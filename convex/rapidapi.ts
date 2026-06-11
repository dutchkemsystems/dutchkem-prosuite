// convex/rapidapi.ts
// RapidAPI Fallback — Backup posting when Composio fails + additional platforms

import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════
// PLATFORM CONFIGS — RapidAPI endpoints for each platform
// ═══════════════════════════════════════════════════════════════
export const RAPIDAPI_PLATFORMS: Record<string, {
  name: string; icon: string; host: string; url: string; method: string;
  rateLimit: number; type: "composio_fallback" | "exclusive";
}> = {
  // === COMPOSIO FALLBACK (retry when Composio fails) ===
  x: { name: "X (Twitter)", icon: "🐦", host: "twitter-api45.p.rapidapi.com", url: "https://twitter-api45.p.rapidapi.com/tweets", method: "POST", rateLimit: 500, type: "composio_fallback" },
  facebook: { name: "Facebook", icon: "📘", host: "facebook-pages-api.p.rapidapi.com", url: "https://facebook-pages-api.p.rapidapi.com/posts", method: "POST", rateLimit: 200, type: "composio_fallback" },
  instagram: { name: "Instagram", icon: "📸", host: "instagram-social-api.p.rapidapi.com", url: "https://instagram-social-api.p.rapidapi.com/media", method: "POST", rateLimit: 500, type: "composio_fallback" },
  // === RAPIDAPI EXCLUSIVE (not in Composio) ===
  tumblr: { name: "Tumblr", icon: "📝", host: "tumblr-api.p.rapidapi.com", url: "https://tumblr-api.p.rapidapi.com/post", method: "POST", rateLimit: 5000, type: "exclusive" },
  pinterest: { name: "Pinterest", icon: "📌", host: "pinterest-api.p.rapidapi.com", url: "https://pinterest-api.p.rapidapi.com/pins", method: "POST", rateLimit: 100, type: "exclusive" },
  telegram: { name: "Telegram", icon: "✈️", host: "telegram-bot-api.p.rapidapi.com", url: "https://telegram-bot-api.p.rapidapi.com/sendMessage", method: "POST", rateLimit: 10000, type: "exclusive" },
  discord: { name: "Discord", icon: "💬", host: "discord-webhook-api.p.rapidapi.com", url: "https://discord-webhook-api.p.rapidapi.com/webhooks", method: "POST", rateLimit: 10000, type: "exclusive" },
  whatsapp: { name: "WhatsApp Business", icon: "📱", host: "whatsapp-business-api.p.rapidapi.com", url: "https://whatsapp-business-api.p.rapidapi.com/messages", method: "POST", rateLimit: 1000, type: "exclusive" },
  medium: { name: "Medium", icon: "📰", host: "medium-api.p.rapidapi.com", url: "https://medium-api.p.rapidapi.com/posts", method: "POST", rateLimit: 500, type: "exclusive" },
  snapchat: { name: "Snapchat", icon: "👻", host: "snapchat-api.p.rapidapi.com", url: "https://snapchat-api.p.rapidapi.com/stories", method: "POST", rateLimit: 100, type: "exclusive" },
  twitch: { name: "Twitch", icon: "🎮", host: "twitch-api.p.rapidapi.com", url: "https://twitch-api.p.rapidapi.com/channels", method: "PUT", rateLimit: 500, type: "exclusive" },
  spotify: { name: "Spotify", icon: "🎵", host: "spotify-api.p.rapidapi.com", url: "https://spotify-api.p.rapidapi.com/playlists", method: "POST", rateLimit: 1000, type: "exclusive" },
  substack: { name: "Substack", icon: "📬", host: "substack-api.p.rapidapi.com", url: "https://substack-api.p.rapidapi.com/newsletters", method: "POST", rateLimit: 200, type: "exclusive" },
};

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════
export const getRapidAPIStatus = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const connections = await ctx.db.query("rapidapi_connections").collect();
    const logs = await ctx.db.query("rapidapi_post_logs").order("desc").take(50);
    const failures = await ctx.db.query("composio_failure_logs").order("desc").take(50);

    const fallbackCount = logs.filter((l) => l.fallbackTriggered).length;
    const fallbackSuccess = logs.filter((l) => l.fallbackTriggered && l.status === "success").length;

    return {
      platforms: Object.entries(RAPIDAPI_PLATFORMS).map(([id, cfg]) => {
        const conn = connections.find((c) => c.platformId === id);
        return {
          id, name: cfg.name, icon: cfg.icon, type: cfg.type,
          rateLimit: cfg.rateLimit, isActive: conn?.isActive ?? false,
          usageCount: conn?.usageCount ?? 0, errorCount: conn?.errorCount ?? 0,
          lastUsed: conn?.lastUsed,
        };
      }),
      stats: {
        totalPlatforms: Object.keys(RAPIDAPI_PLATFORMS).length,
        composioFallback: Object.values(RAPIDAPI_PLATFORMS).filter((p) => p.type === "composio_fallback").length,
        exclusive: Object.values(RAPIDAPI_PLATFORMS).filter((p) => p.type === "exclusive").length,
        fallbackTriggered: fallbackCount,
        fallbackSuccessRate: fallbackCount > 0 ? Math.round((fallbackSuccess / fallbackCount) * 100) : 0,
      },
      recentLogs: logs,
      recentFailures: failures,
    };
  },
});

export const getSupportedPlatforms = query({
  args: {},
  handler: async () => {
    return Object.entries(RAPIDAPI_PLATFORMS).map(([id, cfg]) => ({
      id, name: cfg.name, icon: cfg.icon, type: cfg.type, rateLimit: cfg.rateLimit,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS (internal)
// ═══════════════════════════════════════════════════════════════
export const upsertConnection = internalMutation({
  args: { platformId: v.string(), platformName: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("rapidapi_connections")
      .withIndex("by_platform", (q) => q.eq("platformId", args.platformId)).first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
    } else {
      await ctx.db.insert("rapidapi_connections", {
        platformId: args.platformId, platformName: args.platformName,
        isActive: true, usageCount: 0, errorCount: 0, createdAt: now, updatedAt: now,
      });
    }
  },
});

export const logPost = internalMutation({
  args: {
    platformId: v.string(), content: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("rate_limited")),
    errorMessage: v.optional(v.string()), responseData: v.optional(v.any()),
    fallbackTriggered: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rapidapi_post_logs", {
      ...args, createdAt: Date.now(),
    });
    // Update connection stats
    const conn = await ctx.db.query("rapidapi_connections")
      .withIndex("by_platform", (q) => q.eq("platformId", args.platformId)).first();
    if (conn) {
      await ctx.db.patch(conn._id, {
        usageCount: conn.usageCount + 1,
        errorCount: args.status === "failed" ? conn.errorCount + 1 : conn.errorCount,
        lastUsed: Date.now(), updatedAt: Date.now(),
      });
    }
  },
});

export const logComposioFailure = internalMutation({
  args: {
    platformId: v.string(), errorMessage: v.string(),
    errorCode: v.optional(v.string()), fallbackUsed: v.boolean(), fallbackSuccess: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("composio_failure_logs", {
      ...args, createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════

function buildPayload(platformId: string, content: string, mediaUrls: string[]): any {
  const payloads: Record<string, any> = {
    x: { text: content.substring(0, 280) },
    facebook: { message: content },
    instagram: { caption: content, image_url: mediaUrls[0] },
    tumblr: { type: "text", body: content, title: content.substring(0, 100) },
    pinterest: { title: content.substring(0, 100), description: content, image_url: mediaUrls[0] },
    telegram: { chat_id: process.env.TELEGRAM_CHAT_ID || "", text: content },
    discord: { content },
    whatsapp: { to: process.env.WHATSAPP_NUMBER || "", text: { body: content } },
    medium: { title: content.substring(0, 100), content, contentFormat: "html" },
    snapchat: { caption: content, media_url: mediaUrls[0] },
    twitch: { title: content.substring(0, 140) },
    spotify: { name: content.substring(0, 100), description: content },
    substack: { title: content.substring(0, 100), body: content },
  };
  return payloads[platformId] || { text: content };
}

/** Post via RapidAPI directly */
export const postViaRapidAPI = action({
  args: {
    platform: v.string(), content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; postId?: string; error?: string }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Not authenticated" };

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return { success: false, error: "RAPIDAPI_KEY not configured in Convex env" };

    const cfg = RAPIDAPI_PLATFORMS[args.platform];
    if (!cfg) return { success: false, error: `Platform ${args.platform} not supported by RapidAPI` };

    try {
      const payload = buildPayload(args.platform, args.content, args.mediaUrls || []);
      const res = await fetch(cfg.url, {
        method: cfg.method,
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": cfg.host,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId: args.platform, content: args.content.substring(0, 500),
          status: "rate_limited", errorMessage: "Rate limit exceeded",
          fallbackTriggered: false,
        });
        return { success: false, error: "Rate limit exceeded. Upgrade RapidAPI plan or wait." };
      }

      if (!res.ok) {
        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId: args.platform, content: args.content.substring(0, 500),
          status: "failed", errorMessage: data.message || `HTTP ${res.status}`,
          responseData: data, fallbackTriggered: false,
        });
        return { success: false, error: data.message || `RapidAPI ${res.status}` };
      }

      await ctx.runMutation(internal.rapidapi.logPost, {
        platformId: args.platform, content: args.content.substring(0, 500),
        status: "success", responseData: data, fallbackTriggered: false,
      });
      await ctx.runMutation(internal.rapidapi.upsertConnection, {
        platformId: args.platform, platformName: cfg.name,
      });

      return { success: true, postId: data.id || data.post_id || "rapidapi_post" };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  },
});

/** Post with Composio-first fallback to RapidAPI */
export const postWithFallback = action({
  args: {
    platform: v.string(), content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; postId?: string; error?: string; provider: string }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Not authenticated", provider: "none" };

    const rapidCfg = RAPIDAPI_PLATFORMS[args.platform];
    const isComposioFallback = rapidCfg?.type === "composio_fallback";

    // If this platform has a Composio fallback config, try Composio first via social engine
    if (isComposioFallback) {
      try {
        const { postToPlatform } = await import("./social");
        const result = await (postToPlatform as any)({
          args: { platform: args.platform, content: args.content, mediaUrls: args.mediaUrls, adminToken: args.adminToken },
          ctx,
        });
        if (result?.success) {
          return { ...result, provider: "composio" };
        }
        // Composio failed — log it and fall through to RapidAPI
        await ctx.runMutation(internal.rapidapi.logComposioFailure, {
          platformId: args.platform, errorMessage: result?.error || "Composio post failed",
          fallbackUsed: true, fallbackSuccess: false,
        });
      } catch (e: any) {
        await ctx.runMutation(internal.rapidapi.logComposioFailure, {
          platformId: args.platform, errorMessage: e?.message || "Composio error",
          fallbackUsed: true, fallbackSuccess: false,
        });
      }
    }

    // RapidAPI fallback (or direct for exclusive platforms)
    if (!rapidCfg) {
      return { success: false, error: `Platform ${args.platform} not supported by RapidAPI fallback`, provider: "none" };
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return { success: false, error: "RAPIDAPI_KEY not configured", provider: "none" };

    try {
      const payload = buildPayload(args.platform, args.content, args.mediaUrls || []);
      const res = await fetch(rapidCfg.url, {
        method: rapidCfg.method,
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": rapidCfg.host,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId: args.platform, content: args.content.substring(0, 500),
          status: "rate_limited", errorMessage: "Rate limit exceeded",
          fallbackTriggered: isComposioFallback,
        });
        return { success: false, error: "Rate limit exceeded", provider: "rapidapi" };
      }

      if (!res.ok) {
        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId: args.platform, content: args.content.substring(0, 500),
          status: "failed", errorMessage: data.message || `HTTP ${res.status}`,
          responseData: data, fallbackTriggered: isComposioFallback,
        });
        return { success: false, error: data.message || `RapidAPI ${res.status}`, provider: "rapidapi" };
      }

      await ctx.runMutation(internal.rapidapi.logPost, {
        platformId: args.platform, content: args.content.substring(0, 500),
        status: "success", responseData: data, fallbackTriggered: isComposioFallback,
      });
      await ctx.runMutation(internal.rapidapi.upsertConnection, {
        platformId: args.platform, platformName: rapidCfg.name,
      });

      // Update composio failure log if fallback succeeded
      if (isComposioFallback) {
        const recentFailure = await ctx.runQuery(internal.rapidapi._getRecentFailure, { platformId: args.platform });
        if (recentFailure) {
          await ctx.db.patch(recentFailure, { fallbackSuccess: true });
        }
      }

      return { success: true, postId: data.id || data.post_id || "rapidapi_post", provider: "rapidapi" };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error), provider: "rapidapi" };
    }
  },
});

/** Test a RapidAPI connection */
export const testConnection = action({
  args: { platform: v.string(), adminToken: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { success: false, message: "Not authenticated" };

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return { success: false, message: "RAPIDAPI_KEY not configured" };

    const cfg = RAPIDAPI_PLATFORMS[args.platform];
    if (!cfg) return { success: false, message: `Platform ${args.platform} not supported` };

    try {
      const testContent = `Test post from Prosuite NG+ — ${new Date().toISOString()}`;
      const result = await ctx.action.postViaRapidAPI({
        platform: args.platform, content: testContent, adminToken: args.adminToken,
      });
      return { success: result.success, message: result.success ? `Test post succeeded via RapidAPI` : result.error || "Test failed" };
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  },
});

// Internal query for updating composio failure logs
export const _getRecentFailure = internalQuery({
  args: { platformId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("composio_failure_logs")
      .withIndex("by_platform", (q) => q.eq("platformId", args.platformId))
      .order("desc").first();
  },
});
