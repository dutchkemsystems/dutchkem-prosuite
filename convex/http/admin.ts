import { httpAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

async function verifyAdminToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const url = process.env.CONVEX_SITE_URL || "https://warmhearted-aardvark-280.convex.site";
    const res = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "auth_helpers:validateAdminSession",
        args: { adminToken: token },
      }),
    });
    const data = await res.json();
    if (data.status === "success" && data.value) return data.value._id;
    return null;
  } catch {
    return null;
  }
}

export function registerAdminRoutes(http: HttpRouter) {
  http.route({
    path: "/api/marketplace/jobs/approve",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      const body = await req.json();
      const { transactionId, clientId } = body;
      if (!transactionId || !clientId) return new Response(JSON.stringify({ error: "Missing transactionId or clientId" }), { status: 400, headers: { "Content-Type": "application/json" } });
      await ctx.runMutation(api.marketplace.approveJob, { transactionId, clientId });
      return new Response(JSON.stringify({ success: true, message: "Work approved. Payout scheduled for Friday 2 PM." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({ path: "/api/admin/marketplace/escrow", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const balance = await ctx.runQuery(api.marketplace.getEscrowBalance); return new Response(JSON.stringify(balance), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
  http.route({ path: "/api/admin/marketplace/pending-payout", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const pending = await ctx.runQuery(api.marketplace.getPendingFridayPayout); return new Response(JSON.stringify(pending), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
  http.route({ path: "/api/admin/marketplace/payouts", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const url = new URL(req.url); const limit = Number(url.searchParams.get("limit")) || 50; const payouts = await ctx.runQuery(api.marketplace.getPayoutHistory, { limit }); return new Response(JSON.stringify(payouts), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
  http.route({ path: "/api/admin/marketplace/stats", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const stats = await ctx.runQuery(api.marketplace.getMarketplaceStats); return new Response(JSON.stringify(stats), { status: 200, headers: { "Content-Type": "application/json" } }); }) });

  http.route({
    path: "/api/admin/earnings-live",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const adminToken = url.searchParams.get("token");
      if (!adminToken) return new Response(JSON.stringify({ authError: true }), { status: 401, headers: { "Content-Type": "application/json" } });
      const session: any = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
      if (!session) return new Response(JSON.stringify({ authError: true }), { status: 401, headers: { "Content-Type": "application/json" } });
      const earnings = await ctx.runQuery(api.admin.getEarningsSummary, { adminToken });
      const txs = await ctx.runQuery(api.admin.getRecentTransactions, {});
      return new Response(JSON.stringify({ earnings, txs }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }),
  });

  http.route({
    path: "/api/admin/task-status",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const adminToken = url.searchParams.get("token");
      if (!adminToken) return new Response(JSON.stringify({ authError: true }), { status: 401, headers: { "Content-Type": "application/json" } });
      const session: any = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
      if (!session) return new Response(JSON.stringify({ authError: true }), { status: 401, headers: { "Content-Type": "application/json" } });
      const taskId = url.searchParams.get("taskId");
      if (!taskId) return new Response(JSON.stringify({ error: "taskId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

      const logs = await ctx.runQuery(api.uae_engine.getManualTaskLogs, {});
      const task = logs.find((t: any) => t._id === taskId);
      if (!task) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

      return new Response(JSON.stringify({ status: task.status, output: task.output || null }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }),
  });

  http.route({
    path: "/api/marketplace/seed",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        const { adminToken, offset = 0 } = body;
        if (!adminToken) return new Response(JSON.stringify({ error: "adminToken required" }), { status: 400, headers: { "Content-Type": "application/json" } });

        const session: any = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
        if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const result = await ctx.runMutation(internal.seed_marketplace_templates.seedAllTemplates, { adminToken, offset });
        return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/marketplace/seed",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const adminToken = url.searchParams.get("token");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      if (!adminToken) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { "Content-Type": "application/json" } });

      const session: any = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
      if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

      const result = await ctx.runMutation(internal.seed_marketplace_templates.seedAllTemplates, { adminToken, offset });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/api/marketplace/enterprise-seed",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        const { adminToken, offset = 0 } = body;
        if (!adminToken) return new Response(JSON.stringify({ error: "adminToken required" }), { status: 400, headers: { "Content-Type": "application/json" } });

        const session: any = await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
        if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const result = await ctx.runMutation(internal.enterprise_marketplace_templates.seedEnterpriseTemplates, { adminToken, offset });
        return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });
}
