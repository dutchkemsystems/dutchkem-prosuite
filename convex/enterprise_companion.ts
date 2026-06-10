import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Start a session */
export const startSession = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    userId: v.id("users"),
    channel: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const sessionId = await ctx.db.insert("enterprise_companion_sessions", {
      orgId: args.orgId,
      userId: args.userId,
      channel: args.channel,
      status: "active",
      startedAt: now,
      guidanceCount: 0,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_SESSION_STARTED",
      actor: identity._id,
      action: "start_session",
      target: sessionId,
      details: { orgId: args.orgId, userId: args.userId, channel: args.channel },
      createdAt: now,
    });

    return { success: true, sessionId };
  },
});

/** End a session */
export const endSession = mutation({
  args: {
    sessionId: v.id("enterprise_companion_sessions"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session) return { error: "Session not found" };

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_SESSION_ENDED",
      actor: identity._id,
      action: "end_session",
      target: args.sessionId,
      details: { duration: now - (session.startedAt || now), endedAt: now },
      createdAt: now,
    });

    return { success: true };
  },
});

/** List all sessions */
export const listSessions = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Get session stats */
export const getStats = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const sessions = await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return {
      activeSessions: sessions.filter((s: any) => s.status === "active").length,
      totalSessions: sessions.length,
      avgDuration: sessions.reduce((sum: number, s: any) => sum + ((s.endedAt || Date.now()) - (s.startedAt || Date.now())), 0) / (sessions.length || 1),
    };
  },
});

/** Generate guidance */
export const generateGuidance = mutation({
  args: {
    sessionId: v.id("enterprise_companion_sessions"),
    userId: v.id("users"),
    question: v.string(),
    context: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session) return { error: "Session not found" };

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      guidanceCount: (session.guidanceCount || 0) + 1,
      lastInteraction: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_GUIDANCE_GENERATED",
      actor: identity._id,
      action: "generate_guidance",
      target: args.sessionId,
      details: { question: args.question, sessionId: args.sessionId },
      createdAt: now,
    });

    return { success: true, guidanceCount: (session.guidanceCount || 0) + 1 };
  },
});