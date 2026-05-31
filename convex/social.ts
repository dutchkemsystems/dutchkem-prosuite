import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE - Direct OAuth Integration
 * Real OAuth without Postiz middleware
 */

// Supported platforms with their OAuth endpoints
export const SUPPORTED_PLATFORMS = [
  { 
    id: "x", 
    name: "X (Twitter)", 
    icon: "𝕏", 
    color: "#1DA1F2",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  },
  { 
    id: "linkedin", 
    name: "LinkedIn", 
    icon: "💼", 
    color: "#0A66C2",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["w_member_social", "r_liteprofile", "r_emailaddress"],
  },
  { 
    id: "facebook", 
    name: "Facebook", 
    icon: "📘", 
    color: "#1877F2",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
  },
  { 
    id: "instagram", 
    name: "Instagram", 
    icon: "📸", 
    color: "#E4405F",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
  },
  { 
    id: "tiktok", 
    name: "TikTok", 
    icon: "🎵", 
    color: "#000000",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.list"],
  },
  { 
    id: "youtube", 
    name: "YouTube", 
    icon: "🎬", 
    color: "#FF0000",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"],
  },
  { 
    id: "pinterest", 
    name: "Pinterest", 
    icon: "📌", 
    color: "#E60023",
    authUrl: "https://api.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: ["pins:read", "pins:write", "boards:read"],
  },
  { 
    id: "reddit", 
    name: "Reddit", 
    icon: "🤖", 
    color: "#FF4500",
    authUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    scopes: ["submit", "read", "identity"],
  },
  { 
    id: "threads", 
    name: "Threads", 
    icon: "🧵", 
    color: "#000000",
    authUrl: "https://www.threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    scopes: ["threads_basic", "threads_content_publish"],
  },
] as const;

/**
 * Generate OAuth URL for direct platform login
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

    // Get platform credentials from environment
    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || 
                     process.env[`${platform.toUpperCase()}_APP_ID`];
    
    if (!clientId) {
      return { 
        error: `Missing credentials for ${platformConfig.name}. Set ${platform.toUpperCase()}_CLIENT_ID.`,
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

    // Build OAuth URL
    const scopes = platformConfig.scopes.join(" ");
    let authUrl = "";

    switch (platform) {
      case "x":
        authUrl = `${platformConfig.authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
        break;
      case "linkedin":
        authUrl = `${platformConfig.authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
        break;
      case "facebook":
      case "instagram":
        authUrl = `${platformConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
        break;
      case "tiktok":
        authUrl = `${platformConfig.authUrl}?client_key=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
        break;
      case "youtube":
        authUrl = `${platformConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline`;
        break;
      case "pinterest":
        authUrl = `${platformConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
        break;
      case "reddit":
        authUrl = `${platformConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code&duration=permanent`;
        break;
      case "threads":
        authUrl = `${platformConfig.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
        break;
    }

    return { 
      authUrl, 
      state, 
      platform: platformConfig,
      message: `Opening ${platformConfig.name} login...`
    };
  },
});

/**
 * Handle OAuth callback
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

    // Get platform config
    const platformConfig = SUPPORTED_PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) return { success: false, error: "Unknown platform" };

    // Get platform credentials
    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || 
                     process.env[`${platform.toUpperCase()}_APP_ID`];
    const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] || 
                         process.env[`${platform.toUpperCase()}_APP_SECRET`];
    const redirectUri = stateData.redirectUri;

    if (!clientId || !clientSecret) {
      return { success: false, error: `Missing credentials for ${platformConfig.name}` };
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(platformConfig.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error(`[OAUTH] Token exchange failed for ${platform}:`, error);
        return { success: false, error: `Token exchange failed: ${error}` };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Get user info from the platform
      let username = "unknown";
      let userId = "";

      try {
        const userInfo = await getPlatformUserInfo(platform, accessToken);
        username = userInfo.username || userInfo.name || "unknown";
        userId = userInfo.id || "";
      } catch (err) {
        console.error(`[OAUTH] Failed to get user info for ${platform}:`, err);
      }

      // Store or update the connection
      const existing = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          accessToken,
          refreshToken,
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
          refreshToken,
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
 * Get user info from platform
 */
async function getPlatformUserInfo(platform: string, accessToken: string): Promise<any> {
  const endpoints: Record<string, string> = {
    x: "https://api.twitter.com/2/users/me",
    linkedin: "https://api.linkedin.com/v2/userinfo",
    facebook: "https://graph.facebook.com/me?fields=id,name",
    instagram: "https://graph.facebook.com/me?fields=id,name",
    tiktok: "https://open.tiktokapis.com/v2/user/info/?fields=display_name,username",
    youtube: "https://www.googleapis.com/oauth2/v2/userinfo",
    pinterest: "https://api.pinterest.com/v5/user_account",
    reddit: "https://oauth.reddit.com/api/v1/me",
    threads: "https://graph.threads.net/me?fields=id,username",
  };

  const endpoint = endpoints[platform];
  if (!endpoint) throw new Error(`No user info endpoint for ${platform}`);

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Failed to get user info: ${response.status}`);

  const data = await response.json();
  return {
    id: data.id || data.sub || "",
    username: data.username || data.name || data.login || "",
    name: data.name || data.display_name || "",
  };
}

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
 * Manual post to a platform
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
    
    // Post via platform API
    let externalId = `manual_${Date.now()}`;
    let success = false;
    
    if (platform.accessToken) {
      try {
        const result = await postToPlatform(args.platformId, platform.accessToken, args.content, args.mediaUrls);
        externalId = result.id || externalId;
        success = true;
      } catch (err: any) {
        console.error(`[SOCIAL] Post failed for ${args.platformId}:`, err.message);
      }
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
 * Post to platform API
 */
async function postToPlatform(platform: string, accessToken: string, content: string, mediaUrls?: string[]): Promise<any> {
  const postEndpoints: Record<string, string> = {
    x: "https://api.twitter.com/2/tweets",
    linkedin: "https://api.linkedin.com/v2/ugcPosts",
    facebook: "https://graph.facebook.com/v18.0/me/feed",
    instagram: "https://graph.facebook.com/v18.0/me/media",
    tiktok: "https://open.tiktokapis.com/v2/post/publish/",
    youtube: "https://www.googleapis.com/upload/youtube/v3/videos",
    pinterest: "https://api.pinterest.com/v5/pins",
    reddit: "https://oauth.reddit.com/api/submit",
    threads: "https://graph.threads.net/me/threads",
  };

  const endpoint = postEndpoints[platform];
  if (!endpoint) throw new Error(`No post endpoint for ${platform}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: content, content }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Post failed: ${error}`);
  }

  return await response.json();
}

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

        const result = await postToPlatform(post.platform, platform.accessToken, post.content);
        
        await ctx.runMutation(internal.social.markPostSuccess, {
          postId: post._id,
          externalId: result.id || `post_${Date.now()}`,
        });
        
        await ctx.db.patch(platform._id, {
          postsCount: platform.postsCount + 1,
          lastSyncAt: Date.now(),
        });
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
