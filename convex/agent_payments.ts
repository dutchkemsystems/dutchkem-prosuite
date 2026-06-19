import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Initiate Agent Subscription Payment via Kora Pay
 * Creates payment request and returns checkout URL
 */
export const initiatePayment = action({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    email: v.string(),
    name: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    const reference = `AGENT-${args.agentId}-${args.planId}-${Date.now()}`;

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: args.amount,
          currency: "NGN",
          reference,
          customer: {
            email: args.email,
            name: args.name,
          },
          metadata: {
            agentId: args.agentId,
            agentName: args.agentName,
            planId: args.planId,
            planName: args.planName,
            type: "agent_subscription",
          },
          redirect_url: `${typeof window !== 'undefined' ? window.location.origin : 'https://dutchkem-prosuite-app.vercel.app'}/payment/callback`,
        }),
      });

      const data = await response.json();
      
      if (data.status && data.data?.checkout_url) {
        // Store pending payment
        await ctx.runMutation(internal.agent_payments.recordPendingPayment, {
          reference,
          agentId: args.agentId,
          agentName: args.agentName,
          planId: args.planId,
          planName: args.planName,
          amount: args.amount,
          email: args.email,
          name: args.name,
          checkoutUrl: data.data.checkout_url,
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
        };
      }

      console.error("[Kora] Payment initiation failed:", data);
      return { success: false, error: data.message || "Payment initiation failed" };
    } catch (e: any) {
      console.error("[Kora] Payment error:", e.message);
      return { success: false, error: "Network error. Please try again." };
    }
  },
});

/**
 * Record pending payment before redirect
 */
export const recordPendingPayment = mutation({
  args: {
    reference: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    email: v.string(),
    name: v.string(),
    checkoutUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("agent_payment_pending", {
      reference: args.reference,
      agentId: args.agentId,
      agentName: args.agentName,
      planId: args.planId,
      planName: args.planName,
      amount: args.amount,
      email: args.email,
      name: args.name,
      checkoutUrl: args.checkoutUrl,
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Complete payment after webhook confirmation
 * Credits admin wallet and activates agent subscription
 */
export const completePayment = mutation({
  args: {
    reference: v.string(),
    amount: v.number(),
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
  },
  returns: v.object({ success: v.boolean(), subscriptionId: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    // 1. Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.customerEmail))
      .unique();

    if (!user) {
      console.error("[Payment] User not found for email:", args.customerEmail);
      return { success: false };
    }

    // 2. Calculate subscription duration based on plan
    const planDurations: Record<string, number> = {
      starter: 7 * 24 * 60 * 60 * 1000,        // 7 days
      basic: 30 * 24 * 60 * 60 * 1000,          // 30 days
      standard: 30 * 24 * 60 * 60 * 1000,       // 30 days
      pro: 90 * 24 * 60 * 60 * 1000,            // 90 days
      premium: 180 * 24 * 60 * 60 * 1000,       // 180 days
      enterprise: 365 * 24 * 60 * 60 * 1000,    // 365 days
    };

    const duration = planDurations[args.planId] || planDurations.basic;
    const endsAt = Date.now() + duration;

    // 3. Create or extend agent subscription
    const existingSub = await ctx.db
      .query("agent_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("agentId"), args.agentId),
        q.eq(q.field("status"), "active")
      ))
      .unique();

    let subscriptionId: string;

    if (existingSub) {
      // Extend existing subscription
      await ctx.db.patch(existingSub._id, {
        endsAt: Math.max(existingSub.endsAt, Date.now()) + duration,
        planId: args.planId,
        planName: args.planName,
        amount: args.amount,
        status: "active",
      });
      subscriptionId = existingSub._id;
    } else {
      // Create new subscription
      subscriptionId = await ctx.db.insert("agent_subscriptions", {
        userId: user._id,
        agentId: args.agentId,
        agentName: args.agentName,
        planId: args.planId,
        planName: args.planName,
        amount: args.amount,
        status: "active",
        endsAt,
        autoRenew: true,
        createdAt: Date.now(),
      });
    }

    // 4. Credit admin wallet (platform balance)
    let adminWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "main"))
      .unique();

    if (adminWallet) {
      await ctx.db.patch(adminWallet._id, {
        balance: adminWallet.balance + args.amount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("system_wallets", {
        type: "main",
        balance: args.amount,
        lastUpdated: Date.now(),
      });
    }

    // 5. Record transaction in admin wallet transactions
    await ctx.db.insert("system_wallet_transactions", {
      walletType: "main",
      type: "credit",
      amount: args.amount,
      description: `Agent subscription: ${args.agentName} - ${args.planName}`,
      reference: args.reference,
      metadata: {
        agentId: args.agentId,
        planId: args.planId,
        customerEmail: args.customerEmail,
      },
      createdAt: Date.now(),
    });

    // 6. Update pending payment status
    const pendingPayments = await ctx.db
      .query("agent_payment_pending")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .collect();

    for (const pending of pendingPayments) {
      await ctx.db.patch(pending._id, {
        status: "completed",
        completedAt: Date.now(),
        subscriptionId,
      });
    }

    // 7. Create receipt
    const receiptNumber = `DKV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await ctx.db.insert("agent_receipts", {
      userId: user._id,
      reference: args.reference,
      receiptNumber,
      agentId: args.agentId,
      agentName: args.agentName,
      planId: args.planId,
      planName: args.planName,
      amount: args.amount,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      status: "paid",
      createdAt: Date.now(),
    });

    // 8. Send notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      title: "Payment Successful ✅",
      message: `Your ${args.agentName} ${args.planName} subscription is now active. Receipt: ${receiptNumber}`,
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    return { success: true, subscriptionId };
  },
});

/**
 * Get receipt by reference
 */
export const getReceipt = query({
  args: { reference: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("agent_receipts")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    return receipt;
  },
});

/**
 * Check if user has active subscription for agent
 */
export const checkSubscription = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return null;

    const sub = await ctx.db
      .query("agent_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("agentId"), args.agentId),
        q.eq(q.field("status"), "active")
      ))
      .unique();

    if (!sub) return null;
    if (sub.endsAt < Date.now()) return null;

    return sub;
  },
});
