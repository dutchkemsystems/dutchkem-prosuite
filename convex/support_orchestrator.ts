import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MULTI-AGENT SUPPORT ORCHESTRATOR (Convex bridge)
// Calls the backend orchestrator service which uses OmniRoute + LLM routing.
// ═══════════════════════════════════════════════════════════════════

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// ═══════════════════════════════════════════════════════════════════
// ACTION: Process message via backend orchestrator
// ═══════════════════════════════════════════════════════════════════
export const processMessage = action({
  args: {
    message: v.string(),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
        })
      )
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/support/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: args.message,
          context: {
            history: args.conversationHistory || [],
          },
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("[Orchestrator] Backend call failed:", error.message);

      // Fallback: use existing customer_support directly via NVIDIA
      try {
        const result = await ctx.runAction(
          (await import("./_generated/api")).api.customer_support.generateSupportResponse,
          {
            agentId: "A1",
            message: args.message,
            conversationHistory: args.conversationHistory,
          }
        );

        return {
          success: true,
          response: result.message || "I'm here to help! Could you rephrase your question?",
          agentId: "A1",
          agentName: "Support",
          icon: "💬",
          routed: false,
          confidence: "low",
          fallback: true,
        };
      } catch (fallbackError: any) {
        return {
          success: false,
          response: "I apologize, but our support system is temporarily unavailable. Please try again later.",
          agentId: "GENERAL",
          agentName: "System",
          routed: false,
          confidence: "low",
        };
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get orchestrator status
// ═══════════════════════════════════════════════════════════════════
export const getOrchestratorStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    // NOTE: fetch() is NOT allowed in Convex queries (only in actions).
    // Return static status for the support orchestrator.
    return {
      success: true,
      isAvailable: true,
      primaryModel: "kr/claude-opus-4-6",
      fallbackModel: "google/gemini-3-flash",
      emergencyModel: "if/kimi-k2-thinking",
      agentCount: 15,
      agents: [
        { id: "A1", name: "Academic Pro", icon: "\u{1F393}" },
        { id: "A2", name: "Business Pro", icon: "\u{1F4BC}" },
        { id: "A3", name: "Content Pro", icon: "\u270D\uFE0F" },
        { id: "A4", name: "Career Pro", icon: "\u{1F4C4}" },
        { id: "A5", name: "Personal Shopper", icon: "\u{1F6CD}\uFE0F" },
        { id: "A6", name: "Exam Pro", icon: "\u{1F4DD}" },
        { id: "A7", name: "Finance Pro", icon: "\u{1F4B0}" },
        { id: "A8", name: "MediaStudio Pro", icon: "\u{1F3AC}" },
        { id: "A9", name: "Health Pro", icon: "\u{1F3E5}" },
        { id: "A10", name: "Home Services Pro", icon: "\u{1F9F9}" },
        { id: "A11", name: "Language Tutor", icon: "\u{1F5E3}\uFE0F" },
        { id: "A12", name: "Travel Planner", icon: "\u2708\uFE0F" },
        { id: "A13", name: "ServiceMart NG", icon: "\u{1F680}" },
        { id: "A14", name: "Translation Hub", icon: "\u{1F5E3}\uFE0F\u{1F4DD}" },
        { id: "A15", name: "Event Planner", icon: "\u{1F389}" },
      ],
      features: [
        "LLM-powered intent classification (claude-opus-4-6)",
        "Agent routing (A1-A15)",
        "Repetition detection",
        "Conversation context passing",
        "3-model fallback chain",
        "General support fallback",
      ],
    };
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
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("support_interactions", {
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
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Escalate to human support
// ═══════════════════════════════════════════════════════════════════
export const escalateInteraction = mutation({
  args: {
    userId: v.string(),
    interactionId: v.id("support_interactions"),
    agentId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("support_escalations", {
      userId: args.userId,
      interactionId: args.interactionId,
      agentId: args.agentId,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
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

    // Agent distribution
    const agentCounts: Record<string, number> = {};
    for (const i of interactions) {
      agentCounts[i.agentId] = (agentCounts[i.agentId] || 0) + 1;
    }

    // Confidence distribution
    const confidenceCounts = { high: 0, medium: 0, low: 0 };
    for (const i of interactions) {
      const c = i.confidence as keyof typeof confidenceCounts;
      if (c in confidenceCounts) confidenceCounts[c]++;
    }

    // Average response time
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
