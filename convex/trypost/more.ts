import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";
import { TRENDING_TOPICS } from "./constants";

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
