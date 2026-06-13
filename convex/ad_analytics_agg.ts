import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const recordAnalytics = mutation({
  args: {
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    date: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    engagements: v.number(),
    conversions: v.number(),
    spend: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("ad_analytics")
      .withIndex("by_ad", (q) => q.eq("adId", args.adId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        impressions: args.impressions, clicks: args.clicks, engagements: args.engagements,
        conversions: args.conversions, spend: args.spend,
      });
      return { success: true, updated: true };
    }

    await ctx.db.insert("ad_analytics", { ...args });
    return { success: true, inserted: true };
  },
});

export const snapshotCampaign = mutation({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns"), date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();

    const totals = analytics.reduce((acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      engagements: acc.engagements + a.engagements,
      conversions: acc.conversions + a.conversions,
      spend: acc.spend + a.spend,
    }), { impressions: 0, clicks: 0, engagements: 0, conversions: 0, spend: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const roas = totals.spend > 0 ? ((totals.conversions * 1000) / totals.spend) * 100 : 0;

    const platformBreakdown: Record<string, any> = {};
    for (const a of analytics) {
      if (!platformBreakdown[a.platform]) platformBreakdown[a.platform] = { impressions: 0, clicks: 0, spend: 0 };
      platformBreakdown[a.platform].impressions += a.impressions;
      platformBreakdown[a.platform].clicks += a.clicks;
      platformBreakdown[a.platform].spend += a.spend;
    }

    const existing = await ctx.db.query("ad_performance_snapshots")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    const snapshotData = {
      campaignId: args.campaignId, date: args.date,
      totalImpressions: totals.impressions, totalClicks: totals.clicks,
      totalEngagements: totals.engagements, totalConversions: totals.conversions,
      totalSpendNgn: totals.spend, roas, ctr, cpc, cpa, platformBreakdown,
      createdAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, snapshotData);
    } else {
      await ctx.db.insert("ad_performance_snapshots", snapshotData);
    }

    return { success: true, snapshot: snapshotData };
  },
});

export const getCampaignAnalytics = query({
  args: { campaignId: v.id("ad_campaigns"), days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(args.days || 30);

    const totals = analytics.reduce((acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      engagements: acc.engagements + a.engagements,
      conversions: acc.conversions + a.conversions,
      spend: acc.spend + a.spend,
    }), { impressions: 0, clicks: 0, engagements: 0, conversions: 0, spend: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

    return { totals: { ...totals, ctr: Math.round(ctr * 100) / 100, cpc: Math.round(cpc * 100) / 100, cpa: Math.round(cpa * 100) / 100 }, daily: analytics };
  },
});

export const getOverallStats = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const campaigns = await ctx.db.query("ad_campaigns").collect();
    const ads = await ctx.db.query("ad_ads").collect();
    const analytics = await ctx.db.query("ad_analytics").collect();

    const totals = analytics.reduce((acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      conversions: acc.conversions + a.conversions,
      spend: acc.spend + a.spend,
    }), { impressions: 0, clicks: 0, conversions: 0, spend: 0 });

    return {
      campaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      totalAds: ads.length,
      postedAds: ads.filter((a) => a.status === "posted").length,
      ...totals,
      ctr: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0,
    };
  },
});

export const getSnapshots = query({
  args: { campaignId: v.id("ad_campaigns"), days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_performance_snapshots")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(args.days || 30);
  },
});

export const generateRecommendations = mutation({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const analytics = await ctx.db.query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .collect();

    const recommendations: any[] = [];
    const now = Date.now();

    if (analytics.length > 0) {
      const avgCTR = analytics.reduce((s, a) => s + (a.clicks / Math.max(a.impressions, 1)), 0) / analytics.length;
      if (avgCTR < 0.01) {
        recommendations.push({ type: "creative", title: "Low CTR Detected", description: "Your click-through rate is below 1%. Consider testing new headlines or visuals.", impact: "high", estimatedImprovement: "20-50% CTR increase" });
      }
    }

    const rules = await ctx.db.query("ad_budget_rules")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const rule of rules) {
      if (rule.autoOptimize && rule.currentDailyBudget < rule.maxDailyBudget * 0.5) {
        recommendations.push({ type: "budget", title: `Increase ${rule.platform} Budget`, description: `${rule.platform} has room to scale. Current: ₦${rule.currentDailyBudget}, Max: ₦${rule.maxDailyBudget}.`, impact: "medium", estimatedImprovement: "10-30% more reach" });
      }
    }

    for (const rec of recommendations) {
      await ctx.db.insert("ad_recommendations", {
        campaignId: args.campaignId, ...rec,
        applied: false, createdAt: now,
      });
    }

    return { success: true, count: recommendations.length };
  },
});

export const getRecommendations = query({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_recommendations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(20);
  },
});

export const applyRecommendation = mutation({
  args: { adminToken: v.string(), recommendationId: v.id("ad_recommendations") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.recommendationId, { applied: true, appliedAt: Date.now() });
    return { success: true };
  },
});
