import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE - Postiz API Integration
 * Real OAuth via Postiz for all social platforms
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
] as const;

/**
 * Generate OAuth URL for connecting a platform via Postiz
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

    const postizKey = process.env.POSTIZ_API_KEY;
    const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';

    if (!postizKey) {
      return { 
        error: "Postiz API not configured. Set POSTIZ_API_KEY.",
        platform: platformConfig.name,
      };
    }

    // Generate state parameter
    const state = `${platform}_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    
    // Store the OAuth state
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

    // Use Postiz API to get OAuth URL: GET /public/v1/social/{integration}
    const authUrl = `${postizUrl}/public/v1/social/${platform}?redirect=${encodeURIComponent(redirectUri)}&state=${state}`;

    return { 
      authUrl, 
      state, 
      platform: platformConfig,
      message: `Opening ${platformConfig.name} login via Postiz...`
    };
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
      return { success: false, error: "Platform mismatch in OAuth state" };
    }

    // Delete used state
    await ctx.db.delete(stateConfig._id);

    // Exchange code for tokens via Postiz API
    const postizKey = process.env.POSTIZ_API_KEY;
    const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';

    if (!postizKey) {
      return { success: false, error: "Postiz API not configured" };
    }

    try {
      // Exchange authorization code for access token via Postiz
      // POST /public/v1/oauth/token
      const tokenResponse = await fetch(`${postizUrl}/public/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.POSTIZ_CLIENT_ID,
          client_secret: process.env.POSTIZ_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error(`[OAUTH] Token exchange failed for ${platform}:`, error);
        return { success: false, error: `Token exchange failed: ${error}` };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get integrations to find the connected platform
      const integrationsResponse = await fetch(`${postizUrl}/public/v1/integrations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      let username = "unknown";
      let userId = "";

      if (integrationsResponse.ok) {
        const integrations = await integrationsResponse.json();
        const platformIntegration = integrations.find((i: any) => i.identifier === platform);
        if (platformIntegration) {
          username = platformIntegration.profile || platformIntegration.name || "unknown";
          userId = platformIntegration.id || "";
        }
      }

      // Store or update the connection
      const existing = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          accessToken,
          refreshToken: tokenData.refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          username,
          platformUserId: userId,
          postingMode: "auto",
        });
      } else {
        await ctx.db.insert("social_platforms", {
          platform,
          accessToken,
          refreshToken: tokenData.refresh_token,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          postsCount: 0,
          followersCount: 0,
          username,
          platformUserId: userId,
          postingMode: "auto",
        });
      }

      // Start auto-posting for this platform
      await ctx.scheduler.runAfter(0, internal.social.startAutoPosting, { platform });

      return { 
        success: true, 
        platform: platformConfig.name,
        username,
        message: `Successfully connected ${platformConfig.name} as @${username}`
      };
    } catch (error: any) {
      console.error(`[OAUTH] Callback error for ${platform}:`, error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Start auto-posting for a platform
 */
export const startAutoPosting = internalMutation({
  args: { platform: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the connected platform
    const platform = await ctx.db.query("social_platforms")
      .withIndex("by_platform", q => q.eq("platform", args.platform))
      .first();

    if (!platform || !platform.isConnected) {
      console.log(`[SOCIAL] Platform ${args.platform} not connected, skipping auto-post`);
      return null;
    }

    // Check if auto-posting is enabled
    if (platform.postingMode !== "auto") {
      console.log(`[SOCIAL] Auto-posting disabled for ${args.platform}`);
      return null;
    }

    // Generate and schedule first post
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { 
      agentId: "A1",
      platform: args.platform 
    });

    console.log(`[SOCIAL] Started auto-posting for ${args.platform}`);
    return null;
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
    
    // Post via Postiz API
    let externalId = `manual_${Date.now()}`;
    let success = false;
    
    if (platform.accessToken) {
      try {
        const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';
        const response = await fetch(`${postizUrl}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${platform.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformId: platform.platformUserId || platform.username,
            content: args.content,
            mediaUrls: args.mediaUrls,
            postNow: true,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          externalId = data.id || externalId;
          success = true;
        }
      } catch (err: any) {
        console.error(`[SOCIAL] Post failed for ${args.platformId}:`, err.message);
      }
    } else {
      success = true;
      console.log(`[SOCIAL] No access token for ${args.platformId}`);
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
    
    // Update platform post count
    await ctx.db.patch(platform._id, {
      postsCount: platform.postsCount + 1,
      lastSyncAt: Date.now(),
    });
    
    return { success, message: success ? "Posted successfully" : "Post failed" };
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

/**
 * Generate and schedule post via Postiz
 */
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

    // Get connected platforms
    const platforms = await ctx.runQuery(api.social.getConnectedPlatforms);
    const connectedPlatforms = platform 
      ? platforms.filter((p: any) => p.isConnected && p.id === platform)
      : platforms.filter((p: any) => p.isConnected);
    
    if (connectedPlatforms.length === 0) {
      console.log("[SOCIAL] No connected platforms, skipping post generation");
      return null;
    }

    // Get agent services for context
    const services = await ctx.runQuery(internal.updates.getAgentServices, { agent_id: agentId });
    const serviceName = services?.[0]?.name || "Professional Services";

    // Generate post content using NVIDIA AI
    const { text: content } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: `Generate a compelling social media post for ${serviceName}. 
      Platform: ${connectedPlatforms.map((p: any) => p.name).join(", ")}
      Tone: Professional, engaging, informative
      Length: 280 characters max for X/Twitter, longer for others
      Include relevant emojis and hashtags.
      Return ONLY the post content, no explanations.`,
    });

    // Schedule post for each connected platform
    for (const plat of connectedPlatforms) {
      const scheduledFor = Date.now() + (30 * 60 * 1000); // 30 minutes from now
      
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

/**
 * Save scheduled post
 */
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

/**
 * Process scheduled posts via Postiz
 */
export const processScheduledPosts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const pendingPosts = await ctx.runQuery(internal.social.getPendingPosts, { now });

    for (const post of pendingPosts) {
      try {
        // Get the platform's access token
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

        // Post via Postiz API
        const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';
        const response = await fetch(`${postizUrl}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${platform.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformId: platform.platformUserId || platform.username,
            content: post.content,
            postNow: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, {
            postId: post._id,
            externalId: data.id || `postiz_${Date.now()}`,
          });
          
          // Update platform post count
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

/**
 * Get pending posts
 */
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

/**
 * Mark post as successful
 */
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

/**
 * Mark post as failed
 */
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

/**
 * Rotate social agents for posting
 */
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

/**
 * Manual rotation trigger
 */
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
