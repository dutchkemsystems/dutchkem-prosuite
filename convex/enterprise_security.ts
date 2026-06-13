import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Log a security event */
export const logSecurityEvent = mutation({
  args: {
    companyId: v.optional(v.string()),
    orgId: v.optional(v.id("enterprise_organizations")),
    eventType: v.union(
      v.literal("login_attempt"),
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("intruder_detected"),
      v.literal("ip_blocked"),
      v.literal("password_change"),
      v.literal("data_encrypted"),
      v.literal("data_decrypted"),
      v.literal("unauthorized_access"),
      v.literal("rate_limit_hit")
    ),
    ip: v.string(),
    email: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    details: v.optional(v.any()),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    blocked: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const recordId = await ctx.db.insert("enterprise_security_log", {
      ...args,
      timestamp: now,
    });
    return { success: true, eventId: recordId };
  },
});

/** Get security events for a company */
export const getSecurityEvents = query({
  args: { companyId: v.string(), limit: v.optional(v.number()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 50;
    return await ctx.db.query("enterprise_security_log")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

/** Get security dashboard stats */
export const getSecurityDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const allEvents = await ctx.db.query("enterprise_security_log").collect();
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const recent24h = allEvents.filter((e: any) => e.timestamp >= last24h);
    const recentHour = allEvents.filter((e: any) => e.timestamp >= lastHour);

    const blockedIPs = new Set(allEvents.filter((e: any) => e.blocked).map((e: any) => e.ip));
    const intruders = allEvents.filter((e: any) => e.eventType === "intruder_detected");
    const failedLogins = allEvents.filter((e: any) => e.eventType === "login_failure");
    const criticalEvents = allEvents.filter((e: any) => e.severity === "critical");

    return {
      totalEvents: allEvents.length,
      eventsLast24h: recent24h.length,
      eventsLastHour: recentHour.length,
      blockedIPs: blockedIPs.size,
      intruderDetections: intruders.length,
      failedLogins: failedLogins.length,
      criticalEvents: criticalEvents.length,
      severityBreakdown: {
        low: allEvents.filter((e: any) => e.severity === "low").length,
        medium: allEvents.filter((e: any) => e.severity === "medium").length,
        high: allEvents.filter((e: any) => e.severity === "high").length,
        critical: criticalEvents.length,
      },
    };
  },
});

/** Check if IP is blocked */
export const checkIPBlocked = query({
  args: { ip: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const blocked = await ctx.db.query("enterprise_security_log")
      .withIndex("by_event_type", (q) => q.eq("eventType", "ip_blocked"))
      .filter((q) => q.eq(q.field("ip"), args.ip))
      .first();
    return { blocked: !!blocked };
  },
});

/** Block an IP address */
export const blockIP = mutation({
  args: {
    ip: v.string(),
    reason: v.optional(v.string()),
    companyId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    await ctx.db.insert("enterprise_security_log", {
      companyId: args.companyId,
      eventType: "ip_blocked",
      ip: args.ip,
      details: { reason: args.reason || "Manual block by admin" },
      severity: "critical",
      blocked: true,
      timestamp: now,
    });

    return { success: true };
  },
});

/** Get recent security events (admin overview) */
export const getRecentEvents = query({
  args: { limit: v.optional(v.number()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 20;
    return await ctx.db.query("enterprise_security_log")
      .order("desc")
      .take(limit);
  },
});
