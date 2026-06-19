import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// KORA PAY WEBHOOK HANDLER
// Receives payment status updates from Kora Pay
// ═══════════════════════════════════════════════════════════════════

/**
 * Verify Kora Pay webhook signature using HMAC-SHA256
 * Kora signs webhooks with: HMAC-SHA256(payload, KORA_WEBHOOK_SECRET)
 */
async function verifyKoraSignature(payload: string, signature: string | null): Promise<boolean> {
  const secret = process.env.KORA_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[KORA WEBHOOK] No KORA_WEBHOOK_SECRET in production — REJECTING");
      return false;
    }
    console.warn("[KORA WEBHOOK] No KORA_WEBHOOK_SECRET configured - accepting all (DEV MODE)");
    return true;
  }
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computedB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computedB64 === signature;
  } catch (e) {
    console.error("[KORA WEBHOOK] Signature verification error:", e);
    return false;
  }
}

/**
 * Kora Pay webhook HTTP handler
 * POST /kora-webhook
 */
export const koraWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-kora-signature") || request.headers.get("signature");

  // Verify signature
  const verified = await verifyKoraSignature(rawBody, signature);
  if (!verified) {
    console.error("[KORA WEBHOOK] Signature verification failed");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = payload.event || payload.type || "unknown";
  const reference = payload.data?.reference || payload.reference || "unknown";
  const status = payload.data?.status || payload.status || "unknown";
  const amount = payload.data?.amount || payload.amount;

  console.log(`[KORA WEBHOOK] Event: ${eventType}, Ref: ${reference}, Status: ${status}`);

  // Log the webhook event
  await ctx.runMutation(internal.kora_pay.logWebhookEvent, {
    eventType: String(eventType),
    reference: String(reference),
    amount: typeof amount === "number" ? amount : undefined,
    status: String(status),
    rawPayload: payload,
    verified,
  });

  // Process based on event type
  try {
    if (eventType === "transfer.completed" || eventType === "charge.successful") {
      // Check if this is an agent subscription payment
      if (reference.startsWith("AGENT-")) {
        // Extract agent payment details from metadata
        const metadata = payload.data?.metadata || {};
        const customerEmail = payload.data?.customer?.email || metadata.customerEmail;
        const customerName = payload.data?.customer?.name || metadata.customerName;
        
        if (customerEmail) {
          await ctx.runMutation(internal.agent_payments.completePayment, {
            reference: String(reference),
            amount: typeof amount === "number" ? amount : 0,
            agentId: metadata.agentId || "unknown",
            agentName: metadata.agentName || "Unknown Agent",
            planId: metadata.planId || "basic",
            planName: metadata.planName || "Basic",
            customerEmail,
            customerName: customerName || "Client",
          });
          console.log(`[KORA WEBHOOK] Agent payment completed: ${reference}`);
        }
      } else {
        // Handle regular subscription payments
        await ctx.runMutation(internal.kora_pay.handleTransferCompleted, {
          reference: String(reference),
        });
      }
    } else if (eventType === "transfer.failed" || eventType === "charge.failed") {
      await ctx.runMutation(internal.kora_pay.handleTransferFailed, {
        reference: String(reference),
        reason: payload.data?.reason || payload.reason || "Unknown",
      });
    }
  } catch (e: any) {
    console.error(`[KORA WEBHOOK] Processing error: ${e.message}`);
  }

  return new Response(JSON.stringify({ received: true, eventType, reference }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
