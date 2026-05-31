import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE - Postiz API Integration (Correct Endpoints)
 * Uses Postiz API for all social platform connections
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
    apiUrl: process.env.POSTIZ_API_URL || 'https://api.postiz.com/v1',
  };
}

/**
 * Initiate OAuth via Postiz API
 */
export const generateOAuthUrl = mutation({
  args: { 
    platform: v.string(), 
    redirectUri: v.string() 
  },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    const platformConfig = SUPPORTED_PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) throw new Error(`Unsupported platform: ${platform}`);

    const { apiKey, apiUrl } = getPostizConfig();

    if (!apiKey) {
      return { 
        error: "Postiz API not configured",
        platform: platformConfig.name,
      };
    }

    try {
      // Call Postiz API: POST /oauth/initiate
      const response = await fetch(`${apiUrl}/oauth/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,
          redirect_uri: redirectUri,
          state: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[POSTIZ] OAuth initiation error:`, errorText);
        return { success: false, error: `Postiz API error: ${errorText}` };
      }

      const data = await response.json();
      const { auth_url, state } = data;

      // Store state in database
      await ctx.db.insert("system_config", {
        key: `oauth_state_${state}`,
        value: { 
          platform, 
          state, 
          redirectUri,
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 60 * 1000,
        },
        description: `OAuth state for ${platformConfig.name}`,
        updatedAt: Date.now(),
      });

      return { 
        authUrl: auth_url, 
        state, 
        platform: platformConfig,
        message: `Opening ${platformConfig.name} login...`
      };
    } catch (error: any) {
      console.error(`[POSTIZ] Connection error:`, error.message);
      return { success: false, error: `Failed to connect to Postiz: ${error.message}` };
    }
  },
});

/**
 * Handle OAuth callback from Postiz
 */
export const handleOAuthCallback = mutation({
  args: { 
    platform: v.string(), 
    code: v.string(), 
    state: v.string() 
  },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    // Verify state parameter
    const stateConfig = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", `oauth_state_${state}`))
      .first();
    
    if (!stateConfig) {
      return { success: false, error: "Invalid or expired OAuth state" };
    }

    const stateData = stateConfig.value as any;
    if (stateData.platform !== platform) {
      return { success: false, error: "Platform mismatch" };
    }

    // Delete used state
    await ctx.db.delete(stateConfig._id);

    const { apiKey, apiUrl } = getPostizConfig();

    try {
      // Exchange code for token via Postiz API: POST /oauth/token
      const tokenResponse = await fetch(`${apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,
          code: code,
          redirect_uri: stateData.redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        return { success: false, error: `Token exchange failed: ${error}` };
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in, platform_user_id, platform_username } = tokenData;

      // Store the connection
      const existing = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          accessToken: access_token,
          refreshToken: refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          username: platform_username,
          platformUserId: platform_user_id,
          postingMode: "auto",
        });
      } else {
        await ctx.db.insert("social_platforms", {
          platform,
          accessToken: access_token,
          refreshToken: refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          postsCount: 0,
          followersCount: 0,
          username: platform_username,
          platformUserId: platform_user_id,
          postingMode: "auto",
        });
      }

      // Start auto-posting via Postiz API: POST /platforms/connect
      try {
        await fetch(`${apiUrl}/platforms/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: platform,
            access_token: access_token,
            auto_post: true,
            schedule: {
              frequency: 'daily',
              times: ['09:00', '15:00', '21:00'],
            },
          }),
        });
      } catch (err) {
        console.error(`[POSTIZ] Failed to start auto-posting:`, err);
      }

      return { 
        success: true, 
        platform: platformConfig.name,
        username: platform_username,
        message: `Successfully connected ${platformConfig.name} as @${platform_username}`
      };
    } catch (error: any) {
      console.error(`[OAUTH] Callback error:`, error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Get all connected platforms
 */
export const getConnectedPlatforms = query({
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
      console.error("getConnectedPlatforms error:", error);
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
    
    const { apiKey, apiUrl } = getPostizConfig();
    
    let externalId = `manual_${Date.now()}`;
    let success = false;
    
    try {
      // Post via Postiz API: POST /posts
      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration: platform.platformUserId || platform.username,
          content: args.content,
          media: args.mediaUrls,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        externalId = data.id || externalId;
        success = true;
      }
    } catch (err: any) {
      console.error(`[SOCIAL] Post failed:`, err.message);
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

    const platforms = await ctx.runQuery(api.social.getConnectedPlatforms);
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
      
      await ctx.runMutation(api.social.saveScheduledPost, {
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
        const platform = await ctx.db.query("social_platforms")
          .withIndex("by_platform", q => q.eq("platform", post.platform))
          .first();

        if (!platform || !platform.accessToken) {
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
            integration: platform.platformUserId || platform.username,
            content: post.content,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, {
            postId: post._id,
            externalId: data.id || `post_${Date.now()}`,
          });
          
          await ctx.db.patch(platform._id, {
            postsCount: platform.postsCount + 1,
            lastSyncAt: Date.now(),
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
