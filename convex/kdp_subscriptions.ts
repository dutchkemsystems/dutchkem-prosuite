import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";

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

    // Create subscription as PENDING — activated only after webhook confirms payment
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId,
      plan: planConfig.frequency as "weekly" | "monthly" | "quarterly" | "yearly",
      service: "kdp",
      status: "pending" as any,
      endsAt,
      autoRenew: true,
      failureCount: 0,
    });

    await ctx.db.insert("notifications", {
      userId,
      title: "KDP Subscription — Awaiting Payment",
      message: `Please complete payment for your ${plan} plan to activate.`,
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
      status: "pending",
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
    const secretKey = process.env.KORA_SECRET_KEY;

    // Real Kora Pay checkout initialization
    if (secretKey) {
      try {
        const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/initialize", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: planConfig.price,
            currency: "NGN",
            reference,
            customer: { email: "client@dutchkem.com" },
            redirect_url: returnUrl || `${process.env.SITE_URL || "https://dutchkem-prosuite-app.vercel.app"}/dashboard?kdp=success&reference=${reference}`,
            metadata: {
              userId,
              service: "kdp",
              plan: plan,
              type: "subscription",
            },
          }),
        });
        const data = await response.json();
        if (data.status && data.data?.checkout_url) {
          return {
            checkoutUrl: data.data.checkout_url,
            reference,
            amount: planConfig.price,
            currency: "NGN",
            plan,
          };
        }
      } catch (e: any) {
        console.error("[KDP] Kora Pay checkout init failed:", e.message);
      }
    }

    // Fallback: simulated checkout URL
    const checkoutUrl = returnUrl
      ? `${returnUrl}?reference=${reference}&plan=${plan}&amount=${planConfig.price}`
      : `https://pay.korapay.com?reference=${reference}&amount=${planConfig.price}&currency=NGN`;

    return { checkoutUrl, reference, amount: planConfig.price, currency: "NGN", plan };
  },
});

/**
 * Activate KDP subscription after webhook payment confirmation
 * Called from /api/webhooks/kora
 */
export const activateKDPPayment = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.string(),
    reference: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const frequencyMs: Record<string, number> = {
      monthly: 30 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };

    const planMap: Record<string, string> = { BASIC: "monthly", PRO: "quarterly", ENTERPRISE: "yearly" };
    const frequency = planMap[args.plan] || "monthly";
    const endsAt = now + (frequencyMs[frequency] || frequencyMs.monthly);

    // Find pending KDP subscription for this user
    const pending = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(q.eq(q.field("service"), "kdp"), q.eq(q.field("status"), "pending")))
      .order("desc")
      .first();

    if (pending) {
      await ctx.db.patch("subscriptions", pending._id, {
        status: "active",
        endsAt,
        failureCount: 0,
      });
    } else {
      // Create new active subscription
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: frequency as "weekly" | "monthly" | "quarterly" | "yearly",
        service: "kdp",
        status: "active",
        endsAt,
        autoRenew: true,
        failureCount: 0,
      });
    }

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "KDP Subscription Activated 🎉",
      message: `Your KDP plan is now active. Reference: ${args.reference}`,
      type: "payment",
      read: false,
      createdAt: now,
    });
  },
});
