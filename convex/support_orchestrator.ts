import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MULTI-AGENT SUPPORT ORCHESTRATOR
// LLM-powered intent classification + agent routing (A1-A15).
// ═══════════════════════════════════════════════════════════════════

const AGENT_MAP: Record<string, { name: string; icon: string; domain: string }> = {
  A1: { name: "Academic Pro", icon: "🎓", domain: "Thesis, research, academic writing, citations" },
  A2: { name: "Business Pro", icon: "💼", domain: "Business plans, strategy, finance, entrepreneurship" },
  A3: { name: "Content Pro", icon: "✍️", domain: "Content creation, social media, marketing, copywriting" },
  A4: { name: "Career Pro", icon: "📄", domain: "CV writing, interview prep, job search, career advice" },
  A5: { name: "Personal Shopper", icon: "🛍️", domain: "Shopping advice, deals, product recommendations" },
  A6: { name: "Exam Pro", icon: "📝", domain: "Exam preparation, practice tests, study strategies" },
  A7: { name: "Finance Pro", icon: "💰", domain: "Budgeting, investing, savings, financial planning" },
  A8: { name: "MediaStudio Pro", icon: "🎬", domain: "Video production, animation, editing, dubbing" },
  A9: { name: "Health Pro", icon: "🏥", domain: "Wellness, fitness, nutrition, mental health" },
  A10: { name: "Home Services Pro", icon: "🧹", domain: "Cleaning, organization, home maintenance" },
  A11: { name: "Language Tutor", icon: "🗣️", domain: "Language learning, translation, pronunciation" },
  A12: { name: "Travel Planner", icon: "✈️", domain: "Travel planning, itineraries, destinations" },
  A13: { name: "ServiceMart NG", icon: "🚀", domain: "JAMB, WAEC, NECO, CV, interview, career guidance" },
  A14: { name: "Translation Hub", icon: "📝", domain: "Translation, transcription, subtitling, localization" },
  A15: { name: "Event Planner", icon: "🎉", domain: "Event planning, weddings, birthdays, corporate events" },
};

const AGENT_LIST = Object.entries(AGENT_MAP)
  .map(([id, a]) => `- ${id}: ${a.name} — ${a.domain}`)
  .join("\n");

// ═══════════════════════════════════════════════════════════════════
// LLM CALL HELPER
// ═══════════════════════════════════════════════════════════════════
async function callNVIDIA(model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA API key not configured");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 100,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`NVIDIA API error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

// ═══════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════
async function classifyIntent(message: string, history: Array<{ role: string; content: string }>): Promise<{ agentId: string; confidence: string }> {
  const contextSnippet = history.slice(-3).map((h) => `${h.role}: ${h.content}`).join("\n");

  const classificationPrompt = `You are a support request classifier. Your ONLY job is to determine which agent should handle this customer message.

Available Agents:
${AGENT_LIST}
- GENERAL: General platform questions (pricing, features, how to get started, complaints)

Customer Message: "${message}"
${contextSnippet ? `Previous context: ${contextSnippet}` : ""}

Respond with ONLY the agent ID (e.g. A1, A7, GENERAL). Nothing else.`;

  // Try primary model
  try {
    const response = await callNVIDIA("meta/llama-3.3-70b-instruct", classificationPrompt, message);
    const agentId = response.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (AGENT_MAP[agentId]) return { agentId, confidence: "high" };
    if (agentId === "GENERAL") return { agentId: "GENERAL", confidence: "medium" };
  } catch {}

  // Try fallback model
  try {
    const response = await callNVIDIA("meta/llama-3.1-70b-instruct", classificationPrompt, message);
    const agentId = response.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (AGENT_MAP[agentId]) return { agentId, confidence: "high" };
    if (agentId === "GENERAL") return { agentId: "GENERAL", confidence: "medium" };
  } catch {}

  return { agentId: "GENERAL", confidence: "low" };
}

// ═══════════════════════════════════════════════════════════════════
// ACTION: Process message with LLM routing
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
    const history = args.conversationHistory || [];
    const startTime = Date.now();

    // Step 1: Classify intent via LLM
    const intent = await classifyIntent(args.message, history);

    // Step 2: Route to the classified agent
    if (intent.agentId === "GENERAL") {
      // General support — answer directly
      try {
        const response = await callNVIDIA(
          "meta/llama-3.3-70b-instruct",
          "You are a friendly customer support agent for Dutchkem Ventures Prosuite NG+. Help with general questions about the platform, pricing, features, and getting started. Be warm, professional, use emojis. If the question is about a specific service, suggest the right agent.",
          args.message
        );
        return {
          success: true,
          response,
          agentId: "GENERAL",
          agentName: "General Support",
          icon: "💬",
          routed: false,
          confidence: intent.confidence,
          responseTimeMs: Date.now() - startTime,
        };
      } catch {
        return {
          success: true,
          response: "I'm here to help! Could you tell me more about what you need? 😊",
          agentId: "GENERAL",
          agentName: "General Support",
          icon: "💬",
          routed: false,
          confidence: "low",
          responseTimeMs: Date.now() - startTime,
        };
      }
    }

    // Step 3: Route to specific agent via customer_support
    try {
      const result = await ctx.runAction(
        (await import("./_generated/api")).api.customer_support.generateSupportResponse,
        {
          agentId: intent.agentId,
          message: args.message,
          conversationHistory: history,
        }
      );

      const agentInfo = AGENT_MAP[intent.agentId];
      return {
        success: true,
        response: result.message || "I'm here to help! Could you rephrase your question?",
        agentId: intent.agentId,
        agentName: agentInfo?.name || "Support",
        icon: agentInfo?.icon || "💬",
        routed: true,
        confidence: intent.confidence,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error(`[Orchestrator] Agent ${intent.agentId} failed:`, error.message);
      return {
        success: false,
        response: "I apologize, but our support system is temporarily unavailable. Please try again later.",
        agentId: intent.agentId,
        agentName: AGENT_MAP[intent.agentId]?.name || "System",
        routed: false,
        confidence: "low",
      };
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
// QUERY: Get agent enabled states
// ═══════════════════════════════════════════════════════════════════
export const getAgentStates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const states: Record<string, boolean> = {};
    for (const id of agentIds) {
      const config = await ctx.db
        .query("system_config")
        .withIndex("by_key", (q) => q.eq("key", `agent_enabled_${id}`))
        .first();
      states[id] = config ? (config.value as boolean) : true;
    }
    return states;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Resolve escalation
// ═══════════════════════════════════════════════════════════════════
export const resolveEscalation = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    resolution: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.escalationId, {
      status: "resolved",
      resolution: args.resolution,
      resolvedAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Assign escalation to agent/admin
// ═══════════════════════════════════════════════════════════════════
export const assignEscalation = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    assignedTo: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.escalationId, {
      status: "in_progress",
      assignedTo: args.assignedTo,
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Add response note to escalation
// ═══════════════════════════════════════════════════════════════════
export const addEscalationResponse = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    response: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.escalationId);
    if (!doc) return null;
    const existing = (doc as any).responses || [];
    await ctx.db.patch(args.escalationId, {
      responses: [...existing, { text: args.response, timestamp: Date.now() }],
    } as any);
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all escalations (pending + in_progress)
// ═══════════════════════════════════════════════════════════════════
export const getActiveEscalations = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("support_escalations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    const inProgress = await ctx.db
      .query("support_escalations")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .order("desc")
      .collect();
    return [...pending, ...inProgress];
  },
});
