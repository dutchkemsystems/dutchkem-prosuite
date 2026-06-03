// convex/social.ts
// ⚠️ CRITICAL: This uses `action` (not mutation) because it makes HTTP calls to Postiz API

import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ============================================================
// CONSTANTS
// ============================================================
export const SUPPORTED_PLATFORMS = [
  { id: "x", name: "X (Twitter)", icon: "🐦", color: "#1DA1F2" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2" },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877F2" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#E4405F" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000" },
  { id: "youtube", name: "YouTube", icon: "🎬", color: "#FF0000" },
  { id: "pinterest", name: "Pinterest", icon: "📌", color: "#E60023" },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "#FF4500" },
  { id: "threads", name: "Threads", icon: "🧵", color: "#000000" },
  { id: "telegram", name: "Telegram", icon: "📱", color: "#0088CC" },
  { id: "discord", name: "Discord", icon: "🎮", color: "#5865F2" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", color: "#0085FF" },
] as const;

function getPlatformName(platformId: string): string {
  const names: Record<string, string> = {
    x: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook",
    instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
    pinterest: "Pinterest", reddit: "Reddit", threads: "Threads",
    telegram: "Telegram", discord: "Discord", bluesky: "Bluesky",
  };
  return names[platformId] || platformId;
}

// ============================================================
// ✅ ACTION: Generate OAuth URL (HTTP request to Postiz)
// ============================================================
export const generateOAuthUrl = action({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    console.log(`[generateOAuthUrl] Called for platform: ${args.platform}`);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { platform } = args;
    const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
    const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
    const APP_URL = process.env.APP_URL || "https://yourdomain.com";

    const response = await fetch(`${POSTIZ_API_URL}/oauth/initiate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${POSTIZ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform, redirect_uri: `${APP_URL}/api/postiz/callback/${platform}` }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Postiz API error: ${response.status}`, errorText);
      return { success: false, error: `Postiz API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`[generateOAuthUrl] Got auth URL for ${platform}`);

    await ctx.runAction(internal.social.storeOAuthStateInternal, {
      state: data.state, platform, adminId: identity.subject,
    });

    return { success: true, authUrl: data.auth_url, platform };
  },
});

// ============================================================
// INTERNAL: Store OAuth State (action → mutation bridge)
// ============================================================
export const storeOAuthStateInternal = internalAction({
  args: { state: v.string(), platform: v.string(), adminId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.social.storeOAuthStateMutation, {
      state: args.state, platform: args.platform, adminId: args.adminId,
    });
  },
});

// ============================================================
// INTERNAL MUTATION: Write OAuth state to database
// ============================================================
export const storeOAuthStateMutation = internalMutation({
  args: { state: v.string(), platform: v.string(), adminId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauth_states", {
      state: args.state, platform: args.platform, adminId: args.adminId,
      expiresAt: Date.now() + 10 * 60 * 1000, createdAt: Date.now(),
    });
    console.log(`[storeOAuthStateMutation] Stored state for ${args.platform}`);
  },
});

// ============================================================
// INTERNAL QUERY: Get OAuth state (used by http.ts callback)
// ============================================================
export const getOAuthStateInternal = internalQuery({
  args: { state: v.string(), platform: v.string() },
  handler: async (ctx, args) => {
    const states = await ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .collect();
    const validState = states.find(
      (s) => s.platform === args.platform && s.expiresAt > Date.now()
    );
    return validState || null;
  },
});

// ============================================================
// ✅ ACTION: Handle OAuth Callback (HTTP request to Postiz)
// ============================================================
export const handleOAuthCallback = action({
  args: { platform: v.string(), code: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    console.log(`[handleOAuthCallback] Called for platform: ${args.platform}`);
    const { platform, code, state } = args;

    const storedState = await ctx.runQuery(internal.social.getOAuthStateInternal, { state, platform });
    if (!storedState) {
      console.error(`[handleOAuthCallback] Invalid state for ${platform}`);
      return { success: false, error: "Invalid or expired OAuth state" };
    }

    const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
    const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
    const APP_URL = process.env.APP_URL;

    const tokenResponse = await fetch(`${POSTIZ_API_URL}/oauth/token`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${POSTIZ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform, code, redirect_uri: `${APP_URL}/api/postiz/callback/${platform}` }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token exchange failed: ${tokenResponse.status}`, errorText);
      return { success: false, error: `Token exchange failed: ${tokenResponse.status}` };
    }

    const tokenData = await tokenResponse.json();
    console.log(`[handleOAuthCallback] Got token for ${platform}`);

    const connectResponse = await fetch(`${POSTIZ_API_URL}/platforms/connect`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${POSTIZ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform, access_token: tokenData.access_token, integration_id: tokenData.integration_id }),
    });
    const connectData = connectResponse.ok ? await connectResponse.json().catch(() => ({})) : {};

    await ctx.runMutation(internal.social.saveConnectionMutation, {
      adminId: storedState.adminId, platformId: platform, platformName: getPlatformName(platform),
      integrationId: connectData.integration_id || tokenData.integration_id, accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token, platformUserId: tokenData.platform_user_id, platformUsername: tokenData.platform_username,
    });

    await ctx.runMutation(internal.social.deleteOAuthStateMutation, { stateId: storedState._id });

    console.log(`[handleOAuthCallback] Successfully connected ${platform}`);
    return { success: true, platformName: getPlatformName(platform) };
  },
});

// ============================================================
// INTERNAL MUTATION: Save connection to database
// ============================================================
export const saveConnectionMutation = internalMutation({
  args: {
    adminId: v.string(), platformId: v.string(), platformName: v.string(),
    integrationId: v.string(), accessToken: v.string(), refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()), platformUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", args.adminId).eq("platformId", args.platformId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        integrationId: args.integrationId, accessToken: args.accessToken, refreshToken: args.refreshToken,
        platformUserId: args.platformUserId, platformUsername: args.platformUsername, isConnected: true, updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platform_connections", {
        adminId: args.adminId, platformId: args.platformId, platformName: args.platformName,
        integrationId: args.integrationId, accessToken: args.accessToken, refreshToken: args.refreshToken,
        platformUserId: args.platformUserId, platformUsername: args.platformUsername,
        isConnected: true, autoPostEnabled: true, connectedAt: Date.now(), updatedAt: Date.now(),
      });
    }
    console.log(`[saveConnectionMutation] Saved connection for ${args.platformId}`);
  },
});

// ============================================================
// INTERNAL MUTATION: Delete OAuth state
// ============================================================
export const deleteOAuthStateMutation = internalMutation({
  args: { stateId: v.id("oauth_states") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.stateId);
    console.log(`[deleteOAuthStateMutation] Deleted state`);
  },
});

// ============================================================
// ✅ QUERY: Get all connections
// ============================================================
export const getConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", identity.subject))
      .collect();
  },
});

// ============================================================
// ✅ MUTATION: Disconnect platform
// ============================================================
export const disconnectPlatform = mutation({
  args: { platformId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const connection = await ctx.db.query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", identity.subject).eq("platformId", args.platformId))
      .first();
    if (connection) {
      await ctx.db.patch(connection._id, { isConnected: false, updatedAt: Date.now() });
    }
  },
});

// ============================================================
// DASHBOARD: Get connected platforms (action — merges DB + Postiz)
// ============================================================
export const getConnectedPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
      const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
      const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
      let postizIntegrations: any[] = [];
      if (POSTIZ_API_KEY) {
        try {
          const res = await fetch(`${POSTIZ_API_URL}/integrations`, {
            method: "GET", headers: { Authorization: POSTIZ_API_KEY, "Content-Type": "application/json" },
          });
          if (res.ok) { const d = await res.json(); postizIntegrations = Array.isArray(d) ? d : d.connections || []; }
        } catch (_) {}
      }
      const merged = dbPlatforms.map((p: any) => {
        const postiz = postizIntegrations.find((i: any) => i.identifier === p.platformId || i.id === p.integrationId);
        return { ...p, id: p.platformId, isConnected: p.isConnected || !!postiz, username: p.platformUsername || postiz?.profile || postiz?.name, integrationId: p.integrationId || postiz?.id, profilePicture: postiz?.picture };
      });
      return { platforms: merged, availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, color: p.color })), isConnected: true };
    } catch (error: any) {
      return { platforms: [], availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, color: p.color })), isConnected: false, error: error.message };
    }
  },
});

export const getPlatformsFromDb = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const connected = await ctx.db.query("platform_connections").collect();
    return SUPPORTED_PLATFORMS.map((p) => {
      const conn = connected.find((c) => c.platformId === p.id && c.isConnected);
      return { platformId: p.id, platformName: p.name, icon: p.icon, color: p.color, isConnected: conn?.isConnected || false, connectedAt: conn?.connectedAt, lastSyncAt: conn?.updatedAt, integrationId: conn?.integrationId, platformUsername: conn?.platformUsername, autoPostEnabled: conn?.autoPostEnabled || false };
    });
  },
});

// ============================================================
// DASHBOARD: Manual post (action — uses fetch)
// ============================================================
export const manualPost = action({
  args: { platformId: v.string(), content: v.string(), mediaUrls: v.optional(v.array(v.string())) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.social.getConnectionForPlatform, { platform: args.platformId });
    if (!connection || !connection.isConnected) throw new Error("Platform not connected");
    const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
    const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
    let externalId = `manual_${Date.now()}`;
    let success = false;
    let errorMsg = "";
    if (!connection.integrationId) { errorMsg = "No Postiz integration ID. Reconnect."; }
    else if (!POSTIZ_API_KEY) { errorMsg = "Postiz API key not configured"; }
    else {
      try {
        const response = await fetch(`${POSTIZ_API_URL}/posts`, {
          method: "POST", headers: { Authorization: POSTIZ_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "now", date: new Date().toISOString(), shortLink: false, tags: [], posts: [{ integration: { id: connection.integrationId }, value: [{ content: args.content, image: (args.mediaUrls || []).map((url) => ({ url })) }], settings: { __type: args.platformId } }] }),
        });
        if (response.ok) { const d = await response.json(); externalId = d.id || externalId; success = true; }
        else { errorMsg = await response.text(); }
      } catch (err: any) { errorMsg = err.message; }
    }
    await ctx.runMutation(internal.social.logPost, { platformId: args.platformId, content: args.content, success, externalId, errorMsg });
    return { success, message: success ? "Posted successfully" : errorMsg || "Post failed" };
  },
});

export const getConnectionForPlatform = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    return await ctx.db.query("platform_connections").withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", platform)).first();
  },
});

export const logPost = internalMutation({
  args: { platformId: v.string(), content: v.string(), success: v.boolean(), externalId: v.string(), errorMsg: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", { agentId: "manual", platform: args.platformId, content: args.content, status: args.success ? "posted" : "failed", scheduledFor: Date.now(), postedAt: args.success ? Date.now() : undefined, externalId: args.externalId, error: args.success ? undefined : args.errorMsg || "Post failed" });
  },
});

// ============================================================
// DASHBOARD: Update posting settings (mutation — no fetch)
// ============================================================
export const updatePostingSettings = mutation({
  args: { platformId: v.string(), mode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")), scheduleTime: v.optional(v.string()), postingFrequency: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.query("platform_connections").withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", args.platformId)).first();
    if (!doc) throw new Error("Platform not connected");
    await ctx.db.patch(doc._id, { autoPostEnabled: args.mode === "auto", updatedAt: Date.now() });
    return { success: true, mode: args.mode };
  },
});

// ============================================================
// DASHBOARD: Analytics & stats (queries — no fetch)
// ============================================================
export const getPlatformAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const leads = await ctx.db.query("leads").collect();
      const transactions = await ctx.db.query("marketplace_transactions").collect();
      const platformStats = SUPPORTED_PLATFORMS.map((p) => {
        const platformLeads = leads.filter((l) => l.source === p.id || l.source === p.name.toLowerCase());
        return { platform: p.id, name: p.name, icon: p.icon, leads: platformLeads.length, registrations: platformLeads.filter((l) => l.status === "converted").length, conversions: platformLeads.filter((l) => l.status === "converted").length, revenue: 0 };
      });
      platformStats.sort((a, b) => b.leads - a.leads);
      return { platforms: platformStats, totalLeads: leads.length, totalUsers: leads.length, totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0) };
    } catch (error) { return { platforms: [], totalLeads: 0, totalUsers: 0, totalRevenue: 0 }; }
  },
});

export const getSocialStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_posts").take(100);
    return { total: posts.length, posted: posts.filter((p) => p.status === "posted").length, failed: posts.filter((p) => p.status === "failed").length, scheduled: posts.filter((p) => p.status === "scheduled").length, history: posts.slice(-20).reverse() };
  },
});

// ============================================================
// DASHBOARD: OAuth status (query — no fetch)
// ============================================================
export const getOAuthStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const hasPostiz = !!(process.env.POSTIZ_API_KEY && process.env.POSTIZ_CLIENT_ID && process.env.POSTIZ_CLIENT_SECRET);
    return SUPPORTED_PLATFORMS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, hasCredentials: hasPostiz }));
  },
});
