import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// REFERRAL WITHDRAWAL SYSTEM
// Clients earn from referrals, withdraw when balance reaches ₦15,000
// Admin charges 15% service fee, releases remaining to client
// ═══════════════════════════════════════════════════════════════════

const MINIMUM_WITHDRAWAL = 15000;
const SERVICE_FEE_PERCENT = 15;

// ─── GET CLIENT REFERRAL BALANCE ───

export const getClientReferralBalance = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const code = await ctx.db
      .query("referral_codes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!code) {
      return {
        balance: 0,
        totalRefs: 0,
        totalEarnings: 0,
        canWithdraw: false,
        minimumReached: false,
      };
    }

    const conversions = await ctx.db
      .query("referral_conversions")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();

    const totalEarnings = conversions.reduce((sum: number, c: any) => sum + (c.commission || 0), 0);
    const pendingPayouts = await ctx.db
      .query("referral_payouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const paidAmount = pendingPayouts
      .filter((p: any) => p.status === "completed")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const balance = totalEarnings - paidAmount;
    const minimumReached = balance >= MINIMUM_WITHDRAWAL;

    return {
      balance,
      totalRefs: code.totalRefs,
      totalEarnings,
      paidAmount,
      canWithdraw: minimumReached && balance > 0,
      minimumReached,
      minimumRequired: MINIMUM_WITHDRAWAL,
    };
  },
});

// ─── INITIATE WITHDRAWAL REQUEST ───

export const initiateWithdrawal = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Verify balance
    const code = await ctx.db
      .query("referral_codes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!code) throw new Error("No referral account found");

    const conversions = await ctx.db
      .query("referral_conversions")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();

    const totalEarnings = conversions.reduce((sum: number, c: any) => sum + (c.commission || 0), 0);
    const pendingPayouts = await ctx.db
      .query("referral_payouts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const paidAmount = pendingPayouts
      .filter((p: any) => p.status === "completed")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const balance = totalEarnings - paidAmount;

    // Check minimum
    if (balance < MINIMUM_WITHDRAWAL) {
      throw new Error(`Minimum withdrawal is ₦${MINIMUM_WITHDRAWAL.toLocaleString()}. Your balance: ₦${balance.toLocaleString()}`);
    }

    // Check if amount exceeds balance
    if (args.amount > balance) {
      throw new Error(`Insufficient balance. Available: ₦${balance.toLocaleString()}`);
    }

    // Calculate fees
    const serviceFee = Math.round(args.amount * SERVICE_FEE_PERCENT / 100);
    const netAmount = args.amount - serviceFee;

    // Create withdrawal request
    const withdrawalId = await ctx.db.insert("referral_withdrawal_requests", {
      userId: args.userId,
      requestedAmount: args.amount,
      serviceFee,
      netAmount,
      bankCode: args.bankCode,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      status: "pending",
      createdAt: Date.now(),
    });

    // Notify admin
    await ctx.db.insert("notifications", {
      userId: "admin",
      title: "New Withdrawal Request",
      message: `Client requested ₦${args.amount.toLocaleString()} withdrawal. Service fee: ₦${serviceFee.toLocaleString()}. Net: ₦${netAmount.toLocaleString()}`,
      type: "withdrawal",
      read: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      withdrawalId,
      requestedAmount: args.amount,
      serviceFee,
      netAmount,
    };
  },
});

// ─── GET CLIENT WITHDRAWAL HISTORY ───

export const getClientWithdrawals = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("referral_withdrawal_requests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

// ─── ADMIN: GET ALL WITHDRAWAL REQUESTS ───

export const getWithdrawalRequests = query({
  args: {
    status: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let q = ctx.db.query("referral_withdrawal_requests").order("desc");
    if (args.status) {
      q = q.withIndex("by_status", (iq) => iq.eq("status", args.status));
    }
    return await q.take(50);
  },
});

// ─── ADMIN: APPROVE WITHDRAWAL ───

export const approveWithdrawal = mutation({
  args: {
    withdrawalId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const withdrawal = await ctx.db.get("referral_withdrawal_requests", args.withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status !== "pending") throw new Error("Withdrawal already processed");

    // Calculate service fee (15%)
    const serviceFee = Math.round(withdrawal.requestedAmount * SERVICE_FEE_PERCENT / 100);
    const netAmount = withdrawal.requestedAmount - serviceFee;

    // Update withdrawal status
    await ctx.db.patch(args.withdrawalId, {
      status: "approved",
      serviceFee,
      netAmount,
      approvedAt: Date.now(),
      approvedBy: identity._id,
    });

    // Add service fee to admin wallet
    await ctx.db.insert("system_wallet_transactions", {
      walletType: "main",
      type: "credit",
      amount: serviceFee,
      description: `Referral withdrawal service fee from ${withdrawal.accountName}`,
      reference: `FEE-${args.withdrawalId}`,
      metadata: { type: "referral_fee", userId: withdrawal.userId },
      createdAt: Date.now(),
    });

    // Create payout for client
    await ctx.db.insert("referral_payouts", {
      userId: withdrawal.userId,
      amount: netAmount,
      status: "processing",
      period: new Date().toISOString().substring(0, 7),
      createdAt: Date.now(),
    });

    // Notify client
    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Withdrawal Approved ✅",
      message: `Your withdrawal of ₦${withdrawal.requestedAmount.toLocaleString()} has been approved. Service fee: ₦${serviceFee.toLocaleString()}. You will receive ₦${netAmount.toLocaleString()} in your bank account.`,
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      serviceFee,
      netAmount,
      message: `Withdrawal approved. Client will receive ₦${netAmount.toLocaleString()} after 15% service fee.`,
    };
  },
});

// ─── ADMIN: REJECT WITHDRAWAL ───

export const rejectWithdrawal = mutation({
  args: {
    withdrawalId: v.string(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const withdrawal = await ctx.db.get("referral_withdrawal_requests", args.withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");

    await ctx.db.patch(args.withdrawalId, {
      status: "rejected",
      rejectedAt: Date.now(),
      rejectedBy: identity._id,
      rejectionReason: args.reason,
    });

    // Notify client
    await ctx.db.insert("notifications", {
      userId: withdrawal.userId,
      title: "Withdrawal Rejected ❌",
      message: `Your withdrawal of ₦${withdrawal.requestedAmount.toLocaleString()} was rejected. Reason: ${args.reason}`,
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── ADMIN: PROCESS PAYOUT (after approval) ───

export const processPayout = mutation({
  args: {
    withdrawalId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const withdrawal = await ctx.db.get("referral_withdrawal_requests", args.withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status !== "approved") throw new Error("Withdrawal not approved");

    // Call Kora Pay to disburse funds
    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) {
      throw new Error("KORA_SECRET_KEY not configured");
    }

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${koraSecret}`,
        },
        body: JSON.stringify({
          amount: withdrawal.netAmount,
          currency: "NGN",
          reference: `PAYOUT-${args.withdrawalId}`,
          destination: {
            type: "bank_account",
            bank_code: withdrawal.bankCode,
            account_number: withdrawal.accountNumber,
            account_name: withdrawal.accountName,
          },
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update withdrawal status
        await ctx.db.patch(args.withdrawalId, {
          status: "completed",
          completedAt: Date.now(),
          koraReference: result.data?.reference,
        });

        // Update payout record
        const payout = await ctx.db
          .query("referral_payouts")
          .withIndex("by_user", (q) => q.eq("userId", withdrawal.userId))
          .filter((q) => q.eq(q.field("status"), "processing"))
          .first();

        if (payout) {
          await ctx.db.patch(payout._id, {
            status: "completed",
            koraReference: result.data?.reference,
          });
        }

        // Notify client
        await ctx.db.insert("notifications", {
          userId: withdrawal.userId,
          title: "Payout Completed ✅",
          message: `You have received ₦${withdrawal.netAmount.toLocaleString()} in your bank account. Reference: ${result.data?.reference}`,
          type: "payment",
          read: false,
          createdAt: Date.now(),
        });

        return {
          success: true,
          message: `Payout of ₦${withdrawal.netAmount.toLocaleString()} completed successfully.`,
        };
      } else {
        return {
          success: false,
          error: result.message || "Payout failed",
        };
      }
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Payout failed",
      };
    }
  },
});

// ─── GET WITHDRAWAL DETAILS ───

export const getWithdrawalDetails = query({
  args: { withdrawalId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("referral_withdrawal_requests", args.withdrawalId);
  },
});
