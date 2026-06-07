import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createProfile = mutation({
  args: { userId: v.string(), dominantEmotion: v.string(), emotionalRange: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("emotional_ai_profiles").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { dominantEmotion: args.dominantEmotion, emotionalRange: args.emotionalRange, lastUpdated: Date.now() });
    } else {
      await ctx.db.insert("emotional_ai_profiles", { ...args, lastUpdated: Date.now(), createdAt: Date.now() });
    }
    return { success: true };
  },
});

export const logInteraction = mutation({
  args: { userId: v.string(), agentId: v.string(), detectedEmotion: v.string(), confidence: v.number(), responseStrategy: v.string(), content: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("emotional_ai_interactions", { ...args, timestamp: Date.now() });
    return { success: true };
  },
});

export const addEmotionalMemory = mutation({
  args: { userId: v.string(), emotion: v.string(), context: v.string(), intensity: v.number(), triggers: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("emotional_ai_memory", { ...args, createdAt: Date.now() });
    return { success: true };
  },
});

export const getProfile = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("emotional_ai_profiles").withIndex("by_user", (q) => q.eq("userId", args.userId)).first(),
});

export const getInteractions = query({
  args: { userId: v.optional(v.string()), agentId: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.userId) return await ctx.db.query("emotional_ai_interactions").withIndex("by_user", (q) => q.eq("userId", args.userId!)).order("desc").take(args.limit ?? 50);
    if (args.agentId) return await ctx.db.query("emotional_ai_interactions").withIndex("by_agent", (q) => q.eq("agentId", args.agentId!)).order("desc").take(args.limit ?? 50);
    return await ctx.db.query("emotional_ai_interactions").order("desc").take(args.limit ?? 50);
  },
});

export const getMemories = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("emotional_ai_memory").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc").take(args.limit ?? 50),
});

export const getEmotionalAIStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const profiles = await ctx.db.query("emotional_ai_profiles").take(200);
    const interactions = await ctx.db.query("emotional_ai_interactions").take(500);
    const emotions: Record<string, number> = {};
    for (const i of interactions) emotions[i.detectedEmotion] = (emotions[i.detectedEmotion] ?? 0) + 1;
    return { totalProfiles: profiles.length, totalInteractions: interactions.length, emotionDistribution: emotions };
  },
});
