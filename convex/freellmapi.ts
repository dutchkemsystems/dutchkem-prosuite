import { v } from "convex/values";
import { action, query, mutation, internalAction, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// FREELLMAPI INTEGRATION
// Aggregates 161+ free AI models from 18 providers
// OpenAI-compatible endpoint with automatic failover
// ═══════════════════════════════════════════════════════════════════

const FREELLMAPI_BASE_URL = process.env.FREELLMAPI_URL || "http://localhost:3001/v1";
const FREELLMAPI_API_KEY = process.env.FREELLMAPI_API_KEY || "";

// Recommended models for different use cases
const MODEL_RECOMMENDATIONS: Record<string, string> = {
  chat: "auto",
  academic: "auto",
  business: "auto",
  content: "auto",
  code: "auto",
  vision: "auto",
  embeddings: "text-embedding-3-small",
};

// ═══════════════════════════════════════════════════════════════════
// ACTION: Call FreeLLMAPI chat completion
// ═══════════════════════════════════════════════════════════════════
export const chatCompletion = action({
  args: {
    messages: v.array(v.object({
      role: v.string(),
      content: v.string(),
    })),
    model: v.optional(v.string()),
    useCase: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    stream: v.optional(v.boolean()),
    tools: v.optional(v.any()),
    toolChoice: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!FREELLMAPI_API_KEY) {
      return { error: "FreeLLMAPI API key not configured" };
    }

    const model = args.model || MODEL_RECOMMENDATIONS[args.useCase || "chat"] || "auto";
    const startTime = Date.now();

    try {
      const response = await fetch(`${FREELLMAPI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FREELLMAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: args.messages,
          temperature: args.temperature ?? 0.7,
          max_tokens: args.maxTokens ?? 4096,
          stream: args.stream ?? false,
          tools: args.tools,
          tool_choice: args.toolChoice,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { error: `FreeLLMAPI error: ${response.status} - ${errText}` };
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const routedVia = response.headers.get("x-routed-via") || "unknown";

      // Log usage asynchronously
      await ctx.runMutation(internal.freellmapi.logUsage, {
        model: data.model || model,
        routedVia,
        latencyMs,
        tokensUsed: data.usage?.total_tokens || 0,
        success: true,
      });

      return {
        success: true,
        content: data.choices?.[0]?.message?.content || "",
        model: data.model,
        routedVia,
        latencyMs,
        usage: data.usage,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Log failure
      await ctx.runMutation(internal.freellmapi.logUsage, {
        model,
        routedVia: "error",
        latencyMs,
        tokensUsed: 0,
        success: false,
        error: error.message,
      });

      return { error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Get available models from FreeLLMAPI
// ═══════════════════════════════════════════════════════════════════
export const getModels = action({
  args: {},
  returns: v.any(),
  handler: async () => {
    if (!FREELLMAPI_API_KEY) {
      return { error: "FreeLLMAPI API key not configured", models: [] };
    }

    try {
      const response = await fetch(`${FREELLMAPI_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${FREELLMAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        return { error: `Failed to fetch models: ${response.status}`, models: [] };
      }

      const data = await response.json();
      return {
        success: true,
        models: data.data || [],
        total: data.data?.length || 0,
      };
    } catch (error: any) {
      return { error: error.message, models: [] };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Check FreeLLMAPI health
// ═══════════════════════════════════════════════════════════════════
export const checkHealth = action({
  args: {},
  returns: v.any(),
  handler: async () => {
    if (!FREELLMAPI_API_KEY) {
      return { status: "not_configured", configured: false };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${FREELLMAPI_BASE_URL.replace("/v1", "")}/health`, {
        headers: {
          Authorization: `Bearer ${FREELLMAPI_API_KEY}`,
        },
      });
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return { status: "unhealthy", configured: true, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return {
        status: data.status || "healthy",
        configured: true,
        latencyMs,
        providers: data.providers || {},
      };
    } catch (error: any) {
      return { status: "unreachable", configured: true, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Log usage analytics
// ═══════════════════════════════════════════════════════════════════
export const logUsage = internalMutation({
  args: {
    model: v.string(),
    routedVia: v.string(),
    latencyMs: v.number(),
    tokensUsed: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("freellmapi_usage", {
      model: args.model,
      routedVia: args.routedVia,
      latencyMs: args.latencyMs,
      tokensUsed: args.tokensUsed,
      success: args.success,
      error: args.error,
      createdAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get usage analytics
// ═══════════════════════════════════════════════════════════════════
export const getUsageAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const usage = await ctx.db
      .query("freellmapi_usage")
      .filter((q) => q.gte(q.field("createdAt"), cutoff))
      .collect();

    const totalRequests = usage.length;
    const successfulRequests = usage.filter((u) => u.success).length;
    const totalTokens = usage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const avgLatency = totalRequests > 0
      ? usage.reduce((sum, u) => sum + u.latencyMs, 0) / totalRequests
      : 0;

    // Group by model
    const byModel: Record<string, number> = {};
    usage.forEach((u) => {
      byModel[u.model] = (byModel[u.model] || 0) + 1;
    });

    // Group by routed provider
    const byProvider: Record<string, number> = {};
    usage.forEach((u) => {
      byProvider[u.routedVia] = (byProvider[u.routedVia] || 0) + 1;
    });

    return {
      totalRequests,
      successfulRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      totalTokens,
      avgLatency: Math.round(avgLatency),
      byModel,
      byProvider,
      period: `${days} days`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get FreeLLMAPI status
// ═══════════════════════════════════════════════════════════════════
export const getStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return {
      configured: !!FREELLMAPI_API_KEY,
      baseUrl: FREELLMAPI_BASE_URL,
      hasApiKey: !!FREELLMAPI_API_KEY,
    };
  },
});
