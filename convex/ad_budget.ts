import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

const DEFAULT_ALERT_THRESHOLD_PERCENT = 80;

export const createBudgetRule = mutation({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    minDailyBudget: v.number(),
    maxDailyBudget: v.number(),
    priority: v.number(),
    autoOptimize: v.boolean(),
    alertThresholdPercent: v.optional(v.number()),
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
      alertThresholdPercent: args.alertThresholdPercent ?? DEFAULT_ALERT_THRESHOLD_PERCENT,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, ruleId };
  },
});

// ═══════════════════════════════════════════════════════════════════
// BUDGET ALERTS
// ═══════════════════════════════════════════════════════════════════

export const checkBudgetAlerts = internalAction({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args): Promise<{ alerts: Array<{ platform: string; alertType: string; message: string; currentSpend: number; budgetLimit: number; percentUsed: number }>; alertsCreated: number }> => {
    const rules = await ctx.runQuery(internal.ad_budget.getBudgetRulesForCampaign, { campaignId: args.campaignId });
    const alerts: Array<{ platform: string; alertType: string; message: string; currentSpend: number; budgetLimit: number; percentUsed: number }> = [];
    let alertsCreated = 0;

    for (const rule of rules) {
      // Get today's spend for this platform
      const today = new Date().toISOString().slice(0, 10);
      const analytics = await ctx.runQuery(internal.ad_budget.getTodayAnalytics, {
        campaignId: args.campaignId,
        platform: rule.platform,
        date: today,
      });

      const currentSpend = analytics?.spend || 0;
      const budgetLimit = rule.currentDailyBudget;
      const percentUsed = budgetLimit > 0 ? (currentSpend / budgetLimit) * 100 : 0;
      const threshold = rule.alertThresholdPercent || DEFAULT_ALERT_THRESHOLD_PERCENT;

      // Check for threshold reached
      if (percentUsed >= threshold && percentUsed < 100) {
        const existingAlert = await ctx.runQuery(internal.ad_budget.getExistingAlert, {
          campaignId: args.campaignId,
          platform: rule.platform,
          alertType: "threshold_reached",
          date: today,
        });

        if (!existingAlert) {
          await ctx.runMutation(internal.ad_budget.createAlert, {
            campaignId: args.campaignId,
            platform: rule.platform,
            ruleId: rule._id,
            alertType: "threshold_reached",
            message: `${rule.platform} spend at ${percentUsed.toFixed(1)}% of daily budget (₦${currentSpend.toLocaleString()} / ₦${budgetLimit.toLocaleString()})`,
            currentSpend,
            budgetLimit,
            percentUsed,
          });
          alerts.push({
            platform: rule.platform,
            alertType: "threshold_reached",
            message: `${rule.platform} spend at ${percentUsed.toFixed(1)}% of daily budget`,
            currentSpend,
            budgetLimit,
            percentUsed,
          });
          alertsCreated++;
        }
      }

      // Check for budget exceeded
      if (percentUsed >= 100) {
        const existingAlert = await ctx.runQuery(internal.ad_budget.getExistingAlert, {
          campaignId: args.campaignId,
          platform: rule.platform,
          alertType: "budget_exceeded",
          date: today,
        });

        if (!existingAlert) {
          await ctx.runMutation(internal.ad_budget.createAlert, {
            campaignId: args.campaignId,
            platform: rule.platform,
            ruleId: rule._id,
            alertType: "budget_exceeded",
            message: `${rule.platform} budget EXCEEDED! Spent ₦${currentSpend.toLocaleString()} of ₦${budgetLimit.toLocaleString()} (${percentUsed.toFixed(1)}%)`,
            currentSpend,
            budgetLimit,
            percentUsed,
          });
          alerts.push({
            platform: rule.platform,
            alertType: "budget_exceeded",
            message: `${rule.platform} budget EXCEEDED!`,
            currentSpend,
            budgetLimit,
            percentUsed,
          });
          alertsCreated++;
        }

        // Auto-pause if budget exceeded
        if (rule.autoOptimize) {
          await ctx.runMutation(internal.ad_budget.autoPauseCampaign, {
            campaignId: args.campaignId,
            platform: rule.platform,
            currentSpend,
            budgetLimit,
          });
        }
      }
    }

    return { alerts, alertsCreated };
  },
});

export const getBudgetRulesForCampaign = internalQuery({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const getTodayAnalytics = internalQuery({
  args: { campaignId: v.id("ad_campaigns"), platform: v.string(), date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_analytics")
      .withIndex("by_campaign_date", (q) => q.eq("campaignId", args.campaignId).eq("date", args.date))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
  },
});

export const getExistingAlert = internalQuery({
  args: { campaignId: v.id("ad_campaigns"), platform: v.string(), alertType: v.string(), date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    
    return await ctx.db.query("ad_budget_alerts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => 
        q.eq(q.field("platform"), args.platform) &&
        q.eq(q.field("alertType"), args.alertType) &&
        q.gte(q.field("createdAt"), startOfDay) &&
        q.lt(q.field("createdAt"), endOfDay)
      )
      .first();
  },
});

export const createAlert = internalMutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    ruleId: v.id("ad_budget_rules"),
    alertType: v.string(),
    message: v.string(),
    currentSpend: v.number(),
    budgetLimit: v.number(),
    percentUsed: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const alertId = await ctx.db.insert("ad_budget_alerts", {
      ...args,
      acknowledged: false,
      createdAt: Date.now(),
    });
    return { success: true, alertId };
  },
});

export const autoPauseCampaign = internalMutation({
  args: { campaignId: v.id("ad_campaigns"), platform: v.string(), currentSpend: v.number(), budgetLimit: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Mark all scheduled ads for this platform as paused
    const scheduledAds = await ctx.db.query("ad_ads")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), args.platform) && q.eq(q.field("status"), "scheduled"))
      .collect();

    for (const ad of scheduledAds) {
      await ctx.db.patch(ad._id, { status: "draft" });
    }

    // Create auto-pause alert
    const rules = await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (rules) {
      await ctx.db.insert("ad_budget_alerts", {
        campaignId: args.campaignId,
        platform: args.platform,
        ruleId: rules._id,
        alertType: "auto_paused",
        message: `Auto-paused ${scheduledAds.length} scheduled ads for ${args.platform} due to budget exceeded`,
        currentSpend: args.currentSpend,
        budgetLimit: args.budgetLimit,
        percentUsed: (args.currentSpend / args.budgetLimit) * 100,
        acknowledged: false,
        createdAt: Date.now(),
      });
    }

    return { success: true, pausedAds: scheduledAds.length };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AUTO-OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════

export const autoOptimizeBudgets = internalAction({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args): Promise<{ success: boolean; updates: Array<{ platform: string; oldBudget: number; newBudget: number; change: number }>; totalBudget: number }> => {
    const rules = await ctx.runQuery(internal.ad_budget.getBudgetRulesForAutoOptimize, { campaignId: args.campaignId });
    if (rules.length === 0) return { success: false, updates: [], totalBudget: 0 };

    // Get analytics for the last 7 days
    const analytics = await ctx.runQuery(internal.ad_budget.getRecentAnalytics, { campaignId: args.campaignId, days: 7 });

    const platformPerf: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; score: number }> = {};
    
    for (const a of analytics) {
      if (!platformPerf[a.platform]) {
        platformPerf[a.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, score: 0 };
      }
      platformPerf[a.platform].impressions += a.impressions;
      platformPerf[a.platform].clicks += a.clicks;
      platformPerf[a.platform].conversions += a.conversions;
      platformPerf[a.platform].spend += a.spend;
    }

    // Calculate performance scores
    for (const [platform, perf] of Object.entries(platformPerf)) {
      const ctr = perf.clicks / Math.max(perf.impressions, 1);
      const cpa = perf.conversions > 0 ? perf.spend / perf.conversions : 999999;
      const roas = perf.spend > 0 ? (perf.conversions * 1000) / perf.spend : 0;
      
      // Score: higher CTR and ROAS are better, lower CPA is better
      perf.score = (ctr * 1000) + (roas * 100) + (1 / Math.max(cpa, 1)) * 50;
    }

    const totalBudget = rules.reduce((sum, r) => sum + r.currentDailyBudget, 0);
    const totalScore = rules.reduce((sum, r) => {
      const perf = platformPerf[r.platform];
      return sum + (perf?.score || 1);
    }, 0);

    const updates: Array<{ platform: string; oldBudget: number; newBudget: number; change: number }> = [];

    for (const rule of rules) {
      if (!rule.autoOptimize) continue;

      const perf = platformPerf[rule.platform];
      const score = perf?.score || 1;
      const newBudget = Math.round((score / Math.max(totalScore, 1)) * totalBudget);
      const clampedBudget = Math.max(rule.minDailyBudget, Math.min(rule.maxDailyBudget, newBudget));

      if (clampedBudget !== rule.currentDailyBudget) {
        await ctx.runMutation(internal.ad_budget.updateBudgetRuleInternal, {
          ruleId: rule._id,
          currentDailyBudget: clampedBudget,
        });
        updates.push({
          platform: rule.platform,
          oldBudget: rule.currentDailyBudget,
          newBudget: clampedBudget,
          change: clampedBudget - rule.currentDailyBudget,
        });
      }
    }

    // Create optimization alert if there were changes
    if (updates.length > 0) {
      const firstRule = rules[0];
      await ctx.runMutation(internal.ad_budget.createAlert, {
        campaignId: args.campaignId,
        platform: "all",
        ruleId: firstRule._id,
        alertType: "optimization_applied",
        message: `Budget auto-optimized: ${updates.map(u => `${u.platform} ₦${u.oldBudget}→₦${u.newBudget}`).join(", ")}`,
        currentSpend: 0,
        budgetLimit: totalBudget,
        percentUsed: 0,
      });
    }

    return { success: true, updates, totalBudget };
  },
});

export const getBudgetRulesForAutoOptimize = internalQuery({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const getRecentAnalytics = internalQuery({
  args: { campaignId: v.id("ad_campaigns"), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results = [];
    for (let i = 0; i < args.days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dayAnalytics = await ctx.db.query("ad_analytics")
        .withIndex("by_campaign_date", (q) => q.eq("campaignId", args.campaignId).eq("date", date))
        .collect();
      results.push(...dayAnalytics);
    }
    return results;
  },
});

export const updateBudgetRuleInternal = internalMutation({
  args: { ruleId: v.id("ad_budget_rules"), currentDailyBudget: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ruleId, {
      currentDailyBudget: args.currentDailyBudget,
      lastOptimizedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

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
      if (!rule.autoOptimize) continue;

      const perf = platformPerf[rule.platform];
      let score = 1;
      if (perf && perf.spend > 0) {
        const ctr = perf.clicks / Math.max(perf.impressions, 1);
        const cpa = perf.conversions > 0 ? perf.spend / perf.conversions : 999999;
        score = (ctr * 1000) + (1 / Math.max(cpa, 1)) * 100;
      }

      const totalScore = rules.reduce((sum, r) => {
        const p = platformPerf[r.platform];
        let s = 1;
        if (p && p.spend > 0) {
          const ctr = p.clicks / Math.max(p.impressions, 1);
          const cpa = p.conversions > 0 ? p.spend / p.conversions : 999999;
          s = (ctr * 1000) + (1 / Math.max(cpa, 1)) * 100;
        }
        return sum + s;
      }, 0);

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

export const checkCampaignBudgetAlerts = action({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    const result = await ctx.runAction(internal.ad_budget.checkBudgetAlerts, { campaignId: args.campaignId });
    return result;
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

export const getBudgetAlerts = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns"), includeAcknowledged: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let query = ctx.db.query("ad_budget_alerts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId));

    if (!args.includeAcknowledged) {
      query = query.filter((q) => q.eq(q.field("acknowledged"), false));
    }

    return await query.order("desc").take(50);
  },
});

export const acknowledgeAlert = mutation({
  args: { adminToken: v.string(), alertId: v.id("ad_budget_alerts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    await ctx.db.patch(args.alertId, { acknowledged: true });
    return { success: true };
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
    alertThresholdPercent: v.optional(v.number()),
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
    if (args.alertThresholdPercent !== undefined) updates.alertThresholdPercent = args.alertThresholdPercent;

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
