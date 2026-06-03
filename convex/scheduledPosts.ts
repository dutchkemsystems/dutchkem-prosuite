// convex/scheduledPosts.ts
// Scheduled post queue — schedule, edit, cancel, and process posts
// Additive: uses the existing social_posts table with status="scheduled"

import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Schedule a post for the future
// ═══════════════════════════════════════════════════════════════════
export const schedulePost = mutation({
  args: {
    platform: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
    imageUrl: v.optional(v.string()),
    anonymous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.scheduledFor <= Date.now()) throw new Error("scheduledFor must be in the future");

    const postId = await ctx.db.insert("social_posts", {
      agentId: identity.subject,
      platform: args.platform,
      content: args.content,
      imageUrl: args.imageUrl,
      status: "scheduled",
      scheduledFor: args.scheduledFor,
      anonymous: args.anonymous || false,
    });

    return { postId, status: "scheduled" };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Edit a scheduled post
// ═══════════════════════════════════════════════════════════════════
export const editScheduledPost = mutation({
  args: {
    postId: v.id("social_posts"),
    content: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status !== "scheduled") throw new Error("Can only edit scheduled posts");

    const patch: any = {};
    if (args.content !== undefined) patch.content = args.content;
    if (args.scheduledFor !== undefined) {
      if (args.scheduledFor <= Date.now()) throw new Error("scheduledFor must be in the future");
      patch.scheduledFor = args.scheduledFor;
    }
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;

    await ctx.db.patch(args.postId, patch);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Cancel a scheduled post (set status to draft)
// ═══════════════════════════════════════════════════════════════════
export const cancelScheduledPost = mutation({
  args: { postId: v.id("social_posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status !== "scheduled") throw new Error("Can only cancel scheduled posts");

    await ctx.db.patch(args.postId, { status: "draft" });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all scheduled posts (for admin queue management)
// ═══════════════════════════════════════════════════════════════════
export const getScheduledPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("social_posts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .order("asc")
      .collect();
    return posts;
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL: Get posts that are due to be posted (scheduledFor <= now)
// ═══════════════════════════════════════════════════════════════════
export const getDueScheduledPosts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("social_posts")
      .withIndex("by_status_and_scheduled", (q) =>
        q.eq("status", "scheduled").lte("scheduledFor", now),
      )
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL: Mark a scheduled post as posted or failed
// ═══════════════════════════════════════════════════════════════════
export const markScheduledPostResult = internalMutation({
  args: {
    postId: v.id("social_posts"),
    success: v.boolean(),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: args.success ? "posted" : "failed",
      postedAt: args.success ? Date.now() : undefined,
      externalId: args.externalId,
      error: args.error,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL ACTION: Process all due scheduled posts (called by cron)
// ═══════════════════════════════════════════════════════════════════
export const processScheduledPosts = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; results: any[] }> => {
    const due = await ctx.runQuery(internal.scheduledPosts.getDueScheduledPosts);
    if (due.length === 0) return { processed: 0, results: [] };

    const results: any[] = [];
    for (const post of due) {
      // Get the connection for this platform
      const conn: any = await ctx.runQuery(internal.scheduledPosts.getConnectionForPlatformScheduled, {
        platform: post.platform,
      });

      if (!conn || !conn.isConnected || !conn.accessToken) {
        await ctx.runMutation(internal.scheduledPosts.markScheduledPostResult, {
          postId: post._id,
          success: false,
          error: `Platform ${post.platform} not connected`,
        });
        results.push({ postId: post._id, platform: post.platform, success: false, error: "not connected" });
        continue;
      }

      try {
        const result: any = await ctx.runAction(internal.autoPosting.postToOnePlatform, {
          platform: post.platform,
          accessToken: conn.accessToken,
          content: post.content,
        });

        await ctx.runMutation(internal.scheduledPosts.markScheduledPostResult, {
          postId: post._id,
          success: result.success,
          externalId: result.postId,
          error: result.error,
        });

        results.push({ postId: post._id, platform: post.platform, success: result.success });
      } catch (err: any) {
        await ctx.runMutation(internal.scheduledPosts.markScheduledPostResult, {
          postId: post._id,
          success: false,
          error: err?.message || String(err),
        });
        results.push({ postId: post._id, platform: post.platform, success: false, error: err?.message });
      }
    }

    return { processed: results.length, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL: Get connection for a platform (for scheduled post processing)
// ═══════════════════════════════════════════════════════════════════
export const getConnectionForPlatformScheduled = internalQuery({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) => q.eq("adminId", "system").eq("platformId", args.platform))
      .first();
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ACTION: Manually trigger scheduled post processing
// ═══════════════════════════════════════════════════════════════════
export const runScheduledPostsNow = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.runAction(internal.scheduledPosts.processScheduledPosts);
  },
});
