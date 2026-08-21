import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

export function registerMiscRoutes(http: HttpRouter) {
  http.route({
    path: "/api/health",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      return new Response(JSON.stringify({ status: "ok", timestamp: Date.now(), version: "3.0.0" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }),
  });

  http.route({
    path: "/api/live-feeds",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      return new Response(JSON.stringify({ feeds: [], message: "Live feeds endpoint active" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/api/exchange-rates",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const rateData = await ctx.runAction(internal.usd_wallet.fetchCBNExchangeRate, {});
      return new Response(JSON.stringify(rateData), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });
}
