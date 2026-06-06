import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// ABANDONED CHECKOUT RECOVERY — Track incomplete payments, send reminders
// ═══════════════════════════════════════════════════════════════════

// Create a checkout session (called when user initiates payment)
export const createCheckoutSession = internalMutation({
  args: {
    userId: v.id("users"),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if session already exists for this reference
    const existing = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("checkout_sessions", {
      userId: args.userId,
      planId: args.planId,
      planName: args.planName,
      amount: args.amount,
      reference: args.reference,
      status: "pending",
      recoveryStage: 0,
      createdAt: Date.now(),
    });
  },
});

// Mark checkout as completed (called when payment confirmed)
export const completeCheckout = internalMutation({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    if (!session) return { success: false, notFound: true };

    if (session.status === "completed") return { success: true, alreadyCompleted: true };

    await ctx.db.patch("checkout_sessions", session._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user's checkout sessions
export const getUserCheckouts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("checkout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .order("desc")
      .collect();
  },
});

// Get abandoned checkouts that need recovery (internal)
export const getAbandonedCheckouts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const twentyFourHours = 24 * oneHour;
    const seventyTwoHours = 72 * oneHour;

    // Find all pending checkouts
    const pending = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const needsRecovery = [];

    for (const session of pending) {
      const age = now - session.createdAt;

      // Stage 1: 1-24 hours old, no recovery sent yet
      if (age >= oneHour && age < twentyFourHours && session.recoveryStage < 1) {
        needsRecovery.push({ ...session, stage: 1 });
        continue;
      }

      // Stage 2: 24-72 hours old, only stage 1 sent
      if (age >= twentyFourHours && age < seventyTwoHours && session.recoveryStage < 2) {
        needsRecovery.push({ ...session, stage: 2 });
        continue;
      }

      // Stage 3: 72+ hours old, only stage 2 sent
      if (age >= seventyTwoHours && session.recoveryStage < 3) {
        needsRecovery.push({ ...session, stage: 3 });
        continue;
      }
    }

    return needsRecovery;
  },
});

// Update recovery stage (after sending reminder)
export const updateRecoveryStage = internalMutation({
  args: {
    sessionId: v.id("checkout_sessions"),
    stage: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("checkout_sessions", args.sessionId, {
      recoveryStage: args.stage,
      lastRecoveryAt: Date.now(),
    });
  },
});

// Send recovery reminder (internal mutation)
export const sendRecoveryReminder = internalMutation({
  args: {
    userId: v.id("users"),
    planName: v.string(),
    amount: v.number(),
    stage: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = {
      1: {
        title: "You left something behind!",
        body: `Your ${args.planName} subscription (₦${args.amount.toLocaleString()}) is waiting. Complete your purchase now!`,
      },
      2: {
        title: "Don't miss out on ${args.planName}",
        body: `Your subscription is still pending. Complete checkout to start growing your business today.`,
      },
      3: {
        title: "Last chance: ${args.planName} subscription",
        body: `This is your final reminder. Your ${args.planName} subscription will expire soon. Complete checkout now!`,
      },
    };

    const msg = messages[args.stage as keyof typeof messages] || messages[1];

    // Create in-app notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: msg.title,
      message: msg.body,
      type: "payment",
      read: false,
      createdAt: Date.now(),
    });

    // Trigger push notification
    try {
      await ctx.runMutation(internal.pushNotifications.triggerPushForNotification, {
        userId: args.userId,
        title: msg.title,
        body: msg.body,
        url: `/checkout?ref=${args.reference}`,
        type: "payment",
      });
    } catch {
      // Push not available, in-app notification is enough
    }

    return { sent: true };
  },
});

// Process abandoned checkouts (cron job target)
export const processAbandonedCheckouts = action({
  args: {},
  handler: async (ctx) => {
    const abandoned = await ctx.runQuery(
      "abandonedCheckouts:getAbandonedCheckouts" as any,
      {}
    );

    if (!abandoned || abandoned.length === 0) return { processed: 0 };

    let processed = 0;
    for (const session of abandoned) {
      // Send recovery reminder
      await ctx.runMutation(
        "abandonedCheckouts:sendRecoveryReminder" as any,
        {
          userId: session.userId,
          planName: session.planName,
          amount: session.amount,
          stage: session.stage,
          reference: session.reference,
        }
      );

      // Update recovery stage
      await ctx.runMutation(
        "abandonedCheckouts:updateRecoveryStage" as any,
        {
          sessionId: session._id,
          stage: session.stage,
        }
      );

      processed++;
    }

    return { processed };
  },
});

// Cancel old abandoned checkouts (older than 7 days)
export const cancelOldCheckouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - sevenDays;

    const oldPending = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let cancelled = 0;
    for (const session of oldPending) {
      if (session.createdAt < cutoff) {
        await ctx.db.patch("checkout_sessions", session._id, { status: "cancelled" });
        cancelled++;
      }
    }

    return { cancelled };
  },
});

// Get recovery stats (admin)
export const getRecoveryStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("checkout_sessions").collect();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const stats = {
      total: all.length,
      pending: all.filter((s) => s.status === "pending").length,
      completed: all.filter((s) => s.status === "completed").length,
      abandoned: all.filter(
        (s) => s.status === "pending" && now - s.createdAt > oneDay
      ).length,
      cancelled: all.filter((s) => s.status === "cancelled").length,
      recoveryRate: 0,
      totalRecoveredAmount: 0,
    };

    const recovered = all.filter(
      (s) => s.status === "completed" && s.recoveryStage > 0
    );
    stats.recoveryRate =
      stats.abandoned > 0
        ? Math.round((recovered.length / (stats.abandoned + recovered.length)) * 100)
        : 0;
    stats.totalRecoveredAmount = recovered.reduce((sum, s) => sum + s.amount, 0);

    return stats;
  },
});
