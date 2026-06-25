import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// IMAGE MANAGEMENT SYSTEM
// Self-hosted image management for automated ad posting
// ═══════════════════════════════════════════════════════════════════

const IMAGE_TEMPLATES = {
  promotional: {
    name: "Promotional",
    description: "Special offers and promotions",
    resolution: { width: 1080, height: 1080 },
    colors: ["#FF6B35", "#F7931E", "#FFFFFF"],
  },
  event: {
    name: "Event",
    description: "Events and webinars",
    resolution: { width: 1200, height: 628 },
    colors: ["#1E3A8A", "#3B82F6", "#FFFFFF"],
  },
  product: {
    name: "Product",
    description: "Product showcases",
    resolution: { width: 1080, height: 1080 },
    colors: ["#6366F1", "#8B5CF6", "#FFFFFF"],
  },
  announcement: {
    name: "Announcement",
    description: "News and updates",
    resolution: { width: 1080, height: 1080 },
    colors: ["#0F172A", "#1E293B", "#FFFFFF"],
  },
  flyer: {
    name: "Flyer",
    description: "Marketing flyers",
    resolution: { width: 1080, height: 1920 },
    colors: ["#FF6B35", "#FF3366", "#FFFFFF"],
  },
  story: {
    name: "Story",
    description: "Instagram/TikTok stories",
    resolution: { width: 1080, height: 1920 },
    colors: ["#7C3AED", "#A855F7", "#FFFFFF"],
  },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE POSTER IMAGE
// ═══════════════════════════════════════════════════════════════════

export const generatePoster = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.optional(v.string()),
    colors: v.optional(v.object({
      primary: v.string(),
      secondary: v.string(),
      accent: v.string(),
    })),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = IMAGE_TEMPLATES[args.template as keyof typeof IMAGE_TEMPLATES] || IMAGE_TEMPLATES.promotional;
    const colors = args.colors || {
      primary: template.colors[0],
      secondary: template.colors[1],
      accent: template.colors[2],
    };

    // Generate poster data for canvas rendering
    const posterData = {
      headline: args.headline,
      subheadline: args.subheadline || "",
      cta: args.cta,
      url: args.url,
      template: args.template || "promotional",
      colors,
      resolution: template.resolution,
      platform: args.platform || "universal",
      generatedAt: new Date().toISOString(),
    };

    // Save to database
    const posterId = await ctx.runMutation(internal.image_management.savePoster, {
      ...posterData,
      createdBy: session._id,
    });

    return {
      success: true,
      posterId,
      posterData,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/poster/${posterId}`,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE FLYER IMAGE
// ═══════════════════════════════════════════════════════════════════

export const generateFlyer = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.optional(v.string()),
    colors: v.optional(v.object({
      primary: v.string(),
      secondary: v.string(),
      accent: v.string(),
    })),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = IMAGE_TEMPLATES.flyer;
    const colors = args.colors || {
      primary: template.colors[0],
      secondary: template.colors[1],
      accent: template.colors[2],
    };

    const flyerData = {
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      template: "flyer",
      colors,
      resolution: template.resolution,
      platform: args.platform || "universal",
      generatedAt: new Date().toISOString(),
    };

    const flyerId = await ctx.runMutation(internal.image_management.saveFlyer, {
      ...flyerData,
      createdBy: session._id,
    });

    return {
      success: true,
      flyerId,
      flyerData,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/flyer/${flyerId}`,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// BATCH GENERATE FOR ALL AGENTS
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "📚", color: "#3b82f6", tagline: "Expert Research & Writing Assistance" },
  { id: "A2", name: "Business Pro", icon: "💼", color: "#8b5cf6", tagline: "Strategic Business Planning & Consulting" },
  { id: "A3", name: "Content Pro", icon: "📝", color: "#ec4899", tagline: "Viral Content Creation & Marketing" },
  { id: "A4", name: "Career Pro", icon: "🎯", color: "#f59e0b", tagline: "Land Your Dream Job With AI" },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", color: "#10b981", tagline: "Smart Shopping & Deal Finding" },
  { id: "A6", name: "Exam Pro", icon: "📚", color: "#6366f1", tagline: "Ace Your Exams With AI" },
  { id: "A7", name: "Finance Pro", icon: "💰", color: "#059669", tagline: "Take Control of Your Finances" },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", color: "#dc2626", tagline: "Professional Video & Media Creation" },
  { id: "A9", name: "Wellness Pro", icon: "🏃", color: "#14b8a6", tagline: "Your AI Wellness Coach" },
  { id: "A10", name: "Home Services", icon: "🏠", color: "#78716c", tagline: "Trusted Home Service Providers" },
  { id: "A11", name: "Language Tutor", icon: "🗣️", color: "#0ea5e9", tagline: "Learn Any Language With AI" },
  { id: "A12", name: "Travel Planner", icon: "✈️", color: "#8b5cf6", tagline: "Plan Your Perfect Trip" },
  { id: "A13", name: "ServiceMart NG", icon: "🔧", color: "#f97316", tagline: "Local Services in Nigeria" },
  { id: "A14", name: "Translation Hub", icon: "🌍", color: "#06b6d4", tagline: "Translate Anything Instantly" },
  { id: "A15", name: "Event Planner", icon: "🎉", color: "#a855f7", tagline: "Plan Events Effortlessly" },
];

export const generateAllAgentPosters = action({
  args: {
    adminToken: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const agent of AGENTS) {
      try {
        const result = await ctx.runAction(internal.image_management.generatePoster, {
          adminToken: args.adminToken,
          headline: agent.tagline,
          cta: "Start Free Trial",
          url: "https://dutchkem-prosuite-app.vercel.app/auth",
          template: "promotional",
          colors: {
            primary: agent.color,
            secondary: "#FFFFFF",
            accent: "#000000",
          },
          platform: args.platform,
        });
        results.push({ agentId: agent.id, agentName: agent.name, ...result });
      } catch (err: any) {
        results.push({ agentId: agent.id, agentName: agent.name, error: err.message });
      }
    }

    return {
      success: true,
      total: AGENTS.length,
      generated: results.filter(r => r.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// POST IMAGE TO TELEGRAM
// ═══════════════════════════════════════════════════════════════════

export const postImageToTelegram = action({
  args: {
    adminToken: v.string(),
    imageUrl: v.string(),
    caption: v.string(),
    url: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Get Telegram connection
    const connection = await ctx.runQuery(internal.image_management.getTelegramConnection, {});
    if (!connection) return { error: "Telegram not connected" };

    // Post photo to Telegram
    const postResult = await ctx.runAction(internal.image_management.postPhotoToTelegram, {
      botToken: connection.accessToken,
      chatId: connection.platformUserId,
      photoUrl: args.imageUrl,
      caption: `${args.caption}\n\nRegister: ${args.url}`,
    });

    return {
      success: postResult.success,
      messageId: postResult.messageId,
      imageUrl: args.imageUrl,
      url: args.url,
    };
  },
});

export const getTelegramConnection = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .filter((q: any) => q.eq(q.field("platformId"), "telegram"))
      .first();
  },
});

export const postPhotoToTelegram = internalAction({
  args: {
    botToken: v.string(),
    chatId: v.string(),
    photoUrl: v.string(),
    caption: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${args.botToken}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            photo: args.photoUrl,
            caption: args.caption,
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        return { success: true, messageId: result.result.message_id };
      } else {
        return { success: false, error: result.description };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// SAVE TO DATABASE
// ═══════════════════════════════════════════════════════════════════

export const savePoster = internalMutation({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    colors: v.any(),
    resolution: v.any(),
    platform: v.string(),
    generatedAt: v.string(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ad_generated_content", {
      type: "poster",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const saveFlyer = internalMutation({
  args: {
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    colors: v.any(),
    resolution: v.any(),
    platform: v.string(),
    generatedAt: v.string(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ad_generated_content", {
      type: "flyer",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
    return id;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getGeneratedContent = query({
  args: { adminToken: v.string(), type: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_generated_content").order("desc");
    if (args.type) {
      q = q.filter((q) => q.eq(q.field("type"), args.type));
    }

    return await q.take(args.limit || 20);
  },
});

export const getImageTemplates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(IMAGE_TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  },
});

export const getAgentPosters = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const posters = await ctx.db.query("ad_generated_content")
      .filter((q) => q.eq(q.field("type"), "poster"))
      .order("desc")
      .take(20);

    return posters;
  },
});
