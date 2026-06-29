import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// MULTI-PLATFORM GATEWAY — 20+ messaging platforms
// Routes messages between clients and AI agents across platforms
// ═══════════════════════════════════════════════════════════════════

const SUPPORTED_PLATFORMS = [
  { id: "whatsapp_admin", name: "WhatsApp (Admin)", icon: "📱", status: "active", number: "+234-9113393525" },
  { id: "whatsapp_enterprise", name: "WhatsApp (Enterprise)", icon: "📱", status: "active", number: "Enterprise" },
  { id: "telegram", name: "Telegram", icon: "✈️", status: "available" },
  { id: "discord", name: "Discord", icon: "🎮", status: "available" },
  { id: "slack", name: "Slack", icon: "💬", status: "available" },
  { id: "twitter", name: "Twitter/X", icon: "🐦", status: "available" },
  { id: "instagram", name: "Instagram", icon: "📷", status: "available" },
  { id: "facebook", name: "Facebook", icon: "👤", status: "available" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", status: "available" },
  { id: "tiktok", name: "TikTok", icon: "🎵", status: "available" },
  { id: "youtube", name: "YouTube", icon: "📺", status: "available" },
  { id: "email", name: "Email (SES)", icon: "📧", status: "active" },
  { id: "sms", name: "SMS", icon: "💬", status: "available" },
  { id: "web_chat", name: "Web Chat", icon: "🌐", status: "active" },
  { id: "signal", name: "Signal", icon: "🔒", status: "available" },
  { id: "line", name: "LINE", icon: "🟢", status: "available" },
  { id: "viber", name: "Viber", icon: "💜", status: "available" },
  { id: "wechat", name: "WeChat", icon: "💚", status: "available" },
  { id: "threads", name: "Threads", icon: "🧵", status: "available" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", status: "available" },
  { id: "mastodon", name: "Mastodon", icon: "🐘", status: "available" },
  { id: "reddit", name: "Reddit", icon: "🔴", status: "available" },
];

// ─── GET ALL PLATFORMS ───

export const getPlatforms = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const savedPlatforms = await ctx.db.query("hermes_platform_gateways").collect();
    const savedMap = new Map(savedPlatforms.map((p) => [p.platformId, p]));

    return SUPPORTED_PLATFORMS.map((platform) => {
      const saved = savedMap.get(platform.id);
      return {
        ...platform,
        status: saved?.status || platform.status,
        connected: saved?.connected ?? false,
        lastMessageAt: saved?.lastMessageAt ?? null,
        messageCount: saved?.messageCount ?? 0,
      };
    });
  },
});

// ─── TOGGLE PLATFORM ───

export const togglePlatform = mutation({
  args: {
    platformId: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const now = Date.now();
    const existing = await ctx.db
      .query("hermes_platform_gateways")
      .withIndex("by_platform", (q) => q.eq("platformId", args.platformId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.enabled ? "active" : "disabled",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("hermes_platform_gateways", {
        platformId: args.platformId,
        status: args.enabled ? "active" : "disabled",
        connected: false,
        messageCount: 0,
        config: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, platformId: args.platformId, enabled: args.enabled };
  },
});

// ─── GET GATEWAY STATS ───

export const getGatewayStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const gateways = await ctx.db.query("hermes_platform_gateways").collect();
    const totalMessages = gateways.reduce((sum, g) => sum + (g.messageCount || 0), 0);
    const activeCount = gateways.filter((g) => g.status === "active").length;
    const connectedCount = gateways.filter((g) => g.connected).length;

    return {
      totalPlatforms: SUPPORTED_PLATFORMS.length,
      activePlatforms: activeCount,
      connectedPlatforms: connectedCount,
      totalMessages,
      gateways,
    };
  },
});
