import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createSession = mutation({
  args: { adminToken: v.string(), userId: v.string(), agentId: v.string(), personality: v.string(), mood: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const sessionId = `comp-${Date.now()}`;
    await ctx.db.insert("companion_agent_sessions", {
      sessionId, userId: args.userId, agentId: args.agentId, personality: args.personality,
      mood: args.mood, isActive: true, startedAt: Date.now(), lastInteractionAt: Date.now(),
    });
    return { success: true, sessionId };
  },
});

export const endSession = mutation({
  args: { adminToken: v.string(), sessionId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const session = await ctx.db.query("companion_agent_sessions").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).first();
    if (!session) return { error: "Not found" };
    await ctx.db.patch(session._id, { isActive: false, endedAt: Date.now() });
    return { success: true };
  },
});

export const addMessage = mutation({
  args: { sessionId: v.string(), userId: v.string(), role: v.union(v.literal("user"), v.literal("agent")), content: v.string(), sentiment: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("companion_agent_conversations", { ...args, timestamp: Date.now() });
    const session = await ctx.db.query("companion_agent_sessions").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).first();
    if (session) await ctx.db.patch(session._id, { lastInteractionAt: Date.now() });
    return { success: true };
  },
});

export const addMemory = mutation({
  args: { sessionId: v.string(), userId: v.string(), memoryType: v.string(), content: v.string(), importance: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("companion_agent_memory", { ...args, createdAt: Date.now() });
    return { success: true };
  },
});

export const getActiveSessions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("companion_agent_sessions").withIndex("by_active", (q) => q.eq("isActive", true)).order("desc").take(50);
  },
});

export const getSessionMessages = query({
  args: { sessionId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("companion_agent_conversations").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).order("desc").take(args.limit ?? 50),
});

export const getSessionMemories = query({
  args: { sessionId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("companion_agent_memory").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).order("desc").take(args.limit ?? 50),
});

export const getCompanionStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("companion_agent_sessions").take(200);
    const active = sessions.filter((s) => s.isActive);
    return { total: sessions.length, active: active.length, agents: [...new Set(sessions.map((s) => s.agentId))] };
  },
});
