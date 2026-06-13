import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { tryGetAdminSession } from "./auth_helpers";

/**
 * Handle Auto-Renewals and Retries (Triggered by Cron)
 */
export const processSubscriptionRenewals = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    
    // 1. Find active subscriptions that have expired but should auto-renew
    const subscriptionsToRenew = await ctx.runQuery(internal.payments.getSubscriptionsForRenewal, { now });
    
    for (const sub of subscriptionsToRenew) {
      await ctx.runAction(internal.payments.attemptCharge, { subscriptionId: sub._id });
    }

    // 2. Find suspended subscriptions with pending retries
    const subscriptionsToRetry = await ctx.runQuery(internal.payments.getSubscriptionsForRetry, { now });
    
    for (const sub of subscriptionsToRetry) {
      await ctx.runAction(internal.payments.attemptCharge, { subscriptionId: sub._id });
    }

    return null;
  },
});

export const attemptCharge = internalAction({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const sub = await ctx.runQuery(internal.payments.getSubscription, { subscriptionId });
    if (!sub || !sub.paymentMethodId) return null;

    const user = await ctx.runQuery(internal.payments.getUser, { userId: sub.userId });
    if (!user) return null;

    const standardAmounts = {
        weekly: 2000,
        monthly: 8000,
        quarterly: 25000,
        yearly: 80000
    };

    const kdpAmounts = {
        monthly: 25000,
        quarterly: 60000,
        yearly: 200000,
        weekly: 25000 // Fallback/Unused
    };

    const amount = sub.service === "kdp" 
      ? (kdpAmounts as any)[sub.plan] 
      : (standardAmounts as any)[sub.plan] || 0;

    try {
      console.log(`[Kora] Charging ₦${amount} for ${sub.plan} subscription renewal: ${subscriptionId}`);
      
      // Real Kora Pay API call
      const chargeResult = await ctx.runAction(internal.payments.chargeKoraPay, {
        subscriptionId,
        amount,
        email: user.email || "client@dutchkem.com",
        plan: sub.plan,
        service: sub.service || "prosuite",
      });

      if (chargeResult.success) {
        await ctx.runMutation(internal.payments.handleSuccessfulRenewal, { subscriptionId });
      } else {
        await ctx.runMutation(internal.payments.handleFailedRenewal, { subscriptionId });
      }
    } catch (error) {
      console.error("Renewal charge failed", error);
      await ctx.runMutation(internal.payments.handleFailedRenewal, { subscriptionId });
    }
    return null;
  },
});

/**
 * DB Operations for Renewals
 */
export const getSubscriptionsForRenewal = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_status_and_endsAt", (q) => q.eq("status", "active").lt("endsAt", now))
      .collect();
  },
});

export const getSubscriptionsForRetry = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_retry", (q) => q.eq("status", "suspended").lt("nextRetryAt", now))
      .collect();
  },
});

export const getSubscription = internalQuery({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.any(),
  handler: async (ctx, { subscriptionId }) => await ctx.db.get("subscriptions", subscriptionId),
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => await ctx.db.get("users", userId),
});

export const handleSuccessfulRenewal = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub) return;

    const intervals = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        quarterly: 90 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000
    };
    const extension = (intervals as any)[sub.plan];

    await ctx.db.patch("subscriptions", subscriptionId, {
      status: "active",
      endsAt: Date.now() + extension,
      failureCount: 0,
      nextRetryAt: undefined,
    });

    await ctx.db.insert("notifications", {
        userId: sub.userId,
        title: "Subscription Renewed ✅",
        message: `Your ${sub.plan} plan has been successfully renewed.`,
        type: "payment",
        read: false,
        createdAt: Date.now(),
    });
  },
});

export const handleFailedRenewal = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub) return;

    const newFailureCount = sub.failureCount + 1;
    let nextRetryAt: number | undefined;
    let status: Doc<"subscriptions">["status"] = "suspended";

    if (newFailureCount === 1) {
      // Retry Attempt 2: 24 hours later
      nextRetryAt = Date.now() + (24 * 60 * 60 * 1000);
    } else if (newFailureCount === 2) {
      // Retry Attempt 3: 5 days later
      nextRetryAt = Date.now() + (5 * 24 * 60 * 60 * 1000);
    } else {
      // Final Failure
      status = "expired";
      nextRetryAt = undefined;
    }

    await ctx.db.patch("subscriptions", subscriptionId, {
      status,
      failureCount: newFailureCount,
      nextRetryAt,
    });

    await ctx.db.insert("notifications", {
        userId: sub.userId,
        title: status === "expired" ? "Subscription Canceled ❌" : "Payment Failed ⚠️",
        message: status === "expired" 
            ? `Your ${sub.plan} plan has been canceled after 3 failed attempts.`
            : `Charge failed for ${sub.plan} renewal. We will retry in ${newFailureCount === 1 ? '24 hours' : '5 days'}.`,
        type: "payment",
        read: false,
        createdAt: Date.now(),
    });
  },
});

/**
 * Refund Handling
 */
export const requestRefund = mutation({
  args: { subscriptionId: v.id("subscriptions"), reason: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { subscriptionId, reason, adminToken }) => {
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub) throw new Error("Subscription not found");

    // Use custom admin auth — Convex Auth is never populated
    const session = adminToken ? await tryGetAdminSession(ctx, adminToken) : null;
    if (!session && !adminToken) {
      throw new Error("Unauthorized: admin access required for refunds");
    }

    const isWithin14Days = Date.now() - sub._creationTime < 14 * 24 * 60 * 60 * 1000;
    if (!isWithin14Days) {
        throw new Error("Refund period (14 days) has expired.");
    }

    const refundAmounts: Record<string, number> = {
      weekly: 2000,
      monthly: 8000,
      quarterly: 25000,
      yearly: 80000,
    };
    // KDP subscription refunds use same tier amounts
    const kdpRefundAmounts: Record<string, number> = {
      weekly: 2000,
      monthly: 8000,
      quarterly: 25000,
      yearly: 80000,
    };
    const isKdp = sub.service === "kdp";
    const amounts = isKdp ? kdpRefundAmounts : refundAmounts;
    const amount = amounts[sub.plan] || 0;

    await ctx.db.insert("refunds", {
      userId: sub.userId,
      paymentReference: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
      amount,
      status: "pending",
      reason,
      createdAt: Date.now(),
    });

    await ctx.db.patch("subscriptions", subscriptionId, { status: "canceled", autoRenew: false });

    return { status: "submitted", message: "Your refund request is being processed." };
  },
});

/**
 * ACTIVATE SUBSCRIPTION AFTER WEBHOOK PAYMENT CONFIRMATION
 * Called from /api/webhooks/kora when payment is approved
 */
export const activateSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    service: v.string(),
    plan: v.string(),
    reference: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const intervals: Record<string, number> = {
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };
    const endsAt = now + (intervals[args.plan] || intervals.monthly);

    // Check if user already has an active subscription for this service
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(q.eq(q.field("service"), args.service), q.eq(q.field("status"), "active")))
      .first();

    if (existing) {
      // Extend existing subscription
      await ctx.db.patch("subscriptions", existing._id, {
        endsAt: Math.max(existing.endsAt, now) + (intervals[args.plan] || intervals.monthly),
        status: "active",
        failureCount: 0,
        nextRetryAt: undefined,
      });
    } else {
      // Create new subscription
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: args.plan as "weekly" | "monthly" | "quarterly" | "yearly",
        service: args.service as "standard" | "kdp",
        status: "active",
        endsAt,
        autoRenew: true,
        failureCount: 0,
      });
    }

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Payment Confirmed ✅",
      message: `Your ${args.service} ${args.plan} subscription is now active. Reference: ${args.reference}`,
      type: "payment",
      read: false,
      createdAt: now,
    });
  },
});

/**
 * Real Kora Pay charge for subscription renewal
 * Replaces the simulated attemptCharge
 */
export const chargeKoraPay = internalAction({
  args: {
    subscriptionId: v.id("subscriptions"),
    amount: v.number(),
    email: v.string(),
    plan: v.string(),
    service: v.string(),
  },
  returns: v.object({ success: v.boolean(), reference: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      console.error("[Kora] KORA_SECRET_KEY not set");
      return { success: false };
    }

    const reference = `RENEWAL-${args.service}-${args.subscriptionId}-${Date.now()}`;

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: args.amount,
          currency: "NGN",
          reference,
          customer: { email: args.email },
          metadata: {
            subscriptionId: args.subscriptionId,
            plan: args.plan,
            service: args.service,
            type: "renewal",
          },
        }),
      });

      const data = await response.json();
      if (data.status && data.data?.checkout_url) {
        return { success: true, reference };
      }
      console.error("[Kora] Charge failed:", data);
      return { success: false };
    } catch (e: any) {
      console.error("[Kora] Charge error:", e.message);
      return { success: false };
    }
  },
});
