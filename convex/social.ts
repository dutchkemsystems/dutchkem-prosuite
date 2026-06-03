import { internalAction, internalMutation, mutation, query, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE — Postiz API Integration
 * All OAuth, connection management, and posting via Postiz Public API.
 * Supports 27 platforms; we expose 12 in the dashboard.
 */

// ── Postiz API helpers ────────────────────────────────────────────────
const POSTIZ_API = "https://api.postiz.com/public/v1";
const POSTIZ_OAUTH_TOKEN_URL = "https://api.postiz.com/oauth/token";

function postizHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

function getPostizConfig() {
  return {
    apiKey: process.env.POSTIZ_API_KEY || "",
    clientId: process.env.POSTIZ_CLIENT_ID || "",
    clientSecret: process.env.POSTIZ_CLIENT_SECRET || "",
  };
}

// ── Supported platforms (subset of Postiz's 27) ──────────────────────
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
// 1. INITIATE OAUTH — Get platform-specific OAuth URL from Postiz
// ═══════════════════════════════════════════════════════════════════
export const getOAuthUrl = mutation({
  args: {
    platform: v.string(),
    redirectUri: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
    if (!platformConfig) throw new Error(`Unsupported platform: ${platform}`);

    const { apiKey } = getPostizConfig();
    if (!apiKey) throw new Error("Postiz API key not configured");

    const state = crypto.randomUUID();

    // Store state for CSRF verification
    await ctx.db.insert("system_config", {
      key: `oauth_state_${state}`,
      value: {
        platform,
        state,
        redirectUri,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 min expiry
      },
      description: `OAuth state for ${platformConfig.name}`,
      updatedAt: Date.now(),
    });

    try {
      // Postiz generates the real platform OAuth URL (e.g., Twitter's authorize page)
      const response = await fetch(`${POSTIZ_API}/social/${platform}`, {
        method: "GET",
        headers: postizHeaders(apiKey),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[POSTIZ] OAuth URL error for ${platform}:`, err);
        return { error: `Failed to get OAuth URL: ${err}` };
      }

      const data = await response.json();
      const authUrl = data.url;

      if (!authUrl) {
        return { error: "No OAuth URL returned from Postiz" };
      }

      return {
        authUrl,
        state,
        platform: platformConfig,
        message: `Opening ${platformConfig.name} login...`,
      };
    } catch (error: any) {
      console.error(`[POSTIZ] OAuth exception for ${platform}:`, error.message);
      return { error: `Failed to initiate OAuth: ${error.message}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. HANDLE OAUTH CALLBACK — Exchange code, fetch integrations, save
// ═══════════════════════════════════════════════════════════════════
export const handleOAuthCallback = mutation({
  args: {
    platform: v.string(),
    code: v.string(),
    state: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    // 1. Verify state
    const stateDoc = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", `oauth_state_${state}`))
      .first();

    if (!stateDoc) {
      return { success: false, error: "Invalid or expired OAuth state" };
    }
    if (stateDoc.value && typeof stateDoc.value === "object" && "expiresAt" in stateDoc.value) {
      if (Date.now() > (stateDoc.value as any).expiresAt) {
        await ctx.db.delete(stateDoc._id);
        return { success: false, error: "OAuth state expired" };
      }
    }
    await ctx.db.delete(stateDoc._id);

    const { clientId, clientSecret } = getPostizConfig();
    if (!clientId || !clientSecret) {
      return { success: false, error: "Postiz OAuth credentials not configured" };
    }

    try {
      // 2. Exchange code for Postiz access token
      const tokenRes = await fetch(POSTIZ_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[POSTIZ] Token exchange error:", err);
        return { success: false, error: `Token exchange failed: ${err}` };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return { success: false, error: "No access token returned" };
      }

      // 3. Fetch all integrations to find the newly connected one
      const integrationsRes = await fetch(`${POSTIZ_API}/integrations`, {
        method: "GET",
        headers: postizHeaders(accessToken),
      });

      let integrationId = "";
      let username = "";

      if (integrationsRes.ok) {
        const integrations = await integrationsRes.json();
        const arr = Array.isArray(integrations) ? integrations : integrations.connections || [];
        // Find the integration matching this platform
        const match = arr.find((i: any) => i.identifier === platform || i.id === platform);
        if (match) {
          integrationId = match.id;
          username = match.profile || match.name || "";
        }
      }

      // 4. Save or update the platform connection
      const existing = await ctx.db
        .query("social_platforms")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          accessToken,
          refreshToken: tokenData.refresh_token,
          postizIntegrationId: integrationId,
          username,
          postingMode: "auto",
        });
      } else {
        await ctx.db.insert("social_platforms", {
          platform,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          postsCount: 0,
          followersCount: 0,
          accessToken,
          refreshToken: tokenData.refresh_token,
          postizIntegrationId: integrationId,
          username,
          postingMode: "auto",
        });
      }

      const platformConfig = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
      return {
        success: true,
        platform,
        username,
        integrationId,
        message: `${platformConfig?.name || platform} connected successfully`,
      };
    } catch (error: any) {
      console.error("[POSTIZ] Callback error:", error.message);
      return { success: false, error: `Failed to complete OAuth: ${error.message}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. GET CONNECTED PLATFORMS — Merge Postiz API + local DB
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
          const res = await fetch(`${POSTIZ_API}/integrations`, {
            method: "GET",
            headers: postizHeaders(apiKey),
          });
          if (res.ok) {
            const data = await res.json();
            postizIntegrations = Array.isArray(data) ? data : data.connections || [];
          }
        } catch (err) {
          console.log("[POSTIZ] Failed to fetch integrations:", err);
        }
      }

      // Merge: local DB is source of truth, Postiz adds live data
      const merged = dbPlatforms.map((p: any) => {
        const postiz = postizIntegrations.find(
          (i: any) => i.identifier === p.id || i.id === p.postizIntegrationId
        );
        return {
          ...p,
          isConnected: p.isConnected || !!postiz,
          username: p.username || postiz?.profile || postiz?.name,
          postizIntegrationId: p.postizIntegrationId || postiz?.id,
          profilePicture: postiz?.picture,
        };
      });

      return {
        platforms: merged,
        availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          color: p.color,
        })),
        isConnected: true,
      };
    } catch (error: any) {
      console.error("getConnectedPlatforms error:", error);
      return {
        platforms: [],
        availablePlatforms: SUPPORTED_PLATFORMS.map((p) => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          color: p.color,
        })),
        isConnected: false,
        error: error.message,
      };
    }
  },
});

/**
 * Internal: get all platforms from local DB
 */
export const getPlatformsFromDb = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const connected = await ctx.db.query("social_platforms").collect();
      return SUPPORTED_PLATFORMS.map((p) => {
        const conn = connected.find((c) => c.platform === p.id);
        return {
          ...p,
          isConnected: conn?.isConnected || false,
          connectedAt: conn?.connectedAt,
          lastSyncAt: conn?.lastSyncAt,
          postsCount: conn?.postsCount || 0,
          followersCount: conn?.followersCount || 0,
          postingMode: conn?.postingMode || "auto",
          scheduleTime: conn?.scheduleTime,
          postingFrequency: conn?.postingFrequency,
          username: conn?.username,
          postizIntegrationId: conn?.postizIntegrationId,
          accessToken: conn?.accessToken,
        };
      });
    } catch (error) {
      console.error("getPlatformsFromDb error:", error);
      return SUPPORTED_PLATFORMS.map((p) => ({
        ...p,
        isConnected: false,
        postsCount: 0,
        followersCount: 0,
        postingMode: "auto",
      }));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 4. DISCONNECT PLATFORM — Remove from Postiz + local DB
// ═══════════════════════════════════════════════════════════════════
export const disconnectPlatform = mutation({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    const existing = await ctx.db
      .query("social_platforms")
      .withIndex("by_platform", (q) => q.eq("platform", platform))
      .first();

    if (existing) {
      // Delete from Postiz if we have an integration ID
      if (existing.postizIntegrationId) {
        const { apiKey } = getPostizConfig();
        if (apiKey) {
          try {
            await fetch(`${POSTIZ_API}/integrations/${existing.postizIntegrationId}`, {
              method: "DELETE",
              headers: postizHeaders(apiKey),
            });
          } catch (err) {
            console.error(`[POSTIZ] Failed to delete integration:`, err);
          }
        }
      }

      await ctx.db.patch(existing._id, {
        isConnected: false,
        accessToken: undefined,
        refreshToken: undefined,
        username: undefined,
        postizIntegrationId: undefined,
        platformUserId: undefined,
      });
    }

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. DISCONNECT ALL PLATFORMS
// ═══════════════════════════════════════════════════════════════════
export const disconnectAllPlatforms = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const platforms = await ctx.db.query("social_platforms").collect();
    const { apiKey } = getPostizConfig();
    let disconnected = 0;

    for (const p of platforms) {
      if (p.isConnected) {
        if (p.postizIntegrationId && apiKey) {
          try {
            await fetch(`${POSTIZ_API}/integrations/${p.postizIntegrationId}`, {
              method: "DELETE",
              headers: postizHeaders(apiKey),
            });
          } catch (err) {
            console.error(`[POSTIZ] Failed to delete integration ${p.platform}:`, err);
          }
        }

        await ctx.db.patch(p._id, {
          isConnected: false,
          accessToken: undefined,
          refreshToken: undefined,
          username: undefined,
          postizIntegrationId: undefined,
          platformUserId: undefined,
        });
        disconnected++;
      }
    }
    return { success: true, disconnected };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 6. UPDATE POSTING SETTINGS (auto / manual / paused)
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
    const platform = await ctx.db
      .query("social_platforms")
      .withIndex("by_platform", (q) => q.eq("platform", args.platformId))
      .first();

    if (!platform) {
      throw new Error("Platform not connected");
    }

    await ctx.db.patch(platform._id, {
      postingMode: args.mode,
      scheduleTime: args.scheduleTime,
      postingFrequency: args.postingFrequency,
      lastSyncAt: Date.now(),
    });

    return { success: true, mode: args.mode };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 7. MANUAL POST — Post content via Postiz API
// ═══════════════════════════════════════════════════════════════════
export const manualPost = mutation({
  args: {
    platformId: v.string(),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const platform = await ctx.db
      .query("social_platforms")
      .withIndex("by_platform", (q) => q.eq("platform", args.platformId))
      .first();

    if (!platform || !platform.isConnected) {
      throw new Error("Platform not connected");
    }

    const { apiKey } = getPostizConfig();
    let externalId = `manual_${Date.now()}`;
    let success = false;
    let errorMsg = "";

    if (!platform.postizIntegrationId) {
      errorMsg = "No Postiz integration ID. Reconnect the platform.";
    } else if (!apiKey) {
      errorMsg = "Postiz API key not configured";
    } else {
      try {
        const response = await fetch(`${POSTIZ_API}/posts`, {
          method: "POST",
          headers: postizHeaders(apiKey),
          body: JSON.stringify({
            type: "now",
            date: new Date().toISOString(),
            shortLink: false,
            tags: [],
            posts: [
              {
                integration: { id: platform.postizIntegrationId },
                value: [
                  {
                    content: args.content,
                    image: (args.mediaUrls || []).map((url) => ({ url })),
                  },
                ],
                settings: { __type: args.platformId },
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          externalId = data.id || externalId;
          success = true;
        } else {
          errorMsg = await response.text();
        }
      } catch (err: any) {
        errorMsg = err.message;
      }
    }

    // Log the post attempt
    await ctx.db.insert("social_posts", {
      agentId: "manual",
      platform: args.platformId,
      content: args.content,
      status: success ? "posted" : "failed",
      scheduledFor: Date.now(),
      postedAt: success ? Date.now() : undefined,
      externalId,
      error: success ? undefined : errorMsg || "Post failed",
    });

    if (success) {
      await ctx.db.patch(platform._id, {
        postsCount: platform.postsCount + 1,
        lastSyncAt: Date.now(),
      });
    }

    return { success, message: success ? "Posted successfully" : errorMsg || "Post failed" };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 8. ANALYTICS & STATS
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
      console.error("getPlatformAnalytics error:", error);
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
// 9. AI POST GENERATION + SCHEDULING (NVIDIA NIM)
// ═══════════════════════════════════════════════════════════════════
export const generateAndSchedulePost = internalAction({
  args: {
    agentId: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { agentId, platform }) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const platforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
    const connectedPlatforms = platform
      ? platforms.filter((p: any) => p.isConnected && p.id === platform)
      : platforms.filter((p: any) => p.isConnected);

    if (connectedPlatforms.length === 0) {
      console.log("[SOCIAL] No connected platforms, skipping post generation");
      return null;
    }

    const services = await ctx.runQuery(internal.updates.getAgentServices, { agent_id: agentId });
    const serviceName = services?.[0]?.name || "Professional Services";

    const { text: content } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: `Generate a compelling social media post for ${serviceName}.
      Platform: ${connectedPlatforms.map((p: any) => p.name).join(", ")}
      Tone: Professional, engaging, informative
      Length: 280 characters max for X/Twitter, longer for others
      Include relevant emojis and hashtags.
      Return ONLY the post content, no explanations.`,
    });

    for (const plat of connectedPlatforms) {
      const scheduledFor = Date.now() + 30 * 60 * 1000;
      await ctx.runMutation(internal.social.saveScheduledPost, {
        agentId,
        platform: plat.id,
        content: content.trim(),
        scheduledFor,
      });
    }

    console.log(`[SOCIAL] Scheduled posts for ${connectedPlatforms.length} platforms via ${agentId}`);
    return null;
  },
});

export const saveScheduledPost = internalMutation({
  args: {
    agentId: v.string(),
    platform: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      agentId: args.agentId,
      platform: args.platform,
      content: args.content,
      status: "scheduled",
      scheduledFor: args.scheduledFor,
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// 10. PROCESS SCHEDULED POSTS (cron-triggered)
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
        const platformRecord = await ctx.runQuery(internal.social.getPlatformForPost, {
          platform: post.platform,
        });

        if (!platformRecord || !platformRecord.postizIntegrationId || !apiKey) {
          console.error(`[SOCIAL] No Postiz integration for ${post.platform}`);
          await ctx.runMutation(internal.social.markPostFailed, {
            postId: post._id,
            error: "No Postiz integration ID",
          });
          continue;
        }

        const response = await fetch(`${POSTIZ_API}/posts`, {
          method: "POST",
          headers: postizHeaders(apiKey),
          body: JSON.stringify({
            type: "now",
            date: new Date().toISOString(),
            shortLink: false,
            tags: [],
            posts: [
              {
                integration: { id: platformRecord.postizIntegrationId },
                value: [{ content: post.content, image: [] }],
                settings: { __type: post.platform },
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, {
            postId: post._id,
            externalId: data.id || `post_${Date.now()}`,
          });
          await ctx.runMutation(internal.social.updatePlatformPostsCount, {
            platformId: platformRecord._id,
          });
        } else {
          throw new Error(`Postiz API error: ${response.status}`);
        }
      } catch (err: any) {
        console.error(`[SOCIAL] Failed to post ${post._id}:`, err.message);
        await ctx.runMutation(internal.social.markPostFailed, {
          postId: post._id,
          error: err.message,
        });
      }
    }

    return null;
  },
});

export const getPendingPosts = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("social_posts")
      .withIndex("by_status_and_scheduled", (q) =>
        q.eq("status", "scheduled").lt("scheduledFor", now)
      )
      .take(10);
  },
});

export const getPlatformForPost = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform }) => {
    return await ctx.db
      .query("social_platforms")
      .withIndex("by_platform", (q) => q.eq("platform", platform))
      .first();
  },
});

export const markPostSuccess = internalMutation({
  args: { postId: v.id("social_posts"), externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, externalId }) => {
    await ctx.db.patch(postId, {
      status: "posted",
      postedAt: Date.now(),
      externalId,
    });
    return null;
  },
});

export const updatePlatformPostsCount = internalMutation({
  args: { platformId: v.id("social_platforms") },
  returns: v.null(),
  handler: async (ctx, { platformId }) => {
    const platform = await ctx.db.get(platformId);
    if (platform) {
      await ctx.db.patch(platformId, {
        postsCount: (platform.postsCount || 0) + 1,
        lastSyncAt: Date.now(),
      });
    }
    return null;
  },
});

export const markPostFailed = internalMutation({
  args: { postId: v.id("social_posts"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, error }) => {
    await ctx.db.patch(postId, {
      status: "failed",
      error,
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// 11. AGENT ROTATION
// ═══════════════════════════════════════════════════════════════════
export const rotateSocialAgents = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = [
      "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9",
      "A10", "A11", "A12", "A13", "A14", "A15",
    ];

    const lastPost = await ctx.db.query("social_posts").order("desc").first();

    let nextIndex = 0;
    if (lastPost) {
      const lastIndex = agents.indexOf(lastPost.agentId);
      nextIndex = (lastIndex + 1) % agents.length;
    }

    const nextAgentId = agents[nextIndex];
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { agentId: nextAgentId });
    return nextAgentId;
  },
});

export const rotateSocialAgentsManual = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = [
      "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9",
      "A10", "A11", "A12", "A13", "A14", "A15",
    ];

    const lastPost = await ctx.db.query("social_posts").order("desc").first();

    let nextIndex = 0;
    if (lastPost) {
      const lastIndex = agents.indexOf(lastPost.agentId);
      nextIndex = (lastIndex + 1) % agents.length;
    }

    const nextAgentId = agents[nextIndex];
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { agentId: nextAgentId });
    return nextAgentId;
  },
});

// ═══════════════════════════════════════════════════════════════════
// 12. OAUTH STATUS — Which platforms have Postiz credentials
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

// Backward-compatible alias — old deployments may still call generateOAuthUrl
export const generateOAuthUrl = getOAuthUrl;
