import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

function generateRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "REF-";
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

/** Create an agent-to-agent transaction */
export const createTransaction = mutation({
  args: {
    token: v.string(),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const org = await ctx.db.get("enterprise_organizations", orgId);
    if (org?.spendingLimit && args.amount > org.spendingLimit) {
      return { error: `Amount exceeds your spending limit of ₦${org.spendingLimit.toLocaleString()}` };
    }

    const now = Date.now();
    const ref = generateRef();
    const txnId = await ctx.db.insert("enterprise_transactions", {
      orgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency || "NGN",
      status: "completed",
      reference: ref,
      metadata: args.metadata,
      createdAt: now,
    });

    return { success: true, transactionId: txnId, reference: ref };
  },
});

/** List transactions for an org */
export const listTransactions = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const txns = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return txns.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

/** Get payment stats */
export const getStats = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { totalVolume: 0, transactionCount: 0, completedCount: 0, pendingCount: 0, avgAmount: 0 };

    const txns = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const completed = txns.filter((t: any) => t.status === "completed");
    const pending = txns.filter((t: any) => t.status === "pending");
    const totalVolume = completed.reduce((sum: number, t: any) => sum + t.amount, 0);

    return {
      totalVolume,
      transactionCount: txns.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      avgAmount: completed.length > 0 ? totalVolume / completed.length : 0,
    };
  },
});

/** Simulate running a payment between agents */
export const simulatePayment = mutation({
  args: {
    token: v.string(),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const now = Date.now();
    const ref = generateRef();
    const txnId = await ctx.db.insert("enterprise_transactions", {
      orgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: "NGN",
      status: "completed",
      reference: ref,
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_SIMULATED",
      actor: orgId,
      action: "simulate_payment",
      target: txnId,
      details: { from: args.fromAgent, to: args.toAgent, amount: args.amount },
      createdAt: now,
    });

    return { success: true, transactionId: txnId, reference: ref };
  },
});

/** Get spending limit for an org */
export const getSpendingLimit = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { limit: 500000 };
    const org = await ctx.db.get("enterprise_organizations", orgId);
    return { limit: org?.spendingLimit || 500000 };
  },
});

/** Set spending limit for an org */
export const setSpendingLimit = mutation({
  args: { token: v.string(), limit: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };
    if (args.limit < 1000) return { error: "Minimum limit is ₦1,000" };

    await ctx.db.patch(orgId, { spendingLimit: args.limit, updatedAt: Date.now() });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SPENDING_LIMIT_UPDATED",
      actor: orgId,
      action: "set_spending_limit",
      target: orgId,
      details: { limit: args.limit },
      createdAt: Date.now(),
    });

    return { success: true, limit: args.limit };
  },
});

/** Generate passkey for subscription payment (6-digit, 10-min expiry) */
export const initiateSubscriptionPayment = mutation({
  args: {
    token: v.string(),
    planId: v.union(v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    amount: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const org = await ctx.db.get("enterprise_organizations", orgId);
    if (!org) return { error: "Organization not found" };

    const now = Date.now();
    const ref = generateRef();
    const passkey = String(Math.floor(100000 + Math.random() * 900000));
    const passkeyExpiresAt = now + (10 * 60 * 1000);

    const txnId = await ctx.db.insert("enterprise_transactions", {
      orgId,
      fromAgent: org.name,
      toAgent: "Dutchkem Ventures",
      amount: args.amount,
      currency: "NGN",
      status: "pending",
      reference: ref,
      metadata: { type: "subscription", planId: args.planId, passkey, passkeyExpiresAt },
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBSCRIPTION_PAYMENT_INITIATED",
      actor: orgId,
      action: "initiate_subscription_payment",
      target: txnId,
      details: { planId: args.planId, amount: args.amount, reference: ref },
      createdAt: now,
    });

    return { success: true, reference: ref, passkey, passkeyExpiresAt, transactionId: txnId };
  },
});

/** Verify passkey and complete subscription payment */
export const verifySubscriptionPayment = mutation({
  args: {
    token: v.string(),
    reference: v.string(),
    passkey: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const txn = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    const pending = txn.find((t: any) => t.reference === args.reference && t.status === "pending");
    if (!pending) return { error: "Transaction not found or already processed" };

    const meta = pending.metadata as any;
    if (!meta?.passkey || !meta?.passkeyExpiresAt) return { error: "Invalid transaction metadata" };
    if (meta.passkey !== args.passkey) return { error: "Invalid passkey" };
    if (Date.now() > meta.passkeyExpiresAt) return { error: "Passkey expired. Please initiate a new payment." };

    const now = Date.now();

    await ctx.db.patch(pending._id, { status: "completed" });

    const PLAN_DURATIONS: Record<string, number> = {
      growth: 30 * 24 * 60 * 60 * 1000,
      enterprise: 30 * 24 * 60 * 60 * 1000,
      scale: 30 * 24 * 60 * 60 * 1000,
    };
    const planDuration = PLAN_DURATIONS[meta.planId] || 30 * 24 * 60 * 60 * 1000;
    const subscriptionEndsAt = now + planDuration;

    await ctx.db.patch(orgId, {
      status: "active",
      plan: meta.planId,
      trialEndsAt: undefined,
      subscriptionEndsAt,
      updatedAt: now,
    });

    const systemWallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", (q: any) => q.eq("type", "main"))
      .first();
    if (systemWallet) {
      await ctx.db.patch(systemWallet._id, {
        balance: systemWallet.balance + pending.amount,
        lastUpdated: now,
      });
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBSCRIPTION_PAYMENT_COMPLETED",
      actor: orgId,
      action: "verify_subscription_payment",
      target: pending._id,
      details: {
        planId: meta.planId,
        amount: pending.amount,
        reference: args.reference,
        subscriptionEndsAt,
      },
      createdAt: now,
    });

    return { success: true, plan: meta.planId, subscriptionEndsAt };
  },
});
