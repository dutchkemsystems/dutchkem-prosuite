import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const KDP_PLANS = {
  BASIC: {
    koraProductId: "prod_kdp_basic",
    price: 25000,
    frequency: "monthly",
    features: ["1 book/month", "Basic formatting"],
  },
  PRO: {
    koraProductId: "prod_kdp_pro",
    price: 60000,
    frequency: "quarterly",
    features: ["3 books/quarter", "Live support (1 session)", "Royalty tracking"],
  },
  ENTERPRISE: {
    koraProductId: "prod_kdp_enterprise",
    price: 200000,
    frequency: "yearly",
    features: ["12 books/year", "Unlimited support", "Royalty tracking"],
  },
} as const;

export type KDPPlanKey = keyof typeof KDP_PLANS;

export const listKDPPlans = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.entries(KDP_PLANS).map(([key, plan]) => ({
      id: key,
      name: key.charAt(0) + key.slice(1).toLowerCase(),
      ...plan,
    }));
  },
});

export const createKDPSubscription = mutation({
  args: {
    plan: v.union(v.literal("BASIC"), v.literal("PRO"), v.literal("ENTERPRISE")),
  },
  returns: v.any(),
  handler: async (ctx, { plan }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const planConfig = KDP_PLANS[plan];
    if (!planConfig) throw new Error("Invalid plan");

    const now = Date.now();
    const frequencyMs: Record<string, number> = {
      monthly: 30 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };
    const endsAt = now + (frequencyMs[planConfig.frequency] || frequencyMs.monthly);

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId,
      plan: planConfig.frequency,
      service: "kdp",
      status: "active",
      endsAt,
      autoRenew: true,
      failureCount: 0,
    });

    await ctx.db.insert("notifications", {
      userId,
      title: "KDP Subscription Activated 🎉",
      message: `Your ${plan} plan has been activated. You now have access to ${planConfig.features.join(", ")}.`,
      type: "payment",
      read: false,
      createdAt: now,
    });

    return {
      subscriptionId,
      plan,
      price: planConfig.price,
      frequency: planConfig.frequency,
      endsAt,
      status: "active",
    };
  },
});

export const getKDPSubscriptionStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("service"), "kdp"))
      .order("desc")
      .first();

    if (!sub) return null;

    return {
      ...sub,
      planName: sub.plan === "monthly" ? "Basic" : sub.plan === "quarterly" ? "Pro" : "Enterprise",
    };
  },
});

export const cancelKDPSubscription = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("service"), "kdp"))
      .order("desc")
      .first();

    if (!sub) throw new Error("No active KDP subscription found");

    await ctx.db.patch("subscriptions", sub._id, {
      autoRenew: false,
      status: "canceled",
    });

    await ctx.db.insert("notifications", {
      userId,
      title: "KDP Subscription Canceled",
      message: "Your KDP subscription has been canceled. Your books will remain published on Amazon.",
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    return { canceled: true };
  },
});

export const getKDPCheckoutUrl = mutation({
  args: {
    plan: v.union(v.literal("BASIC"), v.literal("PRO"), v.literal("ENTERPRISE")),
    returnUrl: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { plan, returnUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const planConfig = KDP_PLANS[plan];
    if (!planConfig) throw new Error("Invalid plan");

    const reference = `KDP-${plan}-${userId.replace(/\W/g, "")}-${Date.now()}`;

    // Simulated Kora Pay checkout — in production, call Kora Pay API:
    //   POST https://api.korapay.com/v1/checkout
    //   Headers: { Authorization: `Bearer ${process.env.KORA_SECRET_KEY}` }
    //   Body: { amount: planConfig.price, currency: "NGN", reference, ... }
    const checkoutUrl = returnUrl
      ? `${returnUrl}?reference=${reference}&plan=${plan}&amount=${planConfig.price}`
      : `https://pay.korapay.com?reference=${reference}&amount=${planConfig.price}&currency=NGN`;

    return {
      checkoutUrl,
      reference,
      amount: planConfig.price,
      currency: "NGN",
      plan,
    };
  },
});
