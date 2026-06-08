import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

/** Create or update an emotional profile */
export const upsertProfile = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
    personality: v.optional(v.any()),
    memory: v.optional(v.string()),
    sentiment: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const now = Date.now();
    const existing = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first();

    if (existing && existing.orgId === orgId) {
      const patch: any = { updatedAt: now, lastInteraction: now };
      if (args.personality) patch.personality = args.personality;
      if (args.memory) {
        patch.memories = [...existing.memories, { text: args.memory, createdAt: now }];
      }
      if (args.sentiment) {
        patch.sentimentHistory = [...existing.sentimentHistory, { sentiment: args.sentiment, createdAt: now }];
      }
      await ctx.db.patch(existing._id, patch);
      return { success: true, profileId: existing._id, isNew: false };
    }

    const profileId = await ctx.db.insert("enterprise_emotional_profiles", {
      orgId,
      userId: args.userId,
      personality: args.personality || {},
      memories: args.memory ? [{ text: args.memory, createdAt: now }] : [],
      sentimentHistory: args.sentiment ? [{ sentiment: args.sentiment, createdAt: now }] : [],
      retentionScore: 80,
      lastInteraction: now,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, profileId, isNew: true };
  },
});

/** List all emotional profiles for an org */
export const listProfiles = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const profiles = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return profiles.map((p: any) => ({
      _id: p._id,
      userId: p.userId,
      sentiment: p.sentimentHistory.length > 0 ? p.sentimentHistory[p.sentimentHistory.length - 1].sentiment : "neutral",
      retentionScore: p.retentionScore,
      lastInteraction: p.lastInteraction,
      memoryCount: p.memories.length,
      personality: p.personality,
    }));
  },
});

/** Get detailed profile */
export const getProfile = query({
  args: { token: v.string(), profileId: v.id("enterprise_emotional_profiles") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return null;

    const profile = await ctx.db.get("enterprise_emotional_profiles", args.profileId);
    if (!profile || profile.orgId !== orgId) return null;
    return profile;
  },
});

/** Get emotional AI stats */
export const getStats = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { totalProfiles: 0, avgRetention: 0, totalMemories: 0 };

    const profiles = await ctx.db.query("enterprise_emotional_profiles")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const totalMemories = profiles.reduce((sum: number, p: any) => sum + p.memories.length, 0);
    const avgRetention = profiles.length > 0
      ? profiles.reduce((sum: number, p: any) => sum + p.retentionScore, 0) / profiles.length
      : 0;

    return {
      totalProfiles: profiles.length,
      avgRetention: Math.round(avgRetention),
      totalMemories,
    };
  },
});

/** Add a memory to a profile */
export const addMemory = mutation({
  args: {
    token: v.string(),
    profileId: v.id("enterprise_emotional_profiles"),
    memoryText: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const profile = await ctx.db.get("enterprise_emotional_profiles", args.profileId);
    if (!profile || profile.orgId !== orgId) return { error: "Not found" };

    const now = Date.now();
    await ctx.db.patch(args.profileId, {
      memories: [...profile.memories, { text: args.memoryText, createdAt: now }],
      updatedAt: now,
      lastInteraction: now,
    });

    return { success: true };
  },
});
