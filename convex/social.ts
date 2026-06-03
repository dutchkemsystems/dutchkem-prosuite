import { internalAction, internalMutation, mutation, query, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE — Postiz API Integration
 * fetch() ONLY in actions. DB writes ONLY in mutations.
 */

const POSTIZ_API = "https://api.postiz.com/public/v1";
const POSTIZ_OAUTH_TOKEN_URL = "https://api.postiz.com/oauth/token";

function postizHeaders(apiKey: string): Record<string, string> {
  return { Authorization: apiKey, "Content-Type": "application/json" };
}

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
// 1. INITIATE OAUTH — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const getOAuthUrl = action({
  args: { platform: v.string(), redirectUri: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
    if (!platformConfig) throw new Error(`Unsupported platform: ${platform}`);

    const { apiKey } = getPostizConfig();
    if (!apiKey) throw new Error("Postiz API key not configured");

    const state = crypto.randomUUID();

    // Save state to DB via mutation
    await ctx.runMutation(internal.social.saveOAuthState, {
      state, platform, redirectUri,
    });

    try {
      const response = await fetch(`${POSTIZ_API}/social/${platform}`, {
        method: "GET",
        headers: postizHeaders(apiKey),
      });

      if (!response.ok) {
        const err = await response.text();
        return { error: `Failed to get OAuth URL: ${err}` };
      }

      const data = await response.json();
      if (!data.url) return { error: "No OAuth URL returned from Postiz" };

      return { authUrl: data.url, state, platform: platformConfig };
    } catch (error: any) {
      return { error: `Failed to initiate OAuth: ${error.message}` };
    }
  },
});

// Backward-compatible alias
export const generateOAuthUrl = getOAuthUrl;

export const saveOAuthState = internalMutation({
  args: { state: v.string(), platform: v.string(), redirectUri: v.string() },
  returns: v.null(),
  handler: async (ctx, { state, platform, redirectUri }) => {
    await ctx.db.insert("system_config", {
      key: `oauth_state_${state}`,
      value: { platform, state, redirectUri, createdAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000 },
      description: `OAuth state for ${platform}`,
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. HANDLE OAUTH CALLBACK — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const handleOAuthCallback = action({
  args: { platform: v.string(), code: v.string(), state: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    // Verify state
    const stateDoc = await ctx.runQuery(internal.social.getOAuthState, { state });
    if (!stateDoc) return { success: false, error: "Invalid or expired OAuth state" };

    if (stateDoc.value && typeof stateDoc.value === "object" && "expiresAt" in stateDoc.value) {
      if (Date.now() > (stateDoc.value as any).expiresAt) {
        await ctx.runMutation(internal.social.deleteOAuthState, { stateId: stateDoc._id });
        return { success: false, error: "OAuth state expired" };
      }
    }
    await ctx.runMutation(internal.social.deleteOAuthState, { stateId: stateDoc._id });

    const { clientId, clientSecret } = getPostizConfig();
    if (!clientId || !clientSecret) return { success: false, error: "Postiz OAuth credentials not configured" };

    try {
      // Exchange code for token
      const tokenRes = await fetch(POSTIZ_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return { success: false, error: `Token exchange failed: ${err}` };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) return { success: false, error: "No access token returned" };

      // Fetch integrations
      let integrationId = "";
      let username = "";
      try {
        const integrationsRes = await fetch(`${POSTIZ_API}/integrations`, {
          method: "GET",
          headers: postizHeaders(accessToken),
        });
        if (integrationsRes.ok) {
          const integrations = await integrationsRes.json();
          const arr = Array.isArray(integrations) ? integrations : integrations.connections || [];
          const match = arr.find((i: any) => i.identifier === platform);
          if (match) { integrationId = match.id; username = match.profile || match.name || ""; }
        }
      } catch (_) {}

      // Save to DB via mutation
      await ctx.runMutation(internal.social.savePlatformConnection, {
        platform, accessToken, refreshToken: tokenData.refresh_token || "",
        integrationId, username,
      });

      const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
      return { success: true, platform, username, integrationId, message: `${platformConfig?.name || platform} connected` };
    } catch (error: any) {
      return { success: false, error: `Failed to complete OAuth: ${error.message}` };
    }
  },
});

export const getOAuthState = internalQuery({
  args: { state: v.string() },
  returns: v.any(),
  handler: async (ctx, { state }) => {
    return await ctx.db.query("system_config").withIndex("by_key", (q) => q.eq("key", `oauth_state_${state}`)).first();
  },
});

// Public query for HTTP handler to validate state
export const validateOAuthState = query({
  args: { state: v.string() },
  returns: v.any(),
  handler: async (ctx, { state }) => {
    const doc = await ctx.db.query("system_config").withIndex("by_key", (q) => q.eq("key", `oauth_state_${state}`)).first();
    if (!doc) return { valid: false, error: "Invalid or expired OAuth state" };
    if (doc.value && typeof doc.value === "object" && "expiresAt" in doc.value) {
      if (Date.now() > (doc.value as any).expiresAt) {
        await ctx.db.delete(doc._id);
        return { valid: false, error: "OAuth state expired" };
      }
    }
    return { valid: true, stateId: doc._id, value: doc.value };
  },
});

// Public mutation for HTTP handler to save connection after token exchange
export const saveOAuthCallbackConnection = mutation({
  args: {
    platform: v.string(),
    stateId: v.id("system_config"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    integrationId: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { platform, stateId, accessToken, refreshToken, integrationId, username }) => {
    await ctx.db.delete(stateId);

    const existing = await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", platform)).first();
    const patch = {
      isConnected: true, connectedAt: Date.now(), lastSyncAt: Date.now(),
      accessToken, refreshToken: refreshToken || "",
      postizIntegrationId: integrationId || "", username: username || "", postingMode: "auto" as const,
    };
    if (existing) { await ctx.db.patch(existing._id, patch); }
    else { await ctx.db.insert("social_platforms", { ...patch, platform, postsCount: 0, followersCount: 0 }); }

    const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
    return { success: true, platform, username, integrationId, message: `${platformConfig?.name || platform} connected` };
  },
});

export const deleteOAuthState = internalMutation({
  args: { stateId: v.id("system_config") },
  returns: v.null(),
  handler: async (ctx, { stateId }) => { await ctx.db.delete(stateId); },
});

export const savePlatformConnection = internalMutation({
  args: { platform: v.string(), accessToken: v.string(), refreshToken: v.string(), integrationId: v.string(), username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", args.platform)).first();
    const patch = {
      isConnected: true, connectedAt: Date.now(), lastSyncAt: Date.now(),
      accessToken: args.accessToken, refreshToken: args.refreshToken,
      postizIntegrationId: args.integrationId, username: args.username, postingMode: "auto" as const,
    };
    if (existing) { await ctx.db.patch(existing._id, patch); }
    else { await ctx.db.insert("social_platforms", { ...patch, platform: args.platform, postsCount: 0, followersCount: 0 }); }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. GET CONNECTED PLATFORMS — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const getConnectedPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    try {
      const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
      const { apiKey } = getPostizConfig();
      let postizIntegrations: any[] = [];
      if (apiKey) {
        try {
          const res = await fetch(`${POSTIZ_API}/integrations`, { method: "GET", headers: postizHeaders(apiKey) });
          if (res.ok) { const d = await res.json(); postizIntegrations = Array.isArray(d) ? d : d.connections || []; }
        } catch (_) {}
      }
      const merged = dbPlatforms.map((p: any) => {
        const postiz = postizIntegrations.find((i: any) => i.identifier === p.id || i.id === p.postizIntegrationId);
        return { ...p, isConnected: p.isConnected || !!postiz, username: p.username || postiz?.profile || postiz?.name, postizIntegrationId: p.postizIntegrationId || postiz?.id, profilePicture: postiz?.picture };
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
    try {
      const connected = await ctx.db.query("social_platforms").collect();
      return SUPPORTED_PLATFORMS.map((p) => {
        const conn = connected.find((c) => c.platform === p.id);
        return { ...p, isConnected: conn?.isConnected || false, connectedAt: conn?.connectedAt, lastSyncAt: conn?.lastSyncAt, postsCount: conn?.postsCount || 0, followersCount: conn?.followersCount || 0, postingMode: conn?.postingMode || "auto", scheduleTime: conn?.scheduleTime, postingFrequency: conn?.postingFrequency, username: conn?.username, postizIntegrationId: conn?.postizIntegrationId, accessToken: conn?.accessToken };
      });
    } catch (error) {
      return SUPPORTED_PLATFORMS.map((p) => ({ ...p, isConnected: false, postsCount: 0, followersCount: 0, postingMode: "auto" }));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 4. DISCONNECT PLATFORM — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const disconnectPlatform = action({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    const integrationId = await ctx.runQuery(internal.social.getIntegrationId, { platform });
    if (integrationId) {
      const { apiKey } = getPostizConfig();
      if (apiKey) {
        try { await fetch(`${POSTIZ_API}/integrations/${integrationId}`, { method: "DELETE", headers: postizHeaders(apiKey) }); } catch (_) {}
      }
    }
    await ctx.runMutation(internal.social.clearPlatformConnection, { platform });
    return { success: true };
  },
});

export const getIntegrationId = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    const doc = await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", platform)).first();
    return doc?.postizIntegrationId || null;
  },
});

export const clearPlatformConnection = internalMutation({
  args: { platform: v.string() },
  returns: v.null(),
  handler: async (ctx, { platform }) => {
    const doc = await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", platform)).first();
    if (doc) {
      await ctx.db.patch(doc._id, { isConnected: false, accessToken: undefined, refreshToken: undefined, username: undefined, postizIntegrationId: undefined, platformUserId: undefined });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. DISCONNECT ALL — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const disconnectAllPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const platforms = await ctx.runQuery(internal.social.getAllConnectedPlatforms);
    const { apiKey } = getPostizConfig();
    let disconnected = 0;
    for (const p of platforms) {
      if (p.isConnected && p.postizIntegrationId && apiKey) {
        try { await fetch(`${POSTIZ_API}/integrations/${p.postizIntegrationId}`, { method: "DELETE", headers: postizHeaders(apiKey) }); } catch (_) {}
      }
      if (p.isConnected) { await ctx.runMutation(internal.social.clearPlatformConnection, { platform: p.platform }); disconnected++; }
    }
    return { success: true, disconnected };
  },
});

export const getAllConnectedPlatforms = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => { return await ctx.db.query("social_platforms").collect(); },
});

// ═══════════════════════════════════════════════════════════════════
// 6. UPDATE POSTING SETTINGS — mutation (no fetch)
// ═══════════════════════════════════════════════════════════════════
export const updatePostingSettings = mutation({
  args: { platformId: v.string(), mode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")), scheduleTime: v.optional(v.string()), postingFrequency: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const platform = await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", args.platformId)).first();
    if (!platform) throw new Error("Platform not connected");
    await ctx.db.patch(platform._id, { postingMode: args.mode, scheduleTime: args.scheduleTime, postingFrequency: args.postingFrequency, lastSyncAt: Date.now() });
    return { success: true, mode: args.mode };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 7. MANUAL POST — action (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const manualPost = action({
  args: { platformId: v.string(), content: v.string(), mediaUrls: v.optional(v.array(v.string())) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const platform = await ctx.runQuery(internal.social.getPlatformForPost, { platform: args.platformId });
    if (!platform || !platform.isConnected) throw new Error("Platform not connected");

    const { apiKey } = getPostizConfig();
    let externalId = `manual_${Date.now()}`;
    let success = false;
    let errorMsg = "";

    if (!platform.postizIntegrationId) { errorMsg = "No Postiz integration ID. Reconnect."; }
    else if (!apiKey) { errorMsg = "Postiz API key not configured"; }
    else {
      try {
        const response = await fetch(`${POSTIZ_API}/posts`, {
          method: "POST", headers: postizHeaders(apiKey),
          body: JSON.stringify({
            type: "now", date: new Date().toISOString(), shortLink: false, tags: [],
            posts: [{ integration: { id: platform.postizIntegrationId }, value: [{ content: args.content, image: (args.mediaUrls || []).map((url) => ({ url })) }], settings: { __type: args.platformId } }],
          }),
        });
        if (response.ok) { const d = await response.json(); externalId = d.id || externalId; success = true; }
        else { errorMsg = await response.text(); }
      } catch (err: any) { errorMsg = err.message; }
    }

    await ctx.runMutation(internal.social.logPost, { platformId: args.platformId, content: args.content, success, externalId, errorMsg });
    if (success) await ctx.runMutation(internal.social.incrementPostCount, { platformId: platform._id });
    return { success, message: success ? "Posted successfully" : errorMsg || "Post failed" };
  },
});

export const logPost = internalMutation({
  args: { platformId: v.string(), content: v.string(), success: v.boolean(), externalId: v.string(), errorMsg: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      agentId: "manual", platform: args.platformId, content: args.content,
      status: args.success ? "posted" : "failed", scheduledFor: Date.now(),
      postedAt: args.success ? Date.now() : undefined, externalId: args.externalId,
      error: args.success ? undefined : args.errorMsg || "Post failed",
    });
  },
});

export const incrementPostCount = internalMutation({
  args: { platformId: v.id("social_platforms") },
  returns: v.null(),
  handler: async (ctx, { platformId }) => {
    const p = await ctx.db.get(platformId);
    if (p) await ctx.db.patch(platformId, { postsCount: (p.postsCount || 0) + 1, lastSyncAt: Date.now() });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 8. ANALYTICS & STATS — queries (no fetch)
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 9. AI POST GENERATION — internalAction (uses fetch via AI SDK)
// ═══════════════════════════════════════════════════════════════════
export const generateAndSchedulePost = internalAction({
  args: { agentId: v.string(), platform: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { agentId, platform }) => {
    const nvidia = createOpenAI({ apiKey: process.env.NVIDIA_NIM_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1" });
    const platforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
    const connectedPlatforms = platform ? platforms.filter((p: any) => p.isConnected && p.id === platform) : platforms.filter((p: any) => p.isConnected);
    if (connectedPlatforms.length === 0) return null;

    const services = await ctx.runQuery(internal.updates.getAgentServices, { agent_id: agentId });
    const serviceName = services?.[0]?.name || "Professional Services";
    const { text: content } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: `Generate a compelling social media post for ${serviceName}. Platform: ${connectedPlatforms.map((p: any) => p.name).join(", ")}. Tone: Professional, engaging. 280 chars max for X. Include emojis and hashtags. Return ONLY the post content.`,
    });

    for (const plat of connectedPlatforms) {
      await ctx.runMutation(internal.social.saveScheduledPost, { agentId, platform: plat.id, content: content.trim(), scheduledFor: Date.now() + 30 * 60 * 1000 });
    }
    return null;
  },
});

export const saveScheduledPost = internalMutation({
  args: { agentId: v.string(), platform: v.string(), content: v.string(), scheduledFor: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", { agentId: args.agentId, platform: args.platform, content: args.content, status: "scheduled", scheduledFor: args.scheduledFor });
  },
});

// ═══════════════════════════════════════════════════════════════════
// 10. PROCESS SCHEDULED POSTS — internalAction (uses fetch)
// ═══════════════════════════════════════════════════════════════════
export const processScheduledPosts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const pendingPosts = await ctx.runQuery(internal.social.getPendingPosts, { now });
    const { apiKey } = getPostizConfig();

    for (const post of pendingPosts) {
      try {
        const platformRecord = await ctx.runQuery(internal.social.getPlatformForPost, { platform: post.platform });
        if (!platformRecord || !platformRecord.postizIntegrationId || !apiKey) {
          await ctx.runMutation(internal.social.markPostFailed, { postId: post._id, error: "No Postiz integration ID" });
          continue;
        }
        const response = await fetch(`${POSTIZ_API}/posts`, {
          method: "POST", headers: postizHeaders(apiKey),
          body: JSON.stringify({ type: "now", date: new Date().toISOString(), shortLink: false, tags: [], posts: [{ integration: { id: platformRecord.postizIntegrationId }, value: [{ content: post.content, image: [] }], settings: { __type: post.platform } }] }),
        });
        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, { postId: post._id, externalId: data.id || `post_${Date.now()}` });
          await ctx.runMutation(internal.social.updatePlatformPostsCount, { platformId: platformRecord._id });
        } else { throw new Error(`Postiz API error: ${response.status}`); }
      } catch (err: any) {
        await ctx.runMutation(internal.social.markPostFailed, { postId: post._id, error: err.message });
      }
    }
  },
});

export const getPendingPosts = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    return await ctx.db.query("social_posts").withIndex("by_status_and_scheduled", (q) => q.eq("status", "scheduled").lt("scheduledFor", now)).take(10);
  },
});

export const getPlatformForPost = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    return await ctx.db.query("social_platforms").withIndex("by_platform", (q) => q.eq("platform", platform)).first();
  },
});

export const markPostSuccess = internalMutation({
  args: { postId: v.id("social_posts"), externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, externalId }) => { await ctx.db.patch(postId, { status: "posted", postedAt: Date.now(), externalId }); },
});

export const updatePlatformPostsCount = internalMutation({
  args: { platformId: v.id("social_platforms") },
  returns: v.null(),
  handler: async (ctx, { platformId }) => {
    const p = await ctx.db.get(platformId);
    if (p) await ctx.db.patch(platformId, { postsCount: (p.postsCount || 0) + 1, lastSyncAt: Date.now() });
  },
});

export const markPostFailed = internalMutation({
  args: { postId: v.id("social_posts"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, error }) => { await ctx.db.patch(postId, { status: "failed", error }); },
});

// ═══════════════════════════════════════════════════════════════════
// 11. AGENT ROTATION
// ═══════════════════════════════════════════════════════════════════
export const rotateSocialAgents = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const lastPost = await ctx.db.query("social_posts").order("desc").first();
    let nextIndex = 0;
    if (lastPost) { const li = agents.indexOf(lastPost.agentId); nextIndex = (li + 1) % agents.length; }
    const nextAgentId = agents[nextIndex];
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { agentId: nextAgentId });
    return nextAgentId;
  },
});

export const rotateSocialAgentsManual = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const lastPost = await ctx.db.query("social_posts").order("desc").first();
    let nextIndex = 0;
    if (lastPost) { const li = agents.indexOf(lastPost.agentId); nextIndex = (li + 1) % agents.length; }
    const nextAgentId = agents[nextIndex];
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { agentId: nextAgentId });
    return nextAgentId;
  },
});

// ═══════════════════════════════════════════════════════════════════
// 12. OAUTH STATUS — query (no fetch)
// ═══════════════════════════════════════════════════════════════════
export const getOAuthStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const { apiKey, clientId, clientSecret } = getPostizConfig();
    const hasPostiz = !!(apiKey && clientId && clientSecret);
    return SUPPORTED_PLATFORMS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, hasCredentials: hasPostiz }));
  },
});
