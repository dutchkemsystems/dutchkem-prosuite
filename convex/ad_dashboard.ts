import { v } from "convex/values";
import { query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AD PERFORMANCE DASHBOARD QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getDashboardOverview = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    // Get all campaigns
    const campaigns = await ctx.db.query("ad_campaigns").collect();
    
    // Get all ads
    const ads = await ctx.db.query("ad_ads").collect();
    
    // Get today's analytics
    const today = new Date().toISOString().slice(0, 10);
    const todayAnalytics = await ctx.db.query("ad_analytics")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    // Calculate metrics
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === "active" || c.status === "running").length;
    const totalAds = ads.length;
    const postedAds = ads.filter(a => a.status === "posted").length;
    const scheduledAds = ads.filter(a => a.status === "scheduled").length;
    const failedAds = ads.filter(a => a.status === "failed").length;

    const todayImpressions = todayAnalytics.reduce((sum, a) => sum + a.impressions, 0);
    const todayClicks = todayAnalytics.reduce((sum, a) => sum + a.clicks, 0);
    const todayConversions = todayAnalytics.reduce((sum, a) => sum + a.conversions, 0);
    const todaySpend = todayAnalytics.reduce((sum, a) => sum + a.spend, 0);

    // Get all-time totals
    const allAnalytics = await ctx.db.query("ad_analytics").collect();
    const totalImpressions = allAnalytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = allAnalytics.reduce((sum, a) => sum + a.clicks, 0);
    const totalConversions = allAnalytics.reduce((sum, a) => sum + a.conversions, 0);
    const totalSpend = allAnalytics.reduce((sum, a) => sum + a.spend, 0);

    return {
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        draft: campaigns.filter(c => c.status === "draft").length,
        completed: campaigns.filter(c => c.status === "completed").length,
      },
      ads: {
        total: totalAds,
        posted: postedAds,
        scheduled: scheduledAds,
        failed: failedAds,
        draft: ads.filter(a => a.status === "draft").length,
      },
      today: {
        impressions: todayImpressions,
        clicks: todayClicks,
        conversions: todayConversions,
        spend: todaySpend,
        ctr: todayImpressions > 0 ? ((todayClicks / todayImpressions) * 100).toFixed(2) : "0.00",
        conversionRate: todayClicks > 0 ? ((todayConversions / todayClicks) * 100).toFixed(2) : "0.00",
      },
      allTime: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00",
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00",
      },
    };
  },
});

export const getPerformanceByPlatform = query({
  args: { adminToken: v.string(), days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const days = args.days || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_date", (q) => q.gte("date", startDate))
      .collect();

    const platformStats: Record<string, {
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
      ads: number;
    }> = {};

    for (const entry of analytics) {
      if (!platformStats[entry.platform]) {
        platformStats[entry.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, ads: 0 };
      }
      platformStats[entry.platform].impressions += entry.impressions;
      platformStats[entry.platform].clicks += entry.clicks;
      platformStats[entry.platform].conversions += entry.conversions;
      platformStats[entry.platform].spend += entry.spend;
    }

    // Get ad count per platform
    const ads = await ctx.db.query("ad_ads").collect();
    for (const ad of ads) {
      if (platformStats[ad.platform]) {
        platformStats[ad.platform].ads++;
      }
    }

    return Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      ...stats,
      ctr: stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : "0.00",
      conversionRate: stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(2) : "0.00",
      cpc: stats.clicks > 0 ? (stats.spend / stats.clicks).toFixed(2) : "0.00",
    })).sort((a, b) => b.impressions - a.impressions);
  },
});

export const getPerformanceTimeline = query({
  args: { adminToken: v.string(), campaignId: v.optional(v.id("ad_campaigns")), days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const days = args.days || 7;
    const timeline: Array<{
      date: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
      ctr: string;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      
      let query = ctx.db.query("ad_analytics")
        .withIndex("by_date", (q) => q.eq("date", date));

      if (args.campaignId) {
        query = query.filter((q) => q.eq(q.field("campaignId"), args.campaignId));
      }

      const dayAnalytics = await query.collect();

      const impressions = dayAnalytics.reduce((sum, a) => sum + a.impressions, 0);
      const clicks = dayAnalytics.reduce((sum, a) => sum + a.clicks, 0);
      const conversions = dayAnalytics.reduce((sum, a) => sum + a.conversions, 0);
      const spend = dayAnalytics.reduce((sum, a) => sum + a.spend, 0);

      timeline.unshift({
        date,
        impressions,
        clicks,
        conversions,
        spend,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00",
      });
    }

    return timeline;
  },
});

export const getTopPerformingAds = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()), metric: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const ads = await ctx.db.query("ad_ads")
      .withIndex("by_status", (q) => q.eq("status", "posted"))
      .collect();

    const metric = args.metric || "ctr";
    const limit = args.limit || 10;

    const adsWithMetrics = ads.map(ad => {
      const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
      const conversionRate = ad.clicks > 0 ? (ad.clicks / ad.clicks) * 100 : 0;
      
      return {
        ...ad,
        ctr,
        conversionRate,
        score: metric === "ctr" ? ctr : metric === "impressions" ? ad.impressions : ad.clicks,
      };
    });

    return adsWithMetrics
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
});

export const getCampaignPerformance = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const campaign = await ctx.db.get("ad_campaigns", args.campaignId);
    if (!campaign) return null;

    const ads = await ctx.db.query("ad_ads")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = analytics.reduce((sum, a) => sum + a.clicks, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
    const totalSpend = analytics.reduce((sum, a) => sum + a.spend, 0);

    // Budget utilization
    const budgetUsed = campaign.budget ? (totalSpend / campaign.budget) * 100 : 0;
    const dailyBudgetUsed = campaign.dailyBudget ? (totalSpend / (campaign.dailyBudget * 30)) * 100 : 0;

    return {
      campaign,
      stats: {
        totalAds: ads.length,
        postedAds: ads.filter(a => a.status === "posted").length,
        scheduledAds: ads.filter(a => a.status === "scheduled").length,
        failedAds: ads.filter(a => a.status === "failed").length,
      },
      metrics: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00",
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00",
        cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "0.00",
        cpa: totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : "0.00",
      },
      budget: {
        total: campaign.budget || 0,
        daily: campaign.dailyBudget || 0,
        spent: totalSpend,
        remaining: (campaign.budget || 0) - totalSpend,
        utilizationPercent: budgetUsed.toFixed(1),
      },
    };
  },
});

export const getRealTimeMetrics = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    // Get metrics from the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentAds = await ctx.db.query("ad_ads")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    // Get recent analytics
    const today = new Date().toISOString().slice(0, 10);
    const todayAnalytics = await ctx.db.query("ad_analytics")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    // Get active campaigns
    const activeCampaigns = await ctx.db.query("ad_campaigns")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Get pending scheduled ads
    const pendingScheduled = await ctx.db.query("ad_ads")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    return {
      lastHour: {
        newAds: recentAds.length,
        posted: recentAds.filter(a => a.status === "posted").length,
        failed: recentAds.filter(a => a.status === "failed").length,
      },
      today: {
        impressions: todayAnalytics.reduce((sum, a) => sum + a.impressions, 0),
        clicks: todayAnalytics.reduce((sum, a) => sum + a.clicks, 0),
        conversions: todayAnalytics.reduce((sum, a) => sum + a.conversions, 0),
        spend: todayAnalytics.reduce((sum, a) => sum + a.spend, 0),
      },
      activeCampaigns: activeCampaigns.length,
      pendingScheduled: pendingScheduled.length,
      lastUpdated: Date.now(),
    };
  },
});
