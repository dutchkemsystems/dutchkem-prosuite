import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

const CREDIT_COSTS: Record<string, number> = {
  agent_message: 1,
  document_upload: 5,
  voice_call_minute: 3,
  flyer_generation: 10,
  social_post: 2,
  research_task: 15,
} as const;

const PLANS: Record<
  string,
  { credits: number; price: number; bonus: number }
> = {
  starter: { credits: 500, price: 5000, bonus: 0 },
  pro: { credits: 2500, price: 20000, bonus: 400 },
  business: { credits: 7000, price: 50000, bonus: 1500 },
  enterprise: { credits: 20000, price: 120000, bonus: 5000 },
} as const;

type PlanId = "starter" | "pro" | "business" | "enterprise";

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

export const getCreditBalance = query({
  args: {
    userId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, adminToken }) => {
    // Allow admin access OR client accessing their own balance
    if (adminToken) {
      const identity = await tryGetAdminSession(ctx, adminToken);
      if (!identity) throw new Error("Not authenticated");
    }

    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return default record if none exists
    if (!record) {
      return {
        userId,
        balance: 0,
        lifetimePurchased: 0,
        lifetimeUsed: 0,
        autoRechargeEnabled: false,
        autoRechargeThreshold: 50,
        autoRechargeAmount: 500,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return record;
  },
});

export const getCreditTransactions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, limit, adminToken }) => {
    // Allow admin access OR client accessing their own transactions
    // Client auth is handled by the frontend passing valid userId
    if (adminToken) {
      const identity = await tryGetAdminSession(ctx, adminToken);
      if (!identity) throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("credit_transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const getAllCreditBalances = query({
  args: {
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("user_credits").collect();
  },
});

export const getCreditStats = query({
  args: {
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    const allCredits = await ctx.db.query("user_credits").collect();

    const totalBalance = allCredits.reduce(
      (sum, c) => sum + (c.balance ?? 0),
      0,
    );
    const totalPurchased = allCredits.reduce(
      (sum, c) => sum + (c.lifetimePurchased ?? 0),
      0,
    );
    const totalUsed = allCredits.reduce(
      (sum, c) => sum + (c.lifetimeUsed ?? 0),
      0,
    );
    const totalUsers = allCredits.length;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentPurchases = await ctx.db
      .query("credit_purchases")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(100);

    const recentSpend = recentPurchases
      .filter((p) => p.createdAt >= thirtyDaysAgo)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    return {
      totalBalance,
      totalPurchased,
      totalUsed,
      totalUsers,
      recentPurchases: recentSpend,
    };
  },
});

export const getCreditPlans = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return PLANS;
  },
});

export const getCreditCosts = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return CREDIT_COSTS;
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

export const purchaseCredits = mutation({
  args: {
    userId: v.string(),
    planId: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("business"),
      v.literal("enterprise"),
    ),
    paymentReference: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, planId, paymentReference, adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    const plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    const totalCredits = plan.credits + plan.bonus;

    const purchaseId = await ctx.db.insert("credit_purchases", {
      userId,
      amount: totalCredits,
      priceNgN: plan.price,
      bonusCredits: plan.bonus,
      paymentReference,
      status: "completed",
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + totalCredits,
        lifetimePurchased: existing.lifetimePurchased + totalCredits,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("user_credits", {
        userId,
        balance: totalCredits,
        lifetimePurchased: totalCredits,
        lifetimeUsed: 0,
        autoRechargeEnabled: false,
        autoRechargeThreshold: 50,
        autoRechargeAmount: 500,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("credit_transactions", {
      userId,
      amount: totalCredits,
      transactionType: "purchase",
      description: `Purchased ${planId} plan: ${plan.credits} credits${plan.bonus > 0 ? ` + ${plan.bonus} bonus` : ""}`,
      reference: paymentReference,
      createdAt: Date.now(),
    });

    return {
      success: true,
      credits: totalCredits,
      plan: planId,
    };
  },
});

export const deductCredits = mutation({
  args: {
    userId: v.string(),
    action: v.string(),
    amount: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, action, amount, adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    const cost = amount ?? CREDIT_COSTS[action];
    if (cost === undefined) throw new Error("Unknown action and no amount provided");

    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) throw new Error("No credit balance found for user");
    if (existing.balance < cost) {
      throw new Error(`Insufficient credits: have ${existing.balance}, need ${cost}`);
    }

    await ctx.db.patch(existing._id, {
      balance: existing.balance - cost,
      lifetimeUsed: existing.lifetimeUsed + cost,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("credit_transactions", {
      userId,
      amount: -cost,
      transactionType: "deduction",
      description: `Used ${cost} credits for ${action}`,
      createdAt: Date.now(),
    });

    return {
      success: true,
      remaining: existing.balance - cost,
      cost,
    };
  },
});

export const setAutoRecharge = mutation({
  args: {
    userId: v.string(),
    enabled: v.boolean(),
    threshold: v.optional(v.number()),
    amount: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, enabled, threshold, amount, adminToken }) => {
    // Allow admin access OR client accessing their own settings
    if (adminToken) {
      const identity = await tryGetAdminSession(ctx, adminToken);
      if (!identity) throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing record
      const patch: Record<string, any> = {
        autoRechargeEnabled: enabled,
        updatedAt: now,
      };
      if (threshold !== undefined) patch.autoRechargeThreshold = threshold;
      if (amount !== undefined) patch.autoRechargeAmount = amount;
      await ctx.db.patch(existing._id, patch);
    } else {
      // Create new record if it doesn't exist
      await ctx.db.insert("user_credits", {
        userId,
        balance: 0,
        lifetimePurchased: 0,
        lifetimeUsed: 0,
        autoRechargeEnabled: enabled,
        autoRechargeThreshold: threshold ?? 50,
        autoRechargeAmount: amount ?? 500,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const adminAddCredits = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, amount, reason, adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + amount,
        lifetimePurchased: existing.lifetimePurchased + amount,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("user_credits", {
        userId,
        balance: amount,
        lifetimePurchased: amount,
        lifetimeUsed: 0,
        autoRechargeEnabled: false,
        autoRechargeThreshold: 50,
        autoRechargeAmount: 500,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("credit_transactions", {
      userId,
      amount,
      transactionType: "admin_grant",
      description: `Admin grant: ${reason}`,
      reference: `admin-${identity._id}-${Date.now()}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getAllPurchases = query({
  args: {
    adminToken: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("credit_purchases")
      .order("desc")
      .take(limit ?? 100);
  },
});
