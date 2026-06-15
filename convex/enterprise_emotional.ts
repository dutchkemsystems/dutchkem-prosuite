import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryResolveEnterpriseAuth } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

/** Resolve orgId from either admin session or enterprise session token */
async function resolveOrgId(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: Id<"enterprise_organizations"> }
): Promise<Id<"enterprise_organizations"> | null> {
  if (args.orgId) return args.orgId;
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
  }
  return null;
}

/** Upsert profile */
export const upsertProfile = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    userId: v.string(),
    personality: v.optional(v.any()),
    memories: v.optional(v.array(v.any())),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    const existing = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();
    const profileId = existing?._id || await ctx.db.insert("enterprise_emotional_profiles", {
      orgId: resolvedOrgId,
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
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});

/** Get profile */
export const getProfile = query({
  args: { profileId: v.id("enterprise_emotional_profiles"), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("enterprise_emotional_profiles", args.profileId);
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { totalProfiles: 0, avgRetentionScore: 0, totalMemories: 0 };

    const profiles = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
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
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

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
