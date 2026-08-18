import { v } from "convex/values";
import { action, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// KORA PAY REFUND HANDLING
// Process refunds and track refund history
// ═══════════════════════════════════════════════════════════════════

// ─── INITIATE REFUND ───
export const initiateRefund = action({
  args: {
    reference: v.string(),
    amount: v.number(),
    reason: v.string(),
    adminToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    refundId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    // Verify admin session
    const session = await ctx.runQuery(internal.auth_helpers.validateAdminSession, {
      adminToken: args.adminToken,
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the original transaction
    const pending = await ctx.runQuery(internal.kora_checkout.getPendingByReference, {
      reference: args.reference,
    });
    if (!pending) {
      return { success: false, error: "Transaction not found" };
    }

    if (pending.status !== "completed") {
      return { success: false, error: "Can only refund completed transactions" };
    }

    if (args.amount > pending.amount) {
      return { success: false, error: "Refund amount exceeds transaction amount" };
    }

    // Generate refund reference
    const refundId = `REF-${args.reference.slice(-8)}-${Date.now()}`;

    try {
      // Call Kora Pay refund API
      const response = await fetch("https://api.korapay.com/merchant/api/v1/refunds", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: args.reference,
          amount: args.amount,
          reason: args.reason,
        }),
      });

      const data = await response.json();

      if (data.status) {
        // Store refund record
        await ctx.runMutation(internal.kora_refunds.storeRefund, {
          refundId,
          originalReference: args.reference,
          amount: args.amount,
          reason: args.reason,
          adminId: session._id,
          koraRefundId: data.data?.id || refundId,
          status: "processing",
        });

        return {
          success: true,
          refundId,
        };
      }

      return {
        success: false,
        error: data.message || "Refund initialization failed",
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Refund processing error",
      };
    }
  },
});

// ─── STORE REFUND RECORD ───
export const storeRefund = internalMutation({
  args: {
    refundId: v.string(),
    originalReference: v.string(),
    amount: v.number(),
    reason: v.string(),
    adminId: v.string(),
    koraRefundId: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("kora_refunds", {
      refundId: args.refundId,
      originalReference: args.originalReference,
      amount: args.amount,
      reason: args.reason,
      adminId: args.adminId,
      koraRefundId: args.koraRefundId,
      status: args.status,
      createdAt: Date.now(),
    });
    return null;
  },
});

// ─── HANDLE REFUND WEBHOOK ───
export const handleRefundWebhook = internalMutation({
  args: {
    refundId: v.string(),
    status: v.string(),
    rawPayload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find refund by koraRefundId
    const refunds = await ctx.db
      .query("kora_refunds")
      .filter((q) => q.eq(q.field("koraRefundId"), args.refundId))
      .collect();

    for (const refund of refunds) {
      await ctx.db.patch("kora_refunds", refund._id, {
        status: args.status,
        completedAt: args.status === "completed" ? Date.now() : undefined,
        rawPayload: args.rawPayload,
      });

      // If refund completed, reverse credits if applicable
      if (args.status === "completed") {
        // Find original transaction to reverse credits
        const original = await ctx.db
          .query("kora_pending_transactions")
          .filter((q) => q.eq(q.field("reference"), refund.originalReference))
          .collect();

        for (const tx of original) {
          if (tx.type === "credit_purchase" && tx.credits > 0) {
            // Deduct credits from user
            await ctx.runMutation(internal.kora_refunds.reverseCredits, {
              userId: tx.userId,
              credits: tx.credits,
              reference: refund.refundId,
            });
          }
        }
      }
    }

    return null;
  },
});

// ─── REVERSE CREDITS ───
export const reverseCredits = internalMutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find user and deduct credits
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId))
      .first();

    if (user) {
      const currentCredits = (user as any).credits || 0;
      const newCredits = Math.max(0, currentCredits - args.credits);
      await ctx.db.patch(args.userId as any, { credits: newCredits });

      // Log credit reversal
      await ctx.db.insert("credit_transactions", {
        userId: args.userId,
        type: "reversal",
        amount: -args.credits,
        reference: args.reference,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// ─── GET REFUND HISTORY ───
export const getRefundHistory = query({
  args: {
    limit: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const refunds = await ctx.db.query("kora_refunds").collect();

    // Sort by creation date (newest first)
    refunds.sort((a, b) => b.createdAt - a.createdAt);

    return refunds.slice(0, limit).map((r: any) => ({
      id: r._id,
      refundId: r.refundId,
      originalReference: r.originalReference,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));
  },
});

// ─── GET REFUND SUMMARY ───
export const getRefundSummary = query({
  args: {
    days: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const refunds = await ctx.db.query("kora_refunds").collect();
    const recent = refunds.filter((r: any) => r.createdAt >= cutoff);

    const totalRefunded = recent.reduce((sum: number, r: any) => sum + r.amount, 0);
    const completedRefunds = recent.filter((r: any) => r.status === "completed").length;
    const pendingRefunds = recent.filter((r: any) => r.status === "processing").length;

    return {
      period: `${days} days`,
      totalRefunded,
      totalRefunds: recent.length,
      completedRefunds,
      pendingRefunds,
      averageRefund: recent.length > 0 ? Math.round(totalRefunded / recent.length) : 0,
    };
  },
});
