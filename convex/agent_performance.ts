import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

export const createSnapshot = mutation({
  args: { agentId: v.string(), score: v.number(), tasksCompleted: v.number(), tasksFailed: v.number(), avgResponseMs: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("transaction_analytics", { ...args, createdAt: Date.now() } as any);
    return { success: true, id };
  },
});

export const _takeAgentSnapshots = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const agentIds = Array.from({ length: 15 }, (_, i) => `A${i + 1}`);
    let underperforming = 0;
    for (const agentId of agentIds) {
      const score = 70 + Math.random() * 30;
      const tasksCompleted = Math.floor(Math.random() * 100);
      const tasksFailed = Math.floor(Math.random() * 10);
      const avgResponseMs = 200 + Math.floor(Math.random() * 800);
      await ctx.runMutation(internal.agent_performance._storeSnapshot, {
        agentId, score: Math.round(score * 100) / 100, tasksCompleted, tasksFailed, avgResponseMs,
      });
      if (score < 80) underperforming++;
    }
    return { total: agentIds.length, underperforming };
  },
});

export const _storeSnapshot = internalMutation({
  args: { agentId: v.string(), score: v.number(), tasksCompleted: v.number(), tasksFailed: v.number(), avgResponseMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("agent_autonomy_logs", {
      agentId: args.agentId, actionType: "snapshot",
      actionDetails: JSON.stringify({ score: args.score, tasksCompleted: args.tasksCompleted, tasksFailed: args.tasksFailed, avgResponseMs: args.avgResponseMs }),
      executedBy: "system", status: "ok", createdAt: Date.now(),
    });
  },
});

export const _detectUnderperforming = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const agentIds = Array.from({ length: 15 }, (_, i) => `A${i + 1}`);
    const results: any[] = [];
    for (const agentId of agentIds) {
      const logs: any[] = await ctx.runQuery(internal.agent_performance._getAgentLogs, { agentId });
      if (logs.length === 0) continue;
      let totalScore = 0;
      let count = 0;
      for (const log of logs) {
        try {
          const data = JSON.parse(log.actionDetails);
          if (data.score) { totalScore += data.score; count++; }
        } catch { /* skip */ }
      }
      if (count > 0) {
        const avgScore = totalScore / count;
        if (avgScore < 80) {
          results.push({ agentId, avgScore: Math.round(avgScore * 100) / 100, count });
        }
      }
    }
    return { underperforming: results };
  },
});

export const _getAgentLogs = internalQuery({
  args: { agentId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.query("agent_autonomy_logs").withIndex("by_agent", (q) => q.eq("agentId", args.agentId)).take(20);
  },
});

export const pauseAgent = mutation({
  args: { adminToken: v.string(), agentId: v.string(), reason: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.insert("agent_autonomy_logs", {
      agentId: args.agentId, actionType: "pause", actionDetails: args.reason,
      executedBy: "admin", status: "executed", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const getAgentPerformanceDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, agents: [] };
    const agentIds = Array.from({ length: 15 }, (_, i) => `A${i + 1}`);
    const agents = [];
    for (const agentId of agentIds) {
      const logs = await ctx.db.query("agent_autonomy_logs").withIndex("by_agent", (q) => q.eq("agentId", agentId)).take(5);
      agents.push({ agentId, logCount: logs.length, lastActivity: logs[0]?.createdAt ?? 0 });
    }
    return { authError: false, agents };
  },
});
