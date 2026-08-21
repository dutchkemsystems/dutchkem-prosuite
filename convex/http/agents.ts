import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

const agentHandler = (actionFn: any) => httpAction(async (ctx, req) => {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const verification = await ctx.runQuery(internal.api_key_helpers.verifyApiKey, { apiKey });
  if (!verification.valid) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (verification.userId) {
    const sub = await ctx.runQuery(internal.subscription_guard.checkUserSubscription, { userId: verification.userId });
    if (!sub.active) {
      return new Response(JSON.stringify({ error: "No active subscription. Please subscribe to use this agent." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const { prompt } = await req.json();
  if (!prompt) return new Response("Missing prompt", { status: 400 });
  const result = await ctx.runAction(actionFn, { prompt });
  return new Response(JSON.stringify({ response: result }), { status: 200, headers: { "Content-Type": "application/json" } });
});

export function registerAgentRoutes(http: HttpRouter) {
  http.route({ path: "/api/agents/a1/generate", method: "POST", handler: agentHandler(internal.academic_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a2/generate", method: "POST", handler: agentHandler(internal.business_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a3/generate", method: "POST", handler: agentHandler(internal.content_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a4/generate", method: "POST", handler: agentHandler(internal.career_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a5/generate", method: "POST", handler: agentHandler(internal.shopping_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a6/generate", method: "POST", handler: agentHandler(internal.exam_career_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a7/generate", method: "POST", handler: agentHandler(internal.finance_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a8/generate", method: "POST", handler: agentHandler(internal.video_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a9/generate", method: "POST", handler: agentHandler(internal.wellness_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a10/generate", method: "POST", handler: agentHandler(internal.home_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a11/generate", method: "POST", handler: agentHandler(internal.language_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a12/generate", method: "POST", handler: agentHandler(internal.travel_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a13/generate", method: "POST", handler: agentHandler(internal.certification_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a14/generate", method: "POST", handler: agentHandler(internal.translation_chat.generateSimpleResponse) });
  http.route({ path: "/api/agents/a15/generate", method: "POST", handler: agentHandler(internal.event_chat.generateSimpleResponse) });
}
