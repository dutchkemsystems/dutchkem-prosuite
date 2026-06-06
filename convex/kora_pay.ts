import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// KORA PAY HELPER MUTATIONS
// Used by kora_webhook.ts and other payment-related actions
// ═══════════════════════════════════════════════════════════════════

/**
 * Log a Kora Pay webhook event
 */
export const logWebhookEvent = internalMutation({
  args: {
    eventType: v.string(),
    reference: v.string(),
    amount: v.optional(v.number()),
    status: v.string(),
    rawPayload: v.any(),
    verified: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("kora_webhook_events", {
      eventType: args.eventType,
      reference: args.reference,
      amount: args.amount,
      status: args.status,
      rawPayload: args.rawPayload,
      verified: args.verified,
      processed: false,
      receivedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Handle transfer.completed webhook
 */
export const handleTransferCompleted = internalMutation({
  args: { reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Mark webhook as processed
    const events = await ctx.db
      .query("kora_webhook_events")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .collect();

    for (const event of events) {
      if (!event.processed) {
        await ctx.db.patch("kora_webhook_events", event._id, { processed: true, processedAt: Date.now() });
      }
    }

    // Update related renewal transactions
    const renewals = await ctx.db
      .query("renewal_transactions")
      .filter((q) => q.eq(q.field("koraReference"), args.reference))
      .collect();

    for (const renewal of renewals) {
      if (renewal.status === "pending") {
        await ctx.db.patch("renewal_transactions", renewal._id, {
          status: "completed",
          completedAt: Date.now(),
        });
        console.log(`[KORA] Renewal ${renewal._id} marked completed via webhook`);
      }
    }

    // Update tithe transactions
    const tithes = await ctx.db
      .query("tithe_transactions")
      .filter((q) => q.eq(q.field("koraReference"), args.reference))
      .collect();

    for (const tithe of tithes) {
      if (tithe.status === "pending") {
        await ctx.db.patch("tithe_transactions", tithe._id, { status: "completed" });
      }
    }

    // Update CAC transactions
    const cacs = await ctx.db
      .query("cac_tax_transactions")
      .filter((q) => q.eq(q.field("koraReference"), args.reference))
      .collect();

    for (const cac of cacs) {
      if (cac.status === "pending") {
        await ctx.db.patch("cac_tax_transactions", cac._id, { status: "completed" });
      }
    }

    // Update daily sweeps
    const sweeps = await ctx.db
      .query("daily_sweeps")
      .filter((q) => q.eq(q.field("kora_reference"), args.reference))
      .collect();

    for (const sweep of sweeps) {
      if (sweep.status === "pending") {
        await ctx.db.patch("daily_sweeps", sweep._id, { status: "completed" });
      }
    }

    return null;
  },
});

/**
 * Handle transfer.failed webhook
 */
export const handleTransferFailed = internalMutation({
  args: { reference: v.string(), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Mark webhook as processed
    const events = await ctx.db
      .query("kora_webhook_events")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .collect();

    for (const event of events) {
      if (!event.processed) {
        await ctx.db.patch("kora_webhook_events", event._id, { processed: true, processedAt: Date.now() });
      }
    }

    // Update related renewal transactions
    const renewals = await ctx.db
      .query("renewal_transactions")
      .filter((q) => q.eq(q.field("koraReference"), args.reference))
      .collect();

    for (const renewal of renewals) {
      if (renewal.status === "pending") {
        await ctx.db.patch("renewal_transactions", renewal._id, {
          status: "failed",
          errorMessage: args.reason,
          completedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

/**
 * Get webhook event history
 */
export const getWebhookEvents = internalMutation({
  args: { reference: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kora_webhook_events")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .collect();
  },
});
