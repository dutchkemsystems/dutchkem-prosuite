import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listFlags = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("feature_flags").order("asc").collect();
  },
});

export const getFlag = query({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, { key }) => {
    return await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
  },
});

export const setFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
    label: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { key, enabled, label, description }) => {
    const existing = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("feature_flags", {
        key,
        enabled,
        label,
        description,
        updatedAt: Date.now(),
      });
    }

    return { key, enabled };
  },
});

export const isEnabled = query({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { key }) => {
    const flag = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    return flag?.enabled ?? false;
  },
});
