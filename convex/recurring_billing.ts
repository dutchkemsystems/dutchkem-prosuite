import { v } from "convex/values";
import { action, mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// RECURRING BILLING
// Automated subscription renewal reminders and auto-charge
// ═══════════════════════════════════════════════════════════════════

// ─── CHECK EXPIRING SUBSCRIPTIONS ───
export const checkExpiringSubscriptions = action({
  args: {},
  returns: v.object({
    checked: v.number(),
    remindersSent: v.number(),
    autoRenewed: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    // Get all active subscriptions expiring in the next 7 days
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;

    const subscriptions = await ctx.runQuery(internal.recurring_billing.getExpiringSubscriptions, {
      beforeTimestamp: sevenDaysFromNow,
    });

    let remindersSent = 0;
    let autoRenewed = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      try {
        // Send reminder if within 3 days of expiry
        if (sub.expiresAt <= threeDaysFromNow && !sub.reminderSent) {
          await ctx.runMutation(internal.recurring_billing.sendRenewalReminder, {
            subscriptionId: sub._id,
            userId: sub.userId,
            service: sub.service,
            plan: sub.plan,
            expiresAt: sub.expiresAt,
          });
          remindersSent++;
        }

        // Auto-renew if autoRenew is enabled and subscription is about to expire
        if (sub.autoRenew && sub.expiresAt <= Date.now() + 24 * 60 * 60 * 1000) {
          await ctx.runMutation(internal.recurring_billing.initiateAutoRenewal, {
            subscriptionId: sub._id,
            userId: sub.userId,
            service: sub.service,
            plan: sub.plan,
          });
          autoRenewed++;
        }
      } catch (e: any) {
        console.error(`[RECURRING] Error processing subscription ${sub._id}:`, e.message);
        errors++;
      }
    }

    return {
      checked: subscriptions.length,
      remindersSent,
      autoRenewed,
      errors,
    };
  },
});

// ─── GET EXPIRING SUBSCRIPTIONS ───
export const getExpiringSubscriptions = internalQuery({
  args: {
    beforeTimestamp: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Query subscriptions that expire before the given timestamp
    const subscriptions = await ctx.db.query("subscriptions").collect();

    return subscriptions.filter((sub: any) => {
      return (
        sub.status === "active" &&
        sub.expiresAt &&
        sub.expiresAt <= args.beforeTimestamp &&
        sub.autoRenew !== false
      );
    });
  },
});

// ─── SEND RENEWAL REMINDER ───
export const sendRenewalReminder = internalMutation({
  args: {
    subscriptionId: v.string(),
    userId: v.string(),
    service: v.string(),
    plan: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Mark reminder as sent
    await ctx.db.patch(args.subscriptionId as any, {
      reminderSent: true,
      reminderSentAt: Date.now(),
    });

    // Get user details
    const user = await ctx.db.get(args.userId as any);
    if (!user) return null;

    // Store notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "subscription_renewal_reminder",
      title: "Subscription Renewal Reminder",
      message: `Your ${args.service} subscription (${args.plan}) expires on ${new Date(args.expiresAt).toLocaleDateString()}. Please ensure your payment method is up to date.`,
      read: false,
      createdAt: Date.now(),
    });

    // Log email notification for external email service pickup
    const subject = `Subscription Renewal Reminder - ${args.service}`;
    const body = `Hi ${user.name || 'there'},\n\nYour ${args.service} subscription (${args.plan}) expires on ${new Date(args.expiresAt).toLocaleDateString()}.\n\nPlease ensure your payment method is up to date to avoid service interruption.\n\nBest regards,\nDutchkem Ventures`;

    await ctx.db.insert("email_notifications", {
      to: user.email,
      subject,
      body,
      type: "subscription_renewal_reminder",
      status: "pending",
      createdAt: Date.now(),
    });

    return null;
  },
});

// ─── INITIATE AUTO-RENEWAL ───
export const initiateAutoRenewal = internalMutation({
  args: {
    subscriptionId: v.string(),
    userId: v.string(),
    service: v.string(),
    plan: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get subscription details
    const subscription = await ctx.db.get(args.subscriptionId as any);
    if (!subscription) return null;

    // Get plan pricing
    const planDetails = await ctx.runQuery(internal.recurring_billing.getPlanDetails, {
      service: args.service,
      plan: args.plan,
    });

    if (!planDetails) return null;

    // Create pending renewal transaction
    const reference = `RENEW-${args.userId.slice(-8)}-${Date.now()}`;
    await ctx.db.insert("renewal_transactions", {
      subscriptionId: args.subscriptionId,
      userId: args.userId,
      service: args.service,
      plan: args.plan,
      amount: planDetails.amount,
      reference,
      status: "pending",
      createdAt: Date.now(),
    });

    // Mark subscription as pending renewal
    await ctx.db.patch(args.subscriptionId as any, {
      pendingRenewal: true,
      renewalReference: reference,
    });

    return null;
  },
});

// ─── GET PLAN DETAILS ───
export const getPlanDetails = internalQuery({
  args: {
    service: v.string(),
    plan: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Define plan pricing
    const plans: Record<string, Record<string, { amount: number; credits: number }>> = {
      subscription: {
        starter: { amount: 5000, credits: 500 },
        pro: { amount: 15000, credits: 2500 },
        enterprise: { amount: 50000, credits: 20000 },
      },
      whatsapp: {
        starter: { amount: 5000, credits: 1000 },
        professional: { amount: 15000, credits: 5000 },
        enterprise: { amount: 50000, credits: 20000 },
      },
      kdp: {
        basic: { amount: 10000, credits: 1000 },
        pro: { amount: 25000, credits: 5000 },
      },
    };

    return plans[args.service]?.[args.plan] || null;
  },
});

// ─── COMPLETE RENEWAL PAYMENT ───
export const completeRenewalPayment = internalMutation({
  args: {
    reference: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find renewal transaction
    const renewals = await ctx.db
      .query("renewal_transactions")
      .filter((q) => q.eq(q.field("reference"), args.reference))
      .collect();

    for (const renewal of renewals) {
      if (renewal.status === "pending") {
        // Mark renewal as completed
        await ctx.db.patch(renewal._id, {
          status: "completed",
          completedAt: Date.now(),
        });

        // Extend subscription
        const subscription = await ctx.db.get(renewal.subscriptionId as any);
        if (subscription) {
          const currentExpiry = (subscription as any).expiresAt || Date.now();
          const newExpiry = currentExpiry + 30 * 24 * 60 * 60 * 1000; // Add 30 days

          await ctx.db.patch(renewal.subscriptionId as any, {
            expiresAt: newExpiry,
            pendingRenewal: false,
            renewalReference: undefined,
            lastRenewedAt: Date.now(),
          });

          // Log renewal
          await ctx.db.insert("subscription_renewals", {
            subscriptionId: renewal.subscriptionId,
            userId: renewal.userId,
            service: renewal.service,
            plan: renewal.plan,
            amount: args.amount,
            reference: args.reference,
            previousExpiry: currentExpiry,
            newExpiry,
            createdAt: Date.now(),
          });
        }
      }
    }

    return null;
  },
});

// ─── GET RENEWAL HISTORY ───
export const getRenewalHistory = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let query = ctx.db.query("renewal_transactions");

    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }

    const renewals = await query.collect();
    renewals.sort((a, b) => b.createdAt - a.createdAt);

    return renewals.slice(0, limit).map((r: any) => ({
      id: r._id,
      subscriptionId: r.subscriptionId,
      userId: r.userId,
      service: r.service,
      plan: r.plan,
      amount: r.amount,
      reference: r.reference,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));
  },
});

// ─── TOGGLE AUTO-RENEW ───
export const toggleAutoRenew = action({
  args: {
    subscriptionId: v.string(),
    autoRenew: v.boolean(),
    adminToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify admin session
    const session = await ctx.runQuery(internal.auth_helpers.validateAdminSession, {
      adminToken: args.adminToken,
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Update subscription
    await ctx.runMutation(internal.recurring_billing.updateAutoRenew, {
      subscriptionId: args.subscriptionId,
      autoRenew: args.autoRenew,
    });

    return { success: true };
  },
});

// ─── UPDATE AUTO-RENEW ───
export const updateAutoRenew = internalMutation({
  args: {
    subscriptionId: v.string(),
    autoRenew: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId as any, {
      autoRenew: args.autoRenew,
      updatedAt: Date.now(),
    });
    return null;
  },
});
