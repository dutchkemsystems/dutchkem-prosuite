import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS — CRUD and lifecycle management
// ═══════════════════════════════════════════════════════════════════

export const createSubscription = mutation({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    tierId: v.id("whatsapp_pricing_tiers"),
    phoneNumber: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const tier = await ctx.db.get(args.tierId);
    if (!tier) return { success: false, error: "Tier not found" };

    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    const subId = await ctx.db.insert("whatsapp_subscriptions", {
      userId: args.userId,
      systemType: args.systemType,
      tierId: args.tierId,
      status: "active",
      phoneNumber: args.phoneNumber,
      messagesUsed: 0,
      messagesLimit: tier.messagesPerMonth,
      startDate: now,
      endDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, subscriptionId: subId };
  },
});

export const createSubscriptionInternal = internalMutation({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    tierId: v.id("whatsapp_pricing_tiers"),
    phoneNumber: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) return { success: false, error: "Tier not found" };

    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000;

    const subId = await ctx.db.insert("whatsapp_subscriptions", {
      userId: args.userId,
      systemType: args.systemType,
      tierId: args.tierId,
      status: "active",
      phoneNumber: args.phoneNumber,
      messagesUsed: 0,
      messagesLimit: tier.messagesPerMonth,
      startDate: now,
      endDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, subscriptionId: subId };
  },
});

export const getSubscriptions = query({
  args: {
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    status: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType));
    const subs = await q.collect();
    if (args.status) {
      return subs.filter((s) => s.status === args.status);
    }
    return subs;
  },
});

export const getActiveSubscription = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const incrementUsage = internalMutation({
  args: { subscriptionId: v.id("whatsapp_subscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (sub) {
      await ctx.db.patch(args.subscriptionId, {
        messagesUsed: sub.messagesUsed + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── CRON: Check Expired Subscriptions ───

export const checkExpiredSubscriptions = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3-day grace period

    // Find active subscriptions past their end date
    const allSubs = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const expired: { id: string; userId: string; systemType: string; endDate: number }[] = [];
    const graceExpiring: { id: string; userId: string; daysLeft: number }[] = [];

    for (const sub of allSubs) {
      if (sub.endDate <= now) {
        // Check if still in grace period
        if (now - sub.endDate <= GRACE_PERIOD_MS) {
          const daysLeft = Math.ceil((GRACE_PERIOD_MS - (now - sub.endDate)) / (24 * 60 * 60 * 1000));
          graceExpiring.push({ id: sub._id, userId: sub.userId, daysLeft });
        } else {
          // Past grace period — mark as expired
          await ctx.db.patch(sub._id, {
            status: "expired",
            updatedAt: now,
          });
          expired.push({
            id: sub._id,
            userId: sub.userId,
            systemType: sub.systemType,
            endDate: sub.endDate,
          });
        }
      } else if (sub.endDate - now <= 7 * 24 * 60 * 60 * 1000) {
        // Expiring within 7 days
        const daysLeft = Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000));
        graceExpiring.push({ id: sub._id, userId: sub.userId, daysLeft });
      }
    }

    return {
      checkedAt: now,
      expired,
      graceExpiring,
      totalExpired: expired.length,
      totalExpiringSoon: graceExpiring.length,
    };
  },
});
