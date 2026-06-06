import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// INFLUENCER RECRUITMENT — Find, track, and manage influencer campaigns
// ═══════════════════════════════════════════════════════════════════

// Influencer tiers
const INFLUENCER_TIERS = {
  nano: { label: "Nano", minFollowers: 1000, maxFollowers: 10000, avgRate: 5000 },
  micro: { label: "Micro", minFollowers: 10000, maxFollowers: 50000, avgRate: 25000 },
  mid: { label: "Mid-Tier", minFollowers: 50000, maxFollowers: 500000, avgRate: 100000 },
  macro: { label: "Macro", minFollowers: 500000, maxFollowers: 1000000, avgRate: 300000 },
  mega: { label: "Mega", minFollowers: 1000000, maxFollowers: Infinity, avgRate: 1000000 },
};

// Campaign types
const CAMPAIGN_TYPES = {
  sponsored_post: { label: "Sponsored Post", description: "Single paid post" },
  brand_mention: { label: "Brand Mention", description: "Mention in content" },
  product_review: { label: "Product Review", description: "Detailed product review" },
  takeover: { label: "Account Takeover", description: "Full account control" },
  ambassador: { label: "Brand Ambassador", description: "Long-term partnership" },
  giveaway: { label: "Giveaway", description: "Product giveaway to followers" },
};

// Add an influencer
export const addInfluencer = mutation({
  args: {
    name: v.string(),
    platform: v.string(),
    username: v.string(),
    followers: v.number(),
    engagementRate: v.number(),
    niche: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine tier
    let tier = "nano";
    for (const [tierName, config] of Object.entries(INFLUENCER_TIERS)) {
      if (args.followers >= config.minFollowers && args.followers <= config.maxFollowers) {
        tier = tierName;
        break;
      }
    }

    return await ctx.db.insert("influencers", {
      name: args.name,
      platform: args.platform,
      username: args.username,
      followers: args.followers,
      engagementRate: args.engagementRate,
      niche: args.niche,
      email: args.email,
      notes: args.notes,
      tier,
      status: "prospecting",
      score: calculateInfluencerScore(args.followers, args.engagementRate),
      createdAt: Date.now(),
    });
  },
});

// Calculate influencer score (0-100)
function calculateInfluencerScore(followers: number, engagementRate: number): number {
  let score = 0;

  // Engagement rate score (0-40 points)
  if (engagementRate >= 5) score += 40;
  else if (engagementRate >= 3) score += 30;
  else if (engagementRate >= 1) score += 20;
  else score += 10;

  // Follower count score (0-30 points)
  if (followers >= 1000000) score += 30;
  else if (followers >= 500000) score += 25;
  else if (followers >= 100000) score += 20;
  else if (followers >= 50000) score += 15;
  else if (followers >= 10000) score += 10;
  else score += 5;

  // Tier bonus (0-30 points)
  if (followers >= 1000000) score += 30;
  else if (followers >= 500000) score += 25;
  else if (followers >= 100000) score += 20;
  else if (followers >= 50000) score += 15;
  else if (followers >= 10000) score += 10;
  else score += 5;

  return Math.min(100, score);
}

// Get all influencers
export const getInfluencers = query({
  args: {
    tier: v.optional(v.string()),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tier = args.tier;
    const platform = args.platform;
    const status = args.status;

    let q;
    if (tier) {
      q = ctx.db.query("influencers").withIndex("by_tier", (qi) => qi.eq("tier", tier));
    } else if (platform) {
      q = ctx.db.query("influencers").withIndex("by_platform", (qi) => qi.eq("platform", platform));
    } else if (status) {
      q = ctx.db.query("influencers").withIndex("by_status", (qi) => qi.eq("status", status as any));
    } else {
      q = ctx.db.query("influencers");
    }

    return await q.order("desc").collect();
  },
});

// Get influencer details
export const getInfluencerDetails = query({
  args: { influencerId: v.id("influencers") },
  handler: async (ctx, args) => {
    const influencer = await ctx.db.get("influencers", args.influencerId);
    if (!influencer) return null;

    // Get campaigns
    const campaigns = await ctx.db
      .query("influencer_campaigns")
      .withIndex("by_influencer", (q) => q.eq("influencerId", args.influencerId))
      .collect();

    // Calculate stats
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalReach = campaigns.reduce((sum, c) => sum + (c.reach || 0), 0);
    const avgROI = campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + (c.roi || 0), 0) / campaigns.length
      : 0;

    return {
      ...influencer,
      tierDetails: INFLUENCER_TIERS[influencer.tier as keyof typeof INFLUENCER_TIERS],
      campaigns,
      stats: {
        totalCampaigns: campaigns.length,
        totalSpend,
        totalReach,
        avgROI: Math.round(avgROI),
      },
    };
  },
});

// Create a campaign
export const createCampaign = mutation({
  args: {
    name: v.string(),
    influencerId: v.id("influencers"),
    campaignType: v.string(),
    budget: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    deliverables: v.array(v.string()),
    kpis: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("influencer_campaigns", {
      name: args.name,
      influencerId: args.influencerId,
      campaignType: args.campaignType,
      budget: args.budget,
      startDate: args.startDate,
      endDate: args.endDate,
      deliverables: args.deliverables,
      kpis: args.kpis,
      status: "planning",
      spend: 0,
      reach: 0,
      conversions: 0,
      roi: 0,
      createdAt: Date.now(),
    });
  },
});

// Get campaigns
export const getCampaigns = query({
  args: {
    status: v.optional(v.string()),
    influencerId: v.optional(v.id("influencers")),
  },
  handler: async (ctx, args) => {
    const influencerId = args.influencerId;
    const status = args.status;

    let q;
    if (influencerId) {
      q = ctx.db.query("influencer_campaigns").withIndex("by_influencer", (qi) =>
        qi.eq("influencerId", influencerId)
      );
    } else if (status) {
      q = ctx.db.query("influencer_campaigns").withIndex("by_status", (qi) => qi.eq("status", status as any));
    } else {
      q = ctx.db.query("influencer_campaigns");
    }

    const campaigns = await q.order("desc").collect();

    // Enrich with influencer data
    return Promise.all(
      campaigns.map(async (campaign: any) => {
        const influencer: any = await ctx.db.get(campaign.influencerId);
        return {
          ...campaign,
          influencerName: influencer?.name || "Unknown",
          influencerFollowers: influencer?.followers || 0,
        };
      })
    );
  },
});

// Update campaign status
export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("influencer_campaigns"),
    status: v.string(),
    metrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const update: any = { status: args.status };

    if (args.metrics) {
      if (args.metrics.spend !== undefined) update.spend = args.metrics.spend;
      if (args.metrics.reach !== undefined) update.reach = args.metrics.reach;
      if (args.metrics.conversions !== undefined) update.conversions = args.metrics.conversions;
      if (args.metrics.roi !== undefined) update.roi = args.metrics.roi;
    }

    if (args.status === "completed") {
      update.completedAt = Date.now();
    }

    await ctx.db.patch("influencer_campaigns", args.campaignId, update);
    return { success: true };
  },
});

// Get influencer campaign stats
export const getCampaignStats = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("influencer_campaigns").collect();
    const influencers = await ctx.db.query("influencers").collect();

    const stats = {
      totalInfluencers: influencers.length,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      totalSpend: campaigns.reduce((sum, c) => sum + c.spend, 0),
      totalReach: campaigns.reduce((sum, c) => sum + c.reach, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      avgROI: 0,
      byTier: {} as Record<string, number>,
      byPlatform: {} as Record<string, number>,
    };

    // Influencers by tier
    for (const inf of influencers) {
      stats.byTier[inf.tier] = (stats.byTier[inf.tier] || 0) + 1;
      stats.byPlatform[inf.platform] = (stats.byPlatform[inf.platform] || 0) + 1;
    }

    // Average ROI
    const campaignsWithROI = campaigns.filter((c) => c.roi > 0);
    stats.avgROI = campaignsWithROI.length > 0
      ? Math.round(campaignsWithROI.reduce((sum, c) => sum + c.roi, 0) / campaignsWithROI.length)
      : 0;

    return stats;
  },
});

// Get influencer tiers
export const getInfluencerTiers = query({
  args: {},
  handler: async () => {
    return Object.entries(INFLUENCER_TIERS).map(([id, tier]) => ({
      id,
      ...tier,
    }));
  },
});

// Get campaign types
export const getCampaignTypes = query({
  args: {},
  handler: async () => {
    return Object.entries(CAMPAIGN_TYPES).map(([id, type]) => ({
      id,
      ...type,
    }));
  },
});

// Search influencers by niche
export const searchInfluencers = query({
  args: {
    query: v.string(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allInfluencers = await ctx.db.query("influencers").collect();

    return allInfluencers.filter((inf) => {
      const matchesQuery =
        inf.name.toLowerCase().includes(args.query.toLowerCase()) ||
        inf.niche.toLowerCase().includes(args.query.toLowerCase()) ||
        inf.username.toLowerCase().includes(args.query.toLowerCase());

      const matchesPlatform = !args.platform || inf.platform === args.platform;

      return matchesQuery && matchesPlatform;
    });
  },
});
