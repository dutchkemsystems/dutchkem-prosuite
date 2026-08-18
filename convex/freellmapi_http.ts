import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Proxy endpoint for FreeLLMAPI health check
http.route({
  path: "/freellmapi/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001";
    const healthUrl = FREELLMAPI_URL.replace("/v1", "") + "/health";

    try {
      const response = await fetch(healthUrl, {
        headers: {
          Authorization: request.headers.get("Authorization") || "",
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `HTTP ${response.status}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Proxy endpoint for FreeLLMAPI models
http.route({
  path: "/freellmapi/models",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001/v1";

    try {
      const response = await fetch(`${FREELLMAPI_URL}/models`, {
        headers: {
          Authorization: request.headers.get("Authorization") || "",
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `HTTP ${response.status}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Proxy endpoint for FreeLLMAPI chat completions
http.route({
  path: "/freellmapi/chat/completions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001/v1";

    try {
      const body = await request.text();
      const response = await fetch(`${FREELLMAPI_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: request.headers.get("Authorization") || "",
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `HTTP ${response.status}: ${errorText}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      
      // Log usage
      await ctx.runMutation("freellmapi:logUsage" as any, {
        model: data.model || "unknown",
        routedVia: response.headers.get("x-routed-via") || "proxy",
        latencyMs: 0,
        tokensUsed: data.usage?.total_tokens || 0,
        success: true,
      });

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
