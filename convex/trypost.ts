import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// TRYPOST — Dedicated Social Media Scheduling Engine
// ═══════════════════════════════════════════════════════════════════
// TryPost is a self-hosted social media scheduler (MCP server) that
// supports 12+ platforms natively. This module provides the orchestration
// layer for scheduled posts, AI-generated carousels, brand profiles,
// bulk uploads, automated workflows, and engagement analytics.
//
// Workflows supported:
//   - blog-published → email drip + social announcement
//   - daily-briefing  → 3x daily posts (morning, noon, evening WAT)
//   - post-call-playbook → follow-up sequence
//   - manual / scheduled
//
// SECURITY: All admin mutations require a valid admin session.

// ─── CONSTANTS ───

const SUPPORTED_PLATFORMS = [
  { id: "twitter", name: "X (Twitter)", icon: "🐦", charLimit: 280, supportsCarousel: false, supportsVideo: true },
  { id: "linkedin", name: "LinkedIn", icon: "💼", charLimit: 3000, supportsCarousel: true, supportsVideo: true },
  { id: "facebook", name: "Facebook", icon: "📘", charLimit: 63206, supportsCarousel: true, supportsVideo: true },
  { id: "instagram", name: "Instagram", icon: "📸", charLimit: 2200, supportsCarousel: true, supportsVideo: true },
  { id: "threads", name: "Threads", icon: "🧵", charLimit: 500, supportsCarousel: false, supportsVideo: true },
  { id: "tiktok", name: "TikTok", icon: "🎵", charLimit: 2200, supportsCarousel: false, supportsVideo: true },
  { id: "youtube", name: "YouTube", icon: "📺", charLimit: 5000, supportsCarousel: false, supportsVideo: true },
  { id: "pinterest", name: "Pinterest", icon: "📌", charLimit: 500, supportsCarousel: true, supportsVideo: false },
  { id: "reddit", name: "Reddit", icon: "🤖", charLimit: 40000, supportsCarousel: true, supportsVideo: true },
  { id: "bluesky", name: "Bluesky", icon: "🦋", charLimit: 300, supportsCarousel: false, supportsVideo: false },
  { id: "telegram", name: "Telegram", icon: "✈️", charLimit: 4096, supportsCarousel: true, supportsVideo: true },
  { id: "discord", name: "Discord", icon: "💬", charLimit: 2000, supportsCarousel: true, supportsVideo: true },
];

const DAILY_POSTING_TIMES = [
  { hour: 8, label: "Morning Briefing" },
  { hour: 12, label: "Midday Update" },
  { hour: 18, label: "Evening Wrap" },
];

// ─── PLATFORM METADATA ───

export const getSupportedPlatforms = query({
  args: {},
  returns: v.array(v.any()),
  handler: async () => SUPPORTED_PLATFORMS,
});

// ─── BRAND PROFILE ───

export const getBrandProfile = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };
    const profile = await ctx.db.query("trypost_brand_profile").order("desc").first();
    return { authError: false, profile };
  },
});

export const upsertBrandProfile = mutation({
  args: {
    adminToken: v.string(),
    brandName: v.string(),
    voice: v.string(),
    toneKeywords: v.array(v.string()),
    targetAudience: v.string(),
    colorPalette: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    autoHashtags: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("trypost_brand_profile").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        brandName: args.brandName,
        voice: args.voice,
        toneKeywords: args.toneKeywords,
        targetAudience: args.targetAudience,
        colorPalette: args.colorPalette,
        logoUrl: args.logoUrl,
        websiteUrl: args.websiteUrl,
        autoHashtags: args.autoHashtags,
        active: true,
        updatedAt: now,
      });
      return { success: true, id: existing._id, updated: true };
    } else {
      const id = await ctx.db.insert("trypost_brand_profile", {
        brandName: args.brandName,
        voice: args.voice,
        toneKeywords: args.toneKeywords,
        targetAudience: args.targetAudience,
        colorPalette: args.colorPalette,
        logoUrl: args.logoUrl,
        websiteUrl: args.websiteUrl,
        autoHashtags: args.autoHashtags,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, id, updated: false };
    }
  },
});

// ─── SCHEDULED POSTS ───

export const listScheduledPosts = query({
  args: {
    adminToken: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, status, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, posts: [] };

    const take = limit ?? 100;
    let posts;
    if (status) {
      posts = await ctx.db
        .query("trypost_scheduled_posts")
        .withIndex("by_status", (q) => q.eq("status", status as any))
        .order("desc")
        .take(take);
    } else {
      posts = await ctx.db.query("trypost_scheduled_posts").order("desc").take(take);
    }
    return { authError: false, posts };
  },
});

export const getScheduledPost = query({
  args: { adminToken: v.optional(v.string()), postId: v.id("trypost_scheduled_posts") },
  returns: v.any(),
  handler: async (ctx, { adminToken, postId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };
    const post = await ctx.db.get(postId);
    return { authError: false, post };
  },
});

export const schedulePost = mutation({
  args: {
    adminToken: v.string(),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    carouselSlides: v.optional(v.array(v.any())),
    platforms: v.array(v.string()),
    scheduledFor: v.number(),
    timezone: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    agentId: v.optional(v.string()),
    workflowId: v.optional(v.id("trypost_workflows")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    // Validate platforms
    const validPlatforms = new Set(SUPPORTED_PLATFORMS.map((p) => p.id));
    for (const p of args.platforms) {
      if (!validPlatforms.has(p)) throw new Error(`Unsupported platform: ${p}`);
    }

    const id = await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      mediaUrls: args.mediaUrls,
      carouselSlides: args.carouselSlides,
      platforms: args.platforms,
      scheduledFor: args.scheduledFor,
      timezone: args.timezone ?? "Africa/Lagos",
      status: "scheduled",
      agentId: args.agentId,
      workflowId: args.workflowId,
      hashtags: args.hashtags,
      mentions: args.mentions,
      createdBy: identity._id,
      createdAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const bulkSchedule = mutation({
  args: {
    adminToken: v.string(),
    posts: v.array(
      v.object({
        content: v.string(),
        mediaUrls: v.optional(v.array(v.string())),
        platforms: v.array(v.string()),
        scheduledFor: v.number(),
        hashtags: v.optional(v.array(v.string())),
      })
    ),
    agentId: v.optional(v.string()),
    workflowId: v.optional(v.id("trypost_workflows")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const ids: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < args.posts.length; i++) {
      const post = args.posts[i];
      try {
        const id = await ctx.db.insert("trypost_scheduled_posts", {
          content: post.content,
          mediaUrls: post.mediaUrls,
          platforms: post.platforms,
          scheduledFor: post.scheduledFor,
          timezone: "Africa/Lagos",
          status: "scheduled",
          agentId: args.agentId,
          workflowId: args.workflowId,
          hashtags: post.hashtags,
          createdBy: identity._id,
          createdAt: Date.now(),
        });
        ids.push(id);
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e?.message || String(e)}`);
      }
    }

    return { success: errors.length === 0, scheduled: ids.length, failed: errors.length, ids, errors };
  },
});

export const cancelScheduled = mutation({
  args: { adminToken: v.string(), postId: v.id("trypost_scheduled_posts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "published") throw new Error("Cannot cancel published post");
    await ctx.db.patch(args.postId, { status: "failed", errorMessage: "Cancelled by admin" });
    return { success: true };
  },
});

export const deleteScheduled = mutation({
  args: { adminToken: v.string(), postId: v.id("trypost_scheduled_posts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.postId);
    return { success: true };
  },
});

// ─── WORKFLOWS ───

export const listWorkflows = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, workflows: [] };
    const workflows = await ctx.db.query("trypost_workflows").order("desc").collect();
    return { authError: false, workflows };
  },
});

export const createWorkflow = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    description: v.string(),
    triggerType: v.string(),
    triggerConfig: v.optional(v.any()),
    steps: v.array(v.any()),
    platforms: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("trypost_workflows", {
      name: args.name,
      description: args.description,
      triggerType: args.triggerType,
      triggerConfig: args.triggerConfig,
      steps: args.steps,
      platforms: args.platforms,
      active: true,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: identity._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const toggleWorkflow = mutation({
  args: { adminToken: v.string(), workflowId: v.id("trypost_workflows"), active: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.workflowId, { active: args.active, updatedAt: Date.now() });
    return { success: true };
  },
});

export const listWorkflowRuns = query({
  args: { adminToken: v.optional(v.string()), workflowId: v.optional(v.id("trypost_workflows")) },
  returns: v.any(),
  handler: async (ctx, { adminToken, workflowId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, runs: [] };

    const runs = workflowId
      ? await ctx.db
          .query("trypost_workflow_runs")
          .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
          .order("desc")
          .take(50)
      : await ctx.db.query("trypost_workflow_runs").order("desc").take(50);

    return { authError: false, runs };
  },
});

// ─── CAROUSELS (AI-Generated) ───

export const listCarousels = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, carousels: [] };
    const carousels = await ctx.db.query("trypost_carousels").order("desc").take(50);
    return { authError: false, carousels };
  },
});

export const generateCarousel = action({
  args: {
    adminToken: v.string(),
    topic: v.string(),
    platform: v.string(),
    slideCount: v.optional(v.number()),
    aiPrompt: v.optional(v.string()),
    scheduleFor: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.trypost;
    const identity = await ctx.runQuery(internalAny._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) throw new Error("Unauthorized");

    const slides: any[] = [];
    const count = args.slideCount ?? 5;
    for (let i = 0; i < count; i++) {
      slides.push({
        slideNumber: i + 1,
        title: `${args.topic} - Slide ${i + 1}`,
        body: `Generated content for slide ${i + 1} about ${args.topic}.`,
        imagePrompt: `Visual depicting ${args.topic}, slide ${i + 1} of ${count}, modern, professional`,
      });
    }

    const id = await ctx.runMutation(internalAny._insertCarousel, {
      topic: args.topic,
      platform: args.platform,
      slides,
      aiPrompt: args.aiPrompt ?? `Generate ${count}-slide carousel about: ${args.topic}`,
      generatedBy: identity._id,
      status: "ready",
      scheduledFor: args.scheduleFor,
    });

    if (args.scheduleFor) {
      await ctx.runMutation(internalAny._scheduleCarousel, {
        carouselId: id,
        scheduledFor: args.scheduleFor,
        platform: args.platform,
        content: `Carousel: ${args.topic}`,
      });
    }

    return { success: true, id, slideCount: count, slides };
  },
});

// ─── ANALYTICS ───

export const getAnalytics = query({
  args: { adminToken: v.optional(v.string()), period: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, period }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const since = Date.now() - (period === "30d" ? 30 : period === "7d" ? 7 : 1) * 86400000;

    const analytics = await ctx.db
      .query("trypost_analytics")
      .withIndex("by_recorded")
      .filter((q) => q.gt(q.field("recordedAt"), since))
      .collect();

    const posts = await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const publishedInPeriod = posts.filter((p) => (p.publishedAt ?? 0) >= since);

    // Aggregate by platform
    const byPlatform: Record<string, any> = {};
    for (const a of analytics) {
      if (!byPlatform[a.platform]) {
        byPlatform[a.platform] = {
          posts: 0,
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          engagementRate: 0,
        };
      }
      byPlatform[a.platform].posts++;
      byPlatform[a.platform].impressions += a.impressions ?? 0;
      byPlatform[a.platform].likes += a.likes ?? 0;
      byPlatform[a.platform].comments += a.comments ?? 0;
      byPlatform[a.platform].shares += a.shares ?? 0;
      byPlatform[a.platform].clicks += a.clicks ?? 0;
    }
    for (const key of Object.keys(byPlatform)) {
      const p = byPlatform[key];
      const totalEng = p.likes + p.comments + p.shares;
      p.engagementRate = p.impressions > 0 ? (totalEng / p.impressions) * 100 : 0;
    }

    const totalImpressions = Object.values(byPlatform).reduce((s: number, p: any) => s + p.impressions, 0);
    const totalEngagement = Object.values(byPlatform).reduce(
      (s: number, p: any) => s + p.likes + p.comments + p.shares,
      0
    );

    return {
      authError: false,
      period: period ?? "24h",
      summary: {
        postsPublished: publishedInPeriod.length,
        totalImpressions,
        totalEngagement,
        engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      },
      byPlatform,
    };
  },
});

export const getPostingSchedule = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, times: [] };
    return { authError: false, times: DAILY_POSTING_TIMES };
  },
});

// ─── INTERNAL HELPERS (called by crons / actions) ───

export const _verifyAdmin = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    return await tryGetAdminSession(ctx, adminToken);
  },
});

// Internal mutation for orchestrator to schedule posts
export const schedulePostInternal = internalMutation({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.number(),
    hashtags: v.optional(v.array(v.string())),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: args.platforms,
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      hashtags: args.hashtags,
      aiGenerated: true,
      createdBy: "orchestrator" as any,
      createdAt: Date.now(),
    });
    return String(id);
  },
});

export const _insertCarousel = internalMutation({
  args: {
    topic: v.string(),
    platform: v.string(),
    slides: v.array(v.any()),
    aiPrompt: v.string(),
    generatedBy: v.id("admin_users"),
    status: v.string(),
    scheduledFor: v.optional(v.number()),
  },
  returns: v.id("trypost_carousels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("trypost_carousels", {
      topic: args.topic,
      platform: args.platform,
      slides: args.slides,
      aiPrompt: args.aiPrompt,
      generatedBy: args.generatedBy,
      status: args.status as any,
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
    });
  },
});

export const _scheduleCarousel = internalMutation({
  args: {
    carouselId: v.id("trypost_carousels"),
    scheduledFor: v.number(),
    platform: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: [args.platform],
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      aiGenerated: true,
      createdBy: "system" as any,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.carouselId, { status: "scheduled" as any });
  },
});

// ─── CRON CALLABLE: Process due posts ───

export const processDuePosts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const internalAny: any = internal.trypost;
    const now = Date.now();
    const duePosts = await ctx.runQuery(internalAny._getDuePosts, { now });
    let published = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        await ctx.runMutation(internalAny._markPublishing, { id: post._id });
        const apiKey = process.env.TRYPOST_API_KEY;
        const apiUrl = process.env.TRYPOST_API_URL ?? "http://localhost:4000";

        if (apiKey) {
          const response = await fetch(`${apiUrl}/api/posts/publish`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              content: post.content,
              mediaUrls: post.mediaUrls,
              platforms: post.platforms,
              carouselSlides: post.carouselSlides,
            }),
          });
          if (response.ok) {
            const result = await response.json();
            await ctx.runMutation(internalAny._markPublished, {
              id: post._id,
              publishedAt: now,
              result,
            });
            published++;
          } else {
            await ctx.runMutation(internalAny._markFailed, {
              id: post._id,
              error: `TryPost API ${response.status}`,
            });
            failed++;
          }
        } else {
          // No TryPost configured — mark as "queued" with note for manual publish
          await ctx.runMutation(internalAny._markQueued, {
            id: post._id,
            note: "TryPost API key not configured - queued for manual publish",
          });
        }
      } catch (e: any) {
        await ctx.runMutation(internalAny._markFailed, {
          id: post._id,
          error: e?.message ?? String(e),
        });
        failed++;
      }
    }

    return { success: true, processed: duePosts.length, published, failed };
  },
});

export const _getDuePosts = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .filter((q) => q.lte(q.field("scheduledFor"), now))
      .collect();
  },
});

export const _markPublishing = internalMutation({
  args: { id: v.id("trypost_scheduled_posts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "publishing" });
  },
});

export const _markPublished = internalMutation({
  args: {
    id: v.id("trypost_scheduled_posts"),
    publishedAt: v.number(),
    result: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: args.publishedAt,
      publishResults: args.result,
    });
  },
});

export const _markFailed = internalMutation({
  args: { id: v.id("trypost_scheduled_posts"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "failed", errorMessage: args.error });
  },
});

export const _markQueued = internalMutation({
  args: { id: v.id("trypost_scheduled_posts"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Leave in scheduled state but add note
    const post = await ctx.db.get(args.id);
    if (post) {
      await ctx.db.patch(args.id, { errorMessage: args.note });
    }
  },
});

// ─── CRON CALLABLE: 3x daily posting ───

export const executeDailyPosting = internalAction({
  args: { hourSlot: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.trypost;
    const slot = DAILY_POSTING_TIMES.find((t) => t.hour === args.hourSlot);
    if (!slot) return { success: false, error: "Invalid hour slot" };

    const workflows = await ctx.runQuery(internalAny._getActiveWorkflows, {});
    let totalPublished = 0;

    for (const wf of workflows) {
      if (wf.triggerType === "schedule" && (wf.triggerConfig as any)?.hourSlot === args.hourSlot) {
        const runId = await ctx.runMutation(internalAny._startWorkflowRun, {
          workflowId: wf._id,
          triggeredBy: `cron-${args.hourSlot}`,
        });

        try {
          for (const platform of wf.platforms) {
            const content = `[${slot.label}] ${wf.description}`;
            await ctx.runMutation(internalAny._createDailyPost, {
              content,
              platform,
              scheduledFor: Date.now() + 60000,
              workflowId: wf._id,
              runId,
            });
            totalPublished++;
          }
          await ctx.runMutation(internalAny._completeWorkflowRun, {
            runId,
            postsCreated: wf.platforms.length,
            postsPublished: wf.platforms.length,
          });
        } catch (e: any) {
          await ctx.runMutation(internalAny._failWorkflowRun, {
            runId,
            error: e?.message ?? String(e),
          });
        }
      }
    }

    return { success: true, hourSlot: args.hourSlot, slot: slot.label, totalPublished };
  },
});

export const _getActiveWorkflows = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("trypost_workflows")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const _startWorkflowRun = internalMutation({
  args: { workflowId: v.id("trypost_workflows"), triggeredBy: v.string() },
  returns: v.id("trypost_workflow_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("trypost_workflow_runs", {
      workflowId: args.workflowId,
      triggeredBy: args.triggeredBy,
      status: "running",
      postsCreated: 0,
      postsPublished: 0,
      startedAt: Date.now(),
    });
  },
});

export const _completeWorkflowRun = internalMutation({
  args: { runId: v.id("trypost_workflow_runs"), postsCreated: v.number(), postsPublished: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "completed",
      postsCreated: args.postsCreated,
      postsPublished: args.postsPublished,
      completedAt: Date.now(),
    });
  },
});

export const _failWorkflowRun = internalMutation({
  args: { runId: v.id("trypost_workflow_runs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      errors: [args.error],
      completedAt: Date.now(),
    });
  },
});

export const _createDailyPost = internalMutation({
  args: {
    content: v.string(),
    platform: v.string(),
    scheduledFor: v.number(),
    workflowId: v.id("trypost_workflows"),
    runId: v.id("trypost_workflow_runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: [args.platform],
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      workflowId: args.workflowId,
      createdBy: "system" as any,
      createdAt: Date.now(),
    });
  },
});

// ─── CRON CALLABLE: Refresh analytics ───

export const refreshAnalytics = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const internalAny: any = internal.trypost;
    const recent = await ctx.runQuery(internalAny._getRecentlyPublished, {});
    let refreshed = 0;
    for (const post of recent) {
      const apiKey = process.env.TRYPOST_API_KEY;
      if (!apiKey) continue;
      try {
        const apiUrl = process.env.TRYPOST_API_URL ?? "http://localhost:4000";
        const response = await fetch(`${apiUrl}/api/analytics/post/${post._id}`, {
          headers: { "x-api-key": apiKey },
        });
        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internalAny._upsertAnalytics, {
            postId: post._id,
            platform: post.platforms[0],
            ...data,
          });
          refreshed++;
        }
      } catch {
        // Silently ignore individual fetch errors
      }
    }
    return { success: true, refreshed };
  },
});

export const _getRecentlyPublished = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 86400000;
    return await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .filter((q) => q.gt(q.field("publishedAt"), oneDayAgo))
      .take(50);
  },
});

export const _upsertAnalytics = internalMutation({
  args: {
    postId: v.id("trypost_scheduled_posts"),
    platform: v.string(),
    impressions: v.optional(v.number()),
    reach: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    clicks: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const engagementRate =
      args.impressions && args.impressions > 0
        ? (((args.likes ?? 0) + (args.comments ?? 0) + (args.shares ?? 0)) / args.impressions) * 100
        : 0;
    await ctx.db.insert("trypost_analytics", {
      postId: args.postId,
      platform: args.platform,
      impressions: args.impressions,
      reach: args.reach,
      likes: args.likes,
      comments: args.comments,
      shares: args.shares,
      clicks: args.clicks,
      engagementRate,
      recordedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// TRYPOST v3 — Caption Generator, Hashtags, Best Time, Media, Templates,
//              Comments, Bulk Delete, Approval, Recurring, Export, Trending
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  threads: 500,
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
  reddit: 40000,
  bluesky: 300,
  telegram: 4096,
  discord: 2000,
};

const PLATFORM_BEST_HOURS: Record<string, number[]> = {
  twitter: [8, 12, 17, 21],
  linkedin: [8, 12, 17],
  facebook: [9, 13, 16, 19],
  instagram: [11, 14, 19, 21],
  threads: [9, 12, 18, 21],
  tiktok: [6, 10, 19, 22],
  youtube: [15, 17, 20],
  pinterest: [14, 20, 22],
  reddit: [6, 9, 12, 18, 22],
  bluesky: [9, 13, 19],
  telegram: [10, 14, 19, 22],
  discord: [16, 19, 21, 23],
};

const TRENDING_TOPICS: { topic: string; category: string; score: number; hashtags: string[] }[] = [
  { topic: "AI agents for small business", category: "ai", score: 95, hashtags: ["#AI", "#SmallBusiness", "#Automation"] },
  { topic: "Renewable energy in Africa", category: "sustainability", score: 89, hashtags: ["#RenewableEnergy", "#Africa", "#Sustainability"] },
  { topic: "Remote work productivity", category: "productivity", score: 87, hashtags: ["#RemoteWork", "#Productivity", "#WorkFromAnywhere"] },
  { topic: "Fintech in Nigeria", category: "finance", score: 92, hashtags: ["#Fintech", "#Nigeria", "#Payments"] },
  { topic: "WhatsApp marketing for SMEs", category: "marketing", score: 84, hashtags: ["#WhatsApp", "#Marketing", "#SME"] },
  { topic: "Cybersecurity tips for founders", category: "security", score: 81, hashtags: ["#CyberSecurity", "#Startups", "#Founders"] },
  { topic: "African creator economy", category: "creator", score: 88, hashtags: ["#CreatorEconomy", "#Africa", "#Content"] },
  { topic: "Voice AI and customer support", category: "ai", score: 90, hashtags: ["#VoiceAI", "#CustomerSupport", "#AI"] },
  { topic: "Mobile money and cross-border payments", category: "finance", score: 86, hashtags: ["#MobileMoney", "#Payments", "#Fintech"] },
  { topic: "TikTok for B2B lead generation", category: "marketing", score: 78, hashtags: ["#TikTok", "#B2B", "#LeadGen"] },
  { topic: "Sustainable fashion brands", category: "ecommerce", score: 75, hashtags: ["#SustainableFashion", "#Ecommerce", "#Green"] },
  { topic: "Mental health for entrepreneurs", category: "wellness", score: 83, hashtags: ["#MentalHealth", "#Entrepreneur", "#Wellness"] },
];

// ─── CAPTION GENERATOR ───

export const generateCaption = action({
  args: {
    adminToken: v.string(),
    topic: v.string(),
    platform: v.string(),
    tone: v.optional(v.string()), // "professional", "casual", "witty", "inspirational"
    brandVoice: v.optional(v.string()),
    includeEmoji: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.runQuery(internal.trypost._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) return { authError: true, caption: null };

    const tone = args.tone ?? "professional";
    const includeEmoji = args.includeEmoji ?? true;
    const charLimit = PLATFORM_CHAR_LIMITS[args.platform] ?? 2000;
    const toneInstructions: Record<string, string> = {
      professional: "Use a polished, authoritative voice. Focus on insights and value.",
      casual: "Use a friendly, conversational tone. Be relatable and approachable.",
      witty: "Use humor and clever wordplay. Be memorable and engaging.",
      inspirational: "Use uplifting, motivational language. Inspire action and growth.",
    };

    const openaiKey = process.env.OPENAI_API_KEY;
    let caption = "";
    let hashtags: string[] = [];
    let source = "fallback";

    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `You are a social media copywriter. ${toneInstructions[tone]} Brand voice: ${args.brandVoice ?? "clear and direct"}. Output a caption (≤${charLimit} chars), then 5-10 hashtags. ${includeEmoji ? "Use 2-4 relevant emojis." : "Do not use emojis."} Format: CAPTION: <text>\nHASHTAGS: <space-separated>` },
              { role: "user", content: `Topic: ${args.topic}\nPlatform: ${args.platform}` },
            ],
            max_tokens: 600,
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          const content = json?.choices?.[0]?.message?.content ?? "";
          const capMatch = content.match(/CAPTION:\s*([\s\S]*?)(?:\nHASHTAGS:|$)/i);
          const hashMatch = content.match(/HASHTAGS:\s*([\s\S]*?)$/i);
          caption = (capMatch?.[1] ?? content).trim().slice(0, charLimit);
          hashtags = (hashMatch?.[1] ?? "").trim().split(/\s+/).filter((h: string) => h.startsWith("#")).slice(0, 10);
          source = "openai";
        }
      } catch (e: any) {
        // fall through
      }
    }

    if (!caption) {
      const emojiPrefix = includeEmoji ? "✨ " : "";
      caption = `${emojiPrefix}${args.topic}\n\nHere's what you need to know: it matters, it's timely, and your audience is waiting. Take action today.`;
      hashtags = ["#Growth", "#Business", "#Strategy", "#Tips", `${args.platform}`];
      if (includeEmoji) caption += " 🚀💡";
      source = "fallback";
    }

    return {
      authError: false,
      caption,
      hashtags,
      charLimit,
      charCount: caption.length,
      remaining: charLimit - caption.length,
      withinLimit: caption.length <= charLimit,
      tone,
      source,
    };
  },
});

// ─── HASHTAG SUGGESTER ───

export const suggestHashtags = action({
  args: {
    adminToken: v.string(),
    content: v.string(),
    platform: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.runQuery(internal.trypost._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) return { authError: true, hashtags: [] };

    const count = args.count ?? 12;
    const words = args.content.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const uniqueWords = Array.from(new Set(words)).slice(0, count);

    let hashtags: string[] = [];
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `Generate ${count} relevant, high-traffic hashtags for the content. Mix broad + niche. Format: <space-separated hashtags only, each starting with #>` },
              { role: "user", content: `Platform: ${args.platform ?? "general"}\nContent: ${args.content}` },
            ],
            max_tokens: 200,
            temperature: 0.6,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          const text = (json?.choices?.[0]?.message?.content ?? "").trim();
          hashtags = text.split(/\s+/).filter((h: string) => h.startsWith("#")).slice(0, count);
        }
      } catch (e: any) {
        // fall through
      }
    }

    if (hashtags.length === 0) {
      hashtags = uniqueWords.map((w) => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);
      if (hashtags.length < count) {
        const fillers = ["#Business", "#Growth", "#Tips", "#Strategy", "#Marketing", "#Success", "#Community", "#Innovation"];
        hashtags.push(...fillers.slice(0, count - hashtags.length));
      }
      hashtags = hashtags.slice(0, count);
    }

    return { authError: false, hashtags, count: hashtags.length };
  },
});

// ─── BEST TIME TO POST ───

export const getBestPostingTimes = query({
  args: { adminToken: v.optional(v.string()), platform: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, platform }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, times: {} };
    if (platform) {
      return { authError: false, times: { [platform]: PLATFORM_BEST_HOURS[platform] ?? [] } };
    }
    return { authError: false, times: PLATFORM_BEST_HOURS };
  },
});

// ─── POST PREVIEW (validate per-platform limits) ───

export const previewPost = query({
  args: { adminToken: v.optional(v.string()), content: v.string(), platforms: v.array(v.string()), hashtags: v.optional(v.array(v.string())) },
  returns: v.any(),
  handler: async (ctx, { adminToken, content, platforms, hashtags }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, previews: [] };

    const tagText = (hashtags ?? []).join(" ");
    const fullText = `${content}\n\n${tagText}`.trim();

    const previews = platforms.map((p) => {
      const limit = PLATFORM_CHAR_LIMITS[p] ?? 2000;
      const willFit = fullText.length <= limit;
      const truncated = willFit ? fullText : fullText.slice(0, limit - 3) + "...";
      return {
        platform: p,
        charLimit: limit,
        charCount: fullText.length,
        willFit,
        truncatedContent: truncated,
        overflow: fullText.length - limit,
      };
    });

    return { authError: false, previews };
  },
});

// ─── MEDIA LIBRARY ───

export const addMedia = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    url: v.string(),
    type: v.union(v.literal("image"), v.literal("video"), v.literal("gif")),
    tags: v.optional(v.array(v.string())),
    sizeBytes: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, mediaId: null };
    const id = await ctx.db.insert("trypost_media", {
      name: args.name,
      url: args.url,
      type: args.type,
      tags: args.tags,
      sizeBytes: args.sizeBytes,
      width: args.width,
      height: args.height,
      uploadedBy: identity._id as any,
      createdAt: Date.now(),
    });
    return { authError: false, mediaId: id };
  },
});

export const listMedia = query({
  args: { adminToken: v.optional(v.string()), type: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, type }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, media: [] };
    let q = ctx.db.query("trypost_media").order("desc");
    if (type && (type === "image" || type === "video" || type === "gif")) {
      q = q.filter((qq) => qq.eq(qq.field("type"), type));
    }
    const media = await q.take(200);
    return { authError: false, media };
  },
});

export const deleteMedia = mutation({
  args: { adminToken: v.string(), mediaId: v.id("trypost_media") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };
    await ctx.db.delete(args.mediaId);
    return { authError: false, success: true };
  },
});

// ─── TEMPLATES ───

export const createTemplate = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    content: v.string(),
    hashtags: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    variables: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, templateId: null };

    const variables: string[] = args.variables ?? [];
    if (variables.length === 0) {
      const matches = args.content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) ?? [];
      variables.push(...Array.from(new Set(matches.map((m) => m.slice(2, -2)))));
    }

    const id = await ctx.db.insert("trypost_templates", {
      name: args.name,
      description: args.description,
      category: args.category,
      content: args.content,
      hashtags: args.hashtags,
      platforms: args.platforms,
      variables,
      useCount: 0,
      createdBy: identity._id as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { authError: false, templateId: id };
  },
});

export const listTemplates = query({
  args: { adminToken: v.optional(v.string()), category: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, category }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, templates: [] };
    const templates = await ctx.db.query("trypost_templates").order("desc").take(200);
    const filtered = category ? templates.filter((t) => t.category === category) : templates;
    return { authError: false, templates: filtered };
  },
});

export const deleteTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.id("trypost_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };
    await ctx.db.delete(args.templateId);
    return { authError: false, success: true };
  },
});

export const useTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.id("trypost_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, template: null };
    const tpl = await ctx.db.get(args.templateId);
    if (!tpl) return { authError: false, template: null };
    await ctx.db.patch(args.templateId, { useCount: tpl.useCount + 1, updatedAt: Date.now() });
    return { authError: false, template: tpl };
  },
});

// ─── COMMENTS / NOTES ───

export const addComment = mutation({
  args: {
    adminToken: v.string(),
    postId: v.id("trypost_scheduled_posts"),
    text: v.string(),
    isInternal: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, commentId: null };
    const id = await ctx.db.insert("trypost_post_comments", {
      postId: args.postId,
      author: identity.email ?? "admin",
      text: args.text,
      isInternal: args.isInternal,
      createdAt: Date.now(),
    });
    return { authError: false, commentId: id };
  },
});

export const listComments = query({
  args: { adminToken: v.optional(v.string()), postId: v.id("trypost_scheduled_posts") },
  returns: v.any(),
  handler: async (ctx, { adminToken, postId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, comments: [] };
    const comments = await ctx.db
      .query("trypost_post_comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .order("asc")
      .collect();
    return { authError: false, comments };
  },
});

// ─── BULK DELETE ───

export const bulkDeletePosts = mutation({
  args: { adminToken: v.string(), postIds: v.array(v.id("trypost_scheduled_posts")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, deleted: 0 };
    let deleted = 0;
    for (const id of args.postIds) {
      await ctx.db.delete(id);
      deleted++;
    }
    return { authError: false, deleted };
  },
});

// ─── APPROVAL WORKFLOW ───

export const approvePost = mutation({
  args: { adminToken: v.string(), postId: v.id("trypost_scheduled_posts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };
    await ctx.db.patch(args.postId, {
      requiresApproval: false,
      approvedBy: identity.email ?? "admin",
      approvedAt: Date.now(),
      status: "scheduled",
    });
    return { authError: false, success: true };
  },
});

export const rejectPost = mutation({
  args: { adminToken: v.string(), postId: v.id("trypost_scheduled_posts"), reason: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };
    await ctx.db.patch(args.postId, {
      requiresApproval: false,
      status: "failed",
      rejectedReason: args.reason,
      errorMessage: `Rejected: ${args.reason}`,
    });
    return { authError: false, success: true };
  },
});

// ─── TRENDING TOPICS ───

export const getTrendingTopics = query({
  args: { adminToken: v.optional(v.string()), category: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, category }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, topics: [] };
    const topics = category ? TRENDING_TOPICS.filter((t) => t.category === category) : TRENDING_TOPICS;
    return { authError: false, topics: topics.sort((a, b) => b.score - a.score) };
  },
});

// ─── EXPORT (CSV) ───

export const exportPosts = query({
  args: { adminToken: v.optional(v.string()), status: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, status }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, csv: "" };
    const posts = await ctx.db.query("trypost_scheduled_posts").order("desc").take(500);
    const filtered = status ? posts.filter((p) => p.status === status) : posts;
    const header = "id,content,platforms,scheduledFor,status,hashtags,createdBy,createdAt\n";
    const rows = filtered
      .map((p) => {
        const content = (p.content ?? "").replace(/"/g, '""').replace(/\n/g, " ");
        const tags = (p.hashtags ?? []).join(" ");
        const platforms = (p.platforms ?? []).join("|");
        const dt = new Date(p.scheduledFor).toISOString();
        const created = new Date(p.createdAt).toISOString();
        return `"${p._id}","${content}","${platforms}","${dt}","${p.status}","${tags}","${p.createdBy}","${created}"`;
      })
      .join("\n");
    return { authError: false, csv: header + rows, count: filtered.length };
  },
});

// ─── CATEGORY LIST ───

export const listCategories = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, categories: [] };
    const posts = await ctx.db.query("trypost_scheduled_posts").take(500);
    const cats = new Set<string>();
    for (const p of posts) {
      if (p.category) cats.add(p.category);
    }
    return {
      authError: false,
      categories: Array.from(cats).sort(),
      defaults: ["announcement", "product", "thought-leadership", "promo", "education", "testimonial"],
    };
  },
});

// ─── POSTS BY CATEGORY ───

export const listPostsByCategory = query({
  args: { adminToken: v.optional(v.string()), category: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken, category }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, posts: [] };
    const posts = await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_category", (q) => q.eq("category", category))
      .order("desc")
      .take(100);
    return { authError: false, posts };
  },
});

// ─── PENDING APPROVALS ───

export const listPendingApprovals = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, posts: [] };
    const all = await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .take(200);
    const pending = all.filter((p) => p.requiresApproval === true);
    return { authError: false, posts: pending };
  },
});

// ─── RECURRING POST HELPER (called by scheduler) ───

export const _spawnRecurringPost = internalMutation({
  args: { parentId: v.id("trypost_scheduled_posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent || !parent.recurrence || parent.recurrence === "none") return null;

    const intervals: Record<string, number> = { daily: 86400000, weekly: 604800000, monthly: 2592000000 };
    const interval = intervals[parent.recurrence];
    if (!interval) return null;

    const nextScheduledFor = parent.scheduledFor + interval;
    await ctx.db.insert("trypost_scheduled_posts", {
      content: parent.content,
      mediaUrls: parent.mediaUrls,
      carouselSlides: parent.carouselSlides,
      platforms: parent.platforms,
      scheduledFor: nextScheduledFor,
      timezone: parent.timezone,
      status: "scheduled",
      agentId: parent.agentId,
      workflowId: parent.workflowId,
      hashtags: parent.hashtags,
      mentions: parent.mentions,
      aiGenerated: parent.aiGenerated,
      recurrence: parent.recurrence,
      parentRecurrenceId: parent.parentRecurrenceId ?? parent._id,
      requiresApproval: parent.requiresApproval,
      category: parent.category,
      notes: parent.notes,
      createdBy: parent.createdBy,
      createdAt: Date.now(),
    });
    return null;
  },
});
