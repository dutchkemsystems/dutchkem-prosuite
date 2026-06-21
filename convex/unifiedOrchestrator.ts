import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// UNIFIED ADVERT ORCHESTRATOR
// Connects: Social Engine + Ad Engine + TryPost + Composio + Flyer Engine
// Purpose: Automated posting across all platforms on schedule
// ═══════════════════════════════════════════════════════════════════

// ─── PLATFORM CONFIGURATIONS ───

const PLATFORM_POSTING_TIMES = {
  twitter: { times: ["08:00", "12:00", "18:00"], timezone: "Africa/Lagos" },
  linkedin: { times: ["08:00", "12:00", "17:00"], timezone: "Africa/Lagos" },
  facebook: { times: ["09:00", "13:00", "19:00"], timezone: "Africa/Lagos" },
  instagram: { times: ["11:00", "14:00", "19:00"], timezone: "Africa/Lagos" },
  threads: { times: ["08:00", "12:00", "18:00"], timezone: "Africa/Lagos" },
  tiktok: { times: ["10:00", "15:00", "20:00"], timezone: "Africa/Lagos" },
  youtube: { times: ["14:00", "18:00", "21:00"], timezone: "Africa/Lagos" },
  pinterest: { times: ["09:00", "14:00", "20:00"], timezone: "Africa/Lagos" },
  reddit: { times: ["08:00", "12:00", "18:00"], timezone: "Africa/Lagos" },
  bluesky: { times: ["08:00", "12:00", "18:00"], timezone: "Africa/Lagos" },
  telegram: { times: ["09:00", "13:00", "19:00"], timezone: "Africa/Lagos" },
  discord: { times: ["10:00", "15:00", "20:00"], timezone: "Africa/Lagos" },
};

// ─── UNIFIED ORCHESTRATOR STATUS ───

export const getOrchestratorStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const status = await ctx.db.query("unified_orchestrator_status").first();
    if (!status) {
      return {
        enabled: false,
        autoGenerate: false,
        autoPost: false,
        platforms: [],
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
      };
    }
    return status;
  },
});

export const toggleOrchestrator = mutation({
  args: {
    enabled: v.boolean(),
    autoGenerate: v.optional(v.boolean()),
    autoPost: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("unified_orchestrator_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        autoGenerate: args.autoGenerate ?? existing.autoGenerate,
        autoPost: args.autoPost ?? existing.autoPost,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("unified_orchestrator_status", {
        enabled: args.enabled,
        autoGenerate: args.autoGenerate ?? true,
        autoPost: args.autoPost ?? true,
        platforms: Object.keys(PLATFORM_POSTING_TIMES).map(id => ({ id, enabled: true })),
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

// ─── PLATFORM MANAGEMENT ───

export const togglePlatform = mutation({
  args: {
    platformId: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const status = await ctx.db.query("unified_orchestrator_status").first();
    if (!status) throw new Error("Orchestrator not initialized");

    const platforms = status.platforms.map((p: any) =>
      p.id === args.platformId ? { ...p, enabled: args.enabled } : p
    );

    await ctx.db.patch(status._id, { platforms, updatedAt: Date.now() });
    return { success: true };
  },
});

// ─── CONTENT GENERATION ───

export const generateAdContent = action({
  args: {
    templateId: v.optional(v.string()),
    customHeadline: v.optional(v.string()),
    customDescription: v.optional(v.string()),
    customCta: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken: args.adminToken });
    if (!identity) throw new Error("Unauthorized");

    // Generate content using AI
    const contentResult = await ctx.runMutation(internal.unifiedOrchestrator.generateContentInternal, {
      headline: args.customHeadline || "Dutchkem Ventures ProSuite NG+",
      description: args.customDescription || "15 Expert AI Agents for Business, Academics, and More",
      cta: args.customCta || "Get Started Free",
    });

    return contentResult;
  },
});

export const generateContentInternal = internalMutation({
  args: {
    headline: v.string(),
    description: v.string(),
    cta: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const contentId = await ctx.db.insert("unified_ad_content", {
      headline: args.headline,
      description: args.description,
      cta: args.cta,
      platforms: Object.keys(PLATFORM_POSTING_TIMES),
      usedCount: 0,
      createdAt: now,
    });

    return { success: true, contentId, headline: args.headline };
  },
});

// ─── UNIFIED POSTING ───

export const postToAllPlatforms = action({
  args: {
    contentId: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken: args.adminToken });
    if (!identity) throw new Error("Unauthorized");

    const content = await ctx.runQuery(internal.unifiedOrchestrator.getContentById, { contentId: args.contentId });
    if (!content) throw new Error("Content not found");

    const results: Array<{ platform: string; success: boolean; postId?: string; error?: string }> = [];

    for (const platformId of args.platforms) {
      const platform = PLATFORM_POSTING_TIMES[platformId as keyof typeof PLATFORM_POSTING_TIMES];
      if (!platform) {
        results.push({ platform: platformId, success: false, error: "Unknown platform" });
        continue;
      }

      try {
        // Try TryPost first (MCP server)
        const postId = await ctx.runMutation(internal.trypost.schedulePostInternal, {
          content: content.headline + "\n\n" + content.description + "\n\n" + content.cta,
          platforms: [platformId],
          scheduledFor: args.scheduledFor || Date.now(),
        });

        results.push({ platform: platformId, success: true, postId });
      } catch (e: any) {
        // Fallback to Composio
        try {
          const composioResult = await ctx.runAction(internal.social.postToPlatform, {
            platform: platformId,
            content: content.headline + "\n\n" + content.description + "\n\n" + content.cta,
            adminToken: args.adminToken,
          });
          results.push({ platform: platformId, success: true, postId: composioResult?.postId });
        } catch (e: any) {
          results.push({ platform: platformId, success: false, error: e.message });
        }
      }
    }

    // Log posting activity
    await ctx.runMutation(internal.unifiedOrchestrator.logPostingActivity, {
      contentId: args.contentId,
      platforms: args.platforms,
      results,
    });

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      total: args.platforms.length,
      successful: successCount,
      failed: args.platforms.length - successCount,
      results,
    };
  },
});

export const logPostingActivity = internalMutation({
  args: {
    contentId: v.string(),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("unified_posting_logs", {
      contentId: args.contentId,
      platforms: args.platforms,
      results: args.results,
      timestamp: now,
    });

    // Update content usage count
    const content = await ctx.db.get("unified_ad_content", args.contentId);
    if (content) {
      await ctx.db.patch(args.contentId, {
        usedCount: (content.usedCount || 0) + 1,
        lastUsedAt: now,
      });
    }

    // Update orchestrator stats
    const status = await ctx.db.query("unified_orchestrator_status").first();
    if (status) {
      const successCount = args.results.filter((r: any) => r.success).length;
      await ctx.db.patch(status._id, {
        totalPosted: (status.totalPosted || 0) + successCount,
        lastRun: now,
        updatedAt: now,
      });
    }
  },
});

// ─── SCHEDULED POSTING (CRON) ───

export const processScheduledPosts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const status = await ctx.runQuery(internal.unifiedOrchestrator.getOrchestratorStatusInternal);
    if (!status || !status.enabled || !status.autoPost) {
      return { skipped: true, reason: "Orchestrator disabled" };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find posts due for this time
    const duePosts = await ctx.runQuery(internal.unifiedOrchestrator.getDuePosts, {
      hour: currentHour,
      minute: currentMinute,
    });

    const results: Array<any> = [];
    for (const post of duePosts) {
      try {
        const result = await ctx.runAction(internal.unifiedOrchestrator.executeScheduledPost, {
          postId: post._id,
        });
        results.push({ postId: post._id, ...result });
      } catch (e: any) {
        results.push({ postId: post._id, success: false, error: e.message });
      }
    }

    return { processed: results.length, results };
  },
});

export const getDuePosts = internalQuery({
  args: { hour: v.number(), minute: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unified_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
  },
});

export const executeScheduledPost = internalAction({
  args: { postId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const post = await ctx.db.get("unified_scheduled_posts", args.postId);
    if (!post) return { success: false, error: "Post not found" };

    // Try TryPost first, then fallback to Composio
    try {
      const postId = await ctx.runMutation(internal.trypost.schedulePostInternal, {
        content: post.content,
        platforms: post.platforms,
        scheduledFor: Date.now(),
        hashtags: post.hashtags,
      });

      await ctx.runMutation(internal.unifiedOrchestrator.markPostPublished, {
        postId: args.postId,
        externalId: postId,
      });

      return { success: true, postId };
    } catch (e: any) {
      await ctx.runMutation(internal.unifiedOrchestrator.markPostFailed, {
        postId: args.postId,
        error: e.message,
      });
      return { success: false, error: e.message };
    }
  },
});

export const markPostPublished = internalMutation({
  args: { postId: v.string(), externalId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "published",
      publishedAt: Date.now(),
      externalId: args.externalId,
    });
  },
});

export const markPostFailed = internalMutation({
  args: { postId: v.string(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "failed",
      error: args.error,
    });
  },
});

// ─── CONTENT LIBRARY ───

export const getContentById = internalQuery({
  args: { contentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("unified_ad_content", args.contentId);
  },
});

export const getOrchestratorStatusInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("unified_orchestrator_status").first();
  },
});

export const getAllContent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unified_ad_content")
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getPostingLogs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unified_posting_logs")
      .order("desc")
      .take(args.limit || 50);
  },
});

// ─── PLATFORM SYNC ───

export const syncPlatformStatus = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken: args.adminToken });
    if (!identity) throw new Error("Unauthorized");

    // Get connected platforms from Social Engine
    const connectedPlatforms = await ctx.runQuery(internal.social.getConnectedPlatforms, { adminToken: args.adminToken });

    // Get Composio status
    const composioStatus = await ctx.runQuery(internal.composioHub.getComposioStatus, {});

    // Get TryPost status
    const trypostStatus = await ctx.runQuery(internal.trypost.getPostingSchedule, {});

    return {
      social: connectedPlatforms,
      composio: composioStatus,
      trypost: trypostStatus,
      timestamp: Date.now(),
    };
  },
});

// ─── ANALYTICS ───

export const getAnalytics = query({
  args: { period: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const periodMs = args.period === "week" ? 7 * 86400000 : args.period === "month" ? 30 * 86400000 : 86400000;
    const since = now - periodMs;

    const logs = await ctx.db
      .query("unified_posting_logs")
      .filter((q: any) => q.gte(q.field("timestamp"), since))
      .order("desc")
      .take(100);

    const totalPosts = logs.length;
    const successfulPosts = logs.filter((l: any) => l.results?.some((r: any) => r.success)).length;
    const platformBreakdown: Record<string, { total: number; success: number }> = {};

    for (const log of logs) {
      for (const result of (log.results || [])) {
        if (!platformBreakdown[result.platform]) {
          platformBreakdown[result.platform] = { total: 0, success: 0 };
        }
        platformBreakdown[result.platform].total++;
        if (result.success) platformBreakdown[result.platform].success++;
      }
    }

    return {
      totalPosts,
      successfulPosts,
      successRate: totalPosts > 0 ? Math.round((successfulPosts / totalPosts) * 100) : 0,
      platformBreakdown,
      period: args.period || "day",
    };
  },
});
