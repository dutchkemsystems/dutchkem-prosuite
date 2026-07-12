import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MULTI-AGENT SUPPORT ORCHESTRATOR
// LLM-powered intent classification + agent routing (A1-A15).
// ═══════════════════════════════════════════════════════════════════

const AGENT_MAP: Record<string, { name: string; icon: string; domain: string; tags: string[]; priority: number }> = {
  A1: { name: "Academic Pro", icon: "🎓", domain: "Thesis, research, academic writing, citations", tags: ["thesis", "research", "paper", "citation", "academic", "university", "JAMB", "WAEC", "NECO", "school", "exam", "study", "dissertation"], priority: 1 },
  A2: { name: "Business Pro", icon: "💼", domain: "Business plans, strategy, finance, entrepreneurship", tags: ["business", "plan", "strategy", "finance", "entrepreneur", "startup", "SME", "investor", "profit", "revenue", "company", "enterprise"], priority: 2 },
  A3: { name: "Content Pro", icon: "✍️", domain: "Content creation, social media, marketing, copywriting", tags: ["content", "blog", "article", "social media", "marketing", "copywriting", "post", "tweet", "caption"], priority: 3 },
  A4: { name: "Career Pro", icon: "📄", domain: "CV writing, interview prep, job search, career advice", tags: ["cv", "resume", "interview", "job", "career", "hiring", "recruitment", "cover letter"], priority: 4 },
  A5: { name: "Personal Shopper", icon: "🛍️", domain: "Shopping advice, deals, product recommendations", tags: ["shop", "buy", "deal", "product", "price", "compare", "recommend", "store"], priority: 5 },
  A6: { name: "Exam Pro", icon: "📝", domain: "Exam preparation, practice tests, study strategies", tags: ["exam", "test", "prep", "practice", "study guide", "quiz", "assessment"], priority: 6 },
  A7: { name: "Finance Pro", icon: "💰", domain: "Budgeting, investing, savings, financial planning", tags: ["budget", "invest", "save", "money", "financial", "tax", "accounting", "loan"], priority: 2 },
  A8: { name: "MediaStudio Pro", icon: "🎬", domain: "Video production, animation, editing, dubbing", tags: ["video", "animation", "edit", "dub", "media", "production", "film", "audio"], priority: 7 },
  A9: { name: "Health Pro", icon: "🏥", domain: "Wellness, fitness, nutrition, mental health", tags: ["health", "wellness", "fitness", "diet", "nutrition", "mental health", "therapy"], priority: 3 },
  A10: { name: "Home Services Pro", icon: "🧹", domain: "Cleaning, organization, home maintenance", tags: ["clean", "home", "maintenance", "repair", "organize", "plumber", "electrician"], priority: 8 },
  A11: { name: "Language Tutor", icon: "🗣️", domain: "Language learning, translation, pronunciation", tags: ["language", "learn", "translate", "pronunciation", "grammar", "vocabulary"], priority: 5 },
  A12: { name: "Travel Planner", icon: "✈️", domain: "Travel planning, itineraries, destinations", tags: ["travel", "trip", "hotel", "flight", "itinerary", "destination", "vacation"], priority: 6 },
  A13: { name: "ServiceMart NG", icon: "🚀", domain: "JAMB, WAEC, NECO, CV, interview, career guidance", tags: ["jamb", "waec", "neco", "nigeria", "service", "marketplace", "freelancer"], priority: 4 },
  A14: { name: "Translation Hub", icon: "📝", domain: "Translation, transcription, subtitling, localization", tags: ["translate", "transcribe", "subtitle", "localize", "language pair", "document"], priority: 5 },
  A15: { name: "Event Planner", icon: "🎉", domain: "Event planning, weddings, birthdays, corporate events", tags: ["event", "wedding", "birthday", "party", "corporate event", "venue", "catering"], priority: 7 },
};

const AGENT_LIST = Object.entries(AGENT_MAP)
  .map(([id, a]) => `- ${id}: ${a.name} — ${a.domain}`)
  .join("\n");

// ═══════════════════════════════════════════════════════════════════
// BUSINESS HOURS — Nigerian timezone (WAT = UTC+1)
// ═══════════════════════════════════════════════════════════════════
const BUSINESS_HOURS = {
  start: 8,  // 8 AM WAT
  end: 22,   // 10 PM WAT
  timezone: "Africa/Lagos",
  weekendEnabled: true, // Saturdays enabled
};

function isWithinBusinessHours(): boolean {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24; // UTC+1
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat
  
  // Check if weekend and weekends disabled
  if (!BUSINESS_HOURS.weekendEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }
  
  return watHour >= BUSINESS_HOURS.start && watHour < BUSINESS_HOURS.end;
}

function getBusinessHoursMessage(): string {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const dayOfWeek = now.getUTCDay();
  
  if (!BUSINESS_HOURS.weekendEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return "We're currently closed for the weekend. Our support team is available Monday-Saturday, 8 AM - 10 PM WAT. Leave a message and we'll respond when we're back!";
  }
  
  if (watHour < BUSINESS_HOURS.start) {
    return `We open at ${BUSINESS_HOURS.start}:00 AM WAT. Our team will respond shortly!`;
  }
  
  if (watHour >= BUSINESS_HOURS.end) {
    return `We're closed for the day. Our team resumes at ${BUSINESS_HOURS.start}:00 AM WAT. Leave a message and we'll respond first thing!`;
  }
  
  return "";
}

// ═══════════════════════════════════════════════════════════════════
// QUEUE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
const MAX_CONCURRENT_PER_AGENT = 5;
const MAX_TOTAL_CONCURRENT = 50;

async function getQueuePosition(ctx: any): Promise<number> {
  const allConfig = await ctx.db.query("system_config").collect();
  const configMap = new Map(allConfig.map((c) => [c.key, c.value]));
  
  let totalActive = 0;
  const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
  for (const id of agentIds) {
    totalActive += (configMap.get(`agent_active_conversations_${id}`) as number) || 0;
  }
  
  return Math.max(0, totalActive - MAX_TOTAL_CONCURRENT + 1);
}

async function isAgentAvailable(ctx: any, agentId: string): Promise<boolean> {
  const key = `agent_active_conversations_${agentId}`;
  const config = await ctx.db
    .query("system_config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  const load = (config?.value as number) || 0;
  return load < MAX_CONCURRENT_PER_AGENT;
}

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
// LOAD BALANCING — Track active conversations per agent
// ═══════════════════════════════════════════════════════════════════

async function fetchAgentLoad(ctx: any): Promise<Record<string, number>> {
  const agentIds = Object.keys(AGENT_MAP);
  const load: Record<string, number> = {};
  
  for (const id of agentIds) {
    const key = `agent_active_conversations_${id}`;
    const config = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    load[id] = (config?.value as number) || 0;
  }
  return load;
}

async function incrementAgentLoad(ctx: any, agentId: string): Promise<void> {
  const key = `agent_active_conversations_${agentId}`;
  const existing = await ctx.db
    .query("system_config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  const current = (existing?.value as number) || 0;
  if (existing) {
    await ctx.db.patch(existing._id, { value: current + 1, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("system_config", { key, value: 1, description: `Active conversations for ${agentId}`, updatedAt: Date.now() });
  }
}

async function decrementAgentLoad(ctx: any, agentId: string): Promise<void> {
  const key = `agent_active_conversations_${agentId}`;
  const existing = await ctx.db
    .query("system_config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    const current = (existing.value as number) || 0;
    await ctx.db.patch(existing._id, { value: Math.max(0, current - 1), updatedAt: Date.now() });
  }
}

// Find least-busy enabled agent from candidates
function selectLeastBusy(candidates: string[], agentLoad: Record<string, number>, agentStates: Record<string, boolean>): string {
  const enabled = candidates.filter((id) => agentStates[id] !== false);
  if (enabled.length === 0) return candidates[0]; // Fallback to first candidate
  return enabled.reduce((best, id) => (agentLoad[id] || 0) < (agentLoad[best] || 0) ? id : best, enabled[0]);
}

// ═══════════════════════════════════════════════════════════════════
// SENTIMENT DETECTION — Simple keyword-based
// ═══════════════════════════════════════════════════════════════════
function detectSentiment(message: string): string {
  const lower = message.toLowerCase();
  const negative = ["angry", "frustrated", "terrible", "worst", "hate", "disappointed", "unacceptable", "furious", "annoyed", "waste"];
  const positive = ["great", "awesome", "love", "excellent", "amazing", "perfect", "thank", "happy", "satisfied", "wonderful"];
  
  const negCount = negative.filter((w) => lower.includes(w)).length;
  const posCount = positive.filter((w) => lower.includes(w)).length;
  
  if (negCount >= 2) return "negative";
  if (posCount >= 2) return "positive";
  if (negCount === 1) return "slightly_negative";
  return "neutral";
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

  // Try primary model (fast 8B)
  try {
    const response = await callNVIDIA("meta/llama-3.1-8b-instruct", classificationPrompt, message);
    const agentId = response.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (AGENT_MAP[agentId]) return { agentId, confidence: "high" };
    if (agentId === "GENERAL") return { agentId: "GENERAL", confidence: "medium" };
  } catch {}

  // Try fallback model
  try {
    const response = await callNVIDIA("meta/llama-3-8b-instruct", classificationPrompt, message);
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
    userId: v.optional(v.string()),
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
    const userId = args.userId || "anonymous";

    // Get agent states and load for load balancing
    const agentStates = await ctx.runQuery(
      (await import("./_generated/api")).api.support_orchestrator.getAgentStates
    );
    const agentLoad = await fetchAgentLoad(ctx);

    // Step 0: Business hours check
    const withinHours = isWithinBusinessHours();
    const hoursMessage = getBusinessHoursMessage();

    // Step 0.5: Queue check — if all agents at max capacity
    const queuePosition = await getQueuePosition(ctx);
    if (queuePosition > 0) {
      // Queue the message — client gets queue position
      const queueId = await ctx.runMutation(
        (await import("./_generated/api")).api.support_orchestrator.queueMessage,
        {
          userId,
          message: args.message,
          conversationHistory: history,
          position: queuePosition,
        }
      );
      return {
        success: true,
        queued: true,
        queuePosition,
        estimatedWait: `${queuePosition * 30} seconds`,
        response: withinHours
          ? `You're in position ${queuePosition} in our support queue. Estimated wait: ~${queuePosition * 30} seconds. Our team is handling other requests and will get to you shortly! 🙏`
          : `You're in position ${queuePosition} in our support queue. ${hoursMessage}`,
        agentId: "QUEUE",
        agentName: "Support Queue",
        icon: "⏳",
        routed: false,
        confidence: "none",
        responseTimeMs: Date.now() - startTime,
        shouldPromptLogin: false,
      };
    }

    // Step 1: Classify intent via LLM
    const intent = await classifyIntent(args.message, history);

    // Step 1.5: Detect sentiment
    const sentiment = detectSentiment(args.message);

    // Step 2: Apply load balancing — if classified agent is busy, find least-busy alternative
    let selectedAgentId = intent.agentId;
    if (intent.agentId !== "GENERAL" && AGENT_MAP[intent.agentId]) {
      const primaryLoad = agentLoad[intent.agentId] || 0;
      // If primary agent has 3+ active conversations, find a less busy one
      if (primaryLoad >= 3) {
        const alternatives = Object.keys(AGENT_MAP).filter((id) => id !== intent.agentId);
        const bestAlternative = selectLeastBusy(alternatives, agentLoad, agentStates);
        if ((agentLoad[bestAlternative] || 0) < primaryLoad) {
          selectedAgentId = bestAlternative;
        }
      }
    }

    // Step 2: Route to the classified agent
    if (intent.agentId === "GENERAL") {
      // General support — answer directly
      try {
        const response = await callNVIDIA(
          "meta/llama-3.1-8b-instruct",
          "You are a friendly customer support agent for Dutchkem Ventures Prosuite NG+. Help with general questions about the platform, pricing, features, and getting started. Be warm, professional, use emojis. If the question is about a specific service, suggest the right agent.",
          args.message
        );

        // Log the interaction
        const interactionId = await ctx.runMutation(
          (await import("./_generated/api")).api.support_orchestrator.logInteraction,
          {
            userId,
            message: args.message,
            response,
            agentId: "GENERAL",
            agentName: "General Support",
            confidence: intent.confidence,
            routed: false,
            responseTimeMs: Date.now() - startTime,
          }
        );

        // Check for auto-escalation
        const escalationResult = await ctx.runMutation(
          (await import("./_generated/api")).api.support_auto_escalation.checkAndEscalate,
          {
            interactionId: interactionId as any,
            confidence: intent.confidence,
            agentId: "GENERAL",
            message: args.message,
          }
        );

        if (escalationResult.escalated) {
          console.log(`Auto-escalated: ${escalationResult.reason}`);
        }

        return {
          success: true,
          response,
          agentId: "GENERAL",
          agentName: "General Support",
          icon: "💬",
          routed: false,
          confidence: intent.confidence,
          responseTimeMs: Date.now() - startTime,
          shouldPromptLogin: false,
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
          shouldPromptLogin: false,
        };
      }
    }

    // Step 3: Route to specific agent via customer_support
    try {
      // Increment load for selected agent
      await incrementAgentLoad(ctx, selectedAgentId);

      const result = await ctx.runAction(
        (await import("./_generated/api")).api.customer_support.generateSupportResponse,
        {
          agentId: selectedAgentId,
          message: args.message,
          conversationHistory: history,
        }
      );

      const agentInfo = AGENT_MAP[selectedAgentId];
      const responseText = result.message || "I'm here to help! Could you rephrase your question?";
      const responseTimeMs = Date.now() - startTime;

      // Log interaction and get ID for escalation check
      const interactionId = await ctx.runMutation(
        (await import("./_generated/api")).api.support_orchestrator.logInteraction,
        {
          userId,
          message: args.message,
          response: responseText,
          agentId: selectedAgentId,
          agentName: agentInfo?.name || "Support",
          confidence: intent.confidence,
          routed: true,
          responseTimeMs,
        }
      );

      // Decrement load after response
      await decrementAgentLoad(ctx, selectedAgentId);

      // Auto-escalation check
      if (interactionId) {
        const escalationResult = await ctx.runMutation(
          (await import("./_generated/api")).api.support_auto_escalation.checkAndEscalate,
          {
            interactionId,
            confidence: intent.confidence,
            agentId: intent.agentId,
            message: args.message,
          }
        );
        if (escalationResult.escalated) {
          console.log(`Auto-escalated: ${escalationResult.reason}`);
        }
      }

      // Repetition detection
      const repetitionCheck = await ctx.runMutation(
        (await import("./_generated/api")).api.support_repetition_detector.checkRepetition,
        {
          agentId: selectedAgentId,
          message: args.message,
          response: responseText,
        }
      );

      let finalResponse = responseText;
      if (repetitionCheck.isRepetitive) {
        const retryResult = await ctx.runAction(
          (await import("./_generated/api")).api.customer_support.generateSupportResponse,
          {
            agentId: selectedAgentId,
            message: `IMPORTANT: Do NOT repeat previous answers. Provide a fresh, different response to: ${args.message}`,
          }
        );
        if (retryResult.message) {
          finalResponse = retryResult.message;
        }
      }

      // Login prompt detection
      const shouldPromptLogin = finalResponse.includes("---LOGIN_PROMPT---");
      let cleanedResponse = finalResponse;
      if (shouldPromptLogin) {
        cleanedResponse = finalResponse.replace(/---LOGIN_PROMPT---[\s\S]*?\[\/LOGIN_PROMPT\]/g, "").trim();
      }

      return {
        success: true,
        response: cleanedResponse,
        agentId: intent.agentId,
        agentName: agentInfo?.name || "Support",
        icon: agentInfo?.icon || "💬",
        routed: true,
        confidence: intent.confidence,
        responseTimeMs,
        shouldPromptLogin,
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
        shouldPromptLogin: false,
      };
    }
  },
});

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
// QUERY: Get business hours status
// ═══════════════════════════════════════════════════════════════════
export const getBusinessHoursStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const withinHours = isWithinBusinessHours();
    const message = getBusinessHoursMessage();
    return {
      withinHours,
      message,
      hours: `${BUSINESS_HOURS.start}:00 - ${BUSINESS_HOURS.end}:00 WAT`,
      timezone: BUSINESS_HOURS.timezone,
      weekendEnabled: BUSINESS_HOURS.weekendEnabled,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get queue status
// ═══════════════════════════════════════════════════════════════════
export const getQueueStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));
    
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const agentLoads: Record<string, number> = {};
    let totalActive = 0;
    
    for (const id of agentIds) {
      const load = (configMap.get(`agent_active_conversations_${id}`) as number) || 0;
      agentLoads[id] = load;
      totalActive += load;
    }
    
    return {
      totalActive,
      maxConcurrent: MAX_TOTAL_CONCURRENT,
      maxPerAgent: MAX_CONCURRENT_PER_AGENT,
      agentLoads,
      availableSlots: Math.max(0, MAX_TOTAL_CONCURRENT - totalActive),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get orchestrator status
// ═══════════════════════════════════════════════════════════════════
export const getOrchestratorStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const defaultModels = {
      primaryModel: "meta/llama-3.3-70b-instruct",
      fallbackModel: "meta/llama-3.1-70b-instruct",
      emergencyModel: "general",
    };

    const configDoc = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "support_orchestrator_config"))
      .first();

    const models = configDoc
      ? { ...defaultModels, ...(configDoc.value as Record<string, string>) }
      : defaultModels;

    return {
      success: true,
      isAvailable: true,
      primaryModel: models.primaryModel,
      fallbackModel: models.fallbackModel,
      emergencyModel: models.emergencyModel,
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
        "LLM-powered intent classification (llama-3.3-70b)",
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
  returns: v.optional(v.id("support_interactions")),
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
// MUTATION: Escalate to human support
// ═══════════════════════════════════════════════════════════════════
export const escalateInteraction = mutation({
  args: {
    userId: v.string(),
    interactionId: v.id("support_interactions"),
    agentId: v.string(),
    reason: v.string(),
  },
  returns: v.optional(v.id("support_escalations")),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("support_escalations", {
      userId: args.userId,
      interactionId: args.interactionId,
      agentId: args.agentId,
      reason: args.reason,
      status: "pending",
      createdAt: now,
      updatedAt: now,
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
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));

    const states: Record<string, boolean> = {};
    for (const id of agentIds) {
      const val = configMap.get(`agent_enabled_${id}`);
      states[id] = val !== undefined ? (val as boolean) : true;
    }
    return states;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent load (active conversations)
// ═══════════════════════════════════════════════════════════════════
export const getAgentLoad = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));

    const load: Record<string, number> = {};
    for (const id of agentIds) {
      const val = configMap.get(`agent_active_conversations_${id}`);
      load[id] = (val as number) || 0;
    }
    return load;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent tags and metadata
// ═══════════════════════════════════════════════════════════════════
export const getAgentMetadata = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.entries(AGENT_MAP).map(([id, agent]) => ({
      id,
      name: agent.name,
      icon: agent.icon,
      domain: agent.domain,
      tags: agent.tags,
      priority: agent.priority,
    }));
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
