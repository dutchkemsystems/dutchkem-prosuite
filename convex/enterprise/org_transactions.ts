import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const getOrganizationTransactions = query({
  args: {
    orgId: v.id("enterprise_organizations"), startDate: v.optional(v.number()),
    endDate: v.optional(v.number()), type: v.optional(v.string()),
    status: v.optional(v.string()), limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    const transactions = await ctx.db.query("enterprise_org_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc").take(args.limit || 100);
    return transactions.filter((tx: any) => {
      if (args.startDate && tx.createdAt < args.startDate) return false;
      if (args.endDate && tx.createdAt > args.endDate) return false;
      if (args.type && tx.type !== args.type) return false;
      if (args.status && tx.status !== args.status) return false;
      return true;
    });
  },
});

export const recordTransaction = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    type: v.union(v.literal("subscription_payment"), v.literal("agent_usage"), v.literal("api_call"), v.literal("refund"), v.literal("payout"), v.literal("adjustment")),
    amount: v.number(), currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("reversed")),
    description: v.string(), reference: v.optional(v.string()),
    metadata: v.optional(v.any()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const txId = await ctx.db.insert("enterprise_org_transactions", {
      orgId: args.orgId, type: args.type, amount: args.amount,
      currency: args.currency, status: args.status, description: args.description,
      reference: args.reference, metadata: args.metadata, createdAt: Date.now(),
    });
    return { success: true, txId };
  },
});

export const reverseTransaction = mutation({
  args: { txId: v.id("enterprise_org_transactions"), reason: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const tx = await ctx.db.get("enterprise_org_transactions", args.txId);
    if (!tx) return { success: false, error: "Transaction not found" };
    if (tx.status === "reversed") return { success: false, error: "Transaction already reversed" };
    await ctx.db.patch(args.txId, {
      status: "reversed",
      metadata: { ...tx.metadata, reversedBy: identity._id, reversedAt: Date.now(), reason: args.reason },
    });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRANSACTION_REVERSED", actor: identity._id,
      action: "reverse_transaction", target: args.txId,
      details: { txId: args.txId, amount: tx.amount, reason: args.reason }, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const getOrganizationAnalytics = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    period: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;
    const analytics = await ctx.db.query("enterprise_org_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .order("desc").take(365);
    const grouped: Record<string, any[]> = {};
    for (const entry of analytics) {
      if (!grouped[entry.metric]) grouped[entry.metric] = [];
      grouped[entry.metric].push({ date: entry.date, value: entry.value });
    }
    return grouped;
  },
});

export const recordAnalytics = mutation({
  args: {
    orgId: v.id("enterprise_organizations"), date: v.string(),
    metric: v.string(), value: v.number(),
    metadata: v.optional(v.any()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    await ctx.db.insert("enterprise_org_analytics", {
      orgId: args.orgId, date: args.date, metric: args.metric,
      value: args.value, metadata: args.metadata, createdAt: Date.now(),
    });
    return { success: true };
  },
});
