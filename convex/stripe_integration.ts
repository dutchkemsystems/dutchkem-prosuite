import { v } from "convex/values";
import { action, mutation, query, httpAction, internalMutation } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// STRIPE INTEGRATION
// Handle subscription payments via Stripe
// ═══════════════════════════════════════════════════════════════════

const STRIPE_API_URL = "https://api.stripe.com/v1";

// ═══════════════════════════════════════════════════════════════════
// CREATE CHECKOUT SESSION
// ═══════════════════════════════════════════════════════════════════

export const createCheckoutSession = action({
  args: {
    adminToken: v.string(),
    planId: v.string(),
    userId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { error: "Stripe not configured" };

    // Get plan details
    const plans: Record<string, { name: string; amount: number; interval: string }> = {
      weekly: { name: "Weekly Plan", amount: 500000, interval: "week" },
      monthly: { name: "Monthly Plan", amount: 1500000, interval: "month" },
      yearly: { name: "Yearly Plan", amount: 15000000, interval: "year" },
    };

    const plan = plans[args.planId];
    if (!plan) return { error: "Invalid plan" };

    try {
      const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "mode": "subscription",
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": "ngn",
          "line_items[0][price_data][product_data][name]": plan.name,
          "line_items[0][price_data][unit_amount]": String(plan.amount),
          "line_items[0][price_data][recurring][interval]": plan.interval,
          "line_items[0][quantity]": "1",
          "success_url": args.successUrl,
          "cancel_url": args.cancelUrl,
          "metadata[userId]": args.userId,
          "metadata[planId]": args.planId,
        }),
      });

      const data = await response.json();
      
      if (data.id) {
        return { success: true, sessionId: data.id, url: data.url };
      }
      return { success: false, error: data.error?.message || "Failed to create session" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// HANDLE STRIPE WEBHOOK
// ═══════════════════════════════════════════════════════════════════

export const handleStripeWebhook = httpAction(async (ctx, req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify webhook signature (simplified)
  // In production, use stripe.webhooks.constructEvent(body, sig, webhookSecret)

  const event = JSON.parse(body);

  switch (event.type) {
    case "checkout.session.completed":
      await ctx.runMutation(internal.stripe_integration.handleCheckoutComplete, {
        sessionId: event.data.object.id,
        userId: event.data.object.metadata.userId,
        planId: event.data.object.metadata.planId,
        subscriptionId: event.data.object.subscription,
      });
      break;

    case "invoice.paid":
      await ctx.runMutation(internal.stripe_integration.handleInvoicePaid, {
        subscriptionId: event.data.object.subscription,
        invoiceId: event.data.object.id,
      });
      break;

    case "customer.subscription.deleted":
      await ctx.runMutation(internal.stripe_integration.handleSubscriptionCancelled, {
        subscriptionId: event.data.object.id,
      });
      break;
  }

  return { received: true };
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const handleCheckoutComplete = internalMutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    planId: v.string(),
    subscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const durations: Record<string, number> = {
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };

    await ctx.db.insert("subscriptions", {
      userId: args.userId,
      plan: args.planId as any,
      status: "active",
      amount: 0,
      paymentMethod: "stripe",
      stripeSubscriptionId: args.subscriptionId,
      startDate: now,
      endDate: now + (durations[args.planId] || durations.monthly),
      createdAt: now,
    });
  },
});

export const handleInvoicePaid = internalMutation({
  args: {
    subscriptionId: v.string(),
    invoiceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Extend subscription expiry
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("stripeSubscriptionId"), args.subscriptionId))
      .first();

    if (subscription) {
      const durations: Record<string, number> = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000,
      };
      
      await ctx.db.patch(subscription._id, {
        endDate: subscription.endDate + (durations[subscription.plan] || durations.monthly),
        lastPaymentDate: Date.now(),
      });
    }
  },
});

export const handleSubscriptionCancelled = internalMutation({
  args: {
    subscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("stripeSubscriptionId"), args.subscriptionId))
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "cancelled",
        cancelledAt: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getStripeStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      configured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      status: process.env.STRIPE_SECRET_KEY ? "Ready" : "Needs configuration",
      plans: ["weekly", "monthly", "yearly"],
    };
  },
});
