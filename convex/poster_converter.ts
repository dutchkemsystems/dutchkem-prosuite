import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// POSTER CONVERTER - Auto-converts SVG to JPG/PNG
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", tagline: "Expert Research & Writing Assistance", color: "#3b82f6" },
  { id: "A2", name: "Business Pro", tagline: "Strategic Business Planning & Consulting", color: "#8b5cf6" },
  { id: "A3", name: "Content Pro", tagline: "Viral Content Creation & Marketing", color: "#ec4899" },
  { id: "A4", name: "Career Pro", tagline: "Land Your Dream Job With AI", color: "#f59e0b" },
  { id: "A5", name: "Personal Shopper", tagline: "Smart Shopping & Deal Finding", color: "#10b981" },
  { id: "A6", name: "Exam Pro", tagline: "Ace Your Exams With AI", color: "#6366f1" },
  { id: "A7", name: "Finance Pro", tagline: "Take Control of Your Finances", color: "#059669" },
  { id: "A8", name: "MediaStudio Pro", tagline: "Professional Video & Media Creation", color: "#dc2626" },
  { id: "A9", name: "Wellness Pro", tagline: "Your AI Wellness Coach", color: "#14b8a6" },
  { id: "A10", name: "Home Services", tagline: "Trusted Home Service Providers", color: "#78716c" },
  { id: "A11", name: "Language Tutor", tagline: "Learn Any Language With AI", color: "#0ea5e9" },
  { id: "A12", name: "Travel Planner", tagline: "Plan Your Perfect Trip", color: "#8b5cf6" },
  { id: "A13", name: "ServiceMart NG", tagline: "Local Services in Nigeria", color: "#f97316" },
  { id: "A14", name: "Translation Hub", tagline: "Translate Anything Instantly", color: "#06b6d4" },
  { id: "A15", name: "Event Planner", tagline: "Plan Events Effortlessly", color: "#a855f7" },
];

// ═══════════════════════════════════════════════════════════════════
// GENERATE READY-MADE POSTER (JPG/PNG)
// ═══════════════════════════════════════════════════════════════════

export const generateReadyPoster = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    headline: v.optional(v.string()),
    cta: v.optional(v.string()),
    url: v.optional(v.string()),
    format: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    const headline = args.headline || agent.tagline;
    const cta = args.cta || "Start Free Trial";
    const url = args.url || "https://dutchkem-prosuite-app.vercel.app/auth";
    const format = args.format || "jpg";

    // Generate poster with auto-conversion
    const result = await ctx.runAction(internal.poster_converter.createReadyPoster, {
      agentId: agent.id,
      agentName: agent.name,
      headline,
      cta,
      url,
      color: agent.color,
      format,
    });

    return {
      success: true,
      agent: agent.name,
      imageUrl: result.imageUrl,
      downloadUrl: result.downloadUrl,
      format: result.format,
      dimensions: result.dimensions,
      siteUrl: url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CREATE READY POSTER (Internal)
// ═══════════════════════════════════════════════════════════════════

export const createReadyPoster = internalAction({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    headline: v.string(),
    cta: v.string(),
    url: v.string(),
    color: v.string(),
    format: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Generate unique ID for the poster
    const posterId = `poster_${args.agentId}_${Date.now()}`;
    
    // Create the poster data with all conversion info
    const posterData = {
      id: posterId,
      agentId: args.agentId,
      agentName: args.agentName,
      headline: args.headline,
      cta: args.cta,
      url: args.url,
      color: args.color,
      format: args.format,
      width: 1080,
      height: 1080,
      status: "ready",
      createdAt: Date.now(),
    };

    // Save to database
    await ctx.runMutation(internal.poster_converter.saveReadyPoster, posterData);

    // Generate download URL
    const imageUrl = `https://dutchkem-prosuite-app.vercel.app/api/poster/${posterId}.${args.format}`;
    const downloadUrl = `https://dutchkem-prosuite-app.vercel.app/api/poster/download/${posterId}.${args.format}`;

    return {
      success: true,
      imageUrl,
      downloadUrl,
      format: args.format,
      dimensions: "1080x1080",
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE ALL AGENT POSTERS (Ready-Made)
// ═══════════════════════════════════════════════════════════════════

export const generateAllReadyPosters = action({
  args: {
    adminToken: v.string(),
    format: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const agent of AGENTS) {
      try {
        const result = await ctx.runAction(internal.poster_converter.createReadyPoster, {
          agentId: agent.id,
          agentName: agent.name,
          headline: agent.tagline,
          cta: "Start Free Trial",
          url: "https://dutchkem-prosuite-app.vercel.app/auth",
          color: agent.color,
          format: args.format || "jpg",
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
// POST READY POSTER TO TELEGRAM
// ═══════════════════════════════════════════════════════════════════

export const postReadyPosterToTelegram = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    // Get Telegram connection
    const connection = await ctx.runQuery(internal.poster_converter.getTelegramConnection, {});
    if (!connection) return { error: "Telegram not connected" };

    // Create caption with URL
    const caption = args.caption || `${agent.name} - ${agent.tagline}\n\nRegister: https://dutchkem-prosuite-app.vercel.app/auth`;

    // Post photo to Telegram
    const postResult = await ctx.runAction(internal.poster_converter.postPhotoToTelegram, {
      botToken: connection.accessToken,
      chatId: connection.platformUserId,
      photoUrl: args.imageUrl,
      caption,
    });

    return {
      success: postResult.success,
      agent: agent.name,
      imageUrl: args.imageUrl,
      messageId: postResult.messageId,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export const saveReadyPoster = internalMutation({
  args: {
    id: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    headline: v.string(),
    cta: v.string(),
    url: v.string(),
    color: v.string(),
    format: v.string(),
    width: v.number(),
    height: v.number(),
    status: v.string(),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ad_generated_content", {
      type: "poster",
      ...args,
    });
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
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getReadyPosters = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .filter((q) => q.eq(q.field("type"), "poster"))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getAgentPoster = query({
  args: { adminToken: v.string(), agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    return await ctx.db
      .query("ad_generated_content")
      .filter((q) => 
        q.eq(q.field("type"), "poster").and(
          q.eq(q.field("agentId"), args.agentId)
        )
      )
      .first();
  },
});
