import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createPaymentMethod = mutation({
  args: { adminToken: v.string(), name: v.string(), type: v.string(), provider: v.string(), config: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const methodId = `pm-${Date.now()}`;
    await ctx.db.insert("agentic_payment_methods", { methodId, ...args, isActive: true, createdAt: Date.now() });
    return { success: true, methodId };
  },
});

export const setSpendingLimits = mutation({
  args: { adminToken: v.string(), agentId: v.string(), dailyLimitNgn: v.number(), monthlyLimitNgn: v.number(), perTransactionLimitNgn: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const existing = await ctx.db.query("agentic_payment_limits").withIndex("by_agent", (q) => q.eq("agentId", args.agentId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { dailyLimitNgn: args.dailyLimitNgn, monthlyLimitNgn: args.monthlyLimitNgn, perTransactionLimitNgn: args.perTransactionLimitNgn, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("agentic_payment_limits", {
        agentId: args.agentId, dailyLimitNgn: args.dailyLimitNgn, monthlyLimitNgn: args.monthlyLimitNgn, perTransactionLimitNgn: args.perTransactionLimitNgn, spentToday: 0, spentThisMonth: 0, lastResetAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const createTransaction = mutation({
  args: { agentId: v.string(), methodId: v.string(), amountNgn: v.number(), recipient: v.string(), description: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limits = await ctx.db.query("agentic_payment_limits").withIndex("by_agent", (q) => q.eq("agentId", args.agentId)).first();
    if (limits) {
      if (args.amountNgn > limits.perTransactionLimitNgn) return { error: "Exceeds per-transaction limit" };
      if (limits.spentToday + args.amountNgn > limits.dailyLimitNgn) return { error: "Exceeds daily limit" };
      if (limits.spentThisMonth + args.amountNgn > limits.monthlyLimitNgn) return { error: "Exceeds monthly limit" };
      await ctx.db.patch(limits._id, { spentToday: limits.spentToday + args.amountNgn, spentThisMonth: limits.spentThisMonth + args.amountNgn, updatedAt: Date.now() });
    }
    const transactionId = `txn-${Date.now()}`;
    await ctx.db.insert("agentic_payment_transactions", {
      transactionId, agentId: args.agentId, methodId: args.methodId, amountNgn: args.amountNgn, recipient: args.recipient, description: args.description, status: "pending", createdAt: Date.now(),
    });
    return { success: true, transactionId };
  },
});

export const completeTransaction = mutation({
  args: { adminToken: v.string(), transactionId: v.string(), status: v.union(v.literal("completed"), v.literal("failed"), v.literal("reversed")), koraReference: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const txn = await ctx.db.query("agentic_payment_transactions").withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId)).first();
    if (!txn) return { error: "Not found" };
    await ctx.db.patch(txn._id, { status: args.status, koraReference: args.koraReference, completedAt: Date.now() });
    return { success: true };
  },
});

export const getTransactions = query({
  args: { agentId: v.optional(v.string()), status: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("agentic_payment_transactions");
    if (args.agentId) q = q.withIndex("by_agent", (q2: any) => q2.eq("agentId", args.agentId!));
    if (args.status) q = q.withIndex("by_status", (q2: any) => q2.eq("status", args.status!));
    return await q.order("desc").take(args.limit ?? 50);
  },
});

export const getPaymentMethods = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => await ctx.db.query("agentic_payment_methods").take(50),
});

export const getSpendingLimits = query({
  args: { agentId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.agentId) return await ctx.db.query("agentic_payment_limits").withIndex("by_agent", (q) => q.eq("agentId", args.agentId!)).take(10);
    return await ctx.db.query("agentic_payment_limits").take(50);
  },
});

export const getAgenticPaymentStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const txns = await ctx.db.query("agentic_payment_transactions").take(500);
    const totalNgn = txns.filter((t) => t.status === "completed").reduce((s, t) => s + t.amountNgn, 0);
    return { totalTransactions: txns.length, completed: txns.filter((t) => t.status === "completed").length, pending: txns.filter((t) => t.status === "pending").length, failed: txns.filter((t) => t.status === "failed").length, totalNgn };
  },
});
