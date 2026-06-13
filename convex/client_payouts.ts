import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

export const getMyBankAccounts = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("client_bank_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addBankAccount = mutation({
  args: {
    userId: v.id("users"),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("client_bank_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const isDefault = existing.length === 0;

    const accountId = await ctx.db.insert("client_bank_accounts", {
      userId: args.userId,
      bankCode: args.bankCode,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      isVerified: false,
      isDefault,
      createdAt: Date.now(),
    });

    return { success: true, accountId };
  },
});

export const removeBankAccount = mutation({
  args: { userId: v.id("users"), accountId: v.id("client_bank_accounts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== args.userId) return { error: "Not found" };
    await ctx.db.delete(args.accountId);
    return { success: true };
  },
});

export const requestWithdrawal = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    bankAccountId: v.id("client_bank_accounts"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { error: "Amount must be positive" };

    const kyc = await ctx.db.query("client_kyc_submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    if (!kyc || kyc.status !== "approved") return { error: "KYC approval required before withdrawal" };

    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!wallet || wallet.balance < args.amount) return { error: "Insufficient balance" };

    const bankAccount = await ctx.db.get(args.bankAccountId);
    if (!bankAccount || bankAccount.userId !== args.userId) return { error: "Bank account not found" };

    const now = Date.now();
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.amount,
      pendingWithdrawals: wallet.pendingWithdrawals + args.amount,
      lastUpdated: now,
    });

    const requestId = await ctx.db.insert("client_payout_requests", {
      userId: args.userId,
      amount: args.amount,
      currency: "NGN",
      status: "pending",
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      createdAt: now,
    });

    await ctx.db.insert("client_wallet_transactions", {
      userId: args.userId,
      type: "withdrawal",
      amount: args.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - args.amount,
      description: `Withdrawal request #${requestId.substring(requestId.length - 6)}`,
      createdAt: now,
    });

    return { success: true, requestId };
  },
});

export const getMyPayoutRequests = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("client_payout_requests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const resolveBankAccount = action({
  args: { bankCode: v.string(), accountNumber: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) return { error: "KORA_SECRET_KEY not configured" };

    const res = await fetch("https://api.korapay.com/merchant/api/v1/misc/banks/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${koraSecret}` },
      body: JSON.stringify({ bank: args.bankCode, account: args.accountNumber, currency: "NGN" }),
    });
    const data = await res.json() as any;
    if (data.status && data.data) {
      return { success: true, accountName: data.data.account_name, bankName: data.data.bank_name };
    }
    return { error: data.message || "Resolution failed" };
  },
});
