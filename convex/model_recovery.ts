import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Periodically checks and recovers model health
 */
export const recoverModelHealth = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const models = await ctx.runQuery(internal.model_recovery.getDownModels);
    
    for (const model of models) {
      console.log(`[Guardian AI] Attempting recovery for ${model.modelName}...`);
      
      // In production, you could do a real probe here
      // For now, we assume recovery after 5 minutes
      await ctx.runMutation(internal.model_recovery.updateModelStatus, {
        modelName: model.modelName,
        status: "healthy",
      });
    }
    
    return null;
  },
});

export const getDownModels = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allModels = await ctx.db.query("model_status").collect();
    return allModels.filter(m => m.status !== "healthy");
  },
});

export const updateModelStatus = internalMutation({
  args: { modelName: v.string(), status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("model_status")
      .withIndex("by_model", (q) => q.eq("modelName", args.modelName))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastFailureAt: args.status === "healthy" ? undefined : Date.now(),
        failureCount: args.status === "healthy" ? 0 : (existing.failureCount + 1),
      });
    } else {
      await ctx.db.insert("model_status", {
        modelName: args.modelName,
        status: args.status,
        lastFailureAt: args.status === "healthy" ? undefined : Date.now(),
        failureCount: args.status === "healthy" ? 0 : 1,
      });
    }
  },
});
