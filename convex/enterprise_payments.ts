import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Create a transaction */
export const createTransaction = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    fromAgent: v.id("agents"),
    toAgent: v.id("agents"),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: args.orgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      reference: args.reference || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: args.metadata,
      createdAt: now,
    });

    // Enforce spending limit
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (org?.spendingLimit && args.amount > org.spendingLimit) {
      throw new Error(`Transaction exceeds spending limit of ${org.spendingLimit} ${args.currency}`);
    }

    // If Kora Pay integration is active, create Kora transfer
    if (process.env.KORA_WEBHOOK_SECRET) {
      try {
        await ctx.runAction(internal.kora_pay.createTransfer, {
          amount: args.amount,
          currency: args.currency,
          reference: args.reference,
          destination: args.toAgent,
        });
        await ctx.db.patch(transactionId, { status: "completed", completedAt: now });
      } catch (error: any) {
        await ctx.db.patch(transactionId, { status: "failed", error: error.message, completedAt: now });
        throw error;
      }
    } else {
      await ctx.db.patch(transactionId, { status: "completed", completedAt: now });
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRANSACTION_CREATED",
      actor: identity._id,
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
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const transactions = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
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
    fromAgent: v.id("agents"),
    toAgent: v.id("agents"),
    amount: v.number(),
    currency: v.string(),
    reference: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: identity._id,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency,
      status: "completed",
      reference: args.reference,
      metadata: { simulated: true },
      createdAt: now,
      completedAt: now,
    });

    return { success: true, transactionId, simulated: true };
  },
});

/** Get spending limit */
export const getSpendingLimit = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
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
    orgId: v.id("enterprise_organizations"),
    limit: v.number({ min: 1000 }),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.orgId, { spendingLimit: args.limit, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Initiate subscription payment */
export const initiateSubscriptionPayment = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    plan: v.union(v.literal("free"), v.literal("growth"), v.literal("professional"), v.literal("enterprise")),
    paymentMethod: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { error: "Organization not found" };

    const now = Date.now();
    const reference = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate 6-digit passkey for payment verification
    const passkey = Math.floor(100000 + Math.random() * 900000).toString();

    // Create transaction record
    const transactionId = await ctx.db.insert("enterprise_transactions", {
      orgId: args.orgId,
      fromAgent: "admin",
      toAgent: "system_wallets.main",
      amount: args.plan === "free" ? 0 : (args.plan === "growth" ? 5000 : args.plan === "professional" ? 15000 : 50000),
      currency: "NGN",
      status: args.plan === "free" ? "completed" : "pending",
      reference,
      metadata: {
        plan: args.plan,
        paymentMethod: args.paymentMethod,
        passkey,
        passkeyExpiry: now + (10 * 60 * 1000), // 10 minutes
      },
      createdAt: now,
      completedAt: args.plan === "free" ? now : undefined,
    });

    // Send passkey via OTP/email if not free
    if (args.plan !== "free") {
      await ctx.runAction(internal.otp_email.sendPasskey, {
        email: org.email,
        passkey,
        reference,
      });
    }

    return { success: true, reference, passkey, transactionId };
  },
});

/** Verify subscription payment */
export const verifySubscriptionPayment = mutation({
  args: {
    reference: v.string(),
    passkey: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const transaction = await ctx.db.query("enterprise_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", identity._id))
      .filter((q) => q.eq(q.field("reference"), args.reference))
      .first();

    if (!transaction) return { error: "Transaction not found" };
    if (transaction.status !== "pending") return { error: "Transaction already processed" };

    const metadata = transaction.metadata as any;
    if (!metadata?.passkey || !metadata?.passkeyExpiry) return { error: "Passkey not found" };
    if (Date.now() > metadata.passkeyExpiry) return { error: "Passkey expired" };
    if (metadata.passkey !== args.passkey) return { error: "Invalid passkey" };

    const now = Date.now();
    await ctx.db.patch(transaction._id, {
      status: "completed",
      completedAt: now,
    });

    // Update organization subscription
    await ctx.db.patch(transaction.orgId, {
      plan: metadata.plan,
      subscriptionEndsAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      updatedAt: now,
    });

    // Update wallet balance
    await ctx.runMutation(internal.system_wallets.updateBalance, {
      walletId: "main",
      amount: transaction.amount,
      type: "credit",
    });

    return { success: true, plan: metadata.plan, expiresAt: now + (30 * 24 * 60 * 60 * 1000) };
  },
});