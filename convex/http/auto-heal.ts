import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import type { HttpRouter } from "convex/server";

const AUTO_HEAL_SECRET = process.env.AUTO_HEAL_SECRET ?? "";
function verifyAutoHealSecret(req: Request): boolean {
  if (!AUTO_HEAL_SECRET) return true;
  const provided = req.headers.get("x-auto-heal-secret") ?? "";
  return provided === AUTO_HEAL_SECRET;
}

const reportBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

export function registerAutoHealRoutes(http: HttpRouter) {
  http.route({
    path: "/auto-heal-start",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.startRun, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-section",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.recordSection, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-alert",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.recordAlert, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-fix",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.recordFix, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-secret",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.recordSecret, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-health",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.recordHealthCheck, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/auto-heal-complete",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      if (!verifyAutoHealSecret(req)) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const body = await reportBody(req);
      await ctx.runMutation(api.auto_heal.completeRun, body);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });
}
