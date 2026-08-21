import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

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
      uploadedBy: identity._id,
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
