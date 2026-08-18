import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC PRICING ENGINE - Rule-based price optimization
// ═══════════════════════════════════════════════════════════════════

const PRICING_RULES = [
  { id: "peak_hours", name: "Peak Hours", condition: "hour >= 9 && hour <= 17", adjustment: 1.1, description: "10% increase during business hours" },
  { id: "off_peak", name: "Off-Peak", condition: "hour < 9 || hour > 17", adjustment: 0.9, description: "10% decrease outside business hours" },
  { id: "weekend", name: "Weekend", condition: "day === 0 || day === 6", adjustment: 0.85, description: "15% decrease on weekends" },
  { id: "high_demand", name: "High Demand", condition: "requests > threshold", adjustment: 1.2, description: "20% increase during high demand" },
  { id: "new_user", name: "New User Discount", condition: "userAge < 7days", adjustment: 0.8, description: "20% discount for new users" },
  { id: "loyalty", name: "Loyalty Discount", condition: "userAge > 90days", adjustment: 0.9, description: "10% discount for loyal users" },
]

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get pricing rules
// ═══════════════════════════════════════════════════════════════════
export const getPricingRules = query({
  args: {},
  returns: v.any(),
  handler: async () => PRICING_RULES,
})

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Toggle pricing rule
// ═══════════════════════════════════════════════════════════════════
export const togglePricingRule = mutation({
  args: { ruleId: v.string(), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `pricing_rule_${args.ruleId}`;
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key, value: args.enabled, description: `Pricing rule ${args.ruleId}`, updatedAt: Date.now(),
      });
    }
    return null;
  },
})

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get enabled rules
// ═══════════════════════════════════════════════════════════════════
export const getEnabledRules = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const states: Record<string, boolean> = {};
    for (const rule of PRICING_RULES) {
      const config = await ctx.db.query("system_config")
        .withIndex("by_key", (q) => q.eq("key", `pricing_rule_${rule.id}`))
        .first();
      states[rule.id] = config ? (config.value as boolean) : true;
    }
    return states;
  },
})

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get pricing analytics
// ═══════════════════════════════════════════════════════════════════
export const getPricingAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const snapshots = await ctx.db.query("revenue_daily_snapshots").order("desc").take(30);
    const avgRevenue = snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, s) => sum + (s.revenue || 0), 0) / snapshots.length)
      : 0;
    return {
      activeRules: PRICING_RULES.length,
      avgDailyRevenue: avgRevenue,
      potentialUplift: Math.round(avgRevenue * 0.15),
    };
  },
})
