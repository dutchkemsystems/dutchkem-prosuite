import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logEvent = mutation({
  args: { eventType: v.string(), actor: v.string(), action: v.string(), target: v.string(), details: v.any(), ipAddress: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("enterprise_audit_logs", { ...args, createdAt: Date.now() }); },
});

export const getAuditLogs = query({
  args: { eventType: v.optional(v.string()), actor: v.optional(v.string()), limit: v.optional(v.number()), offset: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("enterprise_audit_logs");
    if (args.eventType) q = q.withIndex("by_event_type", (q2: any) => q2.eq("eventType", args.eventType!));
    if (args.actor) q = q.withIndex("by_actor", (q2: any) => q2.eq("actor", args.actor!));
    const all = await q.order("desc").take((args.limit ?? 50) + (args.offset ?? 0));
    return all.slice(args.offset ?? 0);
  },
});

export const exportAuditLogs = query({
  args: { startDate: v.optional(v.number()), endDate: v.optional(v.number()), format: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("enterprise_audit_logs").order("desc").take(1000);
    if (args.startDate) logs = logs.filter((l) => l.createdAt >= args.startDate!);
    if (args.endDate) logs = logs.filter((l) => l.createdAt <= args.endDate!);
    return { logs, count: logs.length, exportedAt: Date.now() };
  },
});

export const getAuditStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const logs = await ctx.db.query("enterprise_audit_logs").take(500);
    const byType: Record<string, number> = {};
    const byActor: Record<string, number> = {};
    for (const l of logs) {
      byType[l.eventType] = (byType[l.eventType] ?? 0) + 1;
      byActor[l.actor] = (byActor[l.actor] ?? 0) + 1;
    }
    return { totalLogs: logs.length, byType, byActor };
  },
});
