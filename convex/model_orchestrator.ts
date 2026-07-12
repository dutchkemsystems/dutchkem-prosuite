import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// UNIFIED MODEL ORCHESTRATOR
// Routes requests across 9 AI providers with failover, cost optimization,
// health checks, and rate limiting.
// ═══════════════════════════════════════════════════════════════════

// ─── PROVIDER CONFIGURATION ───
const PROVIDERS: Record<string, {
  name: string;
  priority: number;
  cost: number; // cost per 1M tokens (0 = free)
  category: string;
  capabilities: string[];
  models: string[];
}> = {
  freellmapi: {
    name: "FreeLLMAPI",
    priority: 1,
    cost: 0,
    category: "free",
    capabilities: ["chat", "vision", "tools", "streaming", "embedding"],
    models: ["auto"],
  },
  tencent: {
    name: "Tencent Hy3",
    priority: 2,
    cost: 0,
    category: "free",
    capabilities: ["chat", "tools", "streaming", "long_context"],
    models: ["tencent/hy3"],
  },
  mistral: {
    name: "Mistral AI",
    priority: 3,
    cost: 0.15,
    category: "versatile",
    capabilities: ["chat", "tools", "streaming", "code", "reasoning", "web_search"],
    models: ["mistralai/mistral-large-3", "mistralai/codestral", "mistralai/magistral-medium"],
  },
  groq: {
    name: "GROQ",
    priority: 4,
    cost: 0.25,
    category: "fast",
    capabilities: ["chat", "tools", "streaming"],
    models: ["llama3-70b-8192"],
  },
  openrouter: {
    name: "OpenRouter",
    priority: 5,
    cost: 0.15,
    category: "balanced",
    capabilities: ["chat", "tools", "streaming", "vision"],
    models: ["nvidia/llama-3.3-70b-instruct:free"],
  },
  nvidia: {
    name: "NVIDIA NIM",
    priority: 6,
    cost: 0.20,
    category: "specialized",
    capabilities: ["chat", "tools", "streaming", "complex"],
    models: ["meta/llama-3.3-70b-instruct"],
  },
  aiml: {
    name: "AI/ML API",
    priority: 7,
    cost: 0.10,
    category: "design",
    capabilities: ["design", "image_generation"],
    models: ["stabilityai/stable-diffusion-xl"],
  },
  mimo: {
    name: "MiMo-V2.5",
    priority: 8,
    cost: 0.05,
    category: "agentic",
    capabilities: ["chat", "tools", "streaming", "agentic"],
    models: ["mimo-v2.5"],
  },
};

// ─── USE CASE MAPPING ───
const USE_CASE_MAPPING: Record<string, string[]> = {
  chat: ["freellmapi", "tencent", "groq", "openrouter", "mimo"],
  academic: ["openrouter", "tencent", "mistral", "nvidia", "mimo"],
  business: ["openrouter", "tencent", "mistral", "nvidia", "mimo"],
  content: ["groq", "openrouter", "tencent", "mistral"],
  code: ["mistral", "groq", "openrouter", "freellmapi"],
  design: ["aiml", "freellmapi", "groq", "openrouter"],
  analysis: ["openrouter", "tencent", "mistral", "nvidia"],
  research: ["mistral", "openrouter", "tencent", "freellmapi"],
  finance: ["mistral", "openrouter", "tencent", "freellmapi"],
  agentic: ["mistral", "mimo", "nvidia", "openrouter"],
  long_context: ["tencent", "mistral", "freellmapi", "mimo"],
  translation: ["tencent", "mistral", "groq", "openrouter"],
  real_time: ["groq", "mistral", "freellmapi"],
  video: ["mimo", "aiml", "openrouter"],
};

// ─── COST OPTIMIZATION TIERS ───
const COST_TIERS: Record<string, string[]> = {
  free: ["freellmapi", "tencent"],
  budget: ["freellmapi", "tencent", "mimo", "aiml"],
  balanced: ["freellmapi", "tencent", "groq", "openrouter", "mistral"],
  performance: ["groq", "mistral", "nvidia"],
  premium: ["nvidia", "mistral"],
};

// ─── RATE LIMITS (requests per minute) ───
const RATE_LIMITS: Record<string, number> = {
  freellmapi: 100,
  tencent: 50,
  mistral: 60,
  groq: 60,
  openrouter: 50,
  nvidia: 40,
  aiml: 30,
  mimo: 50,
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

// ═══════════════════════════════════════════════════════════════════
// HEALTH TRACKING
// ═══════════════════════════════════════════════════════════════════

async function fetchProviderHealth(ctx: any): Promise<Record<string, { status: string; lastCheck: number; errorCount: number }>> {
  const allConfig = await ctx.db.query("system_config").collect();
  const configMap = new Map(allConfig.map((c) => [c.key, c.value]));
  
  const health: Record<string, { status: string; lastCheck: number; errorCount: number }> = {};
  for (const name of Object.keys(PROVIDERS)) {
    const h = configMap.get(`provider_health_${name}`);
    health[name] = h || { status: "healthy", lastCheck: 0, errorCount: 0 };
  }
  return health;
}

async function updateProviderHealth(ctx: any, providerName: string, status: string, error?: string) {
  const key = `provider_health_${providerName}`;
  const existing = await ctx.db
    .query("system_config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  const current = existing?.value as any || { status: "healthy", lastCheck: 0, errorCount: 0 };
  const updated = {
    status,
    lastCheck: Date.now(),
    errorCount: status === "healthy" ? 0 : (current.errorCount || 0) + 1,
    lastError: error || current.lastError,
  };

  if (existing) {
    await ctx.db.patch(existing._id, { value: updated, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("system_config", { key, value: updated, updatedAt: Date.now() });
  }
}

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════

const rateLimitCounters: Record<string, { count: number; resetAt: number }> = {};

function checkRateLimit(providerName: string): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS[providerName] || 50;
  const counter = rateLimitCounters[providerName] || { count: 0, resetAt: now + 60000 };

  if (now > counter.resetAt) {
    counter.count = 0;
    counter.resetAt = now + 60000;
  }

  if (counter.count >= limit) return false;
  counter.count++;
  rateLimitCounters[providerName] = counter;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER SELECTION
// ═══════════════════════════════════════════════════════════════════

function selectProviders(
  useCase: string,
  costTier: string,
  health: Record<string, any>,
  excludeProviders: string[] = []
): string[] {
  // Start with use case mapping
  let candidates = USE_CASE_MAPPING[useCase] || USE_CASE_MAPPING.chat;

  // Apply cost tier filter
  const tierProviders = COST_TIERS[costTier] || COST_TIERS.balanced;
  candidates = candidates.filter((p) => tierProviders.includes(p));

  // Filter by health
  candidates = candidates.filter((p) => {
    const h = health[p];
    return h && h.status === "healthy" && h.errorCount < 5;
  });

  // Exclude already-tried providers
  candidates = candidates.filter((p) => !excludeProviders.includes(p));

  // Sort by priority
  candidates.sort((a, b) => (PROVIDERS[a]?.priority || 99) - (PROVIDERS[b]?.priority || 99));

  return candidates;
}

// ═══════════════════════════════════════════════════════════════════
// CALL PROVIDER
// ═══════════════════════════════════════════════════════════════════

async function callProvider(
  ctx: any,
  providerName: string,
  args: { input: string; systemPrompt?: string; model?: string }
): Promise<{ content: string; model: string }> {
  const systemPrompt = args.systemPrompt || "You are a helpful assistant for Dutchkem Ventures.";
  const model = args.model || PROVIDERS[providerName]?.models[0] || "auto";

  if (providerName === "groq") {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: args.input }], temperature: 0.7, max_tokens: 1024 }),
    });
    if (!response.ok) throw new Error(`GROQ error: ${response.status}`);
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || "", model };
  }

  if (providerName === "openrouter" || providerName === "tencent" || providerName === "mistral") {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: args.input }], temperature: 0.7, max_tokens: 4096 }),
    });
    if (!response.ok) throw new Error(`${providerName} error: ${response.status}`);
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || "", model };
  }

  if (providerName === "freellmapi") {
    const result = await ctx.runAction(internal.freellmapi.chatCompletion, {
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: args.input }],
      useCase: "general",
    });
    if (!result.success) throw new Error(result.error || "FreeLLMAPI failed");
    return { content: result.content || "", model: result.model || "auto" };
  }

  throw new Error(`Unknown provider: ${providerName}`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATION ACTION
// ═══════════════════════════════════════════════════════════════════

export const orchestrate = action({
  args: {
    input: v.string(),
    useCase: v.optional(v.string()),
    costTier: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const useCase = args.useCase || "chat";
    const costTier = args.costTier || "balanced";

    // Get provider health
    const health = await ctx.runQuery(internal.model_orchestrator.getProviderHealth);

    // Select providers
    let candidates = selectProviders(useCase, costTier, health);
    if (candidates.length === 0) {
      // Fallback: try all healthy providers
      candidates = Object.keys(PROVIDERS).filter((p) => health[p]?.status === "healthy");
    }

    let lastError: Error | null = null;
    const triedProviders: string[] = [];

    // 5-retry failover loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      for (const providerName of candidates) {
        if (triedProviders.includes(providerName)) continue;
        if (!checkRateLimit(providerName)) continue;

        triedProviders.push(providerName);

        try {
          const result = await callProvider(ctx, providerName, {
            input: args.input,
            systemPrompt: args.systemPrompt,
            model: args.model,
          });

          // Log success
          await ctx.runMutation(internal.model_orchestrator.logRequest, {
            provider: providerName,
            model: result.model,
            useCase,
            success: true,
            tokens: Math.ceil(result.content.length / 4),
            latencyMs: Date.now() - startTime,
          });

          await updateProviderHealth(ctx, providerName, "healthy");

          return {
            success: true,
            content: result.content,
            provider: providerName,
            model: result.model,
            useCase,
            costTier,
            latencyMs: Date.now() - startTime,
            attempt,
            triedProviders,
          };
        } catch (error: any) {
          lastError = error;
          await updateProviderHealth(ctx, providerName, "degraded", error.message);
          await ctx.runMutation(internal.model_orchestrator.logRequest, {
            provider: providerName,
            model: args.model || "unknown",
            useCase,
            success: false,
            error: error.message,
          });
        }
      }

      // Wait before retry
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }

    return {
      success: false,
      error: `All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`,
      triedProviders,
      latencyMs: Date.now() - startTime,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getProviderHealth = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const health = await fetchProviderHealth(ctx);
    const providers = Object.entries(PROVIDERS).map(([name, config]) => ({
      name,
      displayName: config.name,
      priority: config.priority,
      cost: config.cost,
      category: config.category,
      capabilities: config.capabilities,
      modelCount: config.models.length,
      health: health[name] || { status: "unknown", lastCheck: 0, errorCount: 0 },
    }));
    return { providers, total: providers.length };
  },
});

export const getUseCaseMapping = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return USE_CASE_MAPPING;
  },
});

export const getCostTiers = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return COST_TIERS;
  },
});

// ═══════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════

export const logRequest = internalMutation({
  args: {
    provider: v.string(),
    model: v.string(),
    useCase: v.string(),
    success: v.boolean(),
    tokens: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ai_model_usage", {
      modelName: args.provider,
      taskType: args.useCase,
      input: args.error || "orchestrated",
      agentId: "orchestrator",
      success: args.success,
      responseTimeMs: args.latencyMs || 0,
      errorMessage: args.error,
      tokenCount: args.tokens || 0,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// STREAMING ORCHESTRATION
// Returns response with streaming metadata for progressive rendering
// ═══════════════════════════════════════════════════════════════════

export const streamOrchestrate = action({
  args: {
    input: v.string(),
    useCase: v.optional(v.string()),
    costTier: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const useCase = args.useCase || "chat";
    const costTier = args.costTier || "balanced";

    const health = await ctx.runQuery(internal.model_orchestrator.getProviderHealth);
    let candidates = selectProviders(useCase, costTier, health);
    if (candidates.length === 0) {
      candidates = Object.keys(PROVIDERS).filter((p) => health[p]?.status === "healthy");
    }

    let lastError: Error | null = null;
    const triedProviders: string[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      for (const providerName of candidates) {
        if (triedProviders.includes(providerName)) continue;
        if (!checkRateLimit(providerName)) continue;
        triedProviders.push(providerName);

        try {
          const model = args.model || PROVIDERS[providerName]?.models[0] || "auto";
          let fullContent = "";

          if (providerName === "groq" || providerName === "openrouter" || providerName === "tencent" || providerName === "mistral") {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: providerName === "groq" ? "llama3-70b-8192" : model,
                messages: [{ role: "system", content: args.systemPrompt || "You are a helpful assistant." }, { role: "user", content: args.input }],
                temperature: 0.7,
                max_tokens: 4096,
                stream: false,
              }),
            });
            if (!response.ok) throw new Error(`${providerName} error: ${response.status}`);
            const data = await response.json();
            fullContent = data.choices?.[0]?.message?.content || "";
          } else if (providerName === "freellmapi") {
            const result = await ctx.runAction(internal.freellmapi.chatCompletion, {
              messages: [{ role: "system", content: args.systemPrompt || "You are a helpful assistant." }, { role: "user", content: args.input }],
              useCase: "general",
            });
            if (!result.success) throw new Error(result.error || "FreeLLMAPI failed");
            fullContent = result.content || "";
          } else {
            throw new Error(`Unsupported streaming provider: ${providerName}`);
          }

          const chunkSize = 50;
          const chunks: string[] = [];
          for (let i = 0; i < fullContent.length; i += chunkSize) {
            chunks.push(fullContent.substring(i, i + chunkSize));
          }

          await ctx.runMutation(internal.model_orchestrator.logRequest, {
            provider: providerName,
            model,
            useCase,
            success: true,
            tokens: Math.ceil(fullContent.length / 4),
            latencyMs: Date.now() - startTime,
          });
          await updateProviderHealth(ctx, providerName, "healthy");

          return {
            success: true,
            content: fullContent,
            chunks,
            chunkCount: chunks.length,
            provider: providerName,
            model,
            useCase,
            latencyMs: Date.now() - startTime,
            attempt,
            triedProviders,
            streaming: true,
          };
        } catch (error: any) {
          lastError = error;
          await updateProviderHealth(ctx, providerName, "degraded", error.message);
          await ctx.runMutation(internal.model_orchestrator.logRequest, {
            provider: providerName,
            model: args.model || "unknown",
            useCase,
            success: false,
            error: error.message,
          });
        }
      }
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }

    return {
      success: false,
      error: `All ${MAX_RETRIES} attempts failed: ${lastError?.message}`,
      triedProviders,
      latencyMs: Date.now() - startTime,
      streaming: false,
    };
  },
});
