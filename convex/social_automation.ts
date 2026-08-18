import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// SOCIAL AUTOMATION ENGINE
// Unified system: check connections → refresh tokens → generate content → post
// ═══════════════════════════════════════════════════════════════════

const ALL_PLATFORMS = ["x", "linkedin", "facebook", "instagram", "tiktok", "youtube", "pinterest", "reddit", "threads", "telegram", "discord", "bluesky"];

const PLATFORM_POST_LIMITS: Record<string, number> = {
  x: 280, linkedin: 3000, facebook: 63206, instagram: 2200,
  tiktok: 2200, youtube: 5000, pinterest: 500, reddit: 40000,
  threads: 500, telegram: 4096, discord: 2000, bluesky: 300,
};

// ═══════════════════════════════════════════════════════════════════
// 1. CONNECTION STATUS CHECK
// ═══════════════════════════════════════════════════════════════════

export const getConnectionStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const connections = await ctx.db.query("platform_connections").collect();
    
    const status = ALL_PLATFORMS.map(platform => {
      const conn = connections.find((c: any) => c.platformId === platform && c.isConnected);
      const expired = conn && conn.expiresAt && conn.expiresAt < Date.now();
      const expiringSoon = conn && conn.expiresAt && conn.expiresAt < Date.now() + 7 * 24 * 60 * 60 * 1000;
      
      return {
        platform,
        connected: !!conn,
        expired,
        expiringSoon,
        expiresAt: conn?.expiresAt || null,
        integrationId: conn?.integrationId || null,
        lastTokenRefresh: conn?.lastTokenRefresh || null,
      };
    });

    const connected = status.filter(s => s.connected && !s.expired);
    const expired = status.filter(s => s.expired);
    const expiringSoon = status.filter(s => s.expiringSoon && !s.expired);
    const disconnected = status.filter(s => !s.connected);

    return {
      platforms: status,
      summary: {
        total: ALL_PLATFORMS.length,
        connected: connected.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        disconnected: disconnected.length,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. TOKEN REFRESH FOR ALL PLATFORMS
// ═══════════════════════════════════════════════════════════════════

export const refreshAllTokens = action({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results: Array<{ platform: string; status: string; error?: string }> = [];

    // Get all connections
    const connections = await ctx.runQuery(internal.social_automation._getAllConnections);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const conn of connections) {
      if (!conn.isConnected) continue;
      
      const isExpired = conn.expiresAt && conn.expiresAt < now;
      const isExpiringSoon = conn.expiresAt && conn.expiresAt < now + sevenDays;
      
      if (!isExpired && !isExpiringSoon) {
        results.push({ platform: conn.platformId, status: "skipped", error: "Token still valid" });
        continue;
      }

      try {
        // For Composio connections, trigger sync
        if (conn.integrationId === "composio") {
          const syncResult = await ctx.runAction(internal.composio_token_sync.forceReconnectComposio, {
            platform: conn.platformId,
          });
          results.push({
            platform: conn.platformId,
            status: syncResult.success ? "refreshed" : "failed",
            error: syncResult.error || syncResult.oauthUrl,
          });
        } 
        // For direct connections with refresh tokens
        else if (conn.refreshToken) {
          const refreshResult = await ctx.runAction(internal.social_automation._refreshDirectToken, {
            platform: conn.platformId,
            refreshToken: conn.refreshToken,
          });
          results.push({
            platform: conn.platformId,
            status: refreshResult.success ? "refreshed" : "failed",
            error: refreshResult.error,
          });
        }
        // No refresh token available
        else {
          results.push({
            platform: conn.platformId,
            status: "needs_reauth",
            error: "No refresh token - requires re-authorization",
          });
        }
      } catch (err: any) {
        results.push({ platform: conn.platformId, status: "error", error: err.message });
      }
    }

    const refreshed = results.filter(r => r.status === "refreshed").length;
    const failed = results.filter(r => r.status === "failed" || r.status === "error").length;
    const needsReauth = results.filter(r => r.status === "needs_reauth").length;

    return { results, summary: { refreshed, failed, needsReauth, total: results.length } };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. UNIFIED CONTENT POSTING
// ═══════════════════════════════════════════════════════════════════

export const postToAllConnected = action({
  args: {
    adminToken: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    scheduleFor: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Get connected platforms
    const status = await ctx.runQuery(internal.social_automation.getConnectionStatus, {});
    const targetPlatforms = args.platforms || status.platforms
      .filter((p: any) => p.connected && !p.expired)
      .map((p: any) => p.platform);

    if (targetPlatforms.length === 0) {
      return { error: "No connected platforms available" };
    }

    const results: Array<{ platform: string; success: boolean; postId?: string; error?: string }> = [];

    for (const platform of targetPlatforms) {
      try {
        // Truncate content to platform limit
        const limit = PLATFORM_POST_LIMITS[platform] || 2000;
        const truncatedContent = args.content.length > limit
          ? args.content.slice(0, limit - 3) + "..."
          : args.content;

        const postResult = await ctx.runAction(internal.social.postToPlatform, {
          platform,
          content: truncatedContent,
          imageUrl: args.imageUrl,
          scheduledFor: args.scheduleFor,
        });

        results.push({
          platform,
          success: postResult.success || false,
          postId: postResult.postId,
          error: postResult.error,
        });
      } catch (err: any) {
        results.push({ platform, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Log the batch post
    await ctx.runMutation(internal.social_automation._logBatchPost, {
      content: args.content,
      platforms: targetPlatforms,
      results,
      postedBy: session._id,
    });

    return {
      success: successCount > 0,
      posted: successCount,
      failed: failCount,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 4. AUTO-GENERATE AND POST (Full Pipeline)
// ═══════════════════════════════════════════════════════════════════

export const autoGenerateAndPost = action({
  args: {
    adminToken: v.string(),
    contentType: v.union(v.literal("flyer"), v.literal("poster"), v.literal("video"), v.literal("text")),
    customPrompt: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Step 1: Check connected platforms
    const status = await ctx.runQuery(internal.social_automation.getConnectionStatus, {});
    const connectedPlatforms = (args.platforms || status.platforms
      .filter((p: any) => p.connected && !p.expired)
      .map((p: any) => p.platform));

    if (connectedPlatforms.length === 0) {
      return { error: "No connected platforms. Connect platforms first." };
    }

    // Step 2: Generate content based on type
    let contentResult: any = null;
    let imageUrl: string | undefined;

    switch (args.contentType) {
      case "flyer": {
        const agentIds = ["A1", "A2", "A3", "A4", "A5"];
        const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
        contentResult = await ctx.runAction(internal.flyer_engine.generateFlyerInternal, {
          platform: connectedPlatforms[0],
          forceMode: undefined,
        });
        if (contentResult?.flyerUrl) imageUrl = contentResult.flyerUrl;
        break;
      }
      case "poster": {
        const agentIds = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"];
        const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
        contentResult = await ctx.runAction(internal.poster_generator.generatePosterImageAction, {
          adminToken: args.adminToken,
          agentId,
          platform: connectedPlatforms[0],
          customPrompt: args.customPrompt,
        });
        if (contentResult?.imageUrl) imageUrl = contentResult.imageUrl;
        break;
      }
      case "video": {
        contentResult = await ctx.runAction(internal.video_production.produceFullVideo, {
          prompt: args.customPrompt || "Dutchkem Ventures AI platform promotional video",
          quality: "hd",
          targetDuration: 15,
          includeAudio: false,
        });
        if (contentResult?.videoUrl) imageUrl = contentResult.videoUrl;
        break;
      }
      case "text": {
        contentResult = {
          success: true,
          text: args.customPrompt || "Dutchkem Ventures ProSuite NG+ — 15 AI Agents working 24/7 for your business. Start free at dutchkem-prosuite-app.vercel.app",
        };
        break;
      }
    }

    if (!contentResult?.success && !contentResult?.text) {
      return { error: `Failed to generate ${args.contentType}`, details: contentResult };
    }

    // Step 3: Post to all connected platforms
    const textContent = contentResult.text || `${args.contentType === "flyer" ? "New flyer" : args.contentType === "poster" ? "New poster" : args.contentType === "video" ? "New video" : "Check this out"} from Dutchkem Ventures! #AI #Business #Nigeria #DutchkemProsuite`;

    const postResult = await ctx.runAction(internal.social_automation.postToAllConnected, {
      adminToken: args.adminToken,
      content: textContent,
      imageUrl,
      platforms: connectedPlatforms,
    });

    return {
      success: true,
      contentType: args.contentType,
      generated: contentResult,
      posted: postResult,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. SCHEDULED POSTING (Cron-driven)
// ═══════════════════════════════════════════════════════════════════

export const scheduledPostTick = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const results: Array<{ platform: string; content: string; status: string; error?: string }> = [];

    // Get connected platforms
    const connections = await ctx.db.query("platform_connections").collect();
    const connected = connections.filter((c: any) => c.isConnected && (!c.expiresAt || c.expiresAt > now));

    if (connected.length === 0) {
      return { skipped: true, reason: "No connected platforms" };
    }

    // Rotate content types: flyer → poster → video → text
    const contentTypes = ["flyer", "poster", "video", "text"] as const;
    const hour = new Date().getHours();
    const contentType = contentTypes[hour % contentTypes.length];

    // Generate content
    let imageUrl: string | undefined;
    let textContent: string;

    switch (contentType) {
      case "flyer": {
        const result = await ctx.runAction(internal.flyer_engine.generateFlyerInternal, {
          platform: connected[0].platformId,
        });
        if (result?.flyerUrl) imageUrl = result.flyerUrl;
        textContent = "New AI-powered flyer from Dutchkem Ventures! #AI #Business #Nigeria";
        break;
      }
      case "poster": {
        const agentIds = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"];
        const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
        const result = await ctx.runAction(internal.poster_generator.generatePosterImageAction, {
          adminToken: "cron",
          agentId,
          platform: connected[0].platformId,
        });
        if (result?.imageUrl) imageUrl = result.imageUrl;
        textContent = `Check out ${agentId} AI agent from Dutchkem Ventures! #AI #Agent`;
        break;
      }
      case "video": {
        const result = await ctx.runAction(internal.video_production.produceFullVideo, {
          prompt: "Dutchkem Ventures AI platform promotional video",
          quality: "hd",
          targetDuration: 15,
          includeAudio: false,
        });
        if (result?.videoUrl) imageUrl = result.videoUrl;
        textContent = "Watch our AI agents in action! #AI #Video #DutchkemProsuite";
        break;
      }
      default: {
        textContent = "Dutchkem Ventures ProSuite NG+ — 15 AI Agents working 24/7 for your business. Start free today! #AI #Business #Nigeria #Automation";
      }
    }

    // Post to each connected platform
    for (const conn of connected) {
      try {
        const limit = PLATFORM_POST_LIMITS[conn.platformId] || 2000;
        const content = textContent.length > limit ? textContent.slice(0, limit - 3) + "..." : textContent;

        await ctx.runAction(internal.social.postToPlatform, {
          platform: conn.platformId,
          content,
          imageUrl,
        });

        results.push({ platform: conn.platformId, content: contentType, status: "posted" });
      } catch (err: any) {
        results.push({ platform: conn.platformId, content: contentType, status: "failed", error: err.message });
      }
    }

    // Log the automated post
    await ctx.runMutation(internal.social_automation._logAutomatedPost, {
      contentType,
      platforms: results.map(r => r.platform),
      results,
    });

    return { success: true, contentType, posted: results.filter(r => r.status === "posted").length, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS & QUERIES
// ═══════════════════════════════════════════════════════════════════

export const _getAllConnections = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections").collect();
  },
});

export const _refreshDirectToken = internalAction({
  args: { platform: v.string(), refreshToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const tokenUrls: Record<string, string> = {
        x: "https://api.twitter.com/2/oauth2/token",
        linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
        facebook: "https://graph.facebook.com/v19.0/oauth/access_token",
        reddit: "https://www.reddit.com/api/v1/access_token",
        discord: "https://discord.com/api/v10/oauth2/token",
        pinterest: "https://api.pinterest.com/v5/oauth/token",
      };

      const tokenUrl = tokenUrls[args.platform];
      if (!tokenUrl) return { success: false, error: `No token URL for ${args.platform}` };

      // Platform-specific client IDs from env
      const clientIds: Record<string, { id: string; secret: string } | null> = {
        x: process.env.TWITTER_CLIENT_ID ? { id: process.env.TWITTER_CLIENT_ID, secret: process.env.TWITTER_CLIENT_SECRET || "" } : null,
        linkedin: process.env.LINKEDIN_CLIENT_ID ? { id: process.env.LINKEDIN_CLIENT_ID, secret: process.env.LINKEDIN_CLIENT_SECRET || "" } : null,
        facebook: process.env.FACEBOOK_APP_ID ? { id: process.env.FACEBOOK_APP_ID, secret: process.env.FACEBOOK_APP_SECRET || "" } : null,
      };

      const creds = clientIds[args.platform];
      if (!creds) return { success: false, error: `No client credentials for ${args.platform}` };

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: args.refreshToken,
          client_id: creds.id,
          client_secret: creds.secret,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }

      const data = await response.json() as any;
      
      // Update the connection with new tokens
      const connections = await ctx.runQuery(internal.social_automation._getAllConnections);
      const conn = connections.find((c: any) => c.platformId === args.platform && c.isConnected);
      if (conn) {
        await ctx.runMutation(internal.social_automation._updateConnectionTokens, {
          connectionId: conn._id,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || args.refreshToken,
          expiresIn: data.expires_in || 3600,
        });
      }

      return { success: true, expiresIn: data.expires_in };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

export const _updateConnectionTokens = internalMutation({
  args: {
    connectionId: v.id("platform_connections"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: Date.now() + args.expiresIn * 1000,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const _logBatchPost = internalMutation({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
    postedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Insert one record per platform (schema requires single platform field)
    for (let i = 0; i < args.platforms.length; i++) {
      const platform = args.platforms[i];
      const result = args.results[i];
      await ctx.db.insert("social_posts", {
        agentId: "automation",
        platform,
        content: args.content,
        status: result?.success ? "posted" : "failed",
        scheduledFor: Date.now(),
        postedAt: result?.success ? Date.now() : undefined,
        error: result?.error,
        adminId: args.postedBy,
      });
    }
    return null;
  },
});

export const _logAutomatedPost = internalMutation({
  args: {
    contentType: v.string(),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.platforms.length; i++) {
      const platform = args.platforms[i];
      const result = args.results[i];
      await ctx.db.insert("social_posts", {
        agentId: "automation",
        platform,
        content: `[Auto] ${args.contentType}`,
        status: result?.status === "posted" ? "posted" : "failed",
        scheduledFor: Date.now(),
        postedAt: result?.status === "posted" ? Date.now() : undefined,
        error: result?.error,
        adminId: "system",
      });
    }
    return null;
  },
});
