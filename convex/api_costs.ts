import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * API COSTS TRACKING - Track and deduct API subscription costs from wallet
 */

// API Cost Configuration
const API_COSTS = {
  deepgram: { name: "Deepgram STT/TTS", costPerMinute: 0.004, unit: "minute" },
  livekit: { name: "LiveKit Cloud", costPerMinute: 0.02, unit: "minute" },
  nvidia: { name: "NVIDIA NIM AI", costPerRequest: 0.001, unit: "request" },
  postiz: { name: "Postiz Social", costPerMonth: 29, unit: "month" },
  termii: { name: "Termii OTP", costPerSms: 4, unit: "sms" },
  resend: { name: "Resend Email", costPerEmail: 0.001, unit: "email" },
  kora: { name: "Kora Pay", costPerTransaction: 0.015, unit: "transaction", percentage: 1.5 },
} as const;

/**
 * Get API cost summary
 */
export const getApiCostSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all API usage logs
    const usageLogs = await ctx.db.query("system_config")
      .filter(q => q.eq(q.field("key").slice(0, 8), "API_USE_"))
      .collect();

    // Calculate costs per API
    const costs: Record<string, { name: string; usage: number; cost: number; unit: string }> = {};
    
    for (const [key, config] of Object.entries(API_COSTS)) {
      const log = usageLogs.find(l => l.key === `API_USE_${key.toUpperCase()}`);
      const usage = (log?.value as number) || 0;
      
      let cost = 0;
      if ("costPerMinute" in config) {
        cost = usage * config.costPerMinute;
      } else if ("costPerRequest" in config) {
        cost = usage * config.costPerRequest;
      } else if ("costPerMonth" in config) {
        cost = config.costPerMonth;
      } else if ("costPerSms" in config) {
        cost = usage * config.costPerSms;
      } else if ("costPerEmail" in config) {
        cost = usage * config.costPerEmail;
      } else if ("costPerTransaction" in config) {
        cost = usage * config.costPerTransaction;
      }

      costs[key] = {
        name: config.name,
        usage,
        cost: Math.round(cost * 100) / 100,
        unit: config.unit,
      };
    }

    const totalCost = Object.values(costs).reduce((sum, c) => sum + c.cost, 0);

    // Get main wallet balance
    const mainWallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();

    return {
      costs: Object.entries(costs).map(([key, data]) => ({
        id: key,
        ...data,
      })),
      totalCost: Math.round(totalCost * 100) / 100,
      walletBalance: mainWallet?.balance || 0,
      canAfford: (mainWallet?.balance || 0) >= totalCost,
      month: new Date(now).toISOString().slice(0, 7),
    };
  },
});

/**
 * Record API usage
 */
export const recordApiUsage = mutation({
  args: {
    api: v.string(),
    amount: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const key = `API_USE_${args.api.toUpperCase()}`;
    
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: ((existing.value as number) || 0) + args.amount,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: args.amount,
        description: `API usage counter for ${args.api}`,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Deduct API costs from wallet (run monthly)
 */
export const deductMonthlyApiCosts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get API cost summary
    const summary = await ctx.runQuery(internal.api_costs.getApiCostSummaryInternal);
    
    if (summary.totalCost <= 0) {
      return { success: true, message: "No API costs to deduct" };
    }

    // Get main wallet
    const mainWallet = await ctx.runQuery(internal.api_costs.getMainWallet);
    
    if (!mainWallet || mainWallet.balance < summary.totalCost) {
      console.error(`[API_COSTS] Insufficient balance: ₦${mainWallet?.balance || 0} < ₦${summary.totalCost}`);
      return { success: false, error: "Insufficient wallet balance" };
    }

    // Deduct from main wallet
    await ctx.runMutation(internal.api_costs.deductFromWallet, {
      amount: summary.totalCost,
    });

    // Log the deduction
    await ctx.runMutation(internal.api_costs.logApiCostDeduction, {
      amount: summary.totalCost,
      month: summary.month,
      costs: summary.costs,
    });

    // Reset usage counters for next month
    await ctx.runMutation(internal.api_costs.resetMonthlyUsage);

    return {
      success: true,
      amount: summary.totalCost,
      message: `Monthly API costs deducted: ₦${summary.totalCost.toLocaleString()}`,
    };
  },
});

// Internal helpers
export const getApiCostSummaryInternal = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const usageLogs = await ctx.db.query("system_config")
      .filter(q => q.eq(q.field("key").slice(0, 8), "API_USE_"))
      .collect();

    const costs: Record<string, { name: string; usage: number; cost: number; unit: string }> = {};
    
    for (const [key, config] of Object.entries(API_COSTS)) {
      const log = usageLogs.find(l => l.key === `API_USE_${key.toUpperCase()}`);
      const usage = (log?.value as number) || 0;
      
      let cost = 0;
      if ("costPerMinute" in config) {
        cost = usage * config.costPerMinute;
      } else if ("costPerRequest" in config) {
        cost = usage * config.costPerRequest;
      } else if ("costPerMonth" in config) {
        cost = config.costPerMonth;
      } else if ("costPerSms" in config) {
        cost = usage * config.costPerSms;
      } else if ("costPerEmail" in config) {
        cost = usage * config.costPerEmail;
      } else if ("costPerTransaction" in config) {
        cost = usage * config.costPerTransaction;
      }

      costs[key] = {
        name: config.name,
        usage,
        cost: Math.round(cost * 100) / 100,
        unit: config.unit,
      };
    }

    return {
      costs: Object.entries(costs).map(([key, data]) => ({ id: key, ...data })),
      totalCost: Object.values(costs).reduce((sum, c) => sum + c.cost, 0),
      month: new Date().toISOString().slice(0, 7),
    };
  },
});

export const getMainWallet = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();
  },
});

export const deductFromWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();
    
    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balance: Math.max(0, wallet.balance - args.amount),
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

export const logApiCostDeduction = internalMutation({
  args: { 
    amount: v.number(),
    month: v.string(),
    costs: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_config", {
      key: `API_COST_${args.month}`,
      value: {
        totalAmount: args.amount,
        costs: args.costs,
        deductedAt: Date.now(),
      },
      description: `Monthly API cost deduction for ${args.month}`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const resetMonthlyUsage = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const usageLogs = await ctx.db.query("system_config")
      .filter(q => q.eq(q.field("key").slice(0, 8), "API_USE_"))
      .collect();
    
    for (const log of usageLogs) {
      await ctx.db.patch(log._id, { value: 0, updatedAt: Date.now() });
    }
    return null;
  },
});
