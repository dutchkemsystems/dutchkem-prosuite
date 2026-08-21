import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";
import { SUPPORTED_PLATFORMS } from "./platforms";

export const listScheduledPosts = query({
  args: {
    adminToken: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, status, limit }) => {
    // Allow public read access for scheduled posts
    const take = limit ?? 100;
    let posts;
    if (status) {
      posts = await ctx.db
        .query("trypost_scheduled_posts")
        .withIndex("by_status", (q) => q.eq("status", status as "draft" | "scheduled" | "publishing" | "published" | "failed"))
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
