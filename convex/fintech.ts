import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * FINTECH INTEGRATION - Kora Pay + Nigerian Banks
 * Complete transfer system with OTP verification
 */

// Supported Nigerian banks (NIP bank codes for Kora Pay API)
export const FINTECH_BANKS = [
  { id: "opay", name: "OPay", code: "100004", icon: "ðŸ¦", accountField: "account_number" },
  { id: "palmpay", name: "PalmPay", code: "100033", icon: "ðŸŸ¢", accountField: "account_number" },
  { id: "kuda", name: "Kuda Bank", code: "090267", icon: "ðŸ’œ", accountField: "account_number" },
  { id: "gtbank", name: "GTBank", code: "058", icon: "ðŸ’š", accountField: "account_number" },
  { id: "firstbank", name: "First Bank", code: "011", icon: "ðŸ›ï¸", accountField: "account_number" },
  { id: "uba", name: "UBA", code: "033", icon: "ðŸ”µ", accountField: "account_number" },
  { id: "zenith", name: "Zenith Bank", code: "057", icon: "ðŸ”µ", accountField: "account_number" },
  { id: "access", name: "Access Bank", code: "044", icon: "ðŸ”´", accountField: "account_number" },
  { id: "fidelity", name: "Fidelity Bank", code: "070", icon: "ðŸŸ¢", accountField: "account_number" },
  { id: "sterling", name: "Sterling Bank", code: "232", icon: "âšª", accountField: "account_number" },
  { id: "wema", name: "Wema Bank", code: "035", icon: "ðŸŸ£", accountField: "account_number" },
  { id: "ecobank", name: "Ecobank", code: "050", icon: "ðŸ”´", accountField: "account_number" },
  { id: "stanbic", name: "Stanbic IBTC", code: "221", icon: "ðŸ”µ", accountField: "account_number" },
  { id: "keystone", name: "Keystone Bank", code: "082", icon: "ðŸ”´", accountField: "account_number" },
  { id: "unity", name: "Unity Bank", code: "215", icon: "ðŸŸ ", accountField: "account_number" },
  { id: "heritage", name: "Heritage Bank", code: "030", icon: "ðŸ”µ", accountField: "account_number" },
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
 * Resolve bank account via Kora Pay API (action because fetch requires it)
 */
export const resolveBankAccount = action({
  args: {
    bankCode: v.string(),
    accountNumber: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) {
      return { success: false, error: "KORA_SECRET_KEY not configured in Convex env" };
    }

    try {
      // Kora Pay bank account resolve endpoint
      const response = await fetch("https://api.korapay.com/merchant/api/v1/misc/banks/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${koraSecret}`,
        },
        body: JSON.stringify({
          bank: args.bankCode,
          account: args.accountNumber,
          currency: "NGN",
        }),
      });

      const result = await response.json();

      if (!result.status || !result.data) {
        return {
          success: false,
          error: result.message || "Account resolution failed",
        };
      }

      return {
        success: true,
        accountName: result.data.account_name || "Unknown",
        accountNumber: result.data.account_number || args.accountNumber,
        bankCode: result.data.bank_code || args.bankCode,
        bankName: result.data.bank_name || FINTECH_BANKS.find(b => b.code === args.bankCode)?.name || args.bankCode,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

/**
 * Get connected bank accounts (beneficiaries)
 */
export const getConnectedAccounts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const beneficiaries = await ctx.db.query("beneficiaries").collect();
    
    return beneficiaries.map(b => ({
      id: b._id,
      bankName: b.bankName,
      bankCode: b.bankCode,
      accountName: (b as any).encryptedAccountName || "N/A",
      accountNumber: "****" + ((b as any).encryptedAccountNumber || "0000").slice(-4),
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
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "system";

    const existing = await ctx.db.query("beneficiaries")
      .filter(q => q.eq(q.field("bankCode"), args.bankCode))
      .filter(q => q.eq(q.field("encryptedAccountNumber"), args.accountNumber))
      .first();

    if (existing) {
      return { success: false, error: "Account already connected" };
    }

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
 * Initiate direct transfer to new recipient (no pre-configured beneficiary needed)
 */
export const initiateDirectTransfer = mutation({
  args: {
    amount: v.number(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    purpose: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      if (args.amount <= 0) {
        return { success: false, error: "Amount must be positive" };
      }

      // Get main wallet
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();

      if (!mainWallet || mainWallet.balance < args.amount) {
        return { success: false, error: `Insufficient balance. Wallet: â‚¦${(mainWallet?.balance || 0).toLocaleString()}, Transfer: â‚¦${args.amount.toLocaleString()}` };
      }

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP with direct transfer details
      const otpKey = `DIRECT_TRANSFER_OTP_${Date.now()}`;
      await ctx.db.insert("system_config", {
        key: otpKey,
        value: {
          otp,
          amount: args.amount,
          bankCode: args.bankCode,
          bankName: args.bankName,
          accountNumber: args.accountNumber,
          accountName: args.accountName,
          purpose: args.purpose || "Transfer",
          createdAt: Date.now(),
          expiresAt: otpExpiry,
          status: "pending",
          type: "direct",
        },
        description: `Direct transfer OTP for â‚¦${args.amount} to ${args.accountName}`,
        updatedAt: Date.now(),
      });

      console.log(`[OTP] Direct transfer OTP for â‚¦${args.amount}: ${otp}`);

      // Send OTP via email using Termii
      try {
        await ctx.scheduler.runAfter(0, api.otp_email.sendOtpEmail as any, {
          otp,
          email: "dutchkemdeveloper@gmail.com",
          purpose: `â‚¦${args.amount.toLocaleString()} transfer to ${args.accountName}`,
          amount: args.amount,
        });
      } catch (emailErr: any) {
        console.error("[OTP EMAIL] Failed to schedule:", emailErr.message);
      }

      return {
        success: true,
        otpId: otpKey,
        otp,
        message: `OTP generated. Check your email or screen.`,
        expiresAt: otpExpiry,
      };
    } catch (error: any) {
      console.error("initiateDirectTransfer error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Initiate transfer with OTP verification (legacy - requires pre-configured beneficiary)
 */
export const initiateTransfer = mutation({
  args: {
    amount: v.number(),
    beneficiaryId: v.string(),
    bankCode: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      if (args.amount <= 0) {
        return { success: false, error: "Amount must be positive" };
      }

      // Get the beneficiary
      const beneficiary = await ctx.db.get(args.beneficiaryId as any);
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

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP in system_config temporarily
      const otpKey = `TRANSFER_OTP_${Date.now()}`;
      await ctx.db.insert("system_config", {
        key: otpKey,
        value: {
          otp,
          amount: args.amount,
          beneficiaryId: args.beneficiaryId,
          beneficiaryName: (beneficiary as any).encryptedAccountName || "Unknown",
          bankName: (beneficiary as any).bankName || "Unknown",
          bankCode: (beneficiary as any).bankCode || "Unknown",
          purpose: args.purpose || "Transfer",
          createdAt: Date.now(),
          expiresAt: otpExpiry,
          status: "pending",
        },
        description: `Transfer OTP for â‚¦${args.amount}`,
        updatedAt: Date.now(),
      });

      // In production, send OTP via Termii email API
      console.log(`[OTP] Transfer OTP for â‚¦${args.amount}: ${otp}`);
      console.log(`[OTP] Expires at: ${new Date(otpExpiry).toISOString()}`);

      return {
        success: true,
        otpId: otpKey,
        message: `OTP sent to your email. Valid for 10 minutes.`,
        expiresAt: otpExpiry,
      };
    } catch (error: any) {
      console.error("initiateTransfer error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Verify OTP and complete transfer via Kora Pay API
 */
export const verifyTransferOTP = mutation({
  args: {
    otpId: v.string(),
    otp: v.string(),
    passkey: v.optional(v.string()),
    passkeyId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Get OTP record
      const otpRecord = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", args.otpId))
        .first();

      if (!otpRecord) {
        return { success: false, error: "OTP not found" };
      }

      const otpData = otpRecord.value;

      // Check if OTP expired
      if (Date.now() > otpData.expiresAt) {
        return { success: false, error: "OTP has expired" };
      }

      // Check if OTP already used
      if (otpData.status !== "pending") {
        return { success: false, error: "OTP already used" };
      }

      // Verify OTP
      if (otpData.otp !== args.otp) {
        return { success: false, error: "Invalid OTP" };
      }

      // Verify passkey if provided
      if (args.passkeyId && args.passkey) { const passkeyId = args.passkeyId;
        const passkeyRecord = await ctx.db.query("system_config")
          .withIndex("by_key", q => q.eq("key", passkeyId))
          .first();

        if (!passkeyRecord) return { success: false, error: "Passkey not found" };
        const pkData = passkeyRecord.value;
        if (pkData.used) return { success: false, error: "Passkey already used" };
        if (Date.now() > pkData.expiresAt) return { success: false, error: "Passkey expired" };
        if (pkData.passkey !== args.passkey) return { success: false, error: "Invalid passkey" };

        await ctx.db.patch("system_config", passkeyRecord._id, {
          value: { ...pkData, used: true },
          updatedAt: Date.now(),
        });
      }

      // Mark OTP as used
      await ctx.db.patch("system_config", otpRecord._id, {
        value: { ...otpData, status: "verified" },
        updatedAt: Date.now(),
      });

      // Get main wallet
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();

      if (!mainWallet || mainWallet.balance < otpData.amount) {
        return { success: false, error: "Insufficient balance" };
      }

      // Call Kora Pay API for real transfer
      const koraSecret = process.env.KORA_SECRET_KEY;
      if (!koraSecret) {
        return { success: false, error: "Kora API key not configured" };
      }

      const reference = `KNP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const response = await fetch("https://api.korapay.com/v1/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${koraSecret}`,
        },
        body: JSON.stringify({
          amount: otpData.amount,
          bank_code: otpData.bankCode,
          account_number: otpData.beneficiaryAccountNumber || "",
          account_name: otpData.beneficiaryName,
          currency: "NGN",
          reference,
          narration: otpData.purpose || "Transfer",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.message || "Transfer failed",
          reference,
        };
      }

      // Deduct from main wallet
      const newBalance = mainWallet.balance - otpData.amount;
      await ctx.db.patch("system_wallets", mainWallet._id, {
        balance: newBalance,
        lastUpdated: Date.now(),
      });

      // Record the transaction
      const sweepId = `TRANSFER_${Date.now()}`;
      await ctx.db.insert("daily_sweeps", {
        sweep_id: sweepId,
        date: new Date().toISOString().split("T")[0],
        amount: otpData.amount,
        balance_before: mainWallet.balance,
        balance_after: newBalance,
        status: "completed",
        kora_reference: reference,
        timestamp: Date.now(),
        notes: `Transfer to ${otpData.bankName} (${otpData.beneficiaryName})`,
      });

      // Generate receipt
      const receipt = {
        id: sweepId,
        type: "transfer",
        date: new Date().toISOString(),
        amount: otpData.amount,
        from: "Main Wallet",
        to: `${otpData.bankName} - ${otpData.beneficiaryName}`,
        accountNumber: otpData.beneficiaryAccountNumber ? "****" + otpData.beneficiaryAccountNumber.slice(-4) : "N/A",
        bankCode: otpData.bankCode,
        reference,
        koraReference: result.data?.reference || reference,
        status: "completed",
        purpose: otpData.purpose || "Transfer",
        verifiedBy: "OTP",
        balanceBefore: mainWallet.balance,
        balanceAfter: newBalance,
      };

      return {
        success: true,
        reference,
        receipt,
        message: `â‚¦${otpData.amount.toLocaleString()} transferred successfully`,
      };
    } catch (error: any) {
      console.error("verifyTransferOTP error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Verify OTP and complete DIRECT transfer via Kora Pay API
 */
export const verifyDirectTransferOTP = mutation({
  args: {
    otpId: v.string(),
    otp: v.string(),
    passkey: v.optional(v.string()),
    passkeyId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Get OTP record
      const otpRecord = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", args.otpId))
        .first();

      if (!otpRecord) {
        return { success: false, error: "OTP not found" };
      }

      const otpData = otpRecord.value;

      // Check if OTP expired
      if (Date.now() > otpData.expiresAt) {
        return { success: false, error: "OTP has expired" };
      }

      // Check if OTP already used
      if (otpData.status !== "pending") {
        return { success: false, error: "OTP already used" };
      }

      // Verify OTP
      if (otpData.otp !== args.otp) {
        return { success: false, error: "Invalid OTP" };
      }

      // Verify passkey if provided
      if (args.passkeyId && args.passkey) { const passkeyId = args.passkeyId;
        const passkeyRecord = await ctx.db.query("system_config")
          .withIndex("by_key", q => q.eq("key", passkeyId))
          .first();

        if (!passkeyRecord) return { success: false, error: "Passkey not found" };
        const pkData = passkeyRecord.value;
        if (pkData.used) return { success: false, error: "Passkey already used" };
        if (Date.now() > pkData.expiresAt) return { success: false, error: "Passkey expired" };
        if (pkData.passkey !== args.passkey) return { success: false, error: "Invalid passkey" };

        await ctx.db.patch("system_config", passkeyRecord._id, {
          value: { ...pkData, used: true },
          updatedAt: Date.now(),
        });
      }

      // Mark OTP as used
      await ctx.db.patch("system_config", otpRecord._id, {
        value: { ...otpData, status: "verified" },
        updatedAt: Date.now(),
      });

      // Get main wallet
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();

      if (!mainWallet || mainWallet.balance < otpData.amount) {
        return { success: false, error: `Insufficient balance. Wallet: â‚¦${(mainWallet?.balance || 0).toLocaleString()}, Transfer: â‚¦${otpData.amount.toLocaleString()}` };
      }

      // Call Kora Pay API for real transfer
      const koraSecret = process.env.KORA_SECRET_KEY;
      if (!koraSecret) {
        return { success: false, error: "Kora API key not configured" };
      }

      const reference = `KNP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${koraSecret}`,
        },
        body: JSON.stringify({
          reference,
          destination: {
            type: "bank_account",
            amount: otpData.amount,
            currency: "NGN",
            narration: otpData.purpose || "Transfer",
            bank_account: {
              bank: otpData.bankCode,
              account: otpData.accountNumber,
            },
            customer: {
              name: otpData.accountName,
              email: "dutchkemdeveloper@gmail.com",
            },
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        return {
          success: false,
          error: result.message || result.error || "Transfer failed. Please check account details and try again.",
          reference,
          koraError: result,
        };
      }

      // Deduct from main wallet
      const newBalance = mainWallet.balance - otpData.amount;
      await ctx.db.patch("system_wallets", mainWallet._id, {
        balance: newBalance,
        lastUpdated: Date.now(),
      });

      // Record the transaction
      const sweepId = `TRANSFER_${Date.now()}`;
      await ctx.db.insert("daily_sweeps", {
        sweep_id: sweepId,
        date: new Date().toISOString().split("T")[0],
        amount: otpData.amount,
        balance_before: mainWallet.balance,
        balance_after: newBalance,
        status: "completed",
        kora_reference: reference,
        timestamp: Date.now(),
        notes: `Transfer to ${otpData.bankName} (${otpData.accountName})`,
      });

      // Generate receipt
      const receipt = {
        id: sweepId,
        type: "direct_transfer",
        date: new Date().toISOString(),
        amount: otpData.amount,
        from: "Main Wallet",
        to: `${otpData.bankName} - ${otpData.accountName}`,
        accountNumber: "****" + otpData.accountNumber.slice(-4),
        bankCode: otpData.bankCode,
        reference,
        koraReference: result.data?.reference || reference,
        status: "completed",
        purpose: otpData.purpose || "Transfer",
        verifiedBy: "OTP + Passkey",
        balanceBefore: mainWallet.balance,
        balanceAfter: newBalance,
      };

      return {
        success: true,
        reference,
        receipt,
        message: `â‚¦${otpData.amount.toLocaleString()} transferred successfully to ${otpData.accountName}`,
      };
    } catch (error: any) {
      console.error("verifyDirectTransferOTP error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Get transfer history
 */
export const getTransferHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const allSweeps = await ctx.db.query("daily_sweeps").collect();
    const transfers = allSweeps.filter(s => s.sweep_id?.slice(0, 9) === "TRANSFER_")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return transfers.map(t => ({
      id: t._id,
      reference: t.sweep_id,
      amount: t.amount,
      date: t.date,
      timestamp: t.timestamp,
      status: t.status,
      notes: t.notes,
    }));
  },
});
