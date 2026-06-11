// convex/rapidapi.ts
// RapidAPI Fallback — Backup posting when Composio fails + additional platforms

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════
// PLATFORM CONFIGS — RapidAPI endpoints for each platform
// ═══════════════════════════════════════════════════════════════
// RapidAPI platforms — ONLY exclusive platforms not covered by Composio or social.ts direct APIs
// Platforms x, facebook, instagram, linkedin, youtube, reddit, discord are already handled by social.ts via Composio
// Telegram and WhatsApp use direct APIs in social.ts (no RapidAPI subscription needed)
export const RAPIDAPI_PLATFORMS: Record<string, {
  name: string; icon: string; host: string; url: string; method: string;
  rateLimit: number; type: "exclusive"; postingSupport: "full" | "read_only" | "webhook";
  notes?: string;
}> = {
  // === RAPIDAPI EXCLUSIVE — POSTING SUPPORTED (need marketplace subscription) ===
  pinterest: { name: "Pinterest", icon: "📌", host: "pinterest-api1.p.rapidapi.com", url: "https://pinterest-api1.p.rapidapi.com/pins", method: "POST", rateLimit: 100, type: "exclusive", postingSupport: "full" },
  medium: { name: "Medium", icon: "📰", host: "medium2.p.rapidapi.com", url: "https://medium2.p.rapidapi.com/posts", method: "POST", rateLimit: 500, type: "exclusive", postingSupport: "full" },
  twitch: { name: "Twitch", icon: "🎮", host: "twitch-api7.p.rapidapi.com", url: "https://twitch-api7.p.rapidapi.com/channels", method: "PUT", rateLimit: 500, type: "exclusive", postingSupport: "full" },
  // === RAPIDAPI EXCLUSIVE — READ-ONLY / LIMITED (posting via direct API needed) ===
  tumblr: { name: "Tumblr", icon: "📝", host: "api.tumblr.com", url: "https://api.tumblr.com/v2/blog", method: "POST", rateLimit: 1000, type: "exclusive", postingSupport: "read_only", notes: "Use official Tumblr API with OAuth — no RapidAPI posting wrapper available" },
  spotify: { name: "Spotify", icon: "🎵", host: "spotify81.p.rapidapi.com", url: "https://spotify81.p.rapidapi.com", method: "GET", rateLimit: 1000, type: "exclusive", postingSupport: "read_only", notes: "Read-only data API — posting requires official Spotify Web API with OAuth" },
  substack: { name: "Substack", icon: "📬", host: "substack-live.rapidapi.com", url: "https://substack-live.rapidapi.com", method: "GET", rateLimit: 200, type: "exclusive", postingSupport: "read_only", notes: "Read-only scraper — posting requires direct Substack API (no public posting API exists)" },
  snapchat: { name: "Snapchat", icon: "👻", host: "snapchat-stories.p.rapidapi.com", url: "https://snapchat-stories.p.rapidapi.com/stories", method: "POST", rateLimit: 100, type: "exclusive", postingSupport: "webhook", notes: "Stories API only — use official Snapchat Marketing API for full posting" },
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
          postingSupport: cfg.postingSupport, notes: cfg.notes,
          rateLimit: cfg.rateLimit, isActive: conn?.isActive ?? false,
          usageCount: conn?.usageCount ?? 0, errorCount: conn?.errorCount ?? 0,
          lastUsed: conn?.lastUsed,
        };
      }),
      stats: {
        totalPlatforms: Object.keys(RAPIDAPI_PLATFORMS).length,
        postingSupported: Object.values(RAPIDAPI_PLATFORMS).filter((p) => p.postingSupport === "full").length,
        readOnly: Object.values(RAPIDAPI_PLATFORMS).filter((p) => p.postingSupport === "read_only").length,
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
      const payload = buildPayload(args.platform, testContent, []);

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
        return { success: false, message: "Rate limit exceeded — wait before retrying" };
      }

      if (res.status === 403) {
        return {
          success: false,
          message: `RapidAPI subscription required — subscribe to "${cfg.name}" on RapidAPI Marketplace (rapidapi.com/marketplace)`,
        };
      }

      if (!res.ok) {
        const msg = data.message || data.error || `HTTP ${res.status}: ${res.statusText}`;
        if (msg.toLowerCase().includes("not subscribed")) {
          return {
            success: false,
            message: `Not subscribed — go to RapidAPI Marketplace and subscribe to "${cfg.name}" endpoint first`,
          };
        }
        return { success: false, message: msg };
      }

      await ctx.runMutation(internal.rapidapi.logPost, {
        platformId: args.platform, content: testContent.substring(0, 500),
        status: "success", responseData: data, fallbackTriggered: false,
      });
      await ctx.runMutation(internal.rapidapi.upsertConnection, {
        platformId: args.platform, platformName: cfg.name,
      });

      return { success: true, message: `Test post succeeded via RapidAPI (${cfg.name})` };
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

// ═══════════════════════════════════════════════════════════════
// POSTING MODE CONFIG
// ═══════════════════════════════════════════════════════════════

export const getPostingConfig = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const modeDoc = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", "posting_mode")).first();
    const autoDoc = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_post_enabled")).first();
    const platformsDoc = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_post_platforms")).first();

    return {
      postingMode: modeDoc?.value || "both",           // "composio" | "rapidapi" | "both"
      autoPostEnabled: autoDoc?.value ?? true,
      autoPostPlatforms: platformsDoc?.value || ["x", "facebook", "instagram", "linkedin", "reddit", "youtube"],
    };
  },
});

export const setPostingConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", args.key)).first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("posting_config", {
        key: args.key, value: args.value, updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// AUTOMATED POSTING — Posts to all enabled platforms via chosen provider
// ═══════════════════════════════════════════════════════════════

export const postToAllPlatforms = action({
  args: {
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ results: Array<{ platform: string; success: boolean; provider: string; error?: string }> }> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const modeDoc = await ctx.runQuery(internal.rapidapi._getConfig, { key: "posting_mode" });
    const postingMode = modeDoc?.value || "both";

    const targetPlatforms = args.platforms || ["x", "facebook", "instagram", "linkedin", "reddit", "youtube"];
    const results: Array<{ platform: string; success: boolean; provider: string; error?: string }> = [];

    for (const platform of targetPlatforms) {
      try {
        if (postingMode === "rapidapi") {
          // RapidAPI only
          const res = await ctx.action.postViaRapidAPI({
            platform, content: args.content, mediaUrls: args.mediaUrls, adminToken: args.adminToken,
          });
          results.push({ platform, success: res.success, provider: "rapidapi", error: res.error });
        } else if (postingMode === "composio") {
          // Composio only (via social engine)
          try {
            const { postToPlatform } = await import("./social");
            const res = await (postToPlatform as any)({
              args: { platform, content: args.content, mediaUrls: args.mediaUrls, adminToken: args.adminToken },
              ctx,
            });
            results.push({ platform, success: res?.success ?? false, provider: "composio", error: res?.error });
          } catch (e: any) {
            results.push({ platform, success: false, provider: "composio", error: e?.message || "Composio failed" });
          }
        } else {
          // BOTH — try Composio first, fall back to RapidAPI
          let success = false;
          let provider = "none";
          let error = "";

          // Try Composio first
          try {
            const { postToPlatform } = await import("./social");
            const res = await (postToPlatform as any)({
              args: { platform, content: args.content, mediaUrls: args.mediaUrls, adminToken: args.adminToken },
              ctx,
            });
            if (res?.success) {
              success = true;
              provider = "composio";
            } else {
              error = res?.error || "Composio failed";
            }
          } catch (e: any) {
            error = e?.message || "Composio failed";
          }

          // Fallback to RapidAPI
          if (!success) {
            const rapidCfg = RAPIDAPI_PLATFORMS[platform];
            if (rapidCfg && process.env.RAPIDAPI_KEY) {
              try {
                const res = await ctx.action.postViaRapidAPI({
                  platform, content: args.content, mediaUrls: args.mediaUrls, adminToken: args.adminToken,
                });
                if (res.success) {
                  success = true;
                  provider = "rapidapi";
                } else {
                  error = res.error || "RapidAPI also failed";
                }
              } catch (e: any) {
                error = e?.message || "RapidAPI failed";
              }
            } else if (!rapidCfg) {
              error = error || "Platform not supported by RapidAPI";
            } else {
              error = error || "RAPIDAPI_KEY not configured";
            }
          }

          results.push({ platform, success, provider, error: error || undefined });
        }
      } catch (e: any) {
        results.push({ platform, success: false, provider: "error", error: e?.message || String(e) });
      }
    }

    return { results };
  },
});

// Internal helpers
export const _getConfig = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", args.key)).first();
  },
});

export const _getAutoPostPlatforms = internalQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_post_platforms")).first();
    return doc?.value || ["x", "facebook", "instagram", "linkedin", "reddit", "youtube"];
  },
});

export const _isAutoPostEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("posting_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_post_enabled")).first();
    return doc?.value ?? true;
  },
});

// ═══════════════════════════════════════════════════════════════
// CRON TICK — Auto-posts content via RapidAPI
// ═══════════════════════════════════════════════════════════════
export const _autoPostTick = internalAction({
  args: {},
  handler: async (ctx) => {
    const autoEnabled = await ctx.runQuery(internal.rapidapi._isAutoPostEnabled);
    if (!autoEnabled) return { skipped: true, reason: "auto_post_disabled" };

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return { skipped: true, reason: "no_rapidapi_key" };

    const platforms = await ctx.runQuery(internal.rapidapi._getAutoPostPlatforms);
    const modeDoc = await ctx.runQuery(internal.rapidapi._getConfig, { key: "posting_mode" });
    const postingMode = modeDoc?.value || "both";

    // Generate automated content (daily tip / promotional)
    const tips = [
      "Grow your business with Dutchkem Ventures Prosuite NG+ — your all-in-one autonomous business platform. #Prosuite #BusinessGrowth",
      "Automate your social media, payments, and agent workflows with Dutchkem Ventures. #Automation #DigitalTransformation",
      "Smart financial sweeps, tax compliance, and secure payments — all handled by Prosuite NG+. #FinTech #SmartBusiness",
      "15 AI agents working 24/7 for your business. That's the Prosuite advantage. #AI #AutonomousBusiness",
      "From social posting to secure payouts — Prosuite NG+ does it all. #Prosuite #AllInOne",
      "Enterprise-grade workflows without enterprise complexity. Try Prosuite NG+ today. #Enterprise #SaaS",
      "Dutchkem Ventures: Where innovation meets execution. #Innovation #Ventures",
      "Your business deserves autonomous intelligence. Prosuite NG+ delivers. #AutonomousIntelligence #BusinessAI",
    ];
    const content = tips[Math.floor(Math.random() * tips.length)];

    const results: string[] = [];

    for (const platformId of platforms) {
      const cfg = RAPIDAPI_PLATFORMS[platformId];
      if (!cfg) continue;

      try {
        const payload = buildPayload(platformId, content, []);
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
        const status = res.ok ? "success" : res.status === 429 ? "rate_limited" : "failed";

        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId, content: content.substring(0, 500),
          status: status as any,
          errorMessage: res.ok ? undefined : data.message || `HTTP ${res.status}`,
          responseData: data, fallbackTriggered: false,
        });

        if (res.ok) {
          await ctx.runMutation(internal.rapidapi.upsertConnection, {
            platformId, platformName: cfg.name,
          });
        }

        results.push(`${platformId}:${status}`);
      } catch (e: any) {
        await ctx.runMutation(internal.rapidapi.logPost, {
          platformId, content: content.substring(0, 500),
          status: "failed", errorMessage: e?.message || String(e),
          fallbackTriggered: false,
        });
        results.push(`${platformId}:error`);
      }
    }

    return { posted: results.length, results, postingMode };
  },
});
