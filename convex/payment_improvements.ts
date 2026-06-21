import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PAYMENT IMPROVEMENTS
// Exponential backoff, multi-currency, subscription pause, self-service refund
// ═══════════════════════════════════════════════════════════════════

// ─── EXPONENTIAL BACKOFF FOR PAYMENT RETRIES ───

export const retryPaymentWithBackoff = internalAction({
  args: {
    subscriptionId: v.string(),
    attempt: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Exponential backoff: 5min, 30min, 2hrs, 8hrs, 24hrs
    const backoffMinutes = [5, 30, 120, 480, 1440];
    const delayMs = (backoffMinutes[Math.min(args.attempt, 4)] || 1440) * 60 * 1000;
    
    await ctx.runMutation(internal.payments.handleFailedRenewal, {
      subscriptionId: args.subscriptionId,
    });

    return {
      success: true,
      nextRetryAt: Date.now() + delayMs,
      delayMinutes: backoffMinutes[Math.min(args.attempt, 4)] || 1440,
    };
  },
});

// ─── MULTI-CURRENCY SUPPORT ───

const EXCHANGE_RATES: Record<string, number> = {
  NGN: 1,
  USD: 1500, // 1 USD = 1500 NGN
  GBP: 1900, // 1 GBP = 1900 NGN
  EUR: 1650, // 1 EUR = 1650 NGN
};

export const convertCurrency = query({
  args: {
    amount: v.number(),
    from: v.string(),
    to: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const fromRate = EXCHANGE_RATES[args.from] || 1;
    const toRate = EXCHANGE_RATES[args.to] || 1;
    
    // Convert to NGN first, then to target currency
    const ngAmount = args.amount * fromRate;
    const convertedAmount = ngAmount / toRate;
    
    return {
      originalAmount: args.amount,
      originalCurrency: args.from,
      convertedAmount: Math.round(convertedAmount),
      convertedCurrency: args.to,
      exchangeRate: fromRate / toRate,
    };
  },
});

export const getSupportedCurrencies = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.keys(EXCHANGE_RATES).map(code => ({
      code,
      rate: EXCHANGE_RATES[code],
      symbol: code === 'NGN' ? '₦' : code === 'USD' ? '$' : code === 'GBP' ? '£' : '€',
    }));
  },
});

// ─── SUBSCRIPTION PAUSE/RESUME ───

export const pauseSubscription = mutation({
  args: {
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!sub) throw new Error("No active subscription found");

    await ctx.db.patch(sub._id, {
      status: "suspended",
      suspendedAt: Date.now(),
      suspensionReason: args.reason || "User requested pause",
    });

    return { success: true, message: "Subscription paused successfully" };
  },
});

export const resumeSubscription = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "suspended"))
      .first();

    if (!sub) throw new Error("No suspended subscription found");

    // Extend the subscription by the time it was paused
    const pauseDuration = sub.suspendedAt ? Date.now() - sub.suspendedAt : 0;
    
    await ctx.db.patch(sub._id, {
      status: "active",
      endsAt: sub.endsAt + pauseDuration,
      suspendedAt: undefined,
      suspensionReason: undefined,
    });

    return { success: true, message: "Subscription resumed successfully" };
  },
});

export const getSubscriptionPauseStatus = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!sub) return { hasSubscription: false, canPause: false, canResume: false };

    return {
      hasSubscription: true,
      status: sub.status,
      canPause: sub.status === "active",
      canResume: sub.status === "suspended",
      suspendedAt: sub.suspendedAt,
      suspensionReason: sub.suspensionReason,
    };
  },
});

// ─── SELF-SERVICE REFUND PORTAL ───

export const requestRefund = mutation({
  args: {
    subscriptionId: v.string(),
    reason: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get("subscriptions", args.subscriptionId);
    if (!sub) throw new Error("Subscription not found");

    // Check if within 14-day refund window
    const daysSincePurchase = Math.floor((Date.now() - sub._creationTime) / (1000 * 60 * 60 * 24));
    if (daysSincePurchase > 14) {
      return {
        success: false,
        error: "Refund period (14 days) has expired",
      };
    }

    // Calculate refund amount
    const planAmounts: Record<string, number> = {
      weekly: 2000,
      monthly: 8000,
      quarterly: 25000,
      yearly: 80000,
    };
    const refundAmount = planAmounts[sub.plan] || 0;

    // Create refund request
    const refundId = await ctx.db.insert("refunds", {
      userId: sub.userId,
      paymentReference: `REF-${Date.now()}`,
      amount: refundAmount,
      status: "pending",
      reason: args.reason,
      createdAt: Date.now(),
    });

    // Cancel subscription
    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      autoRenew: false,
    });

    return {
      success: true,
      refundId,
      amount: refundAmount,
      message: "Refund request submitted. You will receive your refund within 5-7 business days.",
    };
  },
});

export const getRefundStatus = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);

    return {
      refunds,
      hasPending: refunds.some((r: any) => r.status === "pending"),
    };
  },
});

// ─── PAYMENT NOTIFICATIONS ───

export const sendPaymentNotification = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create in-app notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    // Log for SMS/email (would integrate with Termii/Resend)
    await ctx.db.insert("payment_notification_logs", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      amount: args.amount,
      channel: "in_app",
      sentAt: Date.now(),
    });
  },
});

export const getPaymentNotifications = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "payment"))
      .order("desc")
      .take(20);
  },
});
