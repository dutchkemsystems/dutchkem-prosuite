import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD
// Comprehensive analytics and insights
// ═══════════════════════════════════════════════════════════════════

export const getAnalyticsOverview = action({
  args: {
    adminToken: v.string(),
    period: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const period = args.period || '7d';
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Get analytics data
    const overview = await ctx.runQuery(internal.analytics_dashboard.getOverview, { adminToken: args.adminToken, days });
    const byPlatform = await ctx.runQuery(internal.analytics_dashboard.getByPlatform, { adminToken: args.adminToken, days });
    const byAgent = await ctx.runQuery(internal.analytics_dashboard.getByAgent, { adminToken: args.adminToken, days });
    const trends = await ctx.runQuery(internal.analytics_dashboard.getTrends, { adminToken: args.adminToken, days });

    return {
      success: true,
      period,
      overview,
      byPlatform,
      byAgent,
      trends,
    };
  },
});

export const getOverview = internalQuery({
  args: { adminToken: v.string(), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startDate = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const campaigns = await ctx.db.query("ad_campaigns").collect();
    const ads = await ctx.db.query("ad_ads").collect();
    const analytics = await ctx.db.query("ad_analytics")
      .filter((q) => q.gte(q.field("date"), startDate))
      .collect();

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c: any) => c.status === "active").length,
      totalAds: ads.length,
      postedAds: ads.filter((a: any) => a.status === "posted").length,
      totalImpressions: analytics.reduce((sum: number, a: any) => sum + a.impressions, 0),
      totalClicks: analytics.reduce((sum: number, a: any) => sum + a.clicks, 0),
      totalConversions: analytics.reduce((sum: number, a: any) => sum + a.conversions, 0),
      totalSpend: analytics.reduce((sum: number, a: any) => sum + a.spend, 0),
    };
  },
});

export const getByPlatform = internalQuery({
  args: { adminToken: v.string(), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startDate = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const analytics = await ctx.db.query("ad_analytics")
      .filter((q) => q.gte(q.field("date"), startDate))
      .collect();

    const byPlatform: Record<string, any> = {};
    for (const a of analytics) {
      if (!byPlatform[a.platform]) {
        byPlatform[a.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
      }
      byPlatform[a.platform].impressions += a.impressions;
      byPlatform[a.platform].clicks += a.clicks;
      byPlatform[a.platform].conversions += a.conversions;
      byPlatform[a.platform].spend += a.spend;
    }

    return Object.entries(byPlatform).map(([platform, data]: [string, any]) => ({
      platform,
      ...data,
      ctr: data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(2) : "0",
    }));
  },
});

export const getByAgent = internalQuery({
  args: { adminToken: v.string(), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agent_services").collect();
    return agents.map((a: any) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      status: a.status,
      healthScore: a.healthScore || 0,
      totalTasks: a.totalTasks || 0,
    }));
  },
});

export const getTrends = internalQuery({
  args: { adminToken: v.string(), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const trends = [];
    for (let i = 0; i < args.days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dayAnalytics = await ctx.db.query("ad_analytics")
        .filter((q) => q.eq(q.field("date"), date))
        .collect();

      trends.push({
        date,
        impressions: dayAnalytics.reduce((sum: number, a: any) => sum + a.impressions, 0),
        clicks: dayAnalytics.reduce((sum: number, a: any) => sum + a.clicks, 0),
        conversions: dayAnalytics.reduce((sum: number, a: any) => sum + a.conversions, 0),
        spend: dayAnalytics.reduce((sum: number, a: any) => sum + a.spend, 0),
      });
    }

    return trends.reverse();
  },
});
