import { internalAction, internalMutation, mutation, query, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getPlatformOAuthConfig, buildPlatformAuthUrl, PLATFORM_OAUTH_CONFIGS } from "./platformOAuth";

/**
 * SOCIAL MEDIA ENGINE - Direct Platform OAuth 2.0
 * Each platform has its own OAuth flow with real login pages
 */

// Supported platforms via Postiz
export const SUPPORTED_PLATFORMS = [
  { id: "x", name: "X (Twitter)", icon: "𝕏", color: "#1DA1F2" },
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

/**
 * Get Postiz API config
 */
function getPostizConfig() {
  return {
    apiKey: process.env.POSTIZ_API_KEY,
    clientId: process.env.POSTIZ_CLIENT_ID,
    clientSecret: process.env.POSTIZ_CLIENT_SECRET,
    apiUrl: 'https://api.postiz.com',
    publicApiUrl: 'https://api.postiz.com/public/v1',
    frontendUrl: 'https://platform.postiz.com',
  };
}

/**
 * Initiate OAuth for a specific platform via Postiz
 * Postiz manages all platform connections
 */
export const generateOAuthUrl = mutation({
  args: {
    platform: v.string(),
    redirectUri: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    const platformConfig = SUPPORTED_PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) throw new Error(`Unsupported platform: ${platform}`);

    // Always use Postiz OAuth - platforms are managed through Postiz
    const { clientId, frontendUrl } = getPostizConfig();
    if (!clientId) {
      return {
        error: "Postiz OAuth not configured. Set POSTIZ_CLIENT_ID in Convex env.",
        platform: platformConfig.name,
      };
    }

    // Generate CSRF state
    const state = crypto.randomUUID();

    // Store state for verification
    await ctx.db.insert("system_config", {
      key: `oauth_state_${state}`,
      value: {
        platform,
        state,
        redirectUri,
        type: "postiz",
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
      description: `OAuth state for ${platformConfig.name}`,
      updatedAt: Date.now(),
    });

    // Build the Postiz authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });

    const authUrl = `${frontendUrl}/oauth/authorize?${params.toString()}`;

    return {
      authUrl,
      state,
      platform: platformConfig,
      type: "postiz",
      message: `Opening Postiz login for ${platformConfig.name}...`,
    };
  },
});

/**
 * Handle OAuth callback from any platform
 * Exchanges authorization code for access token
 */
export const handleOAuthCallback = mutation({
  args: {
    platform: v.string(),
    code: v.string(),
    state: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    // Verify state parameter (CSRF protection)
    const stateConfig = await ctx.db.query("system_config")
      .withIndex("by_platform", q => q.eq("key", `oauth_state_${state}`))
      .first();

    if (!stateConfig) {
      return { success: false, error: "Invalid or expired OAuth state" };
    }

    // Delete used state
    await ctx.db.delete(stateConfig._id);

    const { clientId, clientSecret, apiUrl } = getPostizConfig();

    if (!clientId || !clientSecret) {
      return { success: false, error: "Postiz OAuth credentials not configured" };
    }

    try {
      // Exchange code for access token via Postiz OAuth
      const tokenResponse = await fetch(`${apiUrl}/api/oauth/token`, {
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
        const error = await tokenResponse.text();
        console.error(`[POSTIZ] Token exchange error:`, error);
        return { success: false, error: `Token exchange failed: ${error}` };
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, id } = tokenData;

      if (!access_token) {
        return { success: false, error: "No access token returned from Postiz" };
      }

      // Store the Postiz connection
      const existing = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", "postiz"))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          accessToken: access_token,
          refreshToken: refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          username: id || "Postiz User",
          platformUserId: id,
          postingMode: "auto",
        });
      } else {
        await ctx.db.insert("social_platforms", {
          platform: "postiz",
          accessToken: access_token,
          refreshToken: refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          postsCount: 0,
          followersCount: 0,
          username: id || "Postiz User",
          platformUserId: id,
          postingMode: "auto",
        });
      }

      // Mark the target platform as connected
      const targetExisting = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .first();

      if (targetExisting) {
        await ctx.db.patch(targetExisting._id, {
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          accessToken: access_token,
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
          username: undefined,
          platformUserId: undefined,
          accessToken: access_token,
          postingMode: "auto",
        });
      }

      // Sync integrations from Postiz
      try {
        const integrationsResponse = await fetch(`https://api.postiz.com/public/v1/integrations`, {
          method: "GET",
          headers: { Authorization: access_token },
        });

        if (integrationsResponse.ok) {
          const integrations = await integrationsResponse.json();
          const integrationList = Array.isArray(integrations) ? integrations : integrations.integrations || [];

          for (const integration of integrationList) {
            const intPlatform = integration.identifier || integration.name?.toLowerCase();
            if (!intPlatform) continue;

            const platformRecord = await ctx.db.query("social_platforms")
              .withIndex("by_platform", q => q.eq("platform", intPlatform))
              .first();

            if (platformRecord) {
              await ctx.db.patch(platformRecord._id, {
                isConnected: true,
                lastSyncAt: Date.now(),
                username: integration.name || integration.username,
                platformUserId: integration.id,
                postingMode: "auto",
              });
            } else {
              await ctx.db.insert("social_platforms", {
                platform: intPlatform,
                isConnected: true,
                connectedAt: Date.now(),
                lastSyncAt: Date.now(),
                postsCount: 0,
                followersCount: 0,
                username: integration.name || integration.username,
                platformUserId: integration.id,
                accessToken: access_token,
                postingMode: "auto",
              });
            }
          }
          console.log(`[POSTIZ] Synced ${integrationList.length} integrations`);
        }
      } catch (syncErr) {
        console.log(`[POSTIZ] Integration sync warning:`, syncErr);
      }

      return {
        success: true,
        platform,
        message: `Postiz connected. ${platform} and other platforms are ready for posting.`,
      };
    } catch (error: any) {
      console.error(`[POSTIZ] Connection error:`, error.message);
      return { success: false, error: `Failed to complete OAuth: ${error.message}` };
    }
  },
});

/**
 * Get all connected platforms - reads from database + optionally syncs with Postiz API
 */
export const getConnectedPlatforms = action({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      // Primary: Read connection status from database (where OAuth stores tokens)
      const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);

      // Optional: Try to sync with Postiz API if a valid API key exists
      const postizApiKey = process.env.POSTIZ_API_KEY;
      let apiPlatforms: any[] = [];

      if (postizApiKey) {
        try {
          const response = await fetch(`https://api.postiz.com/public/v1/integrations`, {
            headers: {
              Authorization: postizApiKey,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            apiPlatforms = Array.isArray(data) ? data : data.integrations || [];
          }
        } catch (apiErr) {
          console.warn("[POSTIZ] API sync failed, using DB only:", apiErr);
        }
      }

      // Merge: DB records are source of truth, API data supplements
      const merged = dbPlatforms.map((dbP: any) => {
        const apiP = apiPlatforms.find((a: any) => a.identifier === dbP.id || a.name?.toLowerCase() === dbP.id);
        return {
          ...dbP,
          apiConnected: !!apiP,
          apiUsername: apiP?.name || apiP?.username,
        };
      });

      return {
        platforms: merged,
        availablePlatforms: getAllAvailablePlatforms(),
        isConnected: true,
        apiSynced: apiPlatforms.length > 0,
      };
    } catch (error: any) {
      console.error("getConnectedPlatforms action error:", error);
      // Fallback: read from database directly
      try {
        const dbPlatforms = await ctx.runQuery(internal.social.getPlatformsFromDb);
        return {
          platforms: dbPlatforms,
          availablePlatforms: getAllAvailablePlatforms(),
          isConnected: true,
          apiSynced: false,
        };
      } catch {
        return {
          platforms: [],
          availablePlatforms: getAllAvailablePlatforms(),
          isConnected: false,
          error: error.message,
        };
      }
    }
  },
});

/**
 * Get all connected platforms from database (internal query for auto-posting)
 */
export const getPlatformsFromDb = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const connected = await ctx.db.query("social_platforms").collect();
      const allPlatforms = SUPPORTED_PLATFORMS.map(p => {
        const conn = connected.find(c => c.platform === p.id);
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
        };
      });
      return allPlatforms;
    } catch (error) {
      console.error("getPlatformsFromDb error:", error);
      return SUPPORTED_PLATFORMS.map(p => ({
        ...p,
        isConnected: false,
        postsCount: 0,
        followersCount: 0,
        postingMode: "auto",
      }));
    }
  },
});

function getAllAvailablePlatforms() {
  return [
    { id: "x", name: "X (Twitter)", icon: "🐦", oauthUrl: "/api/auth/x", enabled: true },
    { id: "linkedin", name: "LinkedIn", icon: "🔗", oauthUrl: "/api/auth/linkedin", enabled: true },
    { id: "instagram", name: "Instagram", icon: "📸", oauthUrl: "/api/auth/instagram", enabled: true },
    { id: "facebook", name: "Facebook", icon: "📘", oauthUrl: "/api/auth/facebook", enabled: true },
    { id: "tiktok", name: "TikTok", icon: "🎵", oauthUrl: "/api/auth/tiktok", enabled: true },
    { id: "youtube", name: "YouTube", icon: "▶️", oauthUrl: "/api/auth/youtube", enabled: true },
    { id: "telegram", name: "Telegram", icon: "📱", oauthUrl: "/api/auth/telegram", enabled: true },
    { id: "discord", name: "Discord", icon: "🎮", oauthUrl: "/api/auth/discord", enabled: true },
    { id: "pinterest", name: "Pinterest", icon: "📌", oauthUrl: "/api/auth/pinterest", enabled: true },
    { id: "reddit", name: "Reddit", icon: "🤖", oauthUrl: "/api/auth/reddit", enabled: true },
    { id: "threads", name: "Threads", icon: "🧵", oauthUrl: "/api/auth/threads", enabled: true },
    { id: "bluesky", name: "Bluesky", icon: "🦋", oauthUrl: "/api/auth/bluesky", enabled: true },
  ];
}

/**
 * Disconnect a platform
 */
export const disconnectPlatform = mutation({
  args: { platform: v.string() },
  returns: v.null(),
  handler: async (ctx, { platform }) => {
    const existing = await ctx.db.query("social_platforms")
      .withIndex("by_platform", q => q.eq("platform", platform))
      .first();
    
    if (existing) {
      // Stop auto-posting via Postiz API: DELETE /platforms/{integrationId}
      const { apiKey, apiUrl } = getPostizConfig();
      if (apiKey && existing.platformUserId) {
        try {
          await fetch(`${apiUrl}/platforms/${existing.platformUserId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });
        } catch (err) {
          console.error(`[POSTIZ] Failed to stop auto-posting:`, err);
        }
      }

      await ctx.db.patch(existing._id, {
        isConnected: false,
        accessToken: undefined,
        refreshToken: undefined,
        username: undefined,
        platformUserId: undefined,
      });
    }
  },
});

/**
 * Update posting settings
 */
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
      .withIndex("by_platform", q => q.eq("platform", args.platformId))
      .first();
    
    if (!platform) {
      throw new Error("Platform not connected");
    }
    
    const { apiKey, apiUrl } = getPostizConfig();
    
    // Toggle auto-posting via Postiz API
    if (platform.platformUserId) {
      try {
        if (args.mode === "auto") {
          // Resume auto-posting: POST /platforms/{integrationId}/resume
          await fetch(`${apiUrl}/platforms/${platform.platformUserId}/resume`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
        } else if (args.mode === "paused") {
          // Pause auto-posting: POST /platforms/{integrationId}/pause
          await fetch(`${apiUrl}/platforms/${platform.platformUserId}/pause`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
        }
      } catch (err) {
        console.error(`[POSTIZ] Failed to update posting settings:`, err);
      }
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

/**
 * Manual post to a platform via Postiz
 */
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
      .withIndex("by_platform", q => q.eq("platform", args.platformId))
      .first();
    
    if (!platform || !platform.isConnected) {
      throw new Error("Platform not connected");
    }
    
    const { publicApiUrl } = getPostizConfig();

    let externalId = `manual_${Date.now()}`;
    let success = false;
    let errorMsg = "";
    try {
      // Post via Postiz Public API: POST /public/v1/posts
      const integrationId = platform.platformUserId;
      if (!integrationId) {
        errorMsg = "No Postiz integration ID. Connect via Postiz first.";
      } else {
        const response = await fetch(`${publicApiUrl}/posts`, {
          method: 'POST',
          headers: {
            'Authorization': platform.accessToken || "",
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: "now",
            date: new Date().toISOString(),
            shortLink: false,
            tags: [],
            posts: [{
              integration: { id: integrationId },
              value: [{
                content: args.content,
                image: (args.mediaUrls || []).map(url => ({ url })),
              }],
              settings: { __type: args.platformId },
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          externalId = data.id || externalId;
          success = true;
        } else {
          errorMsg = await response.text();
        }
      }
    } catch (err: any) {
      console.error(`[SOCIAL] Post failed:`, err.message);
      errorMsg = err.message;
    }
    
    // Log the post
    await ctx.db.insert("social_posts", {
      agentId: "manual",
      platform: args.platformId,
      content: args.content,
      status: success ? "posted" : "failed",
      scheduledFor: Date.now(),
      postedAt: success ? Date.now() : undefined,
      externalId,
      error: success ? undefined : "Post failed",
    });
    
    await ctx.db.patch(platform._id, {
      postsCount: platform.postsCount + 1,
      lastSyncAt: Date.now(),
    });
    
    return { success, message: success ? "Posted successfully" : "Post failed" };
  },
});

/**
 * Get platform analytics
 */
export const getPlatformAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const leads = await ctx.db.query("leads").collect();
      const transactions = await ctx.db.query("marketplace_transactions").collect();

      const platformStats = SUPPORTED_PLATFORMS.map(p => {
        const platformLeads = leads.filter(l => l.source === p.id || l.source === p.name.toLowerCase());

        return {
          platform: p.id,
          name: p.name,
          icon: p.icon,
          leads: platformLeads.length,
          registrations: platformLeads.filter(l => l.status === "converted").length,
          conversions: platformLeads.filter(l => l.status === "converted").length,
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

/**
 * Get social stats
 */
export const getSocialStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_posts").collect();
    return {
      total: posts.length,
      posted: posts.filter(p => p.status === "posted").length,
      failed: posts.filter(p => p.status === "failed").length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      history: posts.slice(-20).reverse(),
    };
  },
});

// Internal functions for auto-posting
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
      const scheduledFor = Date.now() + (30 * 60 * 1000);
      
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

export const processScheduledPosts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const pendingPosts = await ctx.runQuery(internal.social.getPendingPosts, { now });

    for (const post of pendingPosts) {
      try {
        const platformRecord = await ctx.runQuery(internal.social.getPlatformForPost, { platform: post.platform });

        if (!platformRecord || !platformRecord.accessToken) {
          console.error(`[SOCIAL] No access token for ${post.platform}`);
          await ctx.runMutation(internal.social.markPostFailed, {
            postId: post._id,
            error: "No access token",
          });
          continue;
        }

        const { apiKey, apiUrl } = getPostizConfig();

        const response = await fetch(`${apiUrl}/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integration: platformRecord.platformUserId || platformRecord.username,
            content: post.content,
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
    return await ctx.db.query("social_platforms")
      .withIndex("by_platform", q => q.eq("platform", platform))
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

export const rotateSocialAgents = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"];
    
    const lastPost = await ctx.db.query("social_posts")
      .order("desc")
      .first();
    
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
    const agents = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"];
    
    const lastPost = await ctx.db.query("social_posts")
      .order("desc")
      .first();
    
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
