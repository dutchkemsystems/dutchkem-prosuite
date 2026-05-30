import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE - OAuth Connection & Auto-Posting
 */

// Supported platforms with their OAuth configuration
export const SUPPORTED_PLATFORMS = [
  { id: "x", name: "X (Twitter)", icon: "𝕏", color: "#1DA1F2", scopes: ["tweet.read", "tweet.write", "users.read"] },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2", scopes: ["w_member_social", "r_liteprofile", "r_emailaddress"] },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877F2", scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"] },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#E4405F", scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"] },
  { id: "threads", name: "Threads", icon: "🧵", color: "#000000", scopes: ["threads_basic", "threads_content_publish"] },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000", scopes: ["video.publish", "user.info.basic"] },
  { id: "youtube", name: "YouTube", icon: "🎬", color: "#FF0000", scopes: ["youtube.upload", "youtube.readonly", "youtube.force-ssl"] },
  { id: "pinterest", name: "Pinterest", icon: "📌", color: "#E60023", scopes: ["pins:read", "pins:write", "boards:read"] },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "#FF4500", scopes: ["submit", "read", "identity"] },
  { id: "mastodon", name: "Mastodon", icon: "🐘", color: "#6364FF", scopes: ["read", "write", "follow"] },
] as const;

/**
 * Generate OAuth URL for connecting a platform via Postiz
 */
export const generateOAuthUrl = mutation({
  args: { platform: v.string(), redirectUri: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, redirectUri }) => {
    const platformConfig = SUPPORTED_PLATFORMS.find(p => p.id === platform);
    if (!platformConfig) throw new Error(`Unsupported platform: ${platform}`);

    const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    
    // Store the OAuth state temporarily
    await ctx.db.insert("system_config", {
      key: `oauth_state_${state}`,
      value: { platform, state, createdAt: Date.now() },
      description: `OAuth state for ${platformConfig.name}`,
      updatedAt: Date.now(),
    });

    // Use Postiz API for OAuth flow
    const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';
    const postizKey = process.env.POSTIZ_API_KEY;

    if (!postizKey) {
      // In development, simulate connection
      console.log(`[SOCIAL] No Postiz API key - simulating OAuth for ${platformConfig.name}`);
      
      // Auto-connect in development
      const existing = await ctx.db.query("social_platforms")
        .withIndex("by_platform", q => q.eq("platform", platform))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          username: `dev-${platform}`,
        });
      } else {
        await ctx.db.insert("social_platforms", {
          platform,
          isConnected: true,
          connectedAt: Date.now(),
          lastSyncAt: Date.now(),
          postsCount: 0,
          followersCount: 0,
          username: `dev-${platform}`,
        });
      }

      return { 
        authUrl: null, 
        state, 
        platform: platformConfig,
        devMode: true,
        message: `Development mode: ${platformConfig.name} connected automatically`
      };
    }

    // Production: Generate Postiz OAuth URL
    const scopes = platformConfig.scopes.join(" ");
    const authUrl = `${postizUrl}/api/v1/auth/${platform}?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;

    return { authUrl, state, platform: platformConfig };
  },
});

/**
 * Handle OAuth callback and store connection
 */
export const handleOAuthCallback = mutation({
  args: { platform: v.string(), code: v.string(), state: v.string() },
  returns: v.any(),
  handler: async (ctx, { platform, code, state }) => {
    // Verify state
    const stateConfig = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", `oauth_state_${state}`))
      .first();
    
    if (!stateConfig || stateConfig.value.platform !== platform) {
      throw new Error("Invalid OAuth state");
    }

    // Delete used state
    await ctx.db.delete(stateConfig._id);

    // Exchange code for token via Postiz API
    const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';
    const postizKey = process.env.POSTIZ_API_KEY;

    let accessToken = `token_${code}`;
    let refreshToken = `refresh_${code}`;
    let username = platform;

    if (postizKey) {
      try {
        const response = await fetch(`${postizUrl}/api/v1/auth/${platform}/callback`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${postizKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        if (response.ok) {
          const data = await response.json();
          accessToken = data.access_token || accessToken;
          refreshToken = data.refresh_token || refreshToken;
          username = data.username || data.name || platform;
        }
      } catch (err: any) {
        console.error(`[SOCIAL] OAuth callback exchange failed:`, err.message);
      }
    }

    // Store the connection
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
      });
    }

    return { success: true, platform, username };
  },
});

/**
 * Get all connected platforms
 */
export const getConnectedPlatforms = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
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
      };
    });
    return allPlatforms;
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
      });
    }
  },
});

/**
 * Get platform analytics (visits, registrations, payments per platform)
 */
export const getPlatformAnalytics = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get leads by source
    const leads = await ctx.db.query("leads").collect();
    const users = await ctx.db.query("users").collect();
    const transactions = await ctx.db.query("marketplace_transactions").collect();

    const platformStats = SUPPORTED_PLATFORMS.map(p => {
      const platformLeads = leads.filter(l => l.source === p.id || l.source === p.name.toLowerCase());
      const platformUsers = users.filter(u => {
        const meta = u as any;
        return meta.registrationSource === p.id || meta.signupSource === p.id;
      });

      return {
        platform: p.id,
        name: p.name,
        icon: p.icon,
        leads: platformLeads.length,
        registrations: platformUsers.length,
        conversions: platformLeads.filter(l => l.status === "converted").length,
        revenue: 0,
      };
    });

    // Sort by leads descending
    platformStats.sort((a, b) => b.leads - a.leads);

    const totalLeads = leads.length;
    const totalUsers = users.length;

    return {
      platforms: platformStats,
      totalLeads,
      totalUsers,
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
    };
  },
});

export const generateAndSchedulePost = internalAction({
  args: { agentId: v.string() },
  returns: v.null(),
  handler: async (ctx, { agentId }) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // 1. Get agent details
    const services = await ctx.runQuery(api.updates.getAgentServices, { agent_id: agentId });
    const agentName = services[0]?.name || "Expert Agent";
    const agentDesc = services[0]?.description || "Professional service";

    // 2. Generate engaging content
    const platforms = ["X", "LinkedIn", "Facebook", "Instagram", "Threads"];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    const { text: content } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: `Generate a highly engaging social media post for ${platform} about our "${agentName}" service.
      Agent Description: ${agentDesc}
      Requirements:
      - Use professional yet catchy tone.
      - Include relevant hashtags.
      - Include a Call to Action (CTA) to visit prosuite.ng.
      - Platform specific: ${platform === 'X' ? 'Max 280 chars' : 'Detailed and informative'}.
      Return ONLY the post text.`,
    });

    // 3. Schedule the post in DB
    await ctx.runMutation(internal.social.saveScheduledPost, {
      agentId,
      platform,
      content: content.trim(),
      scheduledFor: Date.now() + (30 * 60 * 1000), // Schedule for 30 mins from now
    });
  },
});

export const saveScheduledPost = internalMutation({
  args: { agentId: v.string(), platform: v.string(), content: v.string(), scheduledFor: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      ...args,
      status: "scheduled",
    });
  },
});

export const processScheduledPosts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const posts = await ctx.runQuery(internal.social.getPendingPosts, { now });

    for (const post of posts) {
      try {
        console.log(`[SOCIAL] Posting to ${post.platform}: ${post.content.substring(0, 50)}...`);
        
        // Use Postiz API for actual posting
        const postizUrl = process.env.POSTIZ_API_URL || 'https://api.postiz.com';
        const postizKey = process.env.POSTIZ_API_KEY;
        
        if (!postizKey) {
          // In development without API key, simulate posting
          console.log(`[SOCIAL] No Postiz API key - simulating post to ${post.platform}`);
          await ctx.runMutation(internal.social.markPostSuccess, { 
            postId: post._id, 
            externalId: `dev-sim-${Date.now()}` 
          });
          continue;
        }

        const response = await fetch(`${postizUrl}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${postizKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: post.content,
            integration: post.platform.toLowerCase(),
            type: "now",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, { 
            postId: post._id, 
            externalId: data.id || data._id || `posted-${Date.now()}` 
          });
          console.log(`[SOCIAL] ✅ Posted to ${post.platform}: ${data.id}`);
        } else {
          const errorData = await response.text();
          throw new Error(`Postiz API ${response.status}: ${errorData}`);
        }
      } catch (err: any) {
        console.error(`[SOCIAL] Failed to post ${post._id}:`, err.message);
        await ctx.runMutation(internal.social.markPostFailed, { 
          postId: post._id, 
          error: err.message 
        });
      }
    }
  },
});

export const getPendingPosts = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    return await ctx.db.query("social_posts")
      .withIndex("by_status_and_scheduled", q => q.eq("status", "scheduled").lte("scheduledFor", now))
      .collect();
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
  },
});

/**
 * SOCIAL CRON HELPERS
 */

export const rotateSocialAgents = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"];
    
    // Simple rotation: check last post
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
