import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

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
      // Simulate Kora Pay Recurring Charge API Call
      console.log(`[Kora] Charging ₦${amount} for ${sub.plan} subscription renewal: ${subscriptionId}`);
      
      // Simulation: 90% success rate
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
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
  handler: async (ctx, { subscriptionId }) => await ctx.db.get(subscriptionId),
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => await ctx.db.get(userId),
});

export const handleSuccessfulRenewal = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const sub = await ctx.db.get(subscriptionId);
    if (!sub) return;

    const intervals = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        quarterly: 90 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000
    };
    const extension = (intervals as any)[sub.plan];

    await ctx.db.patch(subscriptionId, {
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
    const sub = await ctx.db.get(subscriptionId);
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

    await ctx.db.patch(subscriptionId, {
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
  args: { subscriptionId: v.id("subscriptions"), reason: v.string() },
  returns: v.any(),
  handler: async (ctx, { subscriptionId, reason }) => {
    const sub = await ctx.db.get(subscriptionId);
    if (!sub) throw new Error("Subscription not found");

    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId || sub.userId !== userId) {
      throw new Error("Unauthorized: you can only refund your own subscriptions");
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
    const amount = refundAmounts[sub.plan] || 0;

    await ctx.db.insert("refunds", {
      userId: sub.userId,
      paymentReference: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
      amount,
      status: "pending",
      reason,
      createdAt: Date.now(),
    });

    await ctx.db.patch(subscriptionId, { status: "canceled", autoRenew: false });

    return { status: "submitted", message: "Your refund request is being processed." };
  },
});
