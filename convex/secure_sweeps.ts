import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * SECURE SWEEPS - Daily Auto Sweep with Auto/Manual/Pause Controls
 * LIVE Kora Pay API integration for real money transfers
 */

/**
 * Get sweep settings
 */
export const getSettings = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get sweep settings from system_config
    const settings = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    settings.forEach(s => { configMap[s.key] = s.value; });

    // Get last sweep from daily_sweeps
    const lastSweep = await ctx.db.query("daily_sweeps")
      .order("desc")
      .first();

    // Get next scheduled sweep time
    const sweepTime = configMap.DAILY_SWEEP_TIME || "22:00";
    const [hours, minutes] = sweepTime.split(":").map(Number);
    const now = new Date();
    const nextSweep = new Date();
    nextSweep.setHours(hours, minutes, 0, 0);
    if (nextSweep <= now) {
      nextSweep.setDate(nextSweep.getDate() + 1);
    }

    return {
      autoSweep: configMap.DAILY_SWEEP_ENABLED !== false,
      sweepTime: sweepTime,
      pauseSchedule: configMap.DAILY_SWEEP_PAUSED === true,
      minimumAmount: configMap.DAILY_SWEEP_MINIMUM_AMOUNT || 1000,
      sweepType: configMap.DAILY_SWEEP_TYPE || "full",
      keepBalance: configMap.DAILY_SWEEP_KEEP_BALANCE || 0,
      lastSweep: lastSweep?.timestamp || null,
      lastSweepAmount: lastSweep?.amount || 0,
      nextSweep: nextSweep.getTime(),
    };
  },
});

/**
 * Get sweep history
 */
export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const sweeps = await ctx.db.query("daily_sweeps")
      .order("desc")
      .take(limit);
    
    return sweeps.map(s => ({
      id: s._id,
      date: s.date,
      amount: s.amount,
      type: s.sweep_id.includes("PLATFORM") ? "platform_fee" : "daily",
      status: s.status,
      reference: s.sweep_id,
      timestamp: s.timestamp,
      balanceBefore: s.balance_before,
      balanceAfter: s.balance_after,
    }));
  },
});

/**
 * Update sweep settings
 */
export const updateSettings = mutation({
  args: {
    autoSweep: v.optional(v.boolean()),
    sweepTime: v.optional(v.string()),
    pauseSchedule: v.optional(v.boolean()),
    minimumAmount: v.optional(v.number()),
    sweepType: v.optional(v.string()),
    keepBalance: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const updates: Record<string, any> = {};
    
    if (args.autoSweep !== undefined) {
      updates.DAILY_SWEEP_ENABLED = args.autoSweep;
    }
    if (args.sweepTime !== undefined) {
      updates.DAILY_SWEEP_TIME = args.sweepTime;
    }
    if (args.pauseSchedule !== undefined) {
      updates.DAILY_SWEEP_PAUSED = args.pauseSchedule;
    }
    if (args.minimumAmount !== undefined) {
      updates.DAILY_SWEEP_MINIMUM_AMOUNT = args.minimumAmount;
    }
    if (args.sweepType !== undefined) {
      updates.DAILY_SWEEP_TYPE = args.sweepType;
    }
    if (args.keepBalance !== undefined) {
      updates.DAILY_SWEEP_KEEP_BALANCE = args.keepBalance;
    }

    // Update each setting in system_config
    for (const [key, value] of Object.entries(updates)) {
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", key))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", { key, value, updatedAt: Date.now() });
      }
    }

    return { success: true, settings: args };
  },
});

/**
 * Generate 6-digit passkey for transaction security
 */
export const generatePasskey = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const passkey = Math.floor(100000 + Math.random() * 900000).toString();
    const passkeyKey = `PASSKEY_${Date.now()}`;
    
    await ctx.db.insert("system_config", {
      key: passkeyKey,
      value: {
        passkey,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        used: false,
      },
      description: "Transaction passkey",
      updatedAt: Date.now(),
    });

    return { success: true, passkeyId: passkeyKey, passkey };
  },
});

/**
 * Verify passkey
 */
export const verifyPasskey = mutation({
  args: {
    passkeyId: v.string(),
    passkey: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const record = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", args.passkeyId))
      .first();

    if (!record) return { success: false, error: "Passkey not found" };

    const data = record.value as any;
    if (data.used) return { success: false, error: "Passkey already used" };
    if (Date.now() > data.expiresAt) return { success: false, error: "Passkey expired" };
    if (data.passkey !== args.passkey) return { success: false, error: "Invalid passkey" };

    // Mark as used
    await ctx.db.patch(record._id, {
      value: { ...data, used: true },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Perform sweep with real Kora Pay API
 */
export const performSweep = mutation({
  args: {
    type: v.union(v.literal("manual"), v.literal("auto")),
    amount: v.optional(v.number()),
    passkeyId: v.optional(v.string()),
    passkey: v.optional(v.string()),
    beneficiaryId: v.optional(v.string()),
    remarks: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Verify passkey for manual sweeps
      if (args.type === "manual" && args.passkeyId && args.passkey) {
        const passkeyRecord = await ctx.db.query("system_config")
          .withIndex("by_key", q => q.eq("key", args.passkeyId))
          .first();

        if (!passkeyRecord) return { success: false, error: "Passkey not found" };
        const pkData = passkeyRecord.value as any;
        if (pkData.used) return { success: false, error: "Passkey already used" };
        if (Date.now() > pkData.expiresAt) return { success: false, error: "Passkey expired" };
        if (pkData.passkey !== args.passkey) return { success: false, error: "Invalid passkey" };

        await ctx.db.patch(passkeyRecord._id, {
          value: { ...pkData, used: true },
          updatedAt: Date.now(),
        });
      }

      // Get main wallet balance
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();
      
      if (!mainWallet || mainWallet.balance <= 0) {
        return { success: false, error: "No funds to sweep" };
      }

      // Determine sweep amount
      let sweepAmount: number;
      if (args.type === "manual" && args.amount && args.amount > 0) {
        if (args.amount > mainWallet.balance) {
          return { success: false, error: "Amount exceeds wallet balance" };
        }
        sweepAmount = args.amount;
      } else {
        sweepAmount = mainWallet.balance;
      }

      // Get default beneficiary
      const beneficiaries = await ctx.db.query("beneficiaries").collect();
      let beneficiary;
      
      if (args.beneficiaryId) {
        beneficiary = beneficiaries.find(b => b._id === args.beneficiaryId);
      } else {
        beneficiary = beneficiaries.find(b => b.isDefault) || beneficiaries[0];
      }

      if (!beneficiary) {
        return { success: false, error: "No beneficiary configured" };
      }

      // Call Kora Pay API for real transfer
      const koraSecret = process.env.KORA_SECRET_KEY;
      if (!koraSecret) {
        return { success: false, error: "Kora API key not configured" };
      }

      const sweepId = `SWEEP_${args.type.toUpperCase()}_${Date.now()}`;
      const reference = `KNP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      try {
        const response = await fetch("https://api.korapay.com/v1/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${koraSecret}`,
          },
          body: JSON.stringify({
            amount: sweepAmount,
            currency: "NGN",
            beneficiary: {
              name: (beneficiary as any).encryptedAccountName || "Unknown",
              account_number: (beneficiary as any).encryptedAccountNumber,
              bank_code: beneficiary.bankCode,
            },
            reference,
            narration: args.remarks || `Daily sweep - ${sweepId}`,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Log failed attempt
          await ctx.db.insert("daily_sweeps", {
            sweep_id: sweepId,
            date: new Date().toISOString().split("T")[0],
            amount: sweepAmount,
            balance_before: mainWallet.balance,
            balance_after: mainWallet.balance,
            status: "failed",
            kora_reference: reference,
            timestamp: Date.now(),
            notes: `Transfer failed: ${result.message || "Kora API error"}`,
          });

          return {
            success: false,
            error: result.message || "Transfer failed",
            reference,
          };
        }

        // Deduct from main wallet
        const newBalance = mainWallet.balance - sweepAmount;
        await ctx.db.patch(mainWallet._id, {
          balance: newBalance,
          lastUpdated: Date.now(),
        });

        // Record successful sweep
        await ctx.db.insert("daily_sweeps", {
          sweep_id: sweepId,
          date: new Date().toISOString().split("T")[0],
          amount: sweepAmount,
          balance_before: mainWallet.balance,
          balance_after: newBalance,
          status: "completed",
          kora_reference: reference,
          timestamp: Date.now(),
          notes: args.remarks || `Sweep to ${(beneficiary as any).encryptedAccountName}`,
        });

        // Generate receipt
        const receipt = {
          id: sweepId,
          type: "sweep",
          date: new Date().toISOString(),
          amount: sweepAmount,
          from: "Main Wallet",
          to: `${beneficiary.bankName} - ${(beneficiary as any).encryptedAccountName}`,
          accountNumber: "****" + ((beneficiary as any).encryptedAccountNumber || "").slice(-4),
          bankCode: beneficiary.bankCode,
          reference,
          koraReference: result.data?.reference || reference,
          status: "completed",
          remarks: args.remarks || "Daily sweep",
          balanceBefore: mainWallet.balance,
          balanceAfter: newBalance,
        };

        return {
          success: true,
          amount: sweepAmount,
          reference: sweepId,
          koraReference: result.data?.reference || reference,
          receipt,
          message: `₦${sweepAmount.toLocaleString()} transferred successfully`,
        };
      } catch (apiError: any) {
        // Log failed attempt
        await ctx.db.insert("daily_sweeps", {
          sweep_id: sweepId,
          date: new Date().toISOString().split("T")[0],
          amount: sweepAmount,
          balance_before: mainWallet.balance,
          balance_after: mainWallet.balance,
          status: "failed",
          kora_reference: reference,
          timestamp: Date.now(),
          notes: `API error: ${apiError.message}`,
        });

        return {
          success: false,
          error: `Transfer failed: ${apiError.message}`,
          reference,
        };
      }
    } catch (error: any) {
      console.error("performSweep error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Get sweep statistics
 */
export const getSweepStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const sweeps = await ctx.db.query("daily_sweeps").collect();
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const todaySweeps = sweeps.filter(s => s.date === today);
    const weekSweeps = sweeps.filter(s => s.timestamp >= weekAgo);
    const monthSweeps = sweeps.filter(s => s.timestamp >= monthAgo);

    return {
      total: sweeps.length,
      today: {
        count: todaySweeps.length,
        amount: todaySweeps.reduce((sum, s) => sum + s.amount, 0),
      },
      week: {
        count: weekSweeps.length,
        amount: weekSweeps.reduce((sum, s) => sum + s.amount, 0),
      },
      month: {
        count: monthSweeps.length,
        amount: monthSweeps.reduce((sum, s) => sum + s.amount, 0),
      },
      totalSwept: sweeps.reduce((sum, s) => sum + s.amount, 0),
    };
  },
});
