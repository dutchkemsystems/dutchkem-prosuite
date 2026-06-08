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

    const now = Date.now();
    const txnId = await ctx.db.insert("enterprise_transactions", {
      orgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: args.currency || "NGN",
      status: "completed",
      reference: generateRef(),
      metadata: args.metadata,
      createdAt: now,
    });

    return { success: true, transactionId: txnId };
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
    const txnId = await ctx.db.insert("enterprise_transactions", {
      orgId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      amount: args.amount,
      currency: "NGN",
      status: "pending",
      reference: generateRef(),
      createdAt: now,
    });

    // Simulate completion after a brief delay (in real usage, this would be a webhook)
    await ctx.db.patch(txnId, { status: "completed" });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_SIMULATED",
      actor: orgId,
      action: "simulate_payment",
      target: txnId,
      details: { from: args.fromAgent, to: args.toAgent, amount: args.amount },
      createdAt: now,
    });

    return { success: true, transactionId: txnId, reference: generateRef() };
  },
});
