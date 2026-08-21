import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

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
