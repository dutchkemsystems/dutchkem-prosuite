import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED MARKETING FUNNEL - Drip campaigns and automation
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Create drip campaign
// ═══════════════════════════════════════════════════════════════════
export const createCampaign = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("email"), v.literal("whatsapp"), v.literal("sms")),
    steps: v.array(v.object({
      delay: v.number(),
      subject: v.optional(v.string()),
      content: v.string(),
      channel: v.string(),
    })),
    trigger: v.string(),
  },
  returns: v.id("marketing_campaigns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("marketing_campaigns", {
      name: args.name,
      type: args.type,
      steps: args.steps,
      trigger: args.trigger,
      status: "draft",
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Activate campaign
// ═══════════════════════════════════════════════════════════════════
export const activateCampaign = mutation({
  args: { campaignId: v.id("marketing_campaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, { status: "active", updatedAt: Date.now() });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Pause campaign
// ═══════════════════════════════════════════════════════════════════
export const pauseCampaign = mutation({
  args: { campaignId: v.id("marketing_campaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, { status: "paused", updatedAt: Date.now() });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all campaigns
// ═══════════════════════════════════════════════════════════════════
export const getCampaigns = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("marketing_campaigns").order("desc").collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get campaign analytics
// ═══════════════════════════════════════════════════════════════════
export const getCampaignAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("marketing_campaigns").collect();
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const activeCount = campaigns.filter((c) => c.status === "active").length;
    const avgOpenRate = campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaigns.length)
      : 0;
    return { totalCampaigns: campaigns.length, activeCount, totalSent, avgOpenRate };
  },
});
