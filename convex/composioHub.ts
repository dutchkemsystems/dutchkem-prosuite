import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO ADMIN HUB — Full control panel for admin dashboard
// ═══════════════════════════════════════════════════════════════════
// This module provides the backend for the ComposioHub admin tab:
//   - Platform status, connections, logs, stats
//   - Enable/disable toggles per platform and per agent
//   - Posting mode (auto/manual/paused) and schedule management
//   - Action log recording for the client activity feed
//
// CLIENT DASHBOARD: composioClient.ts provides view-only queries.
// Clients CANNOT call any mutation in this file.

const COMPOSIO_PLATFORMS = [
  { id: "twitter", name: "X (Twitter)", icon: "🐦", color: "#1DA1F2" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2" },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877F2" },
  { id: "youtube", name: "YouTube", icon: "📺", color: "#FF0000" },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "#FF4500" },
  { id: "discord", name: "Discord", icon: "💬", color: "#5865F2" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#E4405F" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000" },
  { id: "pinterest", name: "Pinterest", icon: "📌", color: "#BD081C" },
  { id: "threads", name: "Threads", icon: "🧵", color: "#000000" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", color: "#0085FF" },
  { id: "telegram", name: "Telegram", icon: "✈️", color: "#26A5E4" },
];

// ─── STATUS QUERIES ───

export const getComposioStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) {
      return {
        composioEnabled: false,
        totalPlatforms: 0,
        connectedPlatforms: 0,
        enabledPlatforms: 0,
        platforms: [],
        agents: [],
        authConfigsCount: 0,
        last24h: { total: 0, success: 0, failed: 0 },
        authError: true,
      };
    }

    // Check if Composio API key is set
    const composioEnabled = !!process.env.COMPOSIO_API_KEY;

    // Get platform settings
    const settings = await ctx.db.query("composio_settings").collect();
    const settingsMap = new Map(settings.map(s => [s.platform, s]));

    // Get connected platforms from platform_connections (admin-scoped)
    // FIX: filter by current admin's adminId, not all connections
    const connections = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", identity._id))
      .collect();

    // Get action logs for stats
    const oneDayAgo = Date.now() - 86400000;
    const recentLogs = await ctx.db.query("composio_action_logs")
      .withIndex("by_timestamp", q => q.gt("timestamp", oneDayAgo))
      .collect();

    // Get agent settings
    const agentSettings = await ctx.db.query("composio_agent_settings").collect();

    // Get auth configs
    const authConfigs = await ctx.db.query("composio_auth_configs").collect();

    const platforms = COMPOSIO_PLATFORMS.map(p => {
      const platformSettings = settingsMap.get(p.id);
      // FIX: show all active connections (Composio OR direct OAuth), not just Composio ones
      // Also handle the fact that social.ts uses `platformId` (not `platform`)
      const platformConnections = connections.filter(
        (c: any) => (c.platformId === p.id || c.platform === p.id) && c.isConnected
      );
      const platformLogs = recentLogs.filter(l => l.platform === p.id);
      const successCount = platformLogs.filter(l => l.status === "success").length;
      const failedCount = platformLogs.filter(l => l.status === "failed").length;

      return {
        ...p,
        enabled: platformSettings?.enabled ?? composioEnabled,
        postingMode: platformSettings?.postingMode ?? "paused",
        schedule: platformSettings?.schedule ?? "09:00,15:00,21:00",
        dailyPostLimit: platformSettings?.dailyPostLimit ?? 10,
        postsToday: platformSettings?.postsToday ?? 0,
        isConnected: platformConnections.length > 0,
        connectedCount: platformConnections.length,
        // FIX: track which integration connected the platform
        integrationProvider: platformConnections[0]?.integrationId || null,
        last24hSuccess: successCount,
        last24hFailed: failedCount,
        successRate: platformLogs.length > 0
          ? Math.round((successCount / platformLogs.length) * 100)
          : 0,
      };
    });

    // Agent composio status
    const agents = Array.from({ length: 15 }, (_, i) => {
      const agentId = `A${i + 1}`;
      const agentSetting = agentSettings.find(a => a.agentId === agentId);
      return {
        agentId,
        composioEnabled: agentSetting?.composioEnabled ?? false,
        enabledPlatforms: agentSetting?.enabledPlatforms ?? [],
      };
    });

    return {
      composioEnabled,
      totalPlatforms: COMPOSIO_PLATFORMS.length,
      connectedPlatforms: platforms.filter(p => p.isConnected).length,
      enabledPlatforms: platforms.filter(p => p.enabled).length,
      platforms,
      agents,
      authConfigsCount: authConfigs.length,
      last24h: {
        total: recentLogs.length,
        success: recentLogs.filter(l => l.status === "success").length,
        failed: recentLogs.filter(l => l.status === "failed").length,
      },
    };
  },
});

export const getComposioActionLogs = query({
  args: {
    adminToken: v.optional(v.string()),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, platform, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return [];

    const take = limit || 50;

    // FIX: also include `social_posts` so the logs view shows BOTH the
    // composio_action_logs stream AND the social_posts stream from
    // direct OAuth / social engine posts. The two are merged by timestamp.
    let composioLogs: any[] = [];
    if (platform) {
      composioLogs = await ctx.db.query("composio_action_logs")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .order("desc")
        .take(take);
    } else {
      composioLogs = await ctx.db.query("composio_action_logs")
        .withIndex("by_timestamp")
        .order("desc")
        .take(take);
    }

    // Merge with social_posts (admin-scoped via agentId="admin" or "anonymous")
    const socialPosts = await ctx.db.query("social_posts")
      .withIndex("by_status")
      .order("desc")
      .take(take);
    const socialLogs = socialPosts
      .filter((p: any) => !platform || p.platform === platform)
      .map((p: any) => ({
        _id: p._id,
        platform: p.platform,
        action: "post",
        status: p.status === "posted" ? "success" : p.status === "failed" ? "failed" : "pending",
        agentId: p.agentId,
        content: p.content,
        timestamp: p.postedAt || p.scheduledFor,
        durationMs: undefined,
        error: p.error,
        metadata: { source: "social_engine", externalId: p.externalId, anonymous: p.anonymous },
      }));

    const merged = [...composioLogs, ...socialLogs]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, take);

    return merged;
  },
});

export const getComposioStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) {
      return {
        overview: { totalActions: 0, successRate: 0, avgDuration: 0 },
        periods: { last24h: { total: 0, success: 0, failed: 0 }, last7d: { total: 0, success: 0, failed: 0 }, last30d: { total: 0, success: 0, failed: 0 } },
        byPlatform: {},
        byAgent: {},
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;
    const oneMonthAgo = now - 2592000000;

    // FIX: include social_posts in the stats — they share the same time periods
    const composioLogs = await ctx.db.query("composio_action_logs")
      .withIndex("by_timestamp", q => q.gt("timestamp", oneMonthAgo))
      .collect();
    const socialPosts = await ctx.db.query("social_posts").collect();

    // Normalize social_posts to the same shape as composio_action_logs
    const socialLogs = socialPosts.map((p: any) => ({
      platform: p.platform,
      status: p.status === "posted" ? "success" : p.status === "failed" ? "failed" : "pending",
      agentId: p.agentId,
      timestamp: p.postedAt || p.scheduledFor || 0,
      durationMs: undefined,
    }));

    const allLogs = [...composioLogs, ...socialLogs];
    const last24h = allLogs.filter(l => l.timestamp > oneDayAgo);
    const last7d = allLogs.filter(l => l.timestamp > oneWeekAgo);
    const last30d = allLogs;

    const byPlatform: Record<string, { success: number; failed: number; total: number }> = {};
    for (const log of allLogs) {
      if (!byPlatform[log.platform]) {
        byPlatform[log.platform] = { success: 0, failed: 0, total: 0 };
      }
      byPlatform[log.platform].total++;
      if (log.status === "success") byPlatform[log.platform].success++;
      if (log.status === "failed") byPlatform[log.platform].failed++;
    }

    const byAgent: Record<string, { success: number; failed: number; total: number }> = {};
    for (const log of allLogs) {
      if (!log.agentId) continue;
      if (!byAgent[log.agentId]) {
        byAgent[log.agentId] = { success: 0, failed: 0, total: 0 };
      }
      byAgent[log.agentId].total++;
      if (log.status === "success") byAgent[log.agentId].success++;
      if (log.status === "failed") byAgent[log.agentId].failed++;
    }

    return {
      overview: {
        totalActions: last30d.length,
        successRate: last30d.length > 0
          ? Math.round((last30d.filter(l => l.status === "success").length / last30d.length) * 100)
          : 0,
        avgDuration: last30d.length > 0
          ? Math.round(last30d.reduce((sum, l) => sum + (l.durationMs || 0), 0) / last30d.length)
          : 0,
      },
      periods: {
        last24h: {
          total: last24h.length,
          success: last24h.filter(l => l.status === "success").length,
          failed: last24h.filter(l => l.status === "failed").length,
        },
        last7d: {
          total: last7d.length,
          success: last7d.filter(l => l.status === "success").length,
          failed: last7d.filter(l => l.status === "failed").length,
        },
        last30d: {
          total: last30d.length,
          success: last30d.filter(l => l.status === "success").length,
          failed: last30d.filter(l => l.status === "failed").length,
        },
      },
      byPlatform,
      byAgent,
    };
  },
});

// ─── PLATFORM CONTROL MUTATIONS ───
//
// INTEGRATION: These mutations now also sync to `platform_connections` so the
// Social Engine panel reflects the same enable/mode state. The Social Engine
// mutations (`social.updatePostingSettings`, `social.disconnectPlatform`) also
// write back to `composio_settings` for the same reason. This keeps both UIs
// in sync and ensures cron / agent posting behavior is consistent.

async function syncPlatformConnection(
  ctx: any,
  args: { adminId: string; platform: string; postingMode: "auto" | "manual" | "paused"; enabled: boolean }
) {
  const conn = await ctx.db
    .query("platform_connections")
    .withIndex("by_admin_platform", (q: any) =>
      q.eq("adminId", args.adminId).eq("platformId", args.platform)
    )
    .first();
  if (!conn) return;
  await ctx.db.patch(conn._id, {
    autoPostEnabled: args.enabled && args.postingMode === "auto",
    updatedAt: Date.now(),
  });
}

export const togglePlatform = mutation({
  args: {
    adminToken: v.optional(v.string()),
    platform: v.string(),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { adminToken, platform, enabled }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    const existing = await ctx.db.query("composio_settings")
      .withIndex("by_platform", q => q.eq("platform", platform))
      .first();

    let postingMode: "auto" | "manual" | "paused" = existing?.postingMode ?? "paused";

    if (existing) {
      await ctx.db.patch(existing._id, { enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("composio_settings", {
        platform,
        enabled,
        postingMode,
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().split("T")[0],
        updatedAt: Date.now(),
      });
    }

    // Sync to platform_connections so Social Engine reflects the change
    await syncPlatformConnection(ctx, {
      adminId: identity._id,
      platform,
      postingMode,
      enabled,
    });
  },
});

export const setPlatformMode = mutation({
  args: {
    adminToken: v.optional(v.string()),
    platform: v.string(),
    postingMode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")),
  },
  returns: v.null(),
  handler: async (ctx, { adminToken, platform, postingMode }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    const existing = await ctx.db.query("composio_settings")
      .withIndex("by_platform", q => q.eq("platform", platform))
      .first();

    let enabled = existing?.enabled ?? true;

    if (existing) {
      await ctx.db.patch(existing._id, { postingMode, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("composio_settings", {
        platform,
        enabled,
        postingMode,
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().split("T")[0],
        updatedAt: Date.now(),
      });
    }

    // Sync to platform_connections so Social Engine reflects the change
    await syncPlatformConnection(ctx, {
      adminId: identity._id,
      platform,
      postingMode,
      enabled,
    });
  },
});

export const setPlatformSchedule = mutation({
  args: {
    adminToken: v.optional(v.string()),
    platform: v.string(),
    schedule: v.string(),
    dailyPostLimit: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { adminToken, platform, schedule, dailyPostLimit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    const existing = await ctx.db.query("composio_settings")
      .withIndex("by_platform", q => q.eq("platform", platform))
      .first();

    const patch: any = { schedule, updatedAt: Date.now() };
    if (dailyPostLimit !== undefined) patch.dailyPostLimit = dailyPostLimit;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("composio_settings", {
        platform,
        enabled: true,
        postingMode: "auto",
        schedule,
        dailyPostLimit: dailyPostLimit ?? 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().split("T")[0],
        updatedAt: Date.now(),
      });
    }
  },
});

// Internal mutation: sync composio_settings from Social Engine changes
// Called by social.updatePostingSettings and social.disconnectPlatform
export const syncPlatformFromSocial = internalMutation({
  args: {
    adminId: v.string(),
    platform: v.string(),
    postingMode: v.optional(v.union(v.literal("auto"), v.literal("manual"), v.literal("paused"))),
    enabled: v.optional(v.boolean()),
    isConnected: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { adminId, platform, postingMode, enabled, isConnected }) => {
    const existing = await ctx.db.query("composio_settings")
      .withIndex("by_platform", q => q.eq("platform", platform))
      .first();
    const patch: any = { updatedAt: Date.now() };
    if (postingMode !== undefined) patch.postingMode = postingMode;
    if (enabled !== undefined) patch.enabled = enabled;
    if (isConnected === false) patch.enabled = false;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("composio_settings", {
        platform,
        enabled: enabled ?? (isConnected !== false),
        postingMode: postingMode ?? "paused",
        dailyPostLimit: 10,
        postsToday: 0,
        lastResetDate: new Date().toISOString().split("T")[0],
        ...patch,
      });
    }
  },
});

// ─── AGENT CONTROL MUTATIONS ───

export const toggleAgentComposio = mutation({
  args: {
    adminToken: v.optional(v.string()),
    agentId: v.string(),
    composioEnabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { adminToken, agentId, composioEnabled }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    const existing = await ctx.db.query("composio_agent_settings")
      .withIndex("by_agent", q => q.eq("agentId", agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { composioEnabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("composio_agent_settings", {
        agentId,
        composioEnabled,
        enabledPlatforms: [],
        updatedAt: Date.now(),
      });
    }
  },
});

export const setAgentPlatforms = mutation({
  args: {
    adminToken: v.optional(v.string()),
    agentId: v.string(),
    enabledPlatforms: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { adminToken, agentId, enabledPlatforms }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    const existing = await ctx.db.query("composio_agent_settings")
      .withIndex("by_agent", q => q.eq("agentId", agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { enabledPlatforms, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("composio_agent_settings", {
        agentId,
        composioEnabled: true,
        enabledPlatforms,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── ACTION LOG RECORDING (used by agents in background + social engine) ───
//
// INTEGRATION: This is called by social.postToPlatformHandler so that posts
// from the Social Engine also appear in the Composio Hub logs.

export const recordActionLog = internalMutation({
  args: {
    platform: v.string(),
    action: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("pending")),
    agentId: v.optional(v.string()),
    clientId: v.optional(v.id("users")),
    content: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("composio_action_logs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ─── CLIENT NOTIFICATION PREFS (admin can view) ───

export const getClientNotificationPrefs = query({
  args: {
    adminToken: v.optional(v.string()),
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, userId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return null;

    return await ctx.db.query("composio_notification_prefs")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();
  },
});

export const getAllClientPrefs = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return [];

    return await ctx.db.query("composio_notification_prefs").collect();
  },
});

// ─── PLATFORM INFO ───

export const getPlatformInfo = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return COMPOSIO_PLATFORMS;
  },
});
