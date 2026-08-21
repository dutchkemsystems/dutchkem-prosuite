import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

export function registerOrchestratorRoutes(http: HttpRouter) {
  http.route({
    path: "/api/orchestrator/status",
    method: "GET",
    handler: httpAction(async (ctx) => {
      try {
        const status = await ctx.runQuery(internal.model_orchestrator.getProviderHealth);
        return new Response(JSON.stringify({
          success: true,
          ...status,
          timestamp: Date.now(),
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/models",
    method: "GET",
    handler: httpAction(async (ctx) => {
      try {
        const health = await ctx.runQuery(internal.model_orchestrator.getProviderHealth);
        const models: any[] = [];
        for (const p of health.providers) {
          const providerModels = ["freellmapi", "tencent", "cerebras", "mistral", "groq", "openrouter", "nvidia", "aiml", "mimo"];
          const modelMap: Record<string, string[]> = {
            freellmapi: ["auto"],
            tencent: ["tencent/hy3"],
            cerebras: ["meta-llama/llama-3.3-70b-instruct:free"],
            mistral: ["mistralai/mistral-large-3", "mistralai/codestral", "mistralai/magistral-medium"],
            groq: ["meta-llama/llama-3.3-70b-instruct:free"],
            openrouter: ["meta-llama/llama-3.3-70b-instruct:free"],
            nvidia: ["meta-llama/llama-3.3-70b-instruct:free"],
            aiml: ["stabilityai/stable-diffusion-xl"],
            mimo: ["mimo-v2.5"],
          };
          const pModels = modelMap[p.name] || [];
          for (const m of pModels) {
            models.push({
              id: m,
              provider: p.name,
              displayName: p.displayName,
              category: p.category,
              cost: p.cost,
              capabilities: p.capabilities,
              healthy: p.health.status === "healthy",
            });
          }
        }
        return new Response(JSON.stringify({
          success: true,
          models,
          total: models.length,
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/route",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        const { input, useCase, costTier, systemPrompt, model } = body;

        if (!input) {
          return new Response(JSON.stringify({ success: false, error: "input is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const result = await ctx.runAction(internal.model_orchestrator.orchestrate, {
          input,
          useCase: useCase || "chat",
          costTier: costTier || "balanced",
          systemPrompt,
          model,
        });

        return new Response(JSON.stringify({
          success: true,
          ...result,
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/use-cases",
    method: "GET",
    handler: httpAction(async (ctx) => {
      try {
        const useCases = await ctx.runQuery(internal.model_orchestrator.getUseCaseMapping);
        return new Response(JSON.stringify({
          success: true,
          useCases,
          total: Object.keys(useCases).length,
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/cost-tiers",
    method: "GET",
    handler: httpAction(async (ctx) => {
      try {
        const tiers = await ctx.runQuery(internal.model_orchestrator.getCostTiers);
        return new Response(JSON.stringify({
          success: true,
          tiers,
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/health",
    method: "GET",
    handler: httpAction(async (ctx) => {
      try {
        const health = await ctx.runQuery(internal.model_orchestrator.getProviderHealth);
        const healthyCount = health.providers.filter((p: any) => p.health.status === "healthy").length;
        return new Response(JSON.stringify({
          status: healthyCount >= 6 ? "healthy" : "degraded",
          providers: healthyCount,
          total: health.total,
          timestamp: Date.now(),
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ status: "error", error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/reset",
    method: "POST",
    handler: httpAction(async (ctx) => {
      try {
        await ctx.runMutation(internal.model_orchestrator.resetAllProviderHealth, {});
        return new Response(JSON.stringify({
          success: true,
          message: "All providers reset to healthy",
          timestamp: Date.now(),
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/orchestrator/test-nvidia",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        const input = body.input || "Hello";
        const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
        if (!nvidiaKey) {
          return new Response(JSON.stringify({ success: false, error: "NVIDIA_NIM_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${nvidiaKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "meta/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: input }],
            max_tokens: 100,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(JSON.stringify({ success: false, error: `NVIDIA API error: ${response.status} - ${errorText}` }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const data = await response.json();
        return new Response(JSON.stringify({
          success: true,
          provider: "nvidia",
          model: "meta/llama-3.3-70b-instruct",
          content: data.choices?.[0]?.message?.content || "",
          usage: data.usage,
        }), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });
}
