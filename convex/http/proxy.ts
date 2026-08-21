import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

export function registerProxyRoutes(http: HttpRouter) {
  http.route({
    path: "/freellmapi/health",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001";
      const healthUrl = FREELLMAPI_URL.replace("/v1", "") + "/health";
      try {
        const response = await fetch(healthUrl, {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        });
        if (!response.ok) {
          return new Response(JSON.stringify({ error: `HTTP ${response.status}` }), { status: response.status, headers: { "Content-Type": "application/json" } });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/freellmapi/models",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001/v1";
      try {
        const response = await fetch(`${FREELLMAPI_URL}/models`, {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        });
        if (!response.ok) {
          return new Response(JSON.stringify({ error: `HTTP ${response.status}` }), { status: response.status, headers: { "Content-Type": "application/json" } });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/freellmapi/chat/completions",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      const FREELLMAPI_URL = process.env.FREELLMAPI_URL || "http://localhost:3001/v1";
      try {
        const body = await req.text();
        const response = await fetch(`${FREELLMAPI_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("Authorization") || "",
          },
          body,
        });
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(JSON.stringify({ error: `HTTP ${response.status}: ${errorText}` }), { status: response.status, headers: { "Content-Type": "application/json" } });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });
}
