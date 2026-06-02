import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * POSTIZ AD ENGINE - Completely separate from Synthetic Intelligence
 * Automated + Manual Advert Postings with AI Flyer Generation
 */

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export const createCampaign = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    platform: v.string(),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    targetAudience: v.optional(v.any()),
    goals: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "Not authenticated" };

    const userId = identity.subject as any;
    const campaignId = await ctx.db.insert("postiz_campaigns", {
      name: args.name,
      description: args.description,
      platform: args.platform,
      status: "draft",
      budget: args.budget,
      dailyBudget: args.dailyBudget,
      spent: 0,
      startDate: args.startDate,
      endDate: args.endDate,
      targetAudience: args.targetAudience,
      goals: args.goals,
      createdBy: userId,
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
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("postiz_campaigns");
    if (args.status) {
      q = q.withIndex("by_status", (q) => q.eq("status", args.status as any));
    } else if (args.platform) {
      q = q.withIndex("by_platform", (q) => q.eq("platform", args.platform));
    }
    const campaigns = await q.order("desc").take(args.limit || 50);
    return campaigns;
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("postiz_campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    endDate: v.optional(v.number()),
    targetAudience: v.optional(v.any()),
    goals: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { campaignId, ...updates } = args;
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    filtered.updatedAt = Date.now();
    await ctx.db.patch(campaignId, filtered);
    return { success: true };
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("postiz_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.campaignId);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export const createAd = mutation({
  args: {
    campaignId: v.id("postiz_campaigns"),
    name: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    agentId: v.string(),
    scheduledFor: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adId = await ctx.db.insert("postiz_ads", {
      campaignId: args.campaignId,
      name: args.name,
      content: args.content,
      imageUrl: args.imageUrl,
      ctaText: args.ctaText,
      ctaUrl: args.ctaUrl,
      status: "draft",
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      spend: 0,
      scheduledFor: args.scheduledFor,
      agentId: args.agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, adId };
  },
});

export const getAds = query({
  args: {
    campaignId: v.optional(v.id("postiz_campaigns")),
    status: v.optional(v.string()),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.campaignId) {
      const ads = await ctx.db
        .query("postiz_ads")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .order("desc")
        .take(args.limit || 50);
      return ads;
    }
    if (args.agentId) {
      const ads = await ctx.db
        .query("postiz_ads")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .order("desc")
        .take(args.limit || 50);
      return ads;
    }
    const ads = await ctx.db
      .query("postiz_ads")
      .withIndex("by_status", (q) => q.eq("status", (args.status || "draft") as any))
      .order("desc")
      .take(args.limit || 50);
    return ads;
  },
});

export const updateAd = mutation({
  args: {
    adId: v.id("postiz_ads"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    flyerUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { adId, ...updates } = args;
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    filtered.updatedAt = Date.now();
    await ctx.db.patch(adId, filtered);
    return { success: true };
  },
});

export const deleteAd = mutation({
  args: { adId: v.id("postiz_ads") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.adId);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// LIVE AI AD COPY GENERATION (NVIDIA NIM)
// ═══════════════════════════════════════════════════════════════════

export const generateAdCopy = action({
  args: {
    campaignId: v.id("postiz_campaigns"),
    agentId: v.string(),
    productDescription: v.string(),
    targetAudience: v.optional(v.string()),
    platform: v.string(),
    tone: v.optional(v.string()),
    includeEmoji: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const AGENTS: Record<string, { name: string; description: string; capabilities: string[] }> = {
      A1: { name: "Academic Pro", description: "Thesis, Research Papers, Dissertation", capabilities: ["writing", "research", "analysis", "citations"] },
      A2: { name: "Business Pro", description: "Business Plan, Financial Model, Pitch Deck", capabilities: ["planning", "finance", "strategy", "presentation"] },
      A3: { name: "Content Pro", description: "Blog Posts, Social Media, Copywriting", capabilities: ["writing", "marketing", "seo", "social"] },
      A4: { name: "Career Pro", description: "Resume, Cover Letter, Interview Prep", capabilities: ["writing", "coaching", "review", "optimization"] },
      A5: { name: "Personal Shopper", description: "Product Research, Price Comparison, Deals", capabilities: ["research", "comparison", "recommendation", "deals"] },
      A6: { name: "Exam Pro", description: "Exam Prep, Practice Tests, Study Plans", capabilities: ["teaching", "assessment", "planning", "review"] },
      A7: { name: "Finance Pro", description: "Investment Analysis, Budgeting, Tax Planning", capabilities: ["analysis", "planning", "forecasting", "reporting"] },
      A8: { name: "MediaStudio Pro", description: "Video Production, Editing, Animation", capabilities: ["video", "editing", "animation", "production"] },
      A9: { name: "Wellness Pro", description: "Health Plans, Nutrition, Fitness", capabilities: ["planning", "coaching", "tracking", "recommendation"] },
      A10: { name: "Home Services", description: "Cleaning, Maintenance, Repairs", capabilities: ["scheduling", "coordination", "quality", "support"] },
      A11: { name: "Language Tutor", description: "Language Learning, Pronunciation, Grammar", capabilities: ["teaching", "practice", "assessment", "feedback"] },
      A12: { name: "Travel Planner", description: "Trip Planning, Booking, Itineraries", capabilities: ["planning", "booking", "recommendation", "support"] },
      A13: { name: "ServiceMart NG", description: "General Services Marketplace", capabilities: ["matching", "coordination", "quality", "support"] },
      A14: { name: "Translation Hub", description: "Translation, Localization, Transcription", capabilities: ["translation", "localization", "transcription", "review"] },
      A15: { name: "Event Planner", description: "Event Planning, Coordination, Management", capabilities: ["planning", "coordination", "management", "support"] },
    };

    const agent = AGENTS[args.agentId];
    if (!agent) return { success: false, error: "Agent not found" };

    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const platformSpecs: Record<string, string> = {
      x: "Twitter/X (max 280 chars, hashtags optional, thread-friendly)",
      linkedin: "LinkedIn (professional tone, 1300 chars max, hashtags important)",
      instagram: "Instagram (visual-first, 2200 chars max, 30 hashtags max)",
      facebook: "Facebook (engaging, longer form allowed, link posts work well)",
      tiktok: "TikTok (short, catchy, trend-aware, CTA focused)",
    };

    const systemPrompt = `You are ${agent.name}, an expert ad copywriter for ${platformSpecs[args.platform] || "social media"}.
Create compelling, high-converting ad copy. Be creative, persuasive, and platform-optimized.
${args.tone ? `Use a ${args.tone} tone.` : "Use a professional yet engaging tone."}
${args.includeEmoji !== false ? "Include relevant emojis." : "No emojis."}
Focus on: ${agent.capabilities.join(", ")}`;

    const prompt = `Create an ad for: ${args.productDescription}
Target audience: ${args.targetAudience || "General audience"}
Platform: ${args.platform}
Requirements:
- Headline (short, punchy)
- Body copy (engaging, 2-3 sentences)
- Call to action
- 3-5 relevant hashtags`;

    try {
      const startTime = Date.now();
      const { text } = await generateText({
        model: nvidia.chat("meta-llama/llama-3.1-70b-instruct"),
        system: systemPrompt,
        prompt,
        temperature: 0.8,
      });
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        adCopy: text,
        agent: agent.name,
        agentId: args.agentId,
        platform: args.platform,
        latencyMs,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// AI FLYER GENERATION (NVIDIA NIM image prompts)
// ═══════════════════════════════════════════════════════════════════

export const generateFlyer = action({
  args: {
    adId: v.id("postiz_ads"),
    productDescription: v.string(),
    style: v.optional(v.string()),
    colors: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const systemPrompt = `You are a professional graphic designer AI.
Create detailed, vivid image generation prompts for marketing flyers.
The prompt should describe a complete flyer design including:
- Layout composition
- Color scheme
- Typography style
- Imagery and graphics
- Text placement
- Visual hierarchy`;

    const prompt = `Generate a detailed flyer design prompt for: ${args.productDescription}
Style: ${args.style || "Modern, clean, professional"}
Colors: ${args.colors || "Brand-appropriate, high contrast"}
Output ONLY the image generation prompt, nothing else.`;

    try {
      const startTime = Date.now();
      const { text } = await generateText({
        model: nvidia.chat("meta-llama/llama-3.1-70b-instruct"),
        system: systemPrompt,
        prompt,
        temperature: 0.9,
      });
      const latencyMs = Date.now() - startTime;

      // Store the flyer generation record
      await ctx.runMutation(internal.postiz_ad_engine.saveFlyerRecord, {
        adId: args.adId,
        prompt: text,
        imageUrl: `generated:${Date.now()}`,
        status: "ready",
      });

      return {
        success: true,
        flyerPrompt: text,
        adId: args.adId,
        latencyMs,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// AD POSTING (Postiz API)
// ═══════════════════════════════════════════════════════════════════

export const postAd = mutation({
  args: {
    adId: v.id("postiz_ads"),
    platform: v.string(),
    accessToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ad = await ctx.db.get(args.adId);
    if (!ad) return { success: false, error: "Ad not found" };

    const postizUrl = process.env.POSTIZ_API_URL || "https://api.postiz.com";
    const postizKey = process.env.POSTIZ_API_KEY;

    if (!postizKey) {
      return { success: false, error: "Postiz API key not configured" };
    }

    try {
      const response = await fetch(`${postizUrl}/public/v1/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": postizKey,
        },
        body: JSON.stringify({
          content: ad.content,
          platform: args.platform,
          image_url: ad.flyerUrl || ad.imageUrl,
          settings: {
            access_token: args.accessToken,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await ctx.db.patch(args.adId, {
          status: "draft",
          updatedAt: Date.now(),
        });
        return { success: false, error: result.error || "Post failed" };
      }

      await ctx.db.patch(args.adId, {
        status: "active",
        externalId: result.id,
        postedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, postId: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// AD ANALYTICS
// ═══════════════════════════════════════════════════════════════════

export const getAdAnalytics = query({
  args: {
    campaignId: v.optional(v.id("postiz_campaigns")),
    timeRange: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let ads;
    if (args.campaignId) {
      ads = await ctx.db
        .query("postiz_ads")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .collect();
    } else {
      ads = await ctx.db.query("postiz_ads").collect();
    }

    const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
    const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
    const totalConversions = ads.reduce((sum, ad) => sum + (ad.conversions || 0), 0);
    const totalSpend = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    const byPlatform: Record<string, { ads: number; impressions: number; clicks: number; spend: number }> = {};
    for (const ad of ads) {
      const campaign = await ctx.db.get(ad.campaignId);
      const platform = campaign?.platform || "unknown";
      if (!byPlatform[platform]) {
        byPlatform[platform] = { ads: 0, impressions: 0, clicks: 0, spend: 0 };
      }
      byPlatform[platform].ads++;
      byPlatform[platform].impressions += ad.impressions || 0;
      byPlatform[platform].clicks += ad.clicks || 0;
      byPlatform[platform].spend += ad.spend || 0;
    }

    const byAgent: Record<string, { ads: number; impressions: number; clicks: number }> = {};
    for (const ad of ads) {
      if (!byAgent[ad.agentId]) {
        byAgent[ad.agentId] = { ads: 0, impressions: 0, clicks: 0 };
      }
      byAgent[ad.agentId].ads++;
      byAgent[ad.agentId].impressions += ad.impressions || 0;
      byAgent[ad.agentId].clicks += ad.clicks || 0;
    }

    return {
      totals: {
        ads: ads.length,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        ctr: Number(avgCtr.toFixed(2)),
        cpc: Number(avgCpc.toFixed(2)),
      },
      byPlatform: Object.entries(byPlatform).map(([platform, stats]) => ({
        platform,
        ...stats,
      })),
      byAgent: Object.entries(byAgent).map(([agentId, stats]) => ({
        agentId,
        ...stats,
      })),
    };
  },
});

export const getCampaignStats = query({
  args: { campaignId: v.id("postiz_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    const ads = await ctx.db
      .query("postiz_ads")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    return {
      ...campaign,
      totalAds: ads.length,
      activeAds: ads.filter((a) => a.status === "active").length,
      totalImpressions: ads.reduce((sum, a) => sum + (a.impressions || 0), 0),
      totalClicks: ads.reduce((sum, a) => sum + (a.clicks || 0), 0),
      totalSpend: ads.reduce((sum, a) => sum + (a.spend || 0), 0),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ENABLE/DISABLE AD ENGINE (Global toggle)
// ═══════════════════════════════════════════════════════════════════

export const getAdEngineStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const configs = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    return {
      enabled: configMap["AD_ENGINE_ENABLED"] === true,
      autoPost: configMap["AD_ENGINE_AUTO_POST"] === true,
      lastRun: configMap["AD_ENGINE_LAST_RUN"] || null,
      totalCampaigns: configMap["AD_ENGINE_TOTAL_CAMPAIGNS"] || 0,
      totalAds: configMap["AD_ENGINE_TOTAL_ADS"] || 0,
    };
  },
});

export const toggleAdEngine = mutation({
  args: { enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const key = "AD_ENGINE_ENABLED";
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: args.enabled,
        description: "Postiz Ad Engine global toggle",
        updatedAt: Date.now(),
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

export const toggleAutoPost = mutation({
  args: { enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const key = "AD_ENGINE_AUTO_POST";
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: args.enabled,
        description: "Postiz Ad Engine auto-post toggle",
        updatedAt: Date.now(),
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════

export const saveFlyerRecord = internalMutation({
  args: {
    adId: v.id("postiz_ads"),
    prompt: v.string(),
    imageUrl: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("postiz_flyers", {
      adId: args.adId,
      prompt: args.prompt,
      imageUrl: args.imageUrl,
      status: args.status as any,
      createdAt: Date.now(),
    });

    // Also update the ad with the flyer URL
    await ctx.db.patch(args.adId, {
      flyerUrl: args.imageUrl,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const processScheduledAds = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const ads = await ctx.runQuery(internal.postiz_ad_engine.getPendingAds);

    let posted = 0;
    for (const ad of ads) {
      const campaign = await ctx.runQuery(internal.postiz_ad_engine.getCampaignForAd, {
        campaignId: ad.campaignId,
      });

      if (!campaign || campaign.status !== "active") continue;

      // Get platform connection for this campaign's platform
      const connection = await ctx.runQuery(internal.postiz_ad_engine.getAdConnection, {
        platform: campaign.platform,
      });

      if (!connection || !connection.isConnected || !connection.accessToken) continue;

      try {
        await ctx.runMutation(internal.postiz_ad_engine.executeAdPost, {
          adId: ad._id,
          platform: campaign.platform,
          accessToken: connection.accessToken,
        });
        posted++;
      } catch (error) {
        console.error(`[AD ENGINE] Failed to post ad ${ad._id}:`, error);
      }
    }

    return { posted, total: ads.length };
  },
});

export const getPendingAds = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const ads = await ctx.db
      .query("postiz_ads")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .collect();

    return ads.filter(
      (ad) => ad.scheduledFor && ad.scheduledFor <= now
    );
  },
});

export const getCampaignForAd = internalQuery({
  args: { campaignId: v.id("postiz_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getAdConnection = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postiz_ad_connections")
      .withIndex("by_platform", (q) =>
        q.eq("platform", args.platform).eq("isConnected", true)
      )
      .first();
  },
});

export const executeAdPost = internalMutation({
  args: {
    adId: v.id("postiz_ads"),
    platform: v.string(),
    accessToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ad = await ctx.db.get(args.adId);
    if (!ad) return { success: false };

    const postizUrl = process.env.POSTIZ_API_URL || "https://api.postiz.com";
    const postizKey = process.env.POSTIZ_API_KEY;

    if (!postizKey) return { success: false, error: "No API key" };

    try {
      const response = await fetch(`${postizUrl}/public/v1/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: postizKey,
        },
        body: JSON.stringify({
          content: ad.content,
          platform: args.platform,
          image_url: ad.flyerUrl || ad.imageUrl,
          settings: { access_token: args.accessToken },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await ctx.db.patch(args.adId, {
          status: "draft",
          updatedAt: Date.now(),
        });
        return { success: false };
      }

      await ctx.db.patch(args.adId, {
        status: "active",
        externalId: result.id,
        postedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, postId: result.id };
    } catch {
      return { success: false };
    }
  },
});

export const updateAdMetrics = internalMutation({
  args: {
    adId: v.id("postiz_ads"),
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ctr = args.impressions > 0 ? (args.clicks / args.impressions) * 100 : 0;
    await ctx.db.patch(args.adId, {
      impressions: args.impressions,
      clicks: args.clicks,
      conversions: args.conversions,
      ctr: Number(ctr.toFixed(2)),
      updatedAt: Date.now(),
    });
    return null;
  },
});
