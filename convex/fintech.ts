import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * FINTECH INTEGRATION - Nigerian Bank Connections
 */

// Supported Nigerian fintech banks
export const FINTECH_BANKS = [
  { id: "opay", name: "OPay", code: "OPY", icon: "🏦", accountField: "phone_number" },
  { id: "palmpay", name: "PalmPay", code: "PMP", icon: "🟢", accountField: "phone_number" },
  { id: "moniepoint", name: "Moniepoint", code: "MNP", icon: "🔵", accountField: "business_id" },
  { id: "kuda", name: "Kuda Bank", code: "090267", icon: "💜", accountField: "account_number" },
  { id: "sparkle", name: "Sparkle", code: "090287", icon: "✨", accountField: "account_number" },
  { id: "rubies", name: "Rubies Bank", code: "090279", icon: "🔴", accountField: "account_number" },
  { id: "vfd", name: "VFD Microfinance", code: "090110", icon: "🔷", accountField: "account_number" },
  { id: "firstbank", name: "First Bank", code: "011", icon: "🏛️", accountField: "account_number" },
  { id: "gtbank", name: "GTBank", code: "058", icon: "💚", accountField: "account_number" },
  { id: "uba", name: "UBA", code: "033", icon: "🔵", accountField: "account_number" },
] as const;

/**
 * Get list of available fintech banks
 */
export const getAvailableBanks = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return FINTECH_BANKS;
  },
});

/**
 * Get connected bank accounts (beneficiaries)
 */
export const getConnectedAccounts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const beneficiaries = await ctx.db.query("beneficiaries")
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();
    
    return beneficiaries.map(b => ({
      id: b._id,
      bankName: b.bankName,
      bankCode: b.bankCode,
      accountName: b.encryptedAccountName, // Masked in production
      accountNumber: "****" + b.encryptedAccountNumber.slice(-4), // Masked
      isDefault: b.isDefault,
    }));
  },
});

/**
 * Connect a new bank account
 */
export const connectBank = mutation({
  args: {
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // In production, this would verify the account via Kora Pay API
    // For now, we'll store it as a beneficiary
    
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "system";

    // Check if account already exists
    const existing = await ctx.db.query("beneficiaries")
      .filter(q => q.eq(q.field("bankCode"), args.bankCode))
      .filter(q => q.eq(q.field("encryptedAccountNumber"), args.accountNumber))
      .first();

    if (existing) {
      return { success: false, error: "Account already connected" };
    }

    // Create beneficiary
    await ctx.db.insert("beneficiaries", {
      userId: userId as any,
      bankCode: args.bankCode,
      bankName: args.bankName,
      encryptedAccountNumber: args.accountNumber,
      encryptedAccountName: args.accountName,
      encryptionIv: "manual",
      encryptionTag: "manual",
      isDefault: false,
      status: "active",
      updatedAt: Date.now(),
    });

    return { success: true, message: "Bank account connected" };
  },
});

/**
 * Transfer funds to a bank account
 */
export const transferFunds = mutation({
  args: {
    amount: v.number(),
    accountId: v.string(),
    bankCode: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      if (args.amount <= 0) {
        return { success: false, error: "Amount must be positive" };
      }

      // Get the beneficiary
      const beneficiary = await ctx.db.get(args.accountId as any);
      if (!beneficiary) {
        return { success: false, error: "Account not found" };
      }

      // Get main wallet
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();

      if (!mainWallet || mainWallet.balance < args.amount) {
        return { success: false, error: "Insufficient balance" };
      }

      // Deduct from main wallet
      await ctx.db.patch(mainWallet._id, {
        balance: mainWallet.balance - args.amount,
        lastUpdated: Date.now(),
      });

      // Record the transaction
      const reference = `TRANSFER_${Date.now()}`;
      await ctx.db.insert("daily_sweeps", {
        sweep_id: reference,
        date: new Date().toISOString().split("T")[0],
        amount: args.amount,
        balance_before: mainWallet.balance,
        balance_after: mainWallet.balance - args.amount,
        status: "completed",
        timestamp: Date.now(),
        notes: `Transfer to ${beneficiary.bankName}`,
      });

      // In production, this would call Kora Pay API
      console.log(`[TRANSFER] ₦${args.amount} to ${beneficiary.bankName} (${beneficiary.encryptedAccountNumber})`);

      return {
        success: true,
        reference,
        message: `₦${args.amount.toLocaleString()} transferred successfully`,
      };
    } catch (error: any) {
      console.error("transferFunds error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Withdraw funds (same as transfer, but from specific wallet)
 */
export const withdrawFunds = mutation({
  args: {
    amount: v.number(),
    accountId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Withdrawal is essentially a transfer from the main wallet
    return await ctx.runMutation(internal.fintech.transferFunds, {
      amount: args.amount,
      accountId: args.accountId,
    });
  },
});
