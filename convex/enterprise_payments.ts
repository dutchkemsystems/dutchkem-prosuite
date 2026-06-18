import { v } from "convex/values";
import { action, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryResolveEnterpriseAuth, tryGetAdminSessionInAction } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

/** Resolve orgId from either admin session or enterprise session token */
async function resolveOrgId(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: Id<"enterprise_organizations"> }
): Promise<Id<"enterprise_organizations"> | null> {
  if (args.orgId) return args.orgId;
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
  }
  return null;
}

/** Create a transaction */
export const createTransaction = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    const org = await ctx.db.get("enterprise_organizations", resolvedOrgId);
    if (org?.spendingLimit && args.amount > org.spendingLimit) {
      throw new Error(`Transaction exceeds spending limit of ${org.spendingLimit} ${args.currency}`);
    }

    const now = Date.now();
    const ref = args.reference || `TXN_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: resolvedOrgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      reference: ref,
      metadata: args.metadata,
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRANSACTION_CREATED",
      actor: auth.actorId || "unknown",
      action: "create_transaction",
      target: transactionId,
      details: { amount: args.amount, currency: args.currency, fromAgent: args.fromAgent, toAgent: args.toAgent },
      createdAt: now,
    });

    return { success: true, transactionId };
  },
});

/** List transactions */
export const listTransactions = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { totalTransactions: 0, totalVolume: 0, pendingTransactions: 0, failedTransactions: 0, avgTransactionAmount: 0 };

    const transactions = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();

    return {
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum: number, t: any) => t.status === "completed" ? sum + t.amount : sum, 0),
      pendingTransactions: transactions.filter((t: any) => t.status === "pending").length,
      failedTransactions: transactions.filter((t: any) => t.status === "failed").length,
      avgTransactionAmount: transactions.reduce((sum: number, t: any) => sum + t.amount, 0) / (transactions.length || 1),
    };
  },
});

/** Simulate payment */
export const simulatePayment = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
    currency: v.string(),
    reference: v.optional(v.string()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    const now = Date.now();
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: resolvedOrgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency,
      status: "completed",
      reference: args.reference || `SIM_${now}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: { simulated: true },
      createdAt: now,
    });

    return { success: true, transactionId, simulated: true };
  },
});

/** Get spending limit */
export const getSpendingLimit = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { spendingLimit: 0, subscriptionEndsAt: null, plan: "free" };

    const org = await ctx.db.get("enterprise_organizations", resolvedOrgId);
    return {
      spendingLimit: org?.spendingLimit || 0,
      subscriptionEndsAt: org?.subscriptionEndsAt || null,
      plan: org?.plan || "free",
    };
  },
});

/** Set spending limit */
export const setSpendingLimit = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    limit: v.number(),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    await ctx.db.patch(resolvedOrgId, { spendingLimit: args.limit, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Initiate subscription payment — LIVE via Kora Pay API */
export const initiateSubscriptionPayment = action({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    plan: v.union(v.literal("free"), v.literal("growth"), v.literal("professional"), v.literal("enterprise")),
    paymentMethod: v.string(),
    returnUrl: v.optional(v.string()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    // Resolve orgId from token if not provided
    let resolvedOrgId = args.orgId;
    if (!resolvedOrgId && args.token) {
      const session = await ctx.runQuery(internal.enterprise_payments._resolveSessionOrgId, { token: args.token });
      resolvedOrgId = session;
    }

    // Validate auth
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity && !args.token) throw new Error("Not authenticated");

    if (!resolvedOrgId) throw new Error("Organization not found");

    const amounts: Record<string, number> = { free: 0, growth: 25000, professional: 75000, enterprise: 250000 };
    const amount = amounts[args.plan] || 0;

    if (args.plan === "free") {
      const result: any = await ctx.runMutation(internal.enterprise_payments._activateFreePlan, {
        orgId: resolvedOrgId,
        plan: "free",
        adminToken: args.adminToken,
      });
      return result;
    }

    const ref = `ENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const txnResult: any = await ctx.runMutation(internal.enterprise_payments._createPendingTransaction, {
      orgId: resolvedOrgId,
      amount,
      plan: args.plan,
      paymentMethod: args.paymentMethod,
      reference: ref,
      adminToken: args.adminToken,
    });

    if (txnResult.error) return txnResult;

    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) {
      return { error: "KORA_SECRET_KEY not configured. Add it in Convex Settings → Environment Variables." };
    }

    try {
      const org = txnResult.org;
      const siteUrl = process.env.SITE_URL || "https://dutchkem-prosuite-app.vercel.app";
      const returnUrl = args.returnUrl || `${siteUrl}/admin/dashboard?enterprise=payment-success&reference=${ref}`;

      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${koraSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "NGN",
          reference: ref,
          customer: {
            email: org?.email || "admin@dutchkem.com",
            name: org?.name || "Enterprise",
          },
          redirect_url: returnUrl,
          metadata: {
            type: "enterprise_subscription",
            orgId: resolvedOrgId,
            plan: args.plan,
            paymentMethod: args.paymentMethod,
            adminEmail: identity?.email || "enterprise",
          },
        }),
      });

      const data = await response.json();

      if (!data.status || !data.data?.checkout_url) {
        return {
          error: data.message || `Kora API error (HTTP ${response.status})`,
          reference: ref,
        };
      }

      return {
        success: true,
        checkoutUrl: data.data.checkout_url,
        reference: ref,
        amount,
        plan: args.plan,
        message: `Payment initialized — redirecting to Kora Pay checkout`,
      };
    } catch (err: any) {
      return { error: err.message || "Failed to initialize Kora payment", reference: ref };
    }
  },
});

/** Internal query to resolve orgId from enterprise session token (for actions) */
export const _resolveSessionOrgId = internalMutation({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
    return null;
  },
});

/**
 * INTERNAL MUTATION: Create pending enterprise transaction
 */
export const _createPendingTransaction = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    amount: v.number(),
    plan: v.string(),
    paymentMethod: v.string(),
    reference: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await (await import("./auth_helpers")).tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { error: "Not authenticated" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { error: "Organization not found" };

    const now = Date.now();
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: args.orgId,
      fromAgent: "enterprise_org",
      toAgent: "system_wallets.main",
      amount: args.amount,
      currency: "NGN",
      status: "pending",
      reference: args.reference,
      metadata: {
        plan: args.plan,
        paymentMethod: args.paymentMethod,
        koraInitialized: true,
      },
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_INITIATED",
      actor: identity._id,
      action: "initiate_kora_payment",
      target: transactionId,
      details: { amount: args.amount, plan: args.plan, reference: args.reference },
      createdAt: now,
    });

    return { success: true, transactionId, org };
  },
});

/**
 * INTERNAL MUTATION: Activate free plan
 */
export const _activateFreePlan = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    plan: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await (await import("./auth_helpers")).tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { error: "Not authenticated" };

    const now = Date.now();
    await ctx.db.patch(args.orgId, {
      plan: args.plan as any,
      subscriptionEndsAt: now + (30 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_transactions", {
      orgId: args.orgId,
      fromAgent: "system",
      toAgent: "enterprise_org",
      amount: 0,
      currency: "NGN",
      status: "completed",
      reference: `FREE_${now}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: { plan: "free", activatedBy: "auto" },
      createdAt: now,
    });

    return { success: true, plan: args.plan, expiresAt: now + (30 * 24 * 60 * 60 * 1000) };
  },
});

/**
 * INTERNAL MUTATION: Confirm enterprise payment from Kora webhook
 */
export const confirmEnterprisePayment = internalMutation({
  args: {
    reference: v.string(),
    amount: v.number(),
    koraReference: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.query("enterprise_transactions")
      .filter((q) => q.eq(q.field("reference"), args.reference))
      .first();

    if (!transaction) {
      console.log(`[ENTERPRISE PAY] No transaction found for reference: ${args.reference}`);
      return { error: "Transaction not found" };
    }

    if (transaction.status === "completed") {
      return { success: true, message: "Already processed" };
    }

    const metadata = transaction.metadata as any;
    const plan = metadata?.plan || "growth";
    const now = Date.now();

    await ctx.db.patch(transaction._id, {
      status: "completed",
      metadata: { ...metadata, koraReference: args.koraReference, confirmedAt: now, completedAt: now },
    });

    await ctx.db.patch(transaction.orgId, {
      plan: plan as any,
      subscriptionEndsAt: now + (30 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });

    try {
      await ctx.runMutation(internal.system_wallets.updateBalance, {
        walletId: "main",
        amount: args.amount,
        type: "credit",
      });
    } catch (err: any) {
      console.error(`[ENTERPRISE PAY] Failed to credit wallet: ${err.message}`);
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_COMPLETED",
      actor: "system",
      action: "kora_webhook_confirmed",
      target: transaction._id,
      details: { amount: args.amount, plan, reference: args.reference, koraReference: args.koraReference },
      createdAt: now,
    });

    console.log(`[ENTERPRISE PAY] Confirmed: ${args.reference}, amount=₦${args.amount}, plan=${plan}`);
    return { success: true, plan, expiresAt: now + (30 * 24 * 60 * 60 * 1000) };
  },
});
