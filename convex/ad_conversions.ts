import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// CONVERSION TRACKING — UTM parameters and conversion events
// ═══════════════════════════════════════════════════════════════════

export const generateTrackingUrl = action({
  args: {
    adminToken: v.string(),
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    destinationUrl: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    // Generate UTM parameters
    const utmSource = args.platform;
    const utmMedium = "social";
    const utmCampaign = args.campaignId;
    const utmContent = args.adId;
    const utmTerm = Date.now().toString(36);

    const trackingParams = new URLSearchParams({
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
    });

    const separator = args.destinationUrl.includes("?") ? "&" : "?";
    const trackingUrl = `${args.destinationUrl}${separator}${trackingParams.toString()}`;

    // Store the tracking URL
    await ctx.runMutation(internal.ad_conversions.saveTrackingUrl, {
      adId: args.adId,
      campaignId: args.campaignId,
      platform: args.platform,
      destinationUrl: args.destinationUrl,
      trackingUrl,
      utmParams: {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        content: utmContent,
        term: utmTerm,
      },
    });

    return { success: true, trackingUrl, utmParams: { source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent, term: utmTerm } };
  },
});

export const saveTrackingUrl = internalMutation({
  args: {
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    destinationUrl: v.string(),
    trackingUrl: v.string(),
    utmParams: v.object({
      source: v.string(),
      medium: v.string(),
      campaign: v.string(),
      content: v.string(),
      term: v.string(),
    }),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Check if tracking URL already exists for this ad
    const existing = await ctx.db.query("ad_tracking_urls")
      .withIndex("by_ad", (q) => q.eq("adId", args.adId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        trackingUrl: args.trackingUrl,
        utmParams: args.utmParams,
        updatedAt: Date.now(),
      });
      return { success: true, updated: true };
    }

    const id = await ctx.db.insert("ad_tracking_urls", {
      ...args,
      clicks: 0,
      conversions: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, id };
  },
});

export const recordConversion = mutation({
  args: {
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    conversionType: v.union(v.literal("click"), v.literal("lead"), v.literal("signup"), v.literal("purchase"), v.literal("custom")),
    value: v.optional(v.number()),
    currency: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date(now).toISOString().slice(0, 10);

    // Record the conversion event
    const conversionId = await ctx.db.insert("ad_conversions", {
      adId: args.adId,
      campaignId: args.campaignId,
      platform: args.platform,
      conversionType: args.conversionType,
      value: args.value || 0,
      currency: args.currency || "NGN",
      metadata: args.metadata,
      createdAt: now,
    });

    // Update ad metrics
    const ad = await ctx.db.get(args.adId);
    if (ad) {
      const updates: any = {};
      if (args.conversionType === "click") {
        updates.clicks = (ad.clicks || 0) + 1;
      }
      updates.engagements = (ad.engagements || 0) + 1;
      await ctx.db.patch(args.adId, updates);
    }

    // Update analytics for the day
    const existingAnalytics = await ctx.db.query("ad_analytics")
      .withIndex("by_ad_date", (q) => q.eq("adId", args.adId).eq("date", date))
      .first();

    if (existingAnalytics) {
      await ctx.db.patch(existingAnalytics._id, {
        conversions: existingAnalytics.conversions + 1,
        engagements: existingAnalytics.engagements + 1,
      });
    } else {
      await ctx.db.insert("ad_analytics", {
        adId: args.adId,
        campaignId: args.campaignId,
        platform: args.platform,
        date,
        impressions: 0,
        clicks: args.conversionType === "click" ? 1 : 0,
        engagements: 1,
        conversions: 1,
        spend: 0,
      });
    }

    // Update tracking URL if exists
    const trackingUrl = await ctx.db.query("ad_tracking_urls")
      .withIndex("by_ad", (q) => q.eq("adId", args.adId))
      .first();

    if (trackingUrl) {
      await ctx.db.patch(trackingUrl._id, {
        conversions: trackingUrl.conversions + 1,
        updatedAt: now,
      });
    }

    return { success: true, conversionId };
  },
});

export const getConversionsByCampaign = query({
  args: { 
    adminToken: v.string(), 
    campaignId: v.id("ad_campaigns"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let query = ctx.db.query("ad_conversions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId));

    if (args.startDate) {
      const startTs = new Date(args.startDate).getTime();
      query = query.filter((q) => q.gte(q.field("createdAt"), startTs));
    }
    if (args.endDate) {
      const endTs = new Date(args.endDate).getTime() + 24 * 60 * 60 * 1000;
      query = query.filter((q) => q.lt(q.field("createdAt"), endTs));
    }

    return await query.order("desc").take(1000);
  },
});

export const getConversionStats = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const conversions = await ctx.db.query("ad_conversions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((sum, c) => sum + (c.value || 0), 0);
    const byType = conversions.reduce((acc, c) => {
      acc[c.conversionType] = (acc[c.conversionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPlatform = conversions.reduce((acc, c) => {
      acc[c.platform] = (acc[c.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalConversions,
      totalValue,
      byType,
      byPlatform,
      averageValue: totalConversions > 0 ? totalValue / totalConversions : 0,
    };
  },
});

export const getTrackingUrls = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("ad_tracking_urls")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});
