import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// PAYMENT ANALYTICS
// Revenue tracking, transaction history, success rates
// ═══════════════════════════════════════════════════════════════════

// ─── GET REVENUE SUMMARY ───
export const getRevenueSummary = query({
  args: {
    days: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all payment transactions
    const pendingTx = await ctx.db.query("kora_pending_transactions").collect();
    const webhookEvents = await ctx.db.query("kora_webhook_events").collect();

    // Filter by date range
    const recentPending = pendingTx.filter(t => t.createdAt >= cutoff);
    const recentWebhooks = webhookEvents.filter(w => w.receivedAt >= cutoff);

    // Calculate revenue from successful transactions
    let totalRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;
    let pendingPayments = 0;

    for (const tx of recentPending) {
      if (tx.status === "completed") {
        totalRevenue += tx.amount;
        successfulPayments++;
      } else if (tx.status === "failed") {
        failedPayments++;
      } else {
        pendingPayments++;
      }
    }

    // Revenue by type
    const revenueByType: Record<string, number> = {};
    for (const tx of recentPending) {
      if (tx.status === "completed") {
        revenueByType[tx.type] = (revenueByType[tx.type] || 0) + tx.amount;
      }
    }

    // Daily revenue breakdown
    const dailyRevenue: Record<string, number> = {};
    for (const tx of recentPending) {
      if (tx.status === "completed") {
        const date = new Date(tx.createdAt).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + tx.amount;
      }
    }

    // Success rate
    const totalAttempts = successfulPayments + failedPayments;
    const successRate = totalAttempts > 0 ? (successfulPayments / totalAttempts) * 100 : 0;

    return {
      period: `${days} days`,
      totalRevenue,
      successfulPayments,
      failedPayments,
      pendingPayments,
      successRate: Math.round(successRate * 100) / 100,
      revenueByType,
      dailyRevenue,
      averageTransactionValue: successfulPayments > 0 ? Math.round(totalRevenue / successfulPayments) : 0,
    };
  },
});

// ─── GET TRANSACTION HISTORY ───
export const getTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let query = ctx.db.query("kora_pending_transactions");

    // Get all transactions
    let transactions = await query.collect();

    // Filter by type if specified
    if (args.type) {
      transactions = transactions.filter(t => t.type === args.type);
    }

    // Filter by status if specified
    if (args.status) {
      transactions = transactions.filter(t => t.status === args.status);
    }

    // Sort by creation date (newest first)
    transactions.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    transactions = transactions.slice(0, limit);

    return transactions.map(tx => ({
      id: tx._id,
      reference: tx.reference,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency || "NGN",
      status: tx.status,
      email: tx.email,
      packageId: tx.packageId,
      credits: tx.credits,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    }));
  },
});

// ─── GET PAYMENT TRENDS ───
export const getPaymentTrends = query({
  args: {
    days: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db.query("kora_pending_transactions").collect();
    const recent = transactions.filter(t => t.createdAt >= cutoff);

    // Group by day
    const dailyData: Record<string, { count: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyData[date] = { count: 0, revenue: 0 };
    }

    for (const tx of recent) {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].count++;
        if (tx.status === "completed") {
          dailyData[date].revenue += tx.amount;
        }
      }
    }

    // Convert to array and sort by date
    const trends = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trends;
  },
});

// ─── GET TOP CUSTOMERS ───
export const getTopCustomers = query({
  args: {
    limit: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const transactions = await ctx.db.query("kora_pending_transactions").collect();

    // Group by email
    const customerData: Record<string, { email: string; totalSpent: number; transactionCount: number; lastPurchase: number }> = {};

    for (const tx of transactions) {
      if (tx.status === "completed" && tx.email) {
        if (!customerData[tx.email]) {
          customerData[tx.email] = {
            email: tx.email,
            totalSpent: 0,
            transactionCount: 0,
            lastPurchase: tx.createdAt,
          };
        }
        customerData[tx.email].totalSpent += tx.amount;
        customerData[tx.email].transactionCount++;
        if (tx.createdAt > customerData[tx.email].lastPurchase) {
          customerData[tx.email].lastPurchase = tx.createdAt;
        }
      }
    }

    // Sort by total spent and limit
    const topCustomers = Object.values(customerData)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return topCustomers;
  },
});

// ─── GET CONVERSION RATE ───
export const getConversionRate = query({
  args: {
    days: v.optional(v.number()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db.query("kora_pending_transactions").collect();
    const recent = transactions.filter(t => t.createdAt >= cutoff);

    const completed = recent.filter(t => t.status === "completed").length;
    const total = recent.length;

    const conversionRate = total > 0 ? (completed / total) * 100 : 0;

    // Conversion by type
    const byType: Record<string, { attempted: number; completed: number; rate: number }> = {};
    for (const tx of recent) {
      if (!byType[tx.type]) {
        byType[tx.type] = { attempted: 0, completed: 0, rate: 0 };
      }
      byType[tx.type].attempted++;
      if (tx.status === "completed") {
        byType[tx.type].completed++;
      }
    }

    // Calculate rates
    for (const type of Object.keys(byType)) {
      const { attempted, completed: comp } = byType[type];
      byType[type].rate = attempted > 0 ? Math.round((comp / attempted) * 100 * 100) / 100 : 0;
    }

    return {
      overall: Math.round(conversionRate * 100) / 100,
      byType,
      totalAttempts: total,
      totalCompleted: completed,
    };
  },
});
