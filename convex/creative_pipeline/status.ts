import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const enablePipelineInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("creative_pipeline_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creative_pipeline_status", {
        enabled: true,
        lastRun: now,
        nextRun: now + 4 * 60 * 60 * 1000,
        totalGenerated: 0,
        totalPosted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getPipelineStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const status = await ctx.db.query("creative_pipeline_status").first();
    if (!status) {
      return {
        enabled: false,
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
      };
    }
    return status;
  },
});

export const togglePipeline = mutation({
  args: {
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("creative_pipeline_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creative_pipeline_status", {
        enabled: args.enabled,
        lastRun: now,
        nextRun: now + 4 * 60 * 60 * 1000,
        totalGenerated: 0,
        totalPosted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

export const getPipelineStatusInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("creative_pipeline_status").first();
  },
});

export const updatePipelineStatus = internalMutation({
  args: {
    lastRun: v.number(),
    generated: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("creative_pipeline_status").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastRun: args.lastRun,
        nextRun: args.lastRun + 4 * 60 * 60 * 1000,
        totalGenerated: existing.totalGenerated + args.generated,
        updatedAt: Date.now(),
      });
    }
  },
});
