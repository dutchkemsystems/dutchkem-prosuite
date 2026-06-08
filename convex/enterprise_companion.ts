import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

const GUIDANCE_TEMPLATES = [
  { message: "The customer seems frustrated. Consider offering a 10% discount to retain them.", type: "suggestion" },
  { message: "This ticket matches a common pattern. Recommended response template loaded.", type: "template" },
  { message: "Compliance check: This response needs legal review before sending.", type: "compliance" },
  { message: "Customer mentioned a competitor — consider highlighting our unique features.", type: "suggestion" },
  { message: "This is a high-value account. Escalate to senior support if needed.", type: "alert" },
  { message: "Suggested upsell: Premium plan based on usage patterns.", type: "upsell" },
  { message: "Response tone detected as too formal. Consider a warmer approach.", type: "suggestion" },
  { message: "Similar ticket resolved in 3 minutes last time. Try the same approach.", type: "template" },
  { message: "Customer has been waiting 15+ minutes. Prioritize this interaction.", type: "alert" },
  { message: "Knowledge base article found: \"Refund Policy - 30 Day Window\". Link attached.", type: "template" },
];

/** Start a companion session */
export const startSession = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
    channel: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const now = Date.now();
    const sessionId = await ctx.db.insert("enterprise_companion_sessions", {
      orgId,
      userId: args.userId,
      channel: args.channel,
      status: "active",
      startedAt: now,
      guidanceCount: 0,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANION_STARTED",
      actor: orgId,
      action: "start_session",
      target: sessionId,
      details: { userId: args.userId, channel: args.channel },
      createdAt: now,
    });

    return { success: true, sessionId };
  },
});

/** End a companion session */
export const endSession = mutation({
  args: { token: v.string(), sessionId: v.id("enterprise_companion_sessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session || session.orgId !== orgId) return { error: "Not found" };

    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: Date.now(),
    });

    return { success: true };
  },
});

/** List companion sessions */
export const listSessions = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const sessions = await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return sessions.sort((a: any, b: any) => b.startedAt - a.startedAt);
  },
});

/** Get companion stats */
export const getStats = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { totalSessions: 0, activeSessions: 0, totalGuidance: 0, avgGuidancePerSession: 0 };

    const sessions = await ctx.db.query("enterprise_companion_sessions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const active = sessions.filter((s: any) => s.status === "active");
    const totalGuidance = sessions.reduce((sum: number, s: any) => sum + s.guidanceCount, 0);

    return {
      totalSessions: sessions.length,
      activeSessions: active.length,
      totalGuidance,
      avgGuidancePerSession: sessions.length > 0 ? totalGuidance / sessions.length : 0,
    };
  },
});

/** Generate a guidance message for a session */
export const generateGuidance = mutation({
  args: { token: v.string(), sessionId: v.id("enterprise_companion_sessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const session = await ctx.db.get("enterprise_companion_sessions", args.sessionId);
    if (!session || session.orgId !== orgId || session.status !== "active") return { error: "Invalid session" };

    const template = GUIDANCE_TEMPLATES[Math.floor(Math.random() * GUIDANCE_TEMPLATES.length)];

    await ctx.db.patch(args.sessionId, {
      guidanceCount: session.guidanceCount + 1,
    });

    return {
      success: true,
      guidance: {
        message: template.message,
        type: template.type,
        time: "Just now",
      },
    };
  },
});
