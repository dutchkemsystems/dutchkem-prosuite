import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

export const adminListPendingPayouts = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("client_payout_requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const adminListAllPayouts = query({
  args: { adminToken: v.string(), status: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("client_payout_requests").order("desc");
    if (args.status) q = q.withIndex("by_status", (iq) => iq.eq("status", args.status as any));
    return await q.take(args.limit || 100);
  },
});

export const adminApprovePayout = mutation({
  args: {
    adminToken: v.string(),
    requestId: v.id("client_payout_requests"),
    notes: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const request = await ctx.db.get(args.requestId);
    if (!request) return { error: "Request not found" };
    if (request.status !== "pending") return { error: "Not pending" };

    await ctx.db.patch(args.requestId, {
      status: "approved",
      adminNotes: args.notes,
      approvedBy: identity.name || "admin",
      approvedAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminRejectPayout = mutation({
  args: {
    adminToken: v.string(),
    requestId: v.id("client_payout_requests"),
    reason: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const request = await ctx.db.get(args.requestId);
    if (!request) return { error: "Request not found" };

    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", request.userId))
      .first();
    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + request.amount,
        pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - request.amount),
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.reason,
      rejectedBy: identity.name || "admin",
      rejectedAt: Date.now(),
    });

    return { success: true };
  },
});

export const adminProcessPayout = action({
  args: {
    adminToken: v.string(),
    requestId: v.id("client_payout_requests"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const request = await ctx.runQuery(internal.admin_payouts.getInternalPayoutRequest, { requestId: args.requestId });
    if (!request) return { error: "Request not found" };
    if (request.status !== "approved") return { error: "Not approved" };

    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) return { error: "KORA_SECRET_KEY not configured" };

    const reference = `DKP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const res = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${koraSecret}`,
      },
      body: JSON.stringify({
        reference,
        destination: {
          type: "bank_account",
          amount: request.amount,
          currency: request.currency || "NGN",
          narration: `Dutchkem Ventures payout - ${request.accountName}`,
          bank_account: {
            bank: request.bankCode,
            account: request.accountNumber,
          },
          customer: {
            name: request.accountName,
            email: "dutchkemdeveloper@gmail.com",
          },
        },
      }),
    });

    const data = await res.json() as any;

    if (data.status) {
      await ctx.runMutation(internal.admin_payouts.markPayoutProcessing, {
        requestId: args.requestId,
        koraReference: reference,
      });
      return { success: true, koraReference: reference };
    } else {
      await ctx.runMutation(internal.admin_payouts.markPayoutFailed, {
        requestId: args.requestId,
        reason: data.message || "Disbursement failed",
      });
      return { error: data.message || "Disbursement failed" };
    }
  },
});

export const getInternalPayoutRequest = query({
  args: { requestId: v.id("client_payout_requests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

export const markPayoutProcessing = mutation({
  args: { requestId: v.id("client_payout_requests"), koraReference: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: "processing",
      koraReference: args.koraReference,
      processedAt: Date.now(),
    });
    return { success: true };
  },
});

export const markPayoutFailed = mutation({
  args: { requestId: v.id("client_payout_requests"), reason: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request) {
      const wallet = await ctx.db.query("client_wallets")
        .withIndex("by_user", (q) => q.eq("userId", request.userId))
        .first();
      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: wallet.balance + request.amount,
          pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - request.amount),
          lastUpdated: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.requestId, {
      status: "failed",
      failureReason: args.reason,
    });
    return { success: true };
  },
});

export const markPayoutCompleted = mutation({
  args: { requestId: v.id("client_payout_requests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request) {
      const wallet = await ctx.db.query("client_wallets")
        .withIndex("by_user", (q) => q.eq("userId", request.userId))
        .first();
      if (wallet) {
        await ctx.db.patch(wallet._id, {
          pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - request.amount),
          totalWithdrawn: wallet.totalWithdrawn + request.amount,
          lastUpdated: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.requestId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return { success: true };
  },
});

export const adminBulkProcessPayouts = action({
  args: {
    adminToken: v.string(),
    requestIds: v.array(v.id("client_payout_requests")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };
    if (args.requestIds.length < 2) return { error: "Minimum 2 payouts for bulk" };
    if (args.requestIds.length > 50) return { error: "Maximum 50 per batch" };

    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) return { error: "KORA_SECRET_KEY not configured" };

    const requests: any[] = [];
    for (const id of args.requestIds) {
      const r = await ctx.runQuery(internal.admin_payouts.getInternalPayoutRequest, { requestId: id });
      if (r && r.status === "approved") requests.push(r);
    }

    if (requests.length < 2) return { error: "Need at least 2 approved requests" };

    const batchRef = `DKBATCH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const res = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${koraSecret}`,
      },
      body: JSON.stringify({
        reference: batchRef,
        destination: {
          type: "bank_account",
          amount: requests.reduce((sum, r) => sum + r.amount, 0),
          currency: "NGN",
          narration: `Dutchkem bulk payout - ${requests.length} recipients`,
          bank_account: { bank: requests[0].bankCode, account: requests[0].accountNumber },
          customer: { name: "Dutchkem Bulk Payout", email: "dutchkemdeveloper@gmail.com" },
        },
      }),
    });

    const data = await res.json() as any;

    const batchId = await ctx.runMutation(internal.admin_payouts.createBatch, {
      batchReference: batchRef,
      totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
      totalPayouts: requests.length,
      status: data.status ? "processing" : "failed",
      koraResponse: data,
      initiatedBy: session.name || "admin",
    });

    for (const r of requests) {
      if (data.status) {
        await ctx.runMutation(internal.admin_payouts.markPayoutProcessing, {
          requestId: r._id, koraReference: batchRef,
        });
      }
    }

    return data.status
      ? { success: true, batchReference: batchRef, batchId, count: requests.length }
      : { error: data.message || "Bulk disbursement failed" };
  },
});

export const createBatch = mutation({
  args: {
    batchReference: v.string(),
    totalAmount: v.number(),
    totalPayouts: v.number(),
    status: v.string(),
    koraResponse: v.optional(v.any()),
    initiatedBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("bulk_payout_batches", {
      ...args,
      status: args.status as any,
      createdAt: Date.now(),
    });
  },
});

export const adminGetKoraBalance = action({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) return { error: "KORA_SECRET_KEY not configured" };

    const res = await fetch("https://api.korapay.com/merchant/api/v1/transactions/balance", {
      method: "GET",
      headers: { Authorization: `Bearer ${koraSecret}` },
    });
    const data = await res.json() as any;
    return data.status ? { success: true, balance: data.data } : { error: data.message };
  },
});

export const adminGetBatchHistory = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    return await ctx.db.query("bulk_payout_batches").order("desc").take(args.limit || 20);
  },
});
