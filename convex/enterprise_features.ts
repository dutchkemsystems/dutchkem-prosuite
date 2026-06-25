import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE FEATURE CONFIG
// Admin controls which features each enterprise client can use
// ═══════════════════════════════════════════════════════════════════

export const getConfig = query({
  args: { orgId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("enterprise_feature_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    return config || { orgId: args.orgId, features: [], updatedAt: 0 };
  },
});

export const saveConfig = mutation({
  args: {
    orgId: v.string(),
    features: v.array(v.string()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("enterprise_feature_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        features: args.features,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("enterprise_feature_configs", {
        orgId: args.orgId,
        features: args.features,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, featureCount: args.features.length };
  },
});

export const isFeatureEnabled = query({
  args: { orgId: v.string(), featureId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("enterprise_feature_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    return config ? (config.features as string[]).includes(args.featureId) : false;
  },
});

export const getAllConfigs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("enterprise_feature_configs").take(100);
  },
});
