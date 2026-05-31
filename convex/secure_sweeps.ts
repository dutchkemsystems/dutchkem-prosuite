import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SECURE SWEEPS - Daily Auto Sweep with Auto/Manual/Pause Controls
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
 * Perform manual sweep
 */
export const performSweep = mutation({
  args: {
    type: v.union(v.literal("manual"), v.literal("auto")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Get main wallet balance
      const mainWallet = await ctx.db.query("system_wallets")
        .withIndex("by_type", q => q.eq("type", "main"))
        .first();
      
      if (!mainWallet || mainWallet.balance <= 0) {
        return { success: false, error: "No funds to sweep" };
      }

      const amount = mainWallet.balance;
      const sweepId = `SWEEP_${args.type.toUpperCase()}_${Date.now()}`;
      const date = new Date().toISOString().split("T")[0];

      // Record the sweep
      await ctx.db.insert("daily_sweeps", {
        sweep_id: sweepId,
        date,
        amount,
        balance_before: mainWallet.balance,
        balance_after: 0,
        status: "completed",
        timestamp: Date.now(),
        notes: `Manual sweep performed`,
      });

      // Deduct from main wallet
      await ctx.db.patch(mainWallet._id, {
        balance: 0,
        lastUpdated: Date.now(),
      });

      // Add to owner's sweep wallet (beneficiary)
      const beneficiaries = await ctx.db.query("beneficiaries").collect();
      
      const defaultBeneficiary = beneficiaries.find(b => b.isDefault) || beneficiaries[0];
      
      if (defaultBeneficiary) {
        // In production, this would call Kora Pay API
        console.log(`[SWEEP] Transferring ₦${amount} to beneficiary ${defaultBeneficiary._id}`);
      }

      return {
        success: true,
        amount,
        reference: sweepId,
        message: `Sweep completed: ₦${amount.toLocaleString()}`,
      };
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
