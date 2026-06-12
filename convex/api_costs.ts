import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * API COSTS TRACKING - Track and deduct API subscription costs from wallet
 */

// API Cost Configuration
const API_COSTS = {
  deepgram: { name: "Deepgram STT/TTS", costPerMinute: 0.004, unit: "minute" },
  livekit: { name: "LiveKit Cloud", costPerMinute: 0.02, unit: "minute" },
  nvidia: { name: "NVIDIA NIM AI", costPerRequest: 0.001, unit: "request" },
  aws_ses: { name: "AWS SES Email", costPerEmail: 0.0001, unit: "email" },
  aws_sns: { name: "AWS SNS SMS", costPerSms: 0.00645, unit: "sms" },
  resend: { name: "Resend Email", costPerEmail: 0.001, unit: "email" },
  kora: { name: "Kora Pay", costPerTransaction: 0.015, unit: "transaction", percentage: 1.5 },
} as const;

/**
 * Get API cost summary (public query for frontend)
 */
export const getApiCostSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get all system_config entries
    const allConfigs = await ctx.db.query("system_config").collect();
    
    // Filter for API usage logs (keys starting with "API_USE_")
    const usageLogs = allConfigs.filter(c => c.key.startsWith("API_USE_"));

    // Calculate costs per API
    const costs: Record<string, { name: string; usage: number; cost: number; unit: string }> = {};
    
    for (const [key, config] of Object.entries(API_COSTS)) {
      const cfg = config as any;
      const log = usageLogs.find(l => l.key === `API_USE_${key.toUpperCase()}`);
      const usage = (log?.value as number) || 0;
      
      let cost = 0;
      if ("costPerMinute" in cfg) {
        cost = usage * cfg.costPerMinute;
      } else if ("costPerRequest" in cfg) {
        cost = usage * cfg.costPerRequest;
      } else if ("costPerMonth" in cfg) {
        cost = cfg.costPerMonth;
      } else if ("costPerSms" in cfg) {
        cost = usage * cfg.costPerSms;
      } else if ("costPerEmail" in cfg) {
        cost = usage * cfg.costPerEmail;
      } else if ("costPerTransaction" in cfg) {
        cost = usage * cfg.costPerTransaction;
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
      month: new Date().toISOString().slice(0, 7),
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
      await ctx.db.patch("system_config", existing._id, {
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

// Internal query to get API cost summary
export const getApiCostSummaryInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allConfigs = await ctx.db.query("system_config").collect();
    const usageLogs = allConfigs.filter(c => c.key.startsWith("API_USE_"));

    const costs: Record<string, { name: string; usage: number; cost: number; unit: string }> = {};
    
    for (const [key, config] of Object.entries(API_COSTS)) {
      const cfg = config as any;
      const log = usageLogs.find(l => l.key === `API_USE_${key.toUpperCase()}`);
      const usage = (log?.value as number) || 0;
      
      let cost = 0;
      if ("costPerMinute" in cfg) {
        cost = usage * cfg.costPerMinute;
      } else if ("costPerRequest" in cfg) {
        cost = usage * cfg.costPerRequest;
      } else if ("costPerMonth" in cfg) {
        cost = cfg.costPerMonth;
      } else if ("costPerSms" in cfg) {
        cost = usage * cfg.costPerSms;
      } else if ("costPerEmail" in cfg) {
        cost = usage * cfg.costPerEmail;
      } else if ("costPerTransaction" in cfg) {
        cost = usage * cfg.costPerTransaction;
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

// Internal mutation to deduct from wallet
export const deductFromWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();
    
    if (wallet) {
      await ctx.db.patch("system_wallets", wallet._id, {
        balance: Math.max(0, wallet.balance - args.amount),
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

// Internal mutation to log API cost deduction
export const logApiCostDeduction = internalMutation({
  args: { 
    amount: v.number(),
    month: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_config", {
      key: `API_COST_${args.month}`,
      value: args.amount,
      description: `Monthly API cost deduction for ${args.month}`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Internal mutation to reset monthly usage
export const resetMonthlyUsage = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allConfigs = await ctx.db.query("system_config").collect();
    const usageLogs = allConfigs.filter(c => c.key.startsWith("API_USE_"));
    
    for (const log of usageLogs) {
      await ctx.db.patch("system_config", log._id, { value: 0, updatedAt: Date.now() });
    }
    return null;
  },
});

/**
 * Deduct monthly API costs (run via cron)
 */
export const deductMonthlyApiCosts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    // Get API cost summary via query
    const summary: any = await ctx.runQuery(internal.api_costs.getApiCostSummaryInternal);
    
    if (summary.totalCost <= 0) {
      return { success: true, message: "No API costs to deduct" };
    }

    // Deduct from wallet
    await ctx.runMutation(internal.api_costs.deductFromWallet, {
      amount: summary.totalCost,
    });

    // Log the deduction
    await ctx.runMutation(internal.api_costs.logApiCostDeduction, {
      amount: summary.totalCost,
      month: summary.month,
    });

    // Reset usage counters
    await ctx.runMutation(internal.api_costs.resetMonthlyUsage);

    return {
      success: true,
      amount: summary.totalCost,
      message: `Monthly API costs deducted: ₦${summary.totalCost.toLocaleString()}`,
    };
  },
});
