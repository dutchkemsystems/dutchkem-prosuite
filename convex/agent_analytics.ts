import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordMetric = mutation({
  args: { agentId: v.string(), metricType: v.string(), value: v.number(), dimensions: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("agent_analytics_metrics", { ...args, recordedAt: Date.now() }); },
});

export const getAgentMetrics = query({
  args: { agentId: v.string(), metricType: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("agent_analytics_metrics").withIndex("by_agent", (q2) => q2.eq("agentId", args.agentId));
    if (args.metricType) q = q.withIndex("by_metric", (q2: any) => q2.eq("metricType", args.metricType!));
    return await q.order("desc").take(args.limit ?? 100);
  },
});

export const getAnalyticsDashboard = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const metrics = await ctx.db.query("agent_analytics_metrics").take(1000);
    const agentIds = [...new Set(metrics.map((m) => m.agentId))];
    const byAgent: Record<string, any> = {};
    for (const id of agentIds) {
      const agentMetrics = metrics.filter((m) => m.agentId === id);
      byAgent[id] = { total: agentMetrics.length, types: [...new Set(agentMetrics.map((m) => m.metricType))] };
    }
    return { totalMetrics: metrics.length, uniqueAgents: agentIds.length, byAgent };
  },
});
