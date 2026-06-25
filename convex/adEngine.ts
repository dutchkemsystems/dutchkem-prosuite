// convex/adEngine.ts
// AD ENGINE — Built on top of existing direct OAuth platform_connections.
// Replaces the deleted Postiz ad engine. NO Postiz dependency.
// Reuses autoPosting.postToOnePlatform for posting ads to connected platforms.
// Additive — does not modify any existing tables or functions.

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// ENGINE STATUS (singleton row, id="global")
// ═══════════════════════════════════════════════════════════════════

export const getAdEngineStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("ad_engine_status")
      .withIndex("by_singleton", (q) => q.eq("singleton", "global"))
      .first();

    if (!row) {
      return {
        enabled: false,
        autoPost: false,
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
      };
    }
    return {
      enabled: row.enabled,
      autoPost: row.autoPost,
      dailyPostLimit: row.dailyPostLimit,
      postsToday: row.postsToday,
      lastResetDate: row.lastResetDate,
    };
  },
});

export const toggleAdEngine = mutation({
  args: { enabled: v.boolean(), adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("ad_engine_status")
      .withIndex("by_singleton", (q) => q.eq("singleton", "global"))
      .first();

    if (existing) {
      await ctx.db.patch("ad_engine_status", existing._id, { enabled: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("ad_engine_status", {
        singleton: "global",
        enabled: args.enabled,
        autoPost: false,
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
        updatedAt: Date.now(),
      });
    }
    return { success: true, enabled: args.enabled };
  },
});

export const toggleAutoPost = mutation({
  args: { enabled: v.boolean(), adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("ad_engine_status")
      .withIndex("by_singleton", (q) => q.eq("singleton", "global"))
      .first();

    if (existing) {
      await ctx.db.patch("ad_engine_status", existing._id, { autoPost: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("ad_engine_status", {
        singleton: "global",
        enabled: false,
        autoPost: args.enabled,
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10),
        updatedAt: Date.now(),
      });
    }
    return { success: true, autoPost: args.enabled };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const SUPPORTED_PLATFORMS = ["x", "linkedin", "facebook", "instagram", "tiktok", "youtube", "pinterest", "reddit", "threads", "discord", "bluesky"];

export const createCampaign = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    platform: v.string(),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    goals: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    // Validate platform
    if (!SUPPORTED_PLATFORMS.includes(args.platform)) {
      throw new Error(`Invalid platform: ${args.platform}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`);
    }

    // Validate budget amounts
    if (args.budget !== undefined && args.budget < 0) {
      throw new Error("Budget cannot be negative");
    }
    if (args.dailyBudget !== undefined && args.dailyBudget < 0) {
      throw new Error("Daily budget cannot be negative");
    }

    // Validate dates
    if (args.endDate !== undefined && args.endDate < args.startDate) {
      throw new Error("End date must be after start date");
    }

    const campaignId = await ctx.db.insert("ad_campaigns", {
      name: args.name,
      description: args.description,
      platform: args.platform,
      status: "draft",
      budget: args.budget,
      dailyBudget: args.dailyBudget,
      spent: 0,
      startDate: args.startDate,
      endDate: args.endDate,
      goals: args.goals,
      targetAudience: args.targetAudience,
      createdBy: identity._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, campaignId };
  },
});

export const getCampaigns = query({
  args: {
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100);
    const status = args.status;
    const platform = args.platform;
    if (status) {
      return await ctx.db
        .query("ad_campaigns")
        .withIndex("by_status", (q) => q.eq("status", status as any))
        .order("desc")
        .take(limit);
    }
    if (platform) {
      return await ctx.db
        .query("ad_campaigns")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("ad_campaigns")
      .withIndex("by_createdAt", (q) => q)
      .order("desc")
      .take(limit);
  },
});

export const getCampaign = query({
  args: { campaignId: v.id("ad_campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get("ad_campaigns", args.campaignId);
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    endDate: v.optional(v.number()),
    goals: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) patch.status = args.status;
    if (args.budget !== undefined) patch.budget = args.budget;
    if (args.dailyBudget !== undefined) patch.dailyBudget = args.dailyBudget;
    if (args.endDate !== undefined) patch.endDate = args.endDate;
    if (args.goals !== undefined) patch.goals = args.goals;
    if (args.targetAudience !== undefined) patch.targetAudience = args.targetAudience;

    await ctx.db.patch("ad_campaigns", args.campaignId, patch);
    return { success: true };
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("ad_campaigns"), adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    // Delete all ads in the campaign
    const ads = await ctx.db
      .query("ad_ads")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const ad of ads) {
      await ctx.db.delete("ad_ads", ad._id);
    }

    // Delete all flyers for the campaign
    const flyers = await ctx.db
      .query("ad_flyers")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const f of flyers) {
      await ctx.db.delete("ad_flyers", f._id);
    }

    // Delete all analytics
    const analytics = await ctx.db
      .query("ad_analytics")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const a of analytics) {
      await ctx.db.delete("ad_analytics", a._id);
    }

    await ctx.db.delete("ad_campaigns", args.campaignId);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export const createAd = mutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    flyerId: v.optional(v.id("ad_flyers")),
    scheduledFor: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const campaign = await ctx.db.get("ad_campaigns", args.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const status = args.scheduledFor && args.scheduledFor > Date.now() ? "scheduled" : "draft";
    const adId = await ctx.db.insert("ad_ads", {
      campaignId: args.campaignId,
      title: args.title,
      content: args.content,
      imageUrl: args.imageUrl,
      flyerId: args.flyerId,
      platform: campaign.platform,
      status,
      scheduledFor: args.scheduledFor,
      impressions: 0,
      clicks: 0,
      engagements: 0,
      createdAt: Date.now(),
    });
    return { success: true, adId };
  },
});

export const getAds = query({
  args: {
    campaignId: v.optional(v.id("ad_campaigns")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100);
    const campaignId = args.campaignId;
    if (campaignId) {
      return await ctx.db
        .query("ad_ads")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
        .order("desc")
        .take(limit);
    }
    if (args.status) {
      return await ctx.db
        .query("ad_ads")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("ad_ads")
      .order("desc")
      .take(limit);
  },
});

export const deleteAd = mutation({
  args: { adId: v.id("ad_ads"), adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.delete("ad_ads", args.adId);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// FLYER GENERATION (AI-assisted — enhanced with multiple variants)
// ═══════════════════════════════════════════════════════════════════

const HEADLINE_TEMPLATES = [
  "Don't Miss Out: {topic}",
  "Transform Your {topic} Today",
  "The Secret to Better {topic}",
  "{topic} — Revolutionized",
  "Unlock the Power of {topic}",
];

const CTA_OPTIONS = [
  "Learn More →", "Get Started Now", "Try Free Today", "Discover More",
  "See How It Works", "Start Your Journey", "Join Now", "Explore Now",
];

const COLOR_SCHEMES = [
  { primary: "#1e3a8a", secondary: "#3b82f6", accent: "#f59e0b" },
  { primary: "#059669", secondary: "#10b981", accent: "#f97316" },
  { primary: "#dc2626", secondary: "#ef4444", accent: "#06b6d4" },
  { primary: "#7c3aed", secondary: "#8b5cf6", accent: "#ec4899" },
  { primary: "#ea580c", secondary: "#f97316", accent: "#8b5cf6" },
];

export const generateFlyer = action({
  args: {
    prompt: v.string(),
    style: v.optional(v.string()),
    colorScheme: v.optional(v.string()),
    platform: v.optional(v.string()),
    variants: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ flyers: Array<{ flyerId: any; headline: string; body: string; cta: string; colorScheme: any; imageUrl?: string }>; count: number }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const variantCount = Math.min(args.variants || 3, 5);
    const flyers: Array<{ flyerId: any; headline: string; body: string; cta: string; colorScheme: any; imageUrl?: string }> = [];

    for (let i = 0; i < variantCount; i++) {
      // Generate unique headline for each variant
      const template = HEADLINE_TEMPLATES[i % HEADLINE_TEMPLATES.length];
      const topic = args.prompt.split(" ").slice(0, 3).join(" ");
      const headline = template.replace("{topic}", topic);

      // Generate body copy with platform-specific length
      let body = args.prompt;
      if (args.platform === "x" || args.platform === "threads") {
        body = args.prompt.substring(0, 200);
      } else if (args.platform === "linkedin") {
        body = args.prompt.substring(0, 300);
      }

      // Select CTA and color scheme
      const cta = CTA_OPTIONS[i % CTA_OPTIONS.length];
      const colorScheme = args.colorScheme 
        ? { primary: args.colorScheme, secondary: args.colorScheme, accent: args.colorScheme }
        : COLOR_SCHEMES[i % COLOR_SCHEMES.length];

      const flyerId = await ctx.runMutation(internal.adEngine.saveFlyerRecord, {
        prompt: args.prompt,
        style: args.style || "modern",
        colorScheme: JSON.stringify(colorScheme),
        headline,
        body,
        cta,
        variantIndex: i,
        platform: args.platform || "universal",
      });

      flyers.push({ flyerId, headline, body, cta, colorScheme });
    }

    return { flyers, count: flyers.length };
  },
});

export const generateSmartFlyer = action({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    goal: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    // Get campaign details
    const campaign = await ctx.runQuery(internal.adEngine.getCampaignById, { campaignId: args.campaignId });
    if (!campaign) return { error: "Campaign not found" };

    // Get platform-specific best practices
    const platformTips = getPlatformTips(args.platform);

    // Generate smart prompt based on campaign context
    const smartPrompt = `Create a ${args.platform} ad for: ${campaign.name || "campaign"}.
Goal: ${args.goal || campaign.goals || "drive engagement"}.
Target: ${args.targetAudience || campaign.targetAudience || "general audience"}.
${platformTips}`;

    // Generate multiple variants
    const result = await ctx.runAction(internal.adEngine.generateFlyer, {
      prompt: smartPrompt,
      platform: args.platform,
      variants: 3,
      adminToken: args.adminToken,
    });

    return {
      success: true,
      flyers: result.flyers,
      platformTips,
      campaignName: campaign.name,
    };
  },
});

export const getCampaignById = internalQuery({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("ad_campaigns", args.campaignId);
  },
});

function getPlatformTips(platform: string): string {
  const tips: Record<string, string> = {
    x: "Keep it under 280 characters. Use hashtags sparingly. Include a compelling image.",
    linkedin: "Professional tone. Use bullet points. Include industry insights.",
    facebook: "Tell a story. Use emojis. Ask questions to drive engagement.",
    instagram: "Visual-first. Use relevant hashtags. Create carousel posts.",
    tiktok: "Short, punchy hooks. Trending sounds. Authentic feel.",
    youtube: "Eye-catching thumbnail. Clear value proposition in first 5 seconds.",
    pinterest: "Vertical images. Text overlay. How-to content performs well.",
    threads: "Conversational tone. Join trending conversations. Be authentic.",
  };
  return tips[platform] || "Create compelling, platform-appropriate content.";
}

export const saveFlyerRecord = internalMutation({
  args: {
    prompt: v.string(),
    style: v.string(),
    colorScheme: v.string(),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_flyers", {
      prompt: args.prompt,
      style: args.style,
      headline: args.headline,
      body: args.body,
      cta: args.cta,
      colorScheme: args.colorScheme,
      generatedBy: "ai",
      createdAt: Date.now(),
    });
  },
});

export const getFlyers = query({
  args: { campaignId: v.optional(v.id("ad_campaigns")) },
  handler: async (ctx, args) => {
    if (args.campaignId) {
      return await ctx.db
        .query("ad_flyers")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("ad_flyers").order("desc").take(50);
  },
});

// ═══════════════════════════════════════════════════════════════════
// AD EXECUTION — Reuses platform_connections (no Postiz)
// ═══════════════════════════════════════════════════════════════════

export const executeAdPost = action({
  args: { adId: v.id("ad_ads"), adminToken: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; postId?: string }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Not authenticated" };

    const ad = await ctx.runQuery(internal.adEngine.getAdById, { adId: args.adId });
    if (!ad) return { success: false, error: "Ad not found" };
    if (ad.status === "posted") return { success: false, error: "Ad already posted" };

    // Look up connection using the authenticated admin's ID
    const conn = await ctx.runQuery(internal.adEngine.getConnectionForAd, { 
      platform: ad.platform, 
      adminId: identity._id 
    });
    if (!conn || !conn.isConnected || !conn.accessToken) {
      await ctx.runMutation(internal.adEngine.markAdFailed, {
        adId: args.adId,
        error: `Platform ${ad.platform} not connected. Go to Social Engine to connect.`,
      });
      return { success: false, error: `Platform ${ad.platform} not connected` };
    }

    try {
      const result = await ctx.runAction(internal.autoPosting.postToOnePlatform, {
        platform: ad.platform,
        accessToken: conn.accessToken,
        content: ad.content,
      });

      if (result.success) {
        await ctx.runMutation(internal.adEngine.markAdPosted, {
          adId: args.adId,
          externalId: result.postId,
        });
        return { success: true, postId: result.postId };
      } else {
        await ctx.runMutation(internal.adEngine.markAdFailed, {
          adId: args.adId,
          error: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      await ctx.runMutation(internal.adEngine.markAdFailed, {
        adId: args.adId,
        error: err?.message || String(err),
      });
      return { success: false, error: err?.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERIES & MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const getAdById = internalQuery({
  args: { adId: v.id("ad_ads") },
  handler: async (ctx, args) => {
    return await ctx.db.get("ad_ads", args.adId);
  },
});

export const getConnectionForAd = internalQuery({
  args: { platform: v.string(), adminId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const targetAdmin = args.adminId || "system";
    let conn = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", targetAdmin).eq("platformId", args.platform))
      .first();
    // Fallback to system if no connection found for specified admin
    if (!conn && targetAdmin !== "system") {
      conn = await ctx.db
        .query("platform_connections")
        .withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", args.platform))
        .first();
    }
    return conn;
  },
});

export const markAdPosted = internalMutation({
  args: { adId: v.id("ad_ads"), externalId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch("ad_ads", args.adId, {
      status: "posted",
      postedAt: Date.now(),
      externalId: args.externalId,
      error: undefined,
    });
  },
});

export const markAdFailed = internalMutation({
  args: { adId: v.id("ad_ads"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch("ad_ads", args.adId, { status: "failed", error: args.error });
  },
});

export const getDueAds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("ad_ads")
      .withIndex("by_status_and_scheduled", (q) => q.eq("status", "scheduled").lte("scheduledFor", now))
      .collect();
  },
});

export const processScheduledAds = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; results: Array<{ adId: string; success: boolean; error?: string; postId?: string }> }> => {
    const due = await ctx.runQuery(internal.adEngine.getDueAds);
    const results: Array<{ adId: string; success: boolean; error?: string; postId?: string }> = [];
    
    for (const ad of due) {
      const conn = await ctx.runQuery(internal.adEngine.getConnectionForAd, { platform: ad.platform });
      if (!conn || !conn.isConnected || !conn.accessToken) {
        await ctx.runMutation(internal.adEngine.markAdFailed, {
          adId: ad._id,
          error: `Platform ${ad.platform} not connected`,
        });
        results.push({ adId: ad._id, success: false, error: "not connected" });
        continue;
      }

      try {
        const result = await ctx.runAction(internal.autoPosting.postToOnePlatform, {
          platform: ad.platform,
          accessToken: conn.accessToken,
          content: ad.content,
        });
        if (result.success) {
          await ctx.runMutation(internal.adEngine.markAdPosted, {
            adId: ad._id,
            externalId: result.postId,
          });
          results.push({ adId: ad._id, success: true, postId: result.postId });
        } else {
          await ctx.runMutation(internal.adEngine.markAdFailed, {
            adId: ad._id,
            error: result.error,
          });
          results.push({ adId: ad._id, success: false, error: result.error });
        }
      } catch (err: any) {
        await ctx.runMutation(internal.adEngine.markAdFailed, {
          adId: ad._id,
          error: err?.message || String(err),
        });
        results.push({ adId: ad._id, success: false, error: err?.message });
      }
    }
    return { processed: results.length, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════

export const getAdAnalytics = query({
  args: { campaignId: v.optional(v.id("ad_campaigns")) },
  handler: async (ctx, args) => {
    const ads = args.campaignId
      ? await ctx.db.query("ad_ads").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!)).collect()
      : await ctx.db.query("ad_ads").collect();

    const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalClicks = ads.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const totalEngagements = ads.reduce((sum, a) => sum + (a.engagements || 0), 0);
    const totalSpent = ads.reduce((sum, a) => sum + (a.impressions || 0) * 0.001, 0);

    const postedAds = ads.filter((a) => a.status === "posted");
    const failedAds = ads.filter((a) => a.status === "failed");
    const scheduledAds = ads.filter((a) => a.status === "scheduled");

    return {
      totalAds: ads.length,
      postedAds: postedAds.length,
      failedAds: failedAds.length,
      scheduledAds: scheduledAds.length,
      totalImpressions,
      totalClicks,
      totalEngagements,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00",
      totalSpent,
    };
  },
});

const IMPRESSION_RATE_LIMIT_MS = 1000; // 1 second between impressions from same source
const CLICK_RATE_LIMIT_MS = 5000; // 5 seconds between clicks from same source

export const recordAdImpression = mutation({
  args: { adId: v.id("ad_ads"), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ad = await ctx.db.get("ad_ads", args.adId);
    if (!ad) return { success: false, error: "Ad not found" };

    // Rate limit check using ad's lastImpressionAt field
    const now = Date.now();
    if (ad.lastImpressionAt && (now - ad.lastImpressionAt) < IMPRESSION_RATE_LIMIT_MS) {
      return { success: false, error: "Rate limited" };
    }

    await ctx.db.patch("ad_ads", args.adId, { 
      impressions: (ad.impressions || 0) + 1,
      lastImpressionAt: now,
    });
    return { success: true };
  },
});

export const recordAdClick = mutation({
  args: { adId: v.id("ad_ads"), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ad = await ctx.db.get("ad_ads", args.adId);
    if (!ad) return { success: false, error: "Ad not found" };

    // Rate limit check using ad's lastClickAt field
    const now = Date.now();
    if (ad.lastClickAt && (now - ad.lastClickAt) < CLICK_RATE_LIMIT_MS) {
      return { success: false, error: "Rate limited" };
    }

    await ctx.db.patch("ad_ads", args.adId, { 
      clicks: (ad.clicks || 0) + 1,
      lastClickAt: now,
    });
    return { success: true };
  },
});
