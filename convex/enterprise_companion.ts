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

/** Start a session */
export const startSession = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    userId: v.string(),
    channel: v.string(),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    const now = Date.now();
    const sessionId = await ctx.db.insert("enterprise_companion_sessions", {
      orgId: resolvedOrgId,
      userId: args.userId as any,
      channel: args.channel,
      status: "active",
      startedAt: now,
      guidanceCount: 0,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_SESSION_STARTED",
      actor: auth.actorId || "unknown",
      action: "start_session",
      target: sessionId,
      details: { orgId: resolvedOrgId, userId: args.userId, channel: args.channel },
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
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session) return { error: "Session not found" };

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_SESSION_ENDED",
      actor: auth.actorId || "unknown",
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
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});

/** Get session stats */
export const getStats = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { activeSessions: 0, totalSessions: 0, avgDuration: 0 };

    const sessions = await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
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
    userId: v.string(),
    question: v.string(),
    context: v.optional(v.any()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session) return { error: "Session not found" };

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      guidanceCount: (session.guidanceCount || 0) + 1,
      lastInteraction: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_GUIDANCE_GENERATED",
      actor: auth.actorId || "unknown",
      action: "generate_guidance",
      target: args.sessionId,
      details: { question: args.question, sessionId: args.sessionId },
      createdAt: now,
    });

    return { success: true, guidanceCount: (session.guidanceCount || 0) + 1 };
  },
});
