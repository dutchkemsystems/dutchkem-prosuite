import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Upsert profile */
export const upsertProfile = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    userId: v.string(),
    personality: v.optional(v.any()),
    memories: v.optional(v.array(v.any())),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();
    const profileId = existing?._id || await ctx.db.insert("enterprise_emotional_profiles", {
      orgId: args.orgId,
      userId: args.userId,
      personality: args.personality || { traits: {}, preferences: {}, goals: {} },
      memories: args.memories || [],
      sentimentHistory: [],
      retentionScore: 50,
      lastInteraction: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(profileId, {
      personality: args.personality || { traits: {}, preferences: {}, goals: {} },
      memories: args.memories || [],
      lastInteraction: now,
      updatedAt: now,
    });

    return { success: true, profileId };
  },
});

/** List profiles */
export const listProfiles = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Get profile */
export const getProfile = query({
  args: { profileId: v.id("enterprise_emotional_profiles"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.get("enterprise_emotional_profiles", args.profileId);
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const profiles = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return {
      totalProfiles: profiles.length,
      avgRetentionScore: profiles.reduce((sum: number, p: any) => sum + p.retentionScore, 0) / (profiles.length || 1),
      totalMemories: profiles.reduce((sum: number, p: any) => sum + (p.memories?.length || 0), 0),
    };
  },
});

/** Add memory */
export const addMemory = mutation({
  args: {
    profileId: v.id("enterprise_emotional_profiles"),
    memory: v.string(),
    sentiment: v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db.get("enterprise_emotional_profiles", args.profileId);
    if (!profile) return { error: "Profile not found" };

    const now = Date.now();
    const memory = {
      text: args.memory,
      sentiment: args.sentiment,
      timestamp: now,
      source: "user_input",
    };

    await ctx.db.patch(args.profileId, {
      memories: [...(profile.memories || []), memory],
      sentimentHistory: [...(profile.sentimentHistory || []), { sentiment: args.sentiment, timestamp: now }],
      retentionScore: Math.min(100, (profile.retentionScore || 50) + (args.sentiment === "positive" ? 10 : args.sentiment === "negative" ? -5 : 0)),
      lastInteraction: now,
      updatedAt: now,
    });

    return { success: true };
  },
});