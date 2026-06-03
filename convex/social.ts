// convex/social.ts
// Direct OAuth + API integration for 12 social media platforms
// NO Postiz dependency — all platform APIs called directly

import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATIONS — Direct OAuth endpoints per platform
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

// Composio app slugs — maps our platform IDs to Composio integration IDs.
// Telegram is NOT supported by Composio (it uses bot tokens).
export const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
  x: "twitter",
  linkedin: "linkedin",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  pinterest: "pinterest",
  reddit: "reddit",
  threads: "threads",
  discord: "discord",
  bluesky: "bluesky",
  telegram: undefined, // bot token only
};

// ═══════════════════════════════════════════════════════════════════
// OAUTH STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export const storeOAuthState = internalMutation({
  args: { state: v.string(), platform: v.string(), adminId: v.string(), codeVerifier: v.optional(v.string()) },
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
    const doc = await ctx.db.query("oauth_states").withIndex("by_state", (q) => q.eq("state", state)).first();
    if (!doc) return null;
    if (doc.expiresAt <= Date.now()) { await ctx.db.delete(doc._id); return null; }
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
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };
      if (!config.authUrl) return { success: false, error: `${config.name} uses ${args.platform === 'telegram' ? 'bot token' : 'AT Protocol'} — connect via settings instead` };

      const state = uuidV4();
      let codeVerifier = "";
      let codeChallenge = "";

      if (config.usesCodeVerifier) {
        codeVerifier = generateCodeVerifier();
        codeChallenge = await generateCodeChallenge(codeVerifier);
      }

      await ctx.runMutation(internal.social.storeOAuthState, {
        state, platform: args.platform, adminId: identity.subject, codeVerifier,
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
          authUrl = `${config.authUrl}?client_id=${clientId}&scope=${scopes.join("+")}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
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
      const tokenData = await exchangeCodeForToken(platform, code, clientId, clientSecret, redirectUri, storedState.codeVerifier);
      if (!tokenData.access_token) return { success: false, error: "No access token returned" };

      const userInfo = await fetchUserInfo(platform, tokenData.access_token);

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: storedState.adminId, platform, platformName: config.name,
        accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token || "",
        platformUserId: userInfo.id || "", platformUsername: userInfo.username || userInfo.name || "",
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
        scopes: config.scopes.join(","),
        anonymousByDefault: config.anonymousSupported,
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
// ═══════════════════════════════════════════════════════════════════
export const savePlatformConnection = internalMutation({
  args: {
    adminId: v.string(), platform: v.string(), platformName: v.string(),
    accessToken: v.string(), refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()), platformUsername: v.optional(v.string()),
    expiresAt: v.optional(v.number()), scopes: v.optional(v.string()),
    anonymousByDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", args.adminId).eq("platformId", args.platform)).first();

    const patch = {
      accessToken: args.accessToken, refreshToken: args.refreshToken || "",
      platformUserId: args.platformUserId || "", platformUsername: args.platformUsername || "",
      isConnected: true, expiresAt: args.expiresAt, scopes: args.scopes || "",
      anonymousByDefault: args.anonymousByDefault || false, updatedAt: Date.now(),
    };

    if (existing) { await ctx.db.patch(existing._id, patch); }
    else {
      await ctx.db.insert("platform_connections", {
        adminId: args.adminId, platformId: args.platform, platformName: args.platformName,
        integrationId: "", ...patch, autoPostEnabled: true, connectedAt: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Post to platform directly
// ═══════════════════════════════════════════════════════════════════
export const postToPlatform = action({
  args: {
    platform: v.string(), content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    anonymous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.social.getConnectionForPlatform, { platform: args.platform });
    if (!connection || !connection.isConnected) throw new Error("Platform not connected");

    const config = PLATFORM_CONFIGS[args.platform];
    if (!config) throw new Error(`Unknown platform: ${args.platform}`);

    const result = await postToPlatformApi(args.platform, connection.accessToken, args.content, args.mediaUrls, args.anonymous);

    await ctx.runMutation(internal.social.logPost, {
      platformId: args.platform, content: args.content, success: result.success,
      externalId: result.postId || "", errorMsg: result.error || "", anonymous: args.anonymous || false,
    });

    return result;
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Get connected platforms
// ═══════════════════════════════════════════════════════════════════
export const getConnectedPlatforms = action({
  args: {},
  handler: async (ctx) => {
    const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
    return {
      platforms: dbPlatforms,
      availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({
        id: p.id, name: p.name, icon: p.icon, color: p.color, anonymousSupported: p.anonymousSupported,
      })),
    };
  },
});

export const getPlatformsFromDb = internalQuery({
  args: {},
  handler: async (ctx) => {
    const connected = await ctx.db.query("platform_connections").collect();
    return SUPPORTED_PLATFORMS.map((p) => {
      const conn = connected.find((c) => c.platformId === p.id && c.isConnected);
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

export const getConnectionForPlatform = internalQuery({
  args: { platform: v.string() },
  handler: async (ctx, { platform }) => {
    return await ctx.db.query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", platform)).first();
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Disconnect platform
// ═══════════════════════════════════════════════════════════════════
export const disconnectPlatform = mutation({
  args: { platformId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const conn = await ctx.db.query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", identity.subject).eq("platformId", args.platformId)).first();
    if (conn) await ctx.db.patch(conn._id, { isConnected: false, accessToken: "", refreshToken: "", updatedAt: Date.now() });
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
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", args.platformId)).first();
    if (!doc) throw new Error("Platform not connected");
    await ctx.db.patch(doc._id, {
      autoPostEnabled: args.mode === "auto", anonymousByDefault: args.anonymous || false, updatedAt: Date.now(),
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
      agentId: args.anonymous ? "anonymous" : "admin", platform: args.platformId,
      content: args.content, status: args.success ? "posted" : "failed",
      scheduledFor: Date.now(), postedAt: args.success ? Date.now() : undefined,
      externalId: args.externalId, error: args.success ? undefined : args.errorMsg,
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
      total: posts.length, posted: posts.filter((p) => p.status === "posted").length,
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
        const platformLeads = leads.filter((l) => l.source === p.id || l.source === p.name.toLowerCase());
        return { platform: p.id, name: p.name, icon: p.icon, leads: platformLeads.length,
          registrations: platformLeads.filter((l) => l.status === "converted").length,
          conversions: platformLeads.filter((l) => l.status === "converted").length, revenue: 0 };
      });
      platformStats.sort((a, b) => b.leads - a.leads);
      return { platforms: platformStats, totalLeads: leads.length, totalUsers: leads.length,
        totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0) };
    } catch { return { platforms: [], totalLeads: 0, totalUsers: 0, totalRevenue: 0 }; }
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
// ACTION: Start OAuth via Composio (alternative to direct platform OAuth)
// ═══════════════════════════════════════════════════════════════════
export const startComposioOAuth = action({
  args: { platform: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; redirectUrl?: string; connectionId?: string; error?: string }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured — set it in Convex dashboard env vars" };

      const composioApp = COMPOSIO_APP_MAP[args.platform];
      if (!composioApp) return { success: false, error: `${config.name} does not support Composio (use Telegram bot token instead)` };

      const redirectUri = getRedirectUri(args.platform);

      const res = await fetch("https://backend.composio.dev/api/v1/connectedAccounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          integrationId: composioApp,
          userId: identity.subject,
          callbackUrl: redirectUri,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `Composio start failed: ${txt}` };
      }

      const data: any = await res.json();
      return {
        success: true,
        redirectUrl: data.redirectUrl || data.redirect_url,
        connectionId: data.id || data.connectionId,
      };
    } catch (err: any) {
      return { success: false, error: `Composio OAuth start failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Handle Composio callback (polled after user returns from redirect)
// ═══════════════════════════════════════════════════════════════════
export const handleComposioCallback = action({
  args: { platform: v.string(), connectionId: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; platformName?: string; username?: string; error?: string }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured" };

      const res = await fetch(`https://backend.composio.dev/api/v1/connectedAccounts/${args.connectionId}`, {
        method: "GET",
        headers: { "x-api-key": apiKey },
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `Composio status check failed: ${txt}` };
      }

      const data: any = await res.json();
      const status = data.status;
      const accessToken = data.accessToken || data.access_token;

      if (status !== "ACTIVE" || !accessToken) {
        return { success: false, error: `Connection not active (status: ${status})` };
      }

      const username = data.username || data.account?.username || config.name;

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity.subject,
        platform: args.platform,
        platformName: config.name,
        accessToken,
        refreshToken: "",
        platformUserId: data.accountId || data.account?.id || "",
        platformUsername: username,
        scopes: config.scopes.join(","),
        anonymousByDefault: config.anonymousSupported,
        integrationId: "composio",
      });

      return { success: true, platformName: config.name, username };
    } catch (err: any) {
      return { success: false, error: `Composio callback failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get OAuth provider status (direct vs composio)
// ═══════════════════════════════════════════════════════════════════
export const getOAuthProviderStatus = query({
  args: {},
  handler: async () => {
    const composioKeySet = !!process.env.COMPOSIO_API_KEY;
    return {
      directEnabled: true,
      composioEnabled: composioKeySet,
      composioPlatforms: ["x", "linkedin", "facebook", "instagram", "tiktok", "youtube", "pinterest", "reddit", "threads", "discord", "bluesky"],
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Telegram via bot token (Telegram uses bot tokens, not OAuth)
// ═══════════════════════════════════════════════════════════════════
export const connectTelegramBot = action({
  args: { botToken: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; username?: string; botId?: number; error?: string }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.botToken || !args.botToken.includes(":")) {
        return { success: false, error: "Invalid bot token format. Expected: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz" };
      }

      const res = await fetch(`https://api.telegram.org/bot${args.botToken}/getMe`);
      if (!res.ok) {
        return { success: false, error: "Invalid bot token — Telegram rejected the token" };
      }

      const data: any = await res.json();
      if (!data.ok) {
        return { success: false, error: data.description || "Telegram API error" };
      }

      const bot = data.result;
      const username = bot.username ? `@${bot.username}` : "Telegram Bot";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity.subject,
        platform: "telegram",
        platformName: "Telegram",
        accessToken: args.botToken,
        refreshToken: "",
        platformUserId: String(bot.id || ""),
        platformUsername: username,
        scopes: "",
        anonymousByDefault: false,
        integrationId: "telegram_bot",
      });

      return { success: true, username, botId: bot.id };
    } catch (err: any) {
      return { success: false, error: `Telegram connection failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Bluesky via AT Protocol credentials
// ═══════════════════════════════════════════════════════════════════
export const connectBluesky = action({
  args: { identifier: v.string(), appPassword: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; handle?: string; did?: string; error?: string }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
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
        return { success: false, error: err.message || "Bluesky login failed — check your handle and app password" };
      }

      const data: any = await res.json();
      const handle = data.handle || args.identifier;
      const did = data.did || "";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity.subject,
        platform: "bluesky",
        platformName: "Bluesky",
        accessToken: data.accessJwt || "",
        refreshToken: data.refreshJwt || "",
        platformUserId: did,
        platformUsername: handle,
        scopes: "atproto",
        anonymousByDefault: true,
        integrationId: "atproto",
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

async function exchangeCodeForToken(platform: string, code: string, clientId: string, clientSecret: string, redirectUri: string, codeVerifier?: string): Promise<any> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error("Unknown platform");

  const body: Record<string, string> = { code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret };

  if (platform === "x") { body.grant_type = "authorization_code"; body.code_verifier = codeVerifier || ""; }
  else if (platform === "reddit") { body.grant_type = "authorization_code"; }
  else if (platform === "discord") { body.grant_type = "authorization_code"; }
  else if (platform === "tiktok") { body.grant_type = "authorization_code"; clientSecret && (body.client_secret = clientSecret); }
  else { body.grant_type = "authorization_code"; }

  const res = await fetch(config.tokenUrl, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`Token exchange failed: ${err}`); }
  return res.json();
}

async function fetchUserInfo(platform: string, accessToken: string): Promise<{ id: string; username: string; name: string }> {
  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return { id: data.data?.id || "", username: data.data?.username || "", name: data.data?.name || "" };
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return { id: data.sub || "", username: data.preferred_username || data.email || "", name: data.name || "" };
      }
      case "facebook":
      case "instagram": {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`);
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "tiktok": {
        const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.data?.user?.open_id || "", username: data.data?.user?.display_name || "", name: data.data?.user?.display_name || "" };
      }
      case "youtube": {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return { id: data.id || "", username: data.name || "", name: data.name || "" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return { id: data.id || "", username: data.username || "", name: data.global_name || data.username || "" };
      }
      default: return { id: "", username: "", name: "" };
    }
  } catch { return { id: "", username: "", name: "" }; }
}

async function postToPlatformApi(platform: string, accessToken: string, content: string, mediaUrls?: string[], anonymous?: boolean): Promise<{ success: boolean; postId?: string; error?: string }> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return { success: false, error: "Unknown platform" };

  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const data = await res.json();
        return res.ok ? { success: true, postId: data.data?.id } : { success: false, error: data.detail || "Post failed" };
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ author: "urn:li:person:me", lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: content }, shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
        });
        return res.ok ? { success: true, postId: "linkedin_post" } : { success: false, error: "LinkedIn post failed" };
      }
      case "facebook": {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/feed?message=${encodeURIComponent(content)}&access_token=${accessToken}`, { method: "POST" });
        const data = await res.json();
        return res.ok ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Facebook post failed" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/submit", {
          method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ sr: "self", kind: "self", title: content.substring(0, 100), text: content }).toString(),
        });
        return res.ok ? { success: true, postId: "reddit_post" } : { success: false, error: "Reddit post failed" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/channels/@me/messages", {
          method: "POST", headers: { Authorization: `Bot ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        return res.ok ? { success: true, postId: "discord_msg" } : { success: false, error: "Discord post failed" };
      }
      default: return { success: false, error: `Direct posting not yet implemented for ${platform}` };
    }
  } catch (error: any) { return { success: false, error: error.message }; }
}

function generateRandomString(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < array.length; i++) result += String.fromCharCode(array[i]);
  return result;
}

function base64UrlEncode(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    if (charCode < 128) {
      result += String.fromCharCode(charCode);
    } else if (charCode < 2048) {
      result += String.fromCharCode((charCode >> 6) | 192, (charCode & 63) | 128);
    } else {
      result += String.fromCharCode((charCode >> 12) | 224, ((charCode >> 6) & 63) | 128, (charCode & 63) | 128);
    }
  }
  return btoa(result).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function uuidV4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") + "-" +
    hex.slice(4, 6).join("") + "-" +
    hex.slice(6, 8).join("") + "-" +
    hex.slice(8, 10).join("") + "-" +
    hex.slice(10, 16).join("")
  );
}

function generateCodeVerifier(): string {
  return base64UrlEncode(generateRandomString(32));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  let binary = "";
  for (let i = 0; i < verifier.length; i++) binary += String.fromCharCode(verifier.charCodeAt(i) & 0xff);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(binary));
  let result = "";
  const bytes = new Uint8Array(digest);
  for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
  return base64UrlEncode(result);
}
