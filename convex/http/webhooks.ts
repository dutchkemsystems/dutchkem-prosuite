import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";
import { koraWebhook } from "../kora_webhook";
import { trypostWebhook } from "../trypost_webhook";

export function registerWebhookRoutes(http: HttpRouter) {
  http.route({
    path: "/api/webhooks/kora",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      const signature = req.headers.get("x-kora-signature") || "";
      const body = await req.json();
      if (!body || typeof body !== "object") return new Response(JSON.stringify({ error: "Request body must be a JSON object" }), { status: 400, headers: { "Content-Type": "application/json" } });
      if (!body.reference || typeof body.reference !== "string") return new Response(JSON.stringify({ error: "Missing or invalid 'reference'" }), { status: 400, headers: { "Content-Type": "application/json" } });
      if (typeof body.amount !== "number" || body.amount <= 0) return new Response(JSON.stringify({ error: "Missing or invalid 'amount'" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const userId = body.metadata?.userId || body.userId;
      const verification = await ctx.runMutation(internal.guardian.verifyPayment, { reference: body.reference, amount: body.amount, currency: body.currency, ip, userId, signature, agentId: body.metadata?.agentId, service: body.metadata?.service });
      if (verification.status === "approved") {
        try { await ctx.runMutation(internal.abandonedCheckouts.completeCheckout, { reference: body.reference }); } catch { }
        if (body.metadata?.service && body.metadata?.plan && userId) {
          try {
            await ctx.runMutation(internal.payments.activateSubscription, {
              userId,
              service: body.metadata.service,
              plan: body.metadata.plan,
              reference: body.reference,
              amount: body.amount,
            });
          } catch (e: any) { console.error("[Webhook] Subscription activation failed:", e.message); }
        }
        if (body.metadata?.service === "kdp" && body.metadata?.plan && userId) {
          try {
            await ctx.runMutation(internal.kdp_subscriptions.activateKDPPayment, {
              userId,
              plan: body.metadata.plan,
              reference: body.reference,
              amount: body.amount,
            });
          } catch (e: any) { console.error("[Webhook] KDP subscription activation failed:", e.message); }
        }
        if (body.metadata?.type === "enterprise_subscription" && body.metadata?.orgId) {
          try {
            await ctx.runMutation(internal.enterprise_payments.confirmEnterprisePayment, {
              reference: body.reference,
              amount: body.amount,
              koraReference: body.data?.reference || body.reference,
            });
          } catch (e: any) { console.error("[Webhook] Enterprise payment activation failed:", e.message); }
        }
      }
      return new Response(JSON.stringify({ webhookStatus: "processed", ...verification }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  });

  http.route({
    path: "/kora-webhook",
    method: "POST",
    handler: koraWebhook,
  });

  http.route({
    path: "/api/webhooks/enterprise-payment",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        if (!body || typeof body !== "object") return new Response(JSON.stringify({ ok: false, error: "Request body must be a JSON object" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const hasKnownEvent = body.event || body.type;
        if (typeof hasKnownEvent !== "string") return new Response(JSON.stringify({ ok: false, error: "Missing 'event' or 'type' field" }), { status: 400, headers: { "Content-Type": "application/json" } });

        if (body.event === "charge.success") {
          const invoiceNumber = body.data?.reference || body.data?.metadata?.invoice_number;
          if (invoiceNumber) {
            await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
              invoiceNumber,
              gatewayReference: body.data?.reference,
              metadata: body.data,
            });
          }
        }

        if (body.type === "checkout.session.completed") {
          const invoiceNumber = body.data?.object?.metadata?.invoice_number;
          if (invoiceNumber) {
            await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
              invoiceNumber,
              gatewayReference: body.data?.object?.id,
              metadata: body.data?.object,
            });
          }
        }

        if (body.event === "charge.completed") {
          const invoiceNumber = body.data?.tx_ref;
          if (invoiceNumber) {
            await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
              invoiceNumber,
              gatewayReference: body.data?.transaction_id,
              metadata: body.data,
            });
          }
        }

        if (body.event === "charge.failed" || body.type === "checkout.session.expired") {
          const invoiceNumber = body.data?.reference || body.data?.metadata?.invoice_number || body.data?.tx_ref;
          if (invoiceNumber) {
            await ctx.runMutation(internal.enterprise_client_payments.failPayment, {
              invoiceNumber,
              reason: body.data?.message || "Payment failed",
            });
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/kora/callback",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        if (!body || typeof body !== "object") return new Response(JSON.stringify({ ok: false, error: "Request body must be a JSON object" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const { reference, status, amount } = body;
        if (reference && typeof reference !== "string") return new Response(JSON.stringify({ ok: false, error: "'reference' must be a string" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (amount !== undefined && (typeof amount !== "number" || amount < 0)) return new Response(JSON.stringify({ ok: false, error: "'amount' must be a non-negative number" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (reference) {
          await ctx.runMutation(internal.kora_pay.logWebhookEvent, {
            eventType: status === "success" ? "transfer.completed" : "transfer.failed",
            reference,
            amount: amount || 0,
            status: status || "unknown",
            rawPayload: body,
            verified: false,
          });
          if (status === "success") {
            await ctx.runMutation(internal.kora_pay.handleTransferCompleted, { reference });
          } else {
            await ctx.runMutation(internal.kora_pay.handleTransferFailed, { reference, reason: body.reason || body.message || "Unknown" });
          }
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/trypost-webhook",
    method: "POST",
    handler: trypostWebhook,
  });
}
