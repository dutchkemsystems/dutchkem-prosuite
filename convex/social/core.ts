import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "../auth_helpers";
import { PLATFORM_CONFIGS } from "./platform_configs";

export const generateOAuthUrl = action({
  args: {
    platform: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };
      if (!config.authUrl) {
        return {
          success: false,
          error: `${config.name} uses ${args.platform === "telegram" ? "bot token" : "AT Protocol"} — connect via settings instead`,
        };
      }

      const state = uuidV4();
      let codeVerifier = "";
      let codeChallenge = "";

      if (config.usesCodeVerifier) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = generateCodeChallenge(codeVerifier);
      }

      // FIX: Only store codeVerifier when it's actually set
      await ctx.runMutation(internal.social.storeOAuthState, {
        state,
        platform: args.platform,
        adminId: identity._id,
        ...(codeVerifier ? { codeVerifier } : {}),
      });

      const clientId = getPlatformClientId(args.platform);
      const redirectUri = getRedirectUri(args.platform);
      const scopes = config.scopes.join(" ");

      if (!clientId) {
        const trypostUrl = process.env.TRYPOST_URL;
        if (trypostUrl && TRYPOST_PLATFORMS[args.platform]) {
          return { success: false, error: `TRYPST:${args.platform}`, authUrl: `${trypostUrl}/connect/${args.platform}` };
        }
        return { success: false, error: `${config.name} client ID not configured. Set ${args.platform.toUpperCase()}_CLIENT_ID (or APP_ID/CLIENT_KEY) in Convex env vars, or configure TRYPOST_URL for TryPost OAuth.` };
      }

      let authUrl = "";
      switch (args.platform) {
        case "x":
          authUrl = `${config.authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
          break;
        case "linkedin":
          authUrl = `${config.authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
          break;
        case "facebook":
        case "instagram":
          authUrl = `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`;
          break;
        case "tiktok":
          authUrl = `${config.authUrl}?client_key=${clientId}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
          break;
        case "youtube":
          authUrl = `${config.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline&state=${state}`;
          break;
        case "pinterest":
          authUrl = `${config.authUrl}?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
          break;
        case "reddit":
          authUrl = `${config.authUrl}?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&duration=permanent`;
          break;
        case "threads":
          authUrl = `${config.authUrl}?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
          break;
        case "discord":
          authUrl = `${config.authUrl}?client_id=${clientId}&scope=${config.scopes.join("+")}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
          break;
        default:
          return { success: false, error: `OAuth not implemented for ${args.platform}` };
      }

      return { success: true, authUrl, state };
    } catch (error: any) {
      return { success: false, error: `OAuth URL generation failed: ${error?.message || String(error)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Handle OAuth Callback (token exchange)
// ═══════════════════════════════════════════════════════════════════
export const handleOAuthCallback = action({
  args: { platform: v.string(), code: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const { platform, code, state } = args;
    const config = PLATFORM_CONFIGS[platform];
    if (!config) return { success: false, error: `Unknown platform: ${platform}` };

    const storedState = await ctx.runQuery(internal.social.getOAuthState, { state });
    if (!storedState) return { success: false, error: "Invalid or expired OAuth state" };

    const clientId = getPlatformClientId(platform);
    const clientSecret = getPlatformClientSecret(platform);
    const redirectUri = getRedirectUri(platform);

    try {
      const tokenData = await exchangeCodeForToken(
        platform, code, clientId, clientSecret, redirectUri, storedState.codeVerifier
      );
      if (!tokenData.access_token) return { success: false, error: "No access token returned" };

      const userInfo = await fetchUserInfo(platform, tokenData.access_token);

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: storedState.adminId,
        platform,
        platformName: config.name,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        platformUserId: userInfo.id || "",
        platformUsername: userInfo.username || userInfo.name || "",
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
        scopes: config.scopes.join(","),
        anonymousByDefault: config.anonymousSupported,
        // FIX: no integrationId here — schema doesn't include it in handleOAuthCallback path
      });

      await ctx.runMutation(internal.social.deleteOAuthState, { stateId: storedState._id });
      return { success: true, platformName: config.name, username: userInfo.username || userInfo.name };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Save platform connection
// FIX: Added integrationId as an optional arg so Composio callback doesn't crash
// ═══════════════════════════════════════════════════════════════════
export const savePlatformConnection = internalMutation({
  args: {
    adminId: v.string(),
    platform: v.string(),
    platformName: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.optional(v.string()),
    anonymousByDefault: v.optional(v.boolean()),
    // FIX: was missing — handleComposioCallback passes this field
    integrationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", args.adminId).eq("platformId", args.platform)
      )
      .first();

    const patch = {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken || "",
      platformUserId: args.platformUserId || "",
      platformUsername: args.platformUsername || "",
      isConnected: true,
      expiresAt: args.expiresAt,
      scopes: args.scopes || "",
      anonymousByDefault: args.anonymousByDefault || false,
      updatedAt: Date.now(),
      integrationId: args.integrationId || "",
    };

    if (existing) {
      await ctx.db.patch("platform_connections", existing._id, patch);
    } else {
      await ctx.db.insert("platform_connections", {
        adminId: args.adminId,
        platformId: args.platform,
        platformName: args.platformName,
        ...patch,
        autoPostEnabled: true,
        connectedAt: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Post to platform directly
// ═══════════════════════════════════════════════════════════════════
export async function postToPlatformHandler(ctx: any, args: any): Promise<any> {
  const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
  
  // Try to find the connection with the authenticated admin, then fall back
  let adminId = identity?._id || "system";
  let connection = await ctx.runQuery(internal.social.getConnectionForPlatform, {
    platform: args.platform,
    adminId,
  });
  
  // Final fallback: try system
  if (!connection || !connection.isConnected) {
    connection = await ctx.runQuery(internal.social.getConnectionForPlatform, {
      platform: args.platform,
      adminId: "system",
    });
  }
  
  if (!connection || !connection.isConnected) throw new Error("Platform not connected");

  const config = PLATFORM_CONFIGS[args.platform];
  if (!config) throw new Error(`Unknown platform: ${args.platform}`);

  let result = await postToPlatformApi(
    args.platform, connection.accessToken, args.content, args.mediaUrls, args.anonymous
  );

  const startedAt = Date.now();

  // ═══ RAPIDAPI FALLBACK ═══ If primary posting fails, try RapidAPI
  if (!result.success && process.env.RAPIDAPI_KEY) {
    const { RAPIDAPI_PLATFORMS } = await import("../rapidapi");
    const rapidCfg = RAPIDAPI_PLATFORMS[args.platform];
    if (rapidCfg) {
      try {
        const fallbackResult = await postViaRapidAPIFallback(
          ctx, args.platform, args.content, args.mediaUrls || []
        );
        if (fallbackResult.success) {
          result = { success: true, postId: fallbackResult.postId };
          await ctx.runMutation(internal.rapidapi.logComposioFailure, {
            platformId: args.platform, errorMessage: result.error || "Primary posting failed",
            fallbackUsed: true, fallbackSuccess: true,
          });
        } else {
          await ctx.runMutation(internal.rapidapi.logComposioFailure, {
            platformId: args.platform, errorMessage: result.error || "Primary posting failed",
            fallbackUsed: true, fallbackSuccess: false,
          });
        }
      } catch (_) { /* fallback also failed — keep original result */ }
    }
  }

  await ctx.runMutation(internal.social.logPost, {
    platformId: args.platform,
    content: args.content,
    success: result.success,
    externalId: result.postId || "",
    errorMsg: result.error || "",
    anonymous: args.anonymous || false,
  });

  // INTEGRATION: also record in composio_action_logs so Composio Hub
  // shows the same log stream as the Social Engine
  await ctx.runMutation(internal.composioHub.recordActionLog, {
    platform: args.platform,
    action: "post",
    status: result.success ? "success" : "failed",
    agentId: args.anonymous ? "anonymous" : "admin",
    content: args.content,
    durationMs: Date.now() - startedAt,
    error: result.error,
    metadata: { source: result.error ? "rapidapi_fallback" : "social_engine", externalId: result.postId || "" },
  });

  return result;
}

export const postToPlatform = action({
  args: {
    platform: v.string(),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    anonymous: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await postToPlatformHandler(ctx, args);
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Get connected platforms
// ═══════════════════════════════════════════════════════════════════
export const getConnectedPlatforms = action({
  args: {
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    // First try with auth, fall back to showing all connections
    let adminId = "system";
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (identity) adminId = identity._id;
    } catch (_) {}
    
    let dbPlatforms: any = await ctx.runQuery(internal.social.getPlatformsFromDb, { adminId });
    
    // If no connections found for this admin, try system
    const connectedCount = dbPlatforms.filter((p: any) => p.isConnected).length;
    if (connectedCount === 0) {
      dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb, { adminId: "system" });
    }
    
    return {
      platforms: dbPlatforms,
      availablePlatforms: SUPPORTED_PLATFORMS.map((p: any) => ({
        id: p.id, name: p.name, icon: p.icon, color: p.color,
        anonymousSupported: p.anonymousSupported,
      })),
    };
  },
});

// Diagnostic: check all platform connections without auth
export const diagnosticGetAllConnections = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const connections = await ctx.db.query("platform_connections").collect();
    return {
      total: connections.length,
      connected: connections.filter((c: any) => c.isConnected).length,
      platforms: connections.map((c: any) => ({
        platformId: c.platformId,
        isConnected: c.isConnected,
        adminId: c.adminId,
        integrationId: c.integrationId,
        connectedAt: c.connectedAt,
      })),
    };
  },
});

export const manualPost = action({
  args: {
    platform: v.string(),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    anonymous: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    return await postToPlatformHandler(ctx, args);
  },
});

export const getPlatformsFromDb = internalQuery({
  // FIX: accepts adminId so it filters correctly per user
  // FIX: returns BOTH `id` AND `platformId` so UI merge code matches by `id`
  args: { adminId: v.string() },
  handler: async (ctx, { adminId }) => {
    const connected = await ctx.db
      .query("platform_connections")
      .collect();
    // Count posts per platform from social_posts table
    const allPosts = await ctx.db.query("social_posts").collect();
    return SUPPORTED_PLATFORMS.map((p) => {
      const conn = connected.find(
        (c) => c.platformId === p.id && c.isConnected && c.adminId === adminId
      );
      const platformPosts = allPosts.filter(
        (post) => post.platform === p.id || post.platform === p.name
      );
      return {
        id: p.id, platformId: p.id, platformName: p.name, icon: p.icon, color: p.color,
        isConnected: conn?.isConnected || false, connectedAt: conn?.connectedAt,
        lastSyncAt: conn?.updatedAt, platformUsername: conn?.platformUsername,
        autoPostEnabled: conn?.autoPostEnabled || false,
        anonymousByDefault: conn?.anonymousByDefault || false,
        expiresAt: conn?.expiresAt, scopes: conn?.scopes,
        integrationId: conn?.integrationId,
        // Derived stats for UI
        postsCount: platformPosts.filter((post) => post.status === "posted").length,
        followersCount: conn?.followersCount || 0,
      };
    });
  },
});

// FIX: now accepts adminId parameter instead of hardcoding "system"
export const getConnectionForPlatform = internalQuery({
  args: { platform: v.string(), adminId: v.string() },
  handler: async (ctx, { platform, adminId }) => {
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", adminId).eq("platformId", platform)
      )
      .first();
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Disconnect platform
// INTEGRATION: also disables composio_settings for the platform so the
// Composio Hub reflects the same state.
// ═══════════════════════════════════════════════════════════════════
export const disconnectPlatform = mutation({
  args: {
    platformId: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");
    const conn = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", identity._id).eq("platformId", args.platformId)
      )
      .first();
    if (conn) {
      await ctx.db.patch("platform_connections", conn._id, {
        isConnected: false, accessToken: "", refreshToken: "", updatedAt: Date.now(),
      });
    }
    // Sync to composio_settings — disable and mark as paused
    await ctx.runMutation(internal.composioHub.syncPlatformFromSocial, {
      adminId: identity._id,
      platform: args.platformId,
      isConnected: false,
      enabled: false,
      postingMode: "paused",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Disconnect all platforms at once
// ═══════════════════════════════════════════════════════════════════
export const disconnectAllPlatforms = mutation({
  args: {
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");
    const conns = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", identity._id))
      .collect();
    for (const conn of conns) {
      if (conn.isConnected) {
        await ctx.db.patch(conn._id, {
          isConnected: false, accessToken: "", refreshToken: "", updatedAt: Date.now(),
        });
        await ctx.runMutation(internal.composioHub.syncPlatformFromSocial, {
          adminId: identity._id,
          platform: conn.platformId,
          isConnected: false,
          enabled: false,
          postingMode: "paused",
        });
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Update posting settings
// INTEGRATION: also updates composio_settings.postingMode
// ═══════════════════════════════════════════════════════════════════
export const updatePostingSettings = mutation({
  args: {
    platformId: v.string(),
    mode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")),
    anonymous: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        // FIX: was hardcoded to "system"
        q.eq("adminId", identity._id).eq("platformId", args.platformId)
      )
      .first();
    if (!doc) throw new Error("Platform not connected");
    await ctx.db.patch("platform_connections", doc._id, {
      autoPostEnabled: args.mode === "auto",
      anonymousByDefault: args.anonymous || false,
      updatedAt: Date.now(),
    });
    // Sync to composio_settings so Composio Hub shows the same mode
    await ctx.runMutation(internal.composioHub.syncPlatformFromSocial, {
      adminId: identity._id,
      platform: args.platformId,
      postingMode: args.mode,
      enabled: true,
    });
    return { success: true, mode: args.mode };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Log post
// ═══════════════════════════════════════════════════════════════════
export const logPost = internalMutation({
  args: {
    platformId: v.string(), content: v.string(), success: v.boolean(),
    externalId: v.string(), errorMsg: v.string(), anonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      agentId: args.anonymous ? "anonymous" : "admin",
      platform: args.platformId,
      content: args.content,
      status: args.success ? "posted" : "failed",
      scheduledFor: Date.now(),
      postedAt: args.success ? Date.now() : undefined,
      externalId: args.externalId,
      error: args.success ? undefined : args.errorMsg,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES: Stats & Analytics
// ═══════════════════════════════════════════════════════════════════
export const getSocialStats = query({
  args: {},
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

export const getPlatformAnalytics = query({
  args: {},
  handler: async (ctx) => {
    try {
      const leads = await ctx.db.query("leads").collect();
      const transactions = await ctx.db.query("marketplace_transactions").collect();
      const platformStats = SUPPORTED_PLATFORMS.map((p) => {
        const platformLeads = leads.filter(
          (l) => l.source === p.id || l.source === p.name.toLowerCase()
        );
        return {
          platform: p.id, name: p.name, icon: p.icon,
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
    } catch {
      return { platforms: [], totalLeads: 0, totalUsers: 0, totalRevenue: 0 };
    }
  },
});

export const getOAuthStatus = query({
  args: {},
  handler: async () => {
    return SUPPORTED_PLATFORMS.map((p) => ({
      id: p.id, name: p.name, icon: p.icon, color: p.color,
      anonymousSupported: p.anonymousSupported,
      hasOAuth: !!p.authUrl,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO OAUTH (v3.1)
// ═══════════════════════════════════════════════════════════════════
const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

async function composioFetch(apiKey: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Composio ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function getOrCreateAuthConfigId(apiKey: string, toolkit: string): Promise<string> {
  // Cross-check: for "x" try both "x" and "twitter"; for "twitter" try both
  const toolkitVariants = toolkit === "x" || toolkit === "twitter"
    ? ["x", "twitter"]
    : [toolkit];

  for (const slug of toolkitVariants) {
    const list: any = await composioFetch(
      apiKey,
      `/auth_configs?toolkit_slug=${encodeURIComponent(slug)}&is_composio_managed=true&limit=5`
    );
    const listItems = list?.items || list?.data?.items || [];
    // Filter to only auth configs whose toolkit actually matches the requested slug
    // (Composio may return configs for other toolkits in the same query)
    const matching = listItems.filter((item: any) => {
      const itemSlug = item?.toolkit?.slug || item?.toolkit_slug || "";
      return itemSlug === slug;
    });
    if (matching.length > 0) {
      return (matching[0].id || matching[0].auth_config?.id) as string;
    }
  }

  // No existing auth config found — create one with the primary slug
  const primarySlug = toolkitVariants[0];
  const created: any = await composioFetch(apiKey, "/auth_configs", {
    method: "POST",
    body: JSON.stringify({ toolkit: { slug: primarySlug }, type: "use_composio_managed_auth" }),
  });
  const newId = created?.auth_config?.id || created?.id;
  if (newId) return newId as string;

  // If primary slug failed, try alternate
  if (toolkitVariants.length > 1) {
    const createdAlt: any = await composioFetch(apiKey, "/auth_configs", {
      method: "POST",
      body: JSON.stringify({ toolkit: { slug: toolkitVariants[1] }, type: "use_composio_managed_auth" }),
    });
    const altId = createdAlt?.auth_config?.id || createdAlt?.id;
    if (altId) return altId as string;
    throw new Error(
      `Composio: failed to create auth config for ${toolkitVariants.join("/")} — response: ${JSON.stringify(created).slice(0, 200)}`
    );
  }
  throw new Error(
    `Composio: failed to create auth config for ${toolkit} — response: ${JSON.stringify(created).slice(0, 200)}`
  );
}