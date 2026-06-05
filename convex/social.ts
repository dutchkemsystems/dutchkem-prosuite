// convex/social.ts
// Direct OAuth + API integration for 12 social media platforms

import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════
export const PLATFORM_CONFIGS: Record<string, {
  name: string; icon: string; color: string;
  authUrl: string; tokenUrl: string; apiUrl: string;
  scopes: string[]; anonymousSupported: boolean;
  usesCodeVerifier: boolean;
}> = {
  x: {
    name: "X (Twitter)", icon: "🐦", color: "#1DA1F2",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    apiUrl: "https://api.twitter.com/2",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    anonymousSupported: true, usesCodeVerifier: true,
  },
  linkedin: {
    name: "LinkedIn", icon: "💼", color: "#0A66C2",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    apiUrl: "https://api.linkedin.com/v2",
    scopes: ["w_member_social", "r_liteprofile", "r_emailaddress"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  facebook: {
    name: "Facebook", icon: "📘", color: "#1877F2",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    apiUrl: "https://graph.facebook.com/v19.0",
    scopes: ["pages_manage_posts", "pages_read_engagement", "public_profile"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  instagram: {
    name: "Instagram", icon: "📸", color: "#E4405F",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    apiUrl: "https://graph.facebook.com/v19.0",
    scopes: ["pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  tiktok: {
    name: "TikTok", icon: "🎵", color: "#000000",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    apiUrl: "https://open.tiktokapis.com/v2",
    scopes: ["user.info.basic", "video.publish"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  youtube: {
    name: "YouTube", icon: "🎬", color: "#FF0000",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    apiUrl: "https://www.googleapis.com/youtube/v3",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  pinterest: {
    name: "Pinterest", icon: "📌", color: "#E60023",
    authUrl: "https://pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    apiUrl: "https://api.pinterest.com/v5",
    scopes: ["pins:read", "pins:write", "boards:read"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  reddit: {
    name: "Reddit", icon: "🤖", color: "#FF4500",
    authUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    apiUrl: "https://oauth.reddit.com",
    scopes: ["submit", "read", "identity"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  threads: {
    name: "Threads", icon: "🧵", color: "#000000",
    authUrl: "https://www.threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/v1.0/access_token",
    apiUrl: "https://graph.threads.net/v1.0",
    scopes: ["threads_basic", "threads_content_publish"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  telegram: {
    name: "Telegram", icon: "📱", color: "#0088CC",
    authUrl: "", tokenUrl: "", apiUrl: "https://api.telegram.org",
    scopes: [], anonymousSupported: false, usesCodeVerifier: false,
  },
  discord: {
    name: "Discord", icon: "🎮", color: "#5865F2",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    apiUrl: "https://discord.com/api/v10",
    scopes: ["identify", "email", "guilds", "webhook.incoming"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  bluesky: {
    name: "Bluesky", icon: "🦋", color: "#0085FF",
    authUrl: "", tokenUrl: "", apiUrl: "https://bsky.social/xrpc",
    scopes: [], anonymousSupported: true, usesCodeVerifier: false,
  },
};

export const SUPPORTED_PLATFORMS = Object.entries(PLATFORM_CONFIGS).map(([id, config]) => ({
  id, ...config,
}));

export const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
  x: "twitter",
  linkedin: "linkedin",
  facebook: "facebook",
  youtube: "youtube",
  reddit: "reddit",
  discord: "discord",
  instagram: undefined,
  tiktok: undefined,
  pinterest: undefined,
  threads: undefined,
  bluesky: undefined,
  telegram: undefined,
};

// ═══════════════════════════════════════════════════════════════════
// OAUTH STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export const storeOAuthState = internalMutation({
  args: {
    state: v.string(), platform: v.string(), adminId: v.string(),
    codeVerifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauth_states", {
      state: args.state, platform: args.platform, adminId: args.adminId,
      codeVerifier: args.codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000, createdAt: Date.now(),
    });
  },
});

export const getOAuthState = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const doc = await ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!doc) return null;
    if (doc.expiresAt <= Date.now()) return null;
    return doc;
  },
});

export const deleteOAuthState = internalMutation({
  args: { stateId: v.id("oauth_states") },
  handler: async (ctx, { stateId }) => { await ctx.db.delete(stateId); },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Generate OAuth URL for any platform
// ═══════════════════════════════════════════════════════════════════
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
      await ctx.db.patch(existing._id, patch);
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
  if (!identity) throw new Error("Not authenticated");

  // FIX: was hardcoded to "system" — now uses actual user identity
  const connection = await ctx.runQuery(internal.social.getConnectionForPlatform, {
    platform: args.platform,
    adminId: identity._id,
  });
  if (!connection || !connection.isConnected) throw new Error("Platform not connected");

  const config = PLATFORM_CONFIGS[args.platform];
  if (!config) throw new Error(`Unknown platform: ${args.platform}`);

  const result = await postToPlatformApi(
    args.platform, connection.accessToken, args.content, args.mediaUrls, args.anonymous
  );

  await ctx.runMutation(internal.social.logPost, {
    platformId: args.platform,
    content: args.content,
    success: result.success,
    externalId: result.postId || "",
    errorMsg: result.error || "",
    anonymous: args.anonymous || false,
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
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    const adminId = identity?._id || "system";
    const dbPlatforms: any = await ctx.runQuery(internal.social.getPlatformsFromDb, { adminId });
    return {
      platforms: dbPlatforms,
      availablePlatforms: SUPPORTED_PLATFORMS.map((p: any) => ({
        id: p.id, name: p.name, icon: p.icon, color: p.color,
        anonymousSupported: p.anonymousSupported,
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
  args: { adminId: v.string() },
  handler: async (ctx, { adminId }) => {
    const connected = await ctx.db
      .query("platform_connections")
      .collect();
    return SUPPORTED_PLATFORMS.map((p) => {
      const conn = connected.find(
        (c) => c.platformId === p.id && c.isConnected && c.adminId === adminId
      );
      return {
        platformId: p.id, platformName: p.name, icon: p.icon, color: p.color,
        isConnected: conn?.isConnected || false, connectedAt: conn?.connectedAt,
        lastSyncAt: conn?.updatedAt, platformUsername: conn?.platformUsername,
        autoPostEnabled: conn?.autoPostEnabled || false,
        anonymousByDefault: conn?.anonymousByDefault || false,
        expiresAt: conn?.expiresAt, scopes: conn?.scopes,
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
      await ctx.db.patch(conn._id, {
        isConnected: false, accessToken: "", refreshToken: "", updatedAt: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Update posting settings
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
    await ctx.db.patch(doc._id, {
      autoPostEnabled: args.mode === "auto",
      anonymousByDefault: args.anonymous || false,
      updatedAt: Date.now(),
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
  const list: any = await composioFetch(
    apiKey,
    `/auth_configs?toolkit_slug=${encodeURIComponent(toolkit)}&is_composio_managed=true&limit=1`
  );
  const listItems = list?.items || list?.data?.items || [];
  if (listItems.length > 0) {
    return (listItems[0].id || listItems[0].auth_config?.id) as string;
  }
  const created: any = await composioFetch(apiKey, "/auth_configs", {
    method: "POST",
    body: JSON.stringify({ toolkit: { slug: toolkit }, type: "use_composio_managed_auth" }),
  });
  const newId = created?.auth_config?.id || created?.id;
  if (!newId) {
    throw new Error(
      `Composio: failed to create auth config for ${toolkit} — response: ${JSON.stringify(created).slice(0, 200)}`
    );
  }
  return newId as string;
}

export const startComposioOAuth = action({
  args: {
    platform: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; redirectUrl?: string; connectionId?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) {
        return { success: false, error: "COMPOSIO_API_KEY not configured — set it in Convex dashboard env vars" };
      }

      const composioApp = COMPOSIO_APP_MAP[args.platform];
      if (!composioApp) {
        return { success: false, error: `${config.name} does not support Composio (use Telegram bot token instead)` };
      }

      const redirectUri = getRedirectUri(args.platform);
      const authConfigId = await getOrCreateAuthConfigId(apiKey, composioApp);

      const link: any = await composioFetch(apiKey, "/connected_accounts/link", {
        method: "POST",
        body: JSON.stringify({
          auth_config_id: authConfigId,
          user_id: identity._id,
          callback_url: redirectUri,
        }),
      });

      const payload = link?.data ?? link;
      const redirectUrl = payload?.redirect_url;
      const connectionId = payload?.connected_account_id;
      if (!redirectUrl) {
        return {
          success: false,
          error: `Composio did not return a redirect URL — response: ${JSON.stringify(link).slice(0, 200)}`,
        };
      }

      return { success: true, redirectUrl, connectionId };
    } catch (err: any) {
      return { success: false, error: `Composio OAuth start failed: ${err?.message || String(err)}` };
    }
  },
});

export const handleComposioCallback = action({
  args: {
    platform: v.string(),
    connectionId: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; platformName?: string; username?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured" };

      const data: any = await composioFetch(
        apiKey, `/connected_accounts/${encodeURIComponent(args.connectionId)}`
      );

      const status = data?.status;
      if (status !== "ACTIVE") {
        return { success: false, error: `Connection not active (status: ${status || "unknown"})` };
      }

      const tokenVal = data?.state?.val || data?.data || {};
      const accessToken: string | undefined =
        tokenVal.access_token || tokenVal.oauth_token || data?.accessToken || data?.access_token;
      const refreshToken: string =
        tokenVal.refresh_token || data?.refreshToken || data?.refresh_token || "";

      if (!accessToken) {
        return { success: false, error: "Composio connection active but no access token returned" };
      }

      const username: string = data?.username || data?.meta?.username || config.name;
      const platformUserId: string = data?.id || data?.uuid || args.connectionId;

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id,
        platform: args.platform,
        platformName: config.name,
        accessToken,
        refreshToken,
        platformUserId,
        platformUsername: username,
        scopes: config.scopes.join(","),
        anonymousByDefault: config.anonymousSupported,
        integrationId: "composio", // FIX: now accepted by savePlatformConnection
      });

      return { success: true, platformName: config.name, username };
    } catch (err: any) {
      return { success: false, error: `Composio callback failed: ${err?.message || String(err)}` };
    }
  },
});

export const getOAuthProviderStatus = query({
  args: {},
  handler: async () => {
    const composioKeySet = !!process.env.COMPOSIO_API_KEY;
    const composioPlatforms = Object.entries(COMPOSIO_APP_MAP)
      .filter(([, slug]) => slug)
      .map(([id]) => id);
    return { directEnabled: true, composioEnabled: composioKeySet, composioPlatforms };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Telegram via bot token
// ═══════════════════════════════════════════════════════════════════
export const connectTelegramBot = action({
  args: {
    botToken: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; username?: string; botId?: number; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.botToken || !args.botToken.includes(":")) {
        return {
          success: false,
          error: "Invalid bot token format. Expected: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
        };
      }

      const res = await fetch(`https://api.telegram.org/bot${args.botToken}/getMe`);
      if (!res.ok) return { success: false, error: "Invalid bot token — Telegram rejected the token" };

      const data: any = await res.json();
      if (!data.ok) return { success: false, error: data.description || "Telegram API error" };

      const bot = data.result;
      const username = bot.username ? `@${bot.username}` : "Telegram Bot";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "telegram", platformName: "Telegram",
        accessToken: args.botToken, refreshToken: "", platformUserId: String(bot.id || ""),
        platformUsername: username, scopes: "", anonymousByDefault: false,
        integrationId: "telegram_bot",
      });

      return { success: true, username, botId: bot.id };
    } catch (err: any) {
      return { success: false, error: `Telegram connection failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Bluesky via AT Protocol
// ═══════════════════════════════════════════════════════════════════
export const connectBluesky = action({
  args: {
    identifier: v.string(),
    appPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; handle?: string; did?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.identifier || !args.appPassword) {
        return { success: false, error: "Identifier and app password are required" };
      }

      const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: args.identifier, password: args.appPassword }),
      });

      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        return {
          success: false,
          error: err.message || "Bluesky login failed — check your handle and app password",
        };
      }

      const data: any = await res.json();
      const handle = data.handle || args.identifier;
      const did = data.did || "";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "bluesky", platformName: "Bluesky",
        accessToken: data.accessJwt || "", refreshToken: data.refreshJwt || "",
        platformUserId: did, platformUsername: handle, scopes: "atproto",
        anonymousByDefault: true, integrationId: "atproto",
      });

      return { success: true, handle, did };
    } catch (err: any) {
      return { success: false, error: `Bluesky connection failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// PLATFORM API HELPERS
// ═══════════════════════════════════════════════════════════════════
function getPlatformClientId(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_ID, linkedin: process.env.LINKEDIN_CLIENT_ID,
    facebook: process.env.FACEBOOK_APP_ID, instagram: process.env.FACEBOOK_APP_ID,
    tiktok: process.env.TIKTOK_CLIENT_KEY, youtube: process.env.GOOGLE_CLIENT_ID,
    pinterest: process.env.PINTEREST_APP_ID, reddit: process.env.REDDIT_CLIENT_ID,
    threads: process.env.THREADS_APP_ID, discord: process.env.DISCORD_CLIENT_ID,
  };
  return map[platform] || "";
}

function getPlatformClientSecret(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_SECRET, linkedin: process.env.LINKEDIN_CLIENT_SECRET,
    facebook: process.env.FACEBOOK_APP_SECRET, instagram: process.env.FACEBOOK_APP_SECRET,
    tiktok: process.env.TIKTOK_CLIENT_SECRET, youtube: process.env.GOOGLE_CLIENT_SECRET,
    pinterest: process.env.PINTEREST_APP_SECRET, reddit: process.env.REDDIT_CLIENT_SECRET,
    threads: process.env.THREADS_APP_SECRET, discord: process.env.DISCORD_CLIENT_SECRET,
  };
  return map[platform] || "";
}

function getRedirectUri(platform: string): string {
  const baseUrl = process.env.APP_URL || "https://prosuite.dutchkemventures.com";
  return `${baseUrl}/api/social/callback/${platform}`;
}

async function exchangeCodeForToken(
  platform: string, code: string, clientId: string, clientSecret: string,
  redirectUri: string, codeVerifier?: string
): Promise<any> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error("Unknown platform");

  const body: Record<string, string> = {
    code, redirect_uri: redirectUri, client_id: clientId,
    client_secret: clientSecret, grant_type: "authorization_code",
  };

  if (platform === "x" && codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${manualBase64Standard(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`Token exchange failed: ${err}`); }
  return res.json();
}

async function fetchUserInfo(
  platform: string, accessToken: string
): Promise<{ id: string; username: string; name: string }> {
  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.data?.id || "", username: data.data?.username || "", name: data.data?.name || "" };
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.sub || "", username: data.preferred_username || data.email || "", name: data.name || "" };
      }
      case "facebook":
      case "instagram": {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`
        );
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "tiktok": {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        return {
          id: data.data?.user?.open_id || "",
          username: data.data?.user?.display_name || "",
          name: data.data?.user?.display_name || "",
        };
      }
      case "youtube": {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.name || "", name: data.name || "" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.username || "", name: data.global_name || data.username || "" };
      }
      default:
        return { id: "", username: "", name: "" };
    }
  } catch {
    return { id: "", username: "", name: "" };
  }
}

async function postToPlatformApi(
  platform: string, accessToken: string, content: string,
  _mediaUrls?: string[], _anonymous?: boolean
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return { success: false, error: "Unknown platform" };

  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const data = await res.json();
        return res.ok
          ? { success: true, postId: data.data?.id }
          : { success: false, error: data.detail || "Post failed" };
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            author: "urn:li:person:me", lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: content }, shareMediaCategory: "NONE",
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        return res.ok ? { success: true, postId: "linkedin_post" } : { success: false, error: "LinkedIn post failed" };
      }
      case "facebook": {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me/feed?message=${encodeURIComponent(content)}&access_token=${accessToken}`,
          { method: "POST" }
        );
        const data = await res.json();
        return res.ok
          ? { success: true, postId: data.id }
          : { success: false, error: data.error?.message || "Facebook post failed" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/submit", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sr: "self", kind: "self", title: content.substring(0, 100), text: content,
          }).toString(),
        });
        return res.ok ? { success: true, postId: "reddit_post" } : { success: false, error: "Reddit post failed" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/channels/@me/messages", {
          method: "POST",
          headers: { Authorization: `Bot ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        return res.ok ? { success: true, postId: "discord_msg" } : { success: false, error: "Discord post failed" };
      }
      default:
        return { success: false, error: `Direct posting not yet implemented for ${platform}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRYPTO HELPERS
// FIX: generateCodeVerifier now works directly with raw bytes (Uint8Array)
// instead of converting to a binary string first — avoids UTF-8 double-encoding
// PLUS: replaced crypto.getRandomValues with safeRandomBytes because
//       `crypto` is NOT defined in the Convex action runtime.
// ═══════════════════════════════════════════════════════════════════

// Safe random bytes — Convex action runtime has no `crypto` global
function safeRandomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function uuidV4(): string {
  const bytes = safeRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" +
    hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" +
    hex.slice(10, 16).join("")
  );
}

// FIX: Accepts Uint8Array directly — no string conversion needed
function base64UrlFromBytes(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "";
    result += i + 2 < bytes.length ? B64_CHARS[triplet & 0x3f] : "";
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_");
}

// FIX: Generates verifier directly from raw bytes — no binary string intermediary
function generateCodeVerifier(): string {
  const bytes = safeRandomBytes(32);
  return base64UrlFromBytes(bytes);
}

function generateCodeChallenge(verifier: string): string {
  const utf8: number[] = [];
  for (let i = 0; i < verifier.length; i++) {
    const c = verifier.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
  }
  const digest = sha256(new Uint8Array(utf8));
  return base64UrlFromBytes(digest);
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL SHA-256 (pure JS — Convex action runtime has no crypto.subtle)
// ═══════════════════════════════════════════════════════════════════
const SHA256_K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256(bytes: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen & 0xffffffff);

  const w = new Uint32Array(64);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(chunk + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0); outView.setUint32(4, h1); outView.setUint32(8, h2); outView.setUint32(12, h3);
  outView.setUint32(16, h4); outView.setUint32(20, h5); outView.setUint32(24, h6); outView.setUint32(28, h7);
  return out;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL BASE64 (standard, for HTTP Basic Auth headers)
// ═══════════════════════════════════════════════════════════════════
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function manualBase64Standard(input: string): string {
  const utf8: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else if (c < 0x10000) utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
    else utf8.push((c >> 18) | 0xf0, ((c >> 12) & 0x3f) | 0x80, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
  }
  const data = new Uint8Array(utf8);
  let result = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < data.length ? data[i + 1] : 0;
    const b3 = i + 2 < data.length ? data[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < data.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < data.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}
