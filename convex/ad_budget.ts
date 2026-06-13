import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createBudgetRule = mutation({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    minDailyBudget: v.number(),
    maxDailyBudget: v.number(),
    priority: v.number(),
    autoOptimize: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const now = Date.now();
    const ruleId = await ctx.db.insert("ad_budget_rules", {
      campaignId: args.campaignId,
      platform: args.platform,
      minDailyBudget: args.minDailyBudget,
      maxDailyBudget: args.maxDailyBudget,
      currentDailyBudget: args.minDailyBudget,
      priority: args.priority,
      autoOptimize: args.autoOptimize,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, ruleId };
  },
});

export const optimizeBudgets = mutation({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const rules = await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    if (rules.length === 0) return { error: "No budget rules found" };

    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .collect();

    const platformPerf: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; roas: number }> = {};
    for (const a of analytics) {
      if (!platformPerf[a.platform]) platformPerf[a.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, roas: 0 };
      platformPerf[a.platform].impressions += a.impressions;
      platformPerf[a.platform].clicks += a.clicks;
      platformPerf[a.platform].conversions += a.conversions;
      platformPerf[a.platform].spend += a.spend;
    }

    const totalBudget = rules.reduce((sum, r) => sum + r.currentDailyBudget, 0);
    const updates: any[] = [];

    for (const rule of rules) {
      const perf = platformPerf[rule.platform];
      let score = 1;
      if (perf && perf.spend > 0) {
        const ctr = perf.clicks / Math.max(perf.impressions, 1);
        const cpa = perf.conversions > 0 ? perf.spend / perf.conversions : 999999;
        score = (ctr * 1000) + (1 / Math.max(cpa, 1)) * 100;
      }

      const rulesWithScores = rules.map((r) => ({
        rule: r,
        score: r.platform === rule.platform ? score : 1,
      }));

      const totalScore = rulesWithScores.reduce((sum, r) => sum + r.score, 0);
      const newBudget = Math.round((score / Math.max(totalScore, 1)) * totalBudget);
      const clampedBudget = Math.max(rule.minDailyBudget, Math.min(rule.maxDailyBudget, newBudget));

      if (clampedBudget !== rule.currentDailyBudget) {
        await ctx.db.patch(rule._id, { currentDailyBudget: clampedBudget, lastOptimizedAt: Date.now(), updatedAt: Date.now() });
        updates.push({ platform: rule.platform, oldBudget: rule.currentDailyBudget, newBudget: clampedBudget, change: clampedBudget - rule.currentDailyBudget });
      }
    }

    return { success: true, updates, totalBudget };
  },
});

export const getBudgetRules = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const updateBudgetRule = mutation({
  args: {
    adminToken: v.string(),
    ruleId: v.id("ad_budget_rules"),
    minDailyBudget: v.optional(v.number()),
    maxDailyBudget: v.optional(v.number()),
    priority: v.optional(v.number()),
    autoOptimize: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const updates: any = { updatedAt: Date.now() };
    if (args.minDailyBudget !== undefined) updates.minDailyBudget = args.minDailyBudget;
    if (args.maxDailyBudget !== undefined) updates.maxDailyBudget = args.maxDailyBudget;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.autoOptimize !== undefined) updates.autoOptimize = args.autoOptimize;

    await ctx.db.patch(args.ruleId, updates);
    return { success: true };
  },
});

export const deleteBudgetRule = mutation({
  args: { adminToken: v.string(), ruleId: v.id("ad_budget_rules") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.delete(args.ruleId);
    return { success: true };
  },
});
