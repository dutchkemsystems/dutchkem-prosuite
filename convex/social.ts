import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const POSTIZ_API_URL = "https://api.postiz.com/public/v1";

function getPostizConfig() {
  return {
    apiKey: process.env.POSTIZ_API_KEY || "",
    clientId: process.env.POSTIZ_CLIENT_ID || "",
    clientSecret: process.env.POSTIZ_CLIENT_SECRET || "",
  };
}

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

// ═══════════════════════════════════════════════════════════════════
// 1. ACTION: Generate OAuth URL (Calls Postiz API)
// ═══════════════════════════════════════════════════════════════════
export const generateOAuthUrl = action({
  args: { platform: v.string(), redirectUri: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    try {
      const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
      if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const { apiKey } = getPostizConfig();
      if (!apiKey) {
        throw new Error("Postiz API key not configured");
      }

      const state = crypto.randomUUID();

      const response = await fetch(`${POSTIZ_API_URL}/social/${platform}`, {
        method: "GET",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Postiz API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No OAuth URL returned from Postiz");
      }

      await ctx.runMutation(internal.social.storeOAuthState, {
        state,
        platform,
        redirectUri,
      });

      return {
        success: true,
        authUrl: data.url,
        state,
        platform: platformConfig,
      };
    } catch (error) {
      console.error("generateOAuthUrl error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Backward-compatible alias
export const getOAuthUrl = generateOAuthUrl;

// ═══════════════════════════════════════════════════════════════════
// 2. INTERNAL MUTATION: Store OAuth State
// ═══════════════════════════════════════════════════════════════════
export const storeOAuthState = internalMutation({
  args: {
    state: v.string(),
    platform: v.string(),
    redirectUri: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("oauth_states", {
      state: args.state,
      platform: args.platform,
      redirectUri: args.redirectUri,
      adminId: "system",
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. ACTION: Handle OAuth Callback
// ═══════════════════════════════════════════════════════════════════
export const handleOAuthCallback = action({
  args: { platform: v.string(), code: v.string(), state: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    try {
      const storedState = await ctx.runQuery(internal.social.getOAuthState, {
        state,
        platform,
      });

      if (!storedState) {
        throw new Error("Invalid or expired OAuth state");
      }

      const { clientId, clientSecret } = getPostizConfig();
      if (!clientId || !clientSecret) {
        throw new Error("Postiz OAuth credentials not configured");
      }

      const tokenResponse = await fetch(`${POSTIZ_API_URL}/../oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Postiz token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error("No access token returned");
      }

      let integrationId = "";
      let username = "";
      try {
        const { apiKey } = getPostizConfig();
        const integrationsRes = await fetch(`${POSTIZ_API_URL}/integrations`, {
          method: "GET",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
        });
        if (integrationsRes.ok) {
          const integrations = await integrationsRes.json();
          const arr = Array.isArray(integrations) ? integrations : integrations.connections || [];
          const match = arr.find((i: any) => i.identifier === platform);
          if (match) {
            integrationId = match.id;
            username = match.profile || match.name || "";
          }
        }
      } catch (_) {}

      await ctx.runMutation(internal.social.saveConnection, {
        adminId: storedState.adminId,
        platformId: platform,
        platformName: getPlatformName(platform),
        integrationId,
        accessToken,
        refreshToken: tokenData.refresh_token || "",
        platformUserId: tokenData.platform_user_id || "",
        platformUsername: username || tokenData.platform_username || "",
      });

      await ctx.runMutation(internal.social.deleteOAuthState, {
        stateId: storedState._id,
      });

      return {
        success: true,
        platformName: getPlatformName(platform),
        username,
        integrationId,
        message: `Successfully connected to ${getPlatformName(platform)}`,
      };
    } catch (error) {
      console.error("handleOAuthCallback error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 4. INTERNAL QUERY: Get OAuth State
// ═══════════════════════════════════════════════════════════════════
export const getOAuthState = internalQuery({
  args: { state: v.string(), platform: v.string() },
  returns: v.any(),
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

// Public query for HTTP callback
export const validateOAuthState = query({
  args: { state: v.string() },
  returns: v.any(),
  handler: async (ctx, { state }) => {
    const doc = await ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!doc) return { valid: false, error: "Invalid or expired OAuth state" };
    if (doc.expiresAt > Date.now()) {
      return { valid: true, stateId: doc._id, platform: doc.platform, adminId: doc.adminId };
    }
    await ctx.db.delete(doc._id);
    return { valid: false, error: "OAuth state expired" };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. INTERNAL MUTATION: Save Connection
// ═══════════════════════════════════════════════════════════════════
export const saveConnection = internalMutation({
  args: {
    adminId: v.string(),
    platformId: v.string(),
    platformName: v.string(),
    integrationId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", args.adminId).eq("platformId", args.platformId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        integrationId: args.integrationId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        platformUserId: args.platformUserId,
        platformUsername: args.platformUsername,
        isConnected: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platform_connections", {
        adminId: args.adminId,
        platformId: args.platformId,
        platformName: args.platformName,
        integrationId: args.integrationId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        platformUserId: args.platformUserId,
        platformUsername: args.platformUsername,
        isConnected: true,
        autoPostEnabled: true,
        connectedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Public mutation for HTTP callback
export const saveOAuthCallbackConnection = mutation({
  args: {
    platform: v.string(),
    stateId: v.id("oauth_states"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    integrationId: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { platform, stateId, accessToken, refreshToken, integrationId, username }) => {
    await ctx.db.delete(stateId);

    const adminId = "system";
    const existing = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", adminId).eq("platformId", platform)
      )
      .first();

    const platformName = getPlatformName(platform);
    if (existing) {
      await ctx.db.patch(existing._id, {
        integrationId: integrationId || "",
        accessToken,
        refreshToken: refreshToken || "",
        platformUsername: username || "",
        isConnected: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platform_connections", {
        adminId,
        platformId: platform,
        platformName,
        integrationId: integrationId || "",
        accessToken,
        refreshToken: refreshToken || "",
        platformUsername: username || "",
        isConnected: true,
        autoPostEnabled: true,
        connectedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, platformName, username, integrationId, message: `${platformName} connected` };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 6. INTERNAL MUTATION: Delete OAuth State
// ═══════════════════════════════════════════════════════════════════
export const deleteOAuthState = internalMutation({
  args: { stateId: v.id("oauth_states") },
  returns: v.null(),
  handler: async (ctx, { stateId }) => {
    await ctx.db.delete(stateId);
  },
});

// ═══════════════════════════════════════════════════════════════════
// 7. ACTION: Get Connected Platforms
// ═══════════════════════════════════════════════════════════════════
export const getConnectedPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
      const { apiKey } = getPostizConfig();
      let postizIntegrations: any[] = [];
      if (apiKey) {
        try {
          const res = await fetch(`${POSTIZ_API_URL}/integrations`, {
            method: "GET",
            headers: { Authorization: apiKey, "Content-Type": "application/json" },
          });
          if (res.ok) {
            const d = await res.json();
            postizIntegrations = Array.isArray(d) ? d : d.connections || [];
          }
        } catch (_) {}
      }
      const merged = dbPlatforms.map((p: any) => {
        const postiz = postizIntegrations.find(
          (i: any) => i.identifier === p.platformId || i.id === p.integrationId
        );
        return {
          ...p,
          id: p.platformId,
          isConnected: p.isConnected || !!postiz,
          username: p.platformUsername || postiz?.profile || postiz?.name,
          integrationId: p.integrationId || postiz?.id,
          profilePicture: postiz?.picture,
        };
      });
      return {
        platforms: merged,
        availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({
          id: p.id, name: p.name, icon: p.icon, color: p.color,
        })),
        isConnected: true,
      };
    } catch (error: any) {
      return {
        platforms: [],
        availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({
          id: p.id, name: p.name, icon: p.icon, color: p.color,
        })),
        isConnected: false,
        error: error.message,
      };
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
      return {
        platformId: p.id,
        platformName: p.name,
        icon: p.icon,
        color: p.color,
        isConnected: conn?.isConnected || false,
        connectedAt: conn?.connectedAt,
        lastSyncAt: conn?.updatedAt,
        integrationId: conn?.integrationId,
        platformUsername: conn?.platformUsername,
        autoPostEnabled: conn?.autoPostEnabled || false,
      };
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 8. QUERY: Get All Connections
// ═══════════════════════════════════════════════════════════════════
export const getConnections = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const connections = await ctx.db.query("platform_connections").collect();
    return connections.map((c) => ({
      ...c,
      platformName: getPlatformName(c.platformId),
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// 9. ACTION: Disconnect Platform
// ═══════════════════════════════════════════════════════════════════
export const disconnectPlatform = action({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    const connection = await ctx.runQuery(internal.social.getConnectionForPlatform, { platform });
    if (connection?.integrationId) {
      const { apiKey } = getPostizConfig();
      if (apiKey) {
        try {
          await fetch(`${POSTIZ_API_URL}/integrations/${connection.integrationId}`, {
            method: "DELETE",
            headers: { Authorization: apiKey, "Content-Type": "application/json" },
          });
        } catch (_) {}
      }
    }
    await ctx.runMutation(internal.social.clearConnection, { platform });
    return { success: true };
  },
});

export const getConnectionForPlatform = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", "system").eq("platformId", platform)
      )
      .first();
  },
});

export const clearConnection = internalMutation({
  args: { platform: v.string() },
  returns: v.null(),
  handler: async (ctx, { platform }) => {
    const doc = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", "system").eq("platformId", platform)
      )
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, {
        isConnected: false,
        accessToken: "",
        refreshToken: undefined,
        platformUserId: undefined,
        platformUsername: undefined,
        integrationId: undefined,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 10. ACTION: Disconnect All Platforms
// ═══════════════════════════════════════════════════════════════════
export const disconnectAllPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const platforms = await ctx.runQuery(internal.social.getAllConnected);
    const { apiKey } = getPostizConfig();
    let disconnected = 0;
    for (const p of platforms) {
      if (p.isConnected && p.integrationId && apiKey) {
        try {
          await fetch(`${POSTIZ_API_URL}/integrations/${p.integrationId}`, {
            method: "DELETE",
            headers: { Authorization: apiKey, "Content-Type": "application/json" },
          });
        } catch (_) {}
      }
      if (p.isConnected) {
        await ctx.runMutation(internal.social.clearConnection, { platform: p.platformId });
        disconnected++;
      }
    }
    return { success: true, disconnected };
  },
});

export const getAllConnected = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections").collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// 11. MUTATION: Update Posting Settings
// ═══════════════════════════════════════════════════════════════════
export const updatePostingSettings = mutation({
  args: {
    platformId: v.string(),
    mode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")),
    scheduleTime: v.optional(v.string()),
    postingFrequency: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", "system").eq("platformId", args.platformId)
      )
      .first();
    if (!doc) throw new Error("Platform not connected");
    await ctx.db.patch(doc._id, { autoPostEnabled: args.mode === "auto", updatedAt: Date.now() });
    return { success: true, mode: args.mode };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 12. ACTION: Manual Post
// ═══════════════════════════════════════════════════════════════════
export const manualPost = action({
  args: {
    platformId: v.string(),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.social.getConnectionForPlatform, { platform: args.platformId });
    if (!connection || !connection.isConnected) throw new Error("Platform not connected");

    const { apiKey } = getPostizConfig();
    let externalId = `manual_${Date.now()}`;
    let success = false;
    let errorMsg = "";

    if (!connection.integrationId) {
      errorMsg = "No Postiz integration ID. Reconnect.";
    } else if (!apiKey) {
      errorMsg = "Postiz API key not configured";
    } else {
      try {
        const response = await fetch(`${POSTIZ_API_URL}/posts`, {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "now",
            date: new Date().toISOString(),
            shortLink: false,
            tags: [],
            posts: [{
              integration: { id: connection.integrationId },
              value: [{ content: args.content, image: (args.mediaUrls || []).map((url) => ({ url })) }],
              settings: { __type: args.platformId },
            }],
          }),
        });
        if (response.ok) {
          const d = await response.json();
          externalId = d.id || externalId;
          success = true;
        } else {
          errorMsg = await response.text();
        }
      } catch (err: any) {
        errorMsg = err.message;
      }
    }

    await ctx.runMutation(internal.social.logPost, {
      platformId: args.platformId,
      content: args.content,
      success,
      externalId,
      errorMsg,
    });

    return { success, message: success ? "Posted successfully" : errorMsg || "Post failed" };
  },
});

export const logPost = internalMutation({
  args: {
    platformId: v.string(),
    content: v.string(),
    success: v.boolean(),
    externalId: v.string(),
    errorMsg: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      agentId: "manual",
      platform: args.platformId,
      content: args.content,
      status: args.success ? "posted" : "failed",
      scheduledFor: Date.now(),
      postedAt: args.success ? Date.now() : undefined,
      externalId: args.externalId,
      error: args.success ? undefined : args.errorMsg || "Post failed",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 13. QUERIES: Analytics & Stats
// ═══════════════════════════════════════════════════════════════════
export const getPlatformAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const leads = await ctx.db.query("leads").collect();
      const transactions = await ctx.db.query("marketplace_transactions").collect();
      const platformStats = SUPPORTED_PLATFORMS.map((p) => {
        const platformLeads = leads.filter(
          (l) => l.source === p.id || l.source === p.name.toLowerCase()
        );
        return {
          platform: p.id,
          name: p.name,
          icon: p.icon,
          leads: platformLeads.length,
          registrations: platformLeads.filter((l) => l.status === "converted").length,
          conversions: platformLeads.filter((l) => l.status === "converted").length,
          revenue: 0,
        };
      });
      platformStats.sort((a, b) => b.leads - a.leads);
      return {
        platforms: platformStats,
        totalLeads: leads.length,
        totalUsers: leads.length,
        totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      };
    } catch (error) {
      return { platforms: [], totalLeads: 0, totalUsers: 0, totalRevenue: 0 };
    }
  },
});

export const getSocialStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_posts").take(100);
    return {
      total: posts.length,
      posted: posts.filter((p) => p.status === "posted").length,
      failed: posts.filter((p) => p.status === "failed").length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
      history: posts.slice(-20).reverse(),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 14. QUERY: OAuth Status
// ═══════════════════════════════════════════════════════════════════
export const getOAuthStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const { apiKey, clientId, clientSecret } = getPostizConfig();
    const hasPostiz = !!(apiKey && clientId && clientSecret);
    return SUPPORTED_PLATFORMS.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      hasCredentials: hasPostiz,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════════
function getPlatformName(platformId: string): string {
  const names: Record<string, string> = {
    x: "X (Twitter)",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    reddit: "Reddit",
    threads: "Threads",
    telegram: "Telegram",
    discord: "Discord",
    bluesky: "Bluesky",
  };
  return names[platformId] || platformId;
}
