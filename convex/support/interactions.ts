import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Queue a message when all agents are busy
// ═══════════════════════════════════════════════════════════════════
export const queueMessage = mutation({
  args: {
    userId: v.string(),
    message: v.string(),
    conversationHistory: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))),
    position: v.number(),
  },
  returns: v.id("support_interactions"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("support_interactions", {
      userId: args.userId,
      message: args.message,
      response: `[QUEUED - Position ${args.position}] Your message has been queued. A support agent will respond shortly.`,
      agentId: "QUEUE",
      agentName: "Support Queue",
      confidence: "none",
      routed: false,
      sentiment: "neutral",
      responseTimeMs: 0,
      createdAt: Date.now(),
    });
    return id;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Log interaction to database
// ═══════════════════════════════════════════════════════════════════
export const logInteraction = mutation({
  args: {
    userId: v.string(),
    message: v.string(),
    response: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    confidence: v.string(),
    routed: v.boolean(),
    sentiment: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
  },
  returns: v.id("support_interactions"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("support_interactions", {
      userId: args.userId,
      message: args.message,
      response: args.response,
      agentId: args.agentId,
      agentName: args.agentName,
      confidence: args.confidence,
      routed: args.routed,
      sentiment: args.sentiment,
      responseTimeMs: args.responseTimeMs,
      createdAt: Date.now(),
    });
    return id;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get support analytics (admin)
// ═══════════════════════════════════════════════════════════════════
export const getSupportAnalytics = query({
  args: { days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const interactions = await ctx.db
      .query("support_interactions")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const escalations = await ctx.db
      .query("support_escalations")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const agentCounts: Record<string, number> = {};
    for (const i of interactions) {
      agentCounts[i.agentId] = (agentCounts[i.agentId] || 0) + 1;
    }

    const confidenceCounts = { high: 0, medium: 0, low: 0 };
    for (const i of interactions) {
      const c = i.confidence as keyof typeof confidenceCounts;
      if (c in confidenceCounts) confidenceCounts[c]++;
    }

    const withTiming = interactions.filter((i) => i.responseTimeMs);
    const avgResponseMs = withTiming.length
      ? withTiming.reduce((sum, i) => sum + (i.responseTimeMs || 0), 0) / withTiming.length
      : 0;

    return {
      totalInteractions: interactions.length,
      totalEscalations: escalations.length,
      pendingEscalations: escalations.filter((e) => e.status === "pending").length,
      agentCounts,
      confidenceCounts,
      avgResponseMs: Math.round(avgResponseMs),
      routedCount: interactions.filter((i) => i.routed).length,
      unroutedCount: interactions.filter((i) => !i.routed).length,
      dailyBreakdown: Array.from({ length: days }, (_, d) => {
        const dayStart = cutoff + d * 24 * 60 * 60 * 1000;
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        return {
          date: new Date(dayStart).toISOString().split("T")[0],
          interactions: interactions.filter((i) => i.createdAt >= dayStart && i.createdAt < dayEnd).length,
          escalations: escalations.filter((e) => e.createdAt >= dayStart && e.createdAt < dayEnd).length,
        };
      }),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get recent interactions (admin)
// ═══════════════════════════════════════════════════════════════════
export const getRecentInteractions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("support_interactions")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 50);
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get pending escalations (admin)
// ═══════════════════════════════════════════════════════════════════
export const getPendingEscalations = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("support_escalations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Update orchestrator model config
// ═══════════════════════════════════════════════════════════════════
export const updateModelConfig = mutation({
  args: {
    primaryModel: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    emergencyModel: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = "support_orchestrator_config";
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const value = {
      primaryModel: args.primaryModel,
      fallbackModel: args.fallbackModel,
      emergencyModel: args.emergencyModel,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value,
        description: "Support orchestrator model configuration",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Toggle agent enabled/disabled
// ═══════════════════════════════════════════════════════════════════
export const toggleAgent = mutation({
  args: {
    agentId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `agent_enabled_${args.agentId}`;
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: args.enabled,
        description: `Agent ${args.agentId} enabled state`,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent performance metrics
// ═══════════════════════════════════════════════════════════════════
export const getAgentPerformance = query({
  args: { days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const interactions = await ctx.db
      .query("support_interactions")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const performance: Record<string, any> = {};

    for (const id of agentIds) {
      const agentInteractions = interactions.filter((i) => i.agentId === id);
      const withTiming = agentInteractions.filter((i) => i.responseTimeMs);
      const avgMs = withTiming.length
        ? Math.round(withTiming.reduce((sum, i) => sum + (i.responseTimeMs || 0), 0) / withTiming.length)
        : 0;
      const routedCount = agentInteractions.filter((i) => i.routed).length;

      performance[id] = {
        totalInteractions: agentInteractions.length,
        avgResponseMs: avgMs,
        routedCount,
        unroutedCount: agentInteractions.length - routedCount,
        score: Math.min(100, Math.round(
          (agentInteractions.length > 0 ? 40 : 0) +
          (avgMs < 5000 ? 30 : avgMs < 10000 ? 20 : 10) +
          (routedCount / Math.max(1, agentInteractions.length) * 30)
        )),
      };
    }

    return performance;
  },
});
