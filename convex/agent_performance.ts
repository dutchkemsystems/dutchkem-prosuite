import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Feature 8: Agent Onboarding & Performance Dashboard

export const updateAgentPerformance = mutation({
  args: {
    userId: v.id("users"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    metrics: v.object({
      totalSales: v.number(),
      totalRevenue: v.number(),
      completions: v.number(),
      averageRating: v.number(),
      totalRatings: v.number(),
      responseTimeAvg: v.number(),
      leadsHandled: v.number(),
      conversionRate: v.number(),
    }),
    target: v.object({
      salesTarget: v.number(),
      revenueTarget: v.number(),
      completionTarget: v.number(),
    }),
    commission: v.object({
      baseRate: v.number(),
      bonusRate: v.number(),
      totalCommission: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = new Date();
    let periodStart: string;
    let periodEnd: string;

    if (args.period === "daily") {
      periodStart = now.toISOString().split("T")[0];
      periodEnd = periodStart;
    } else if (args.period === "weekly") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      periodStart = weekStart.toISOString().split("T")[0];
      periodEnd = now.toISOString().split("T")[0];
    } else {
      periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      periodEnd = now.toISOString().split("T")[0];
    }

    // Check for existing entry
    const allEntries = await ctx.db
      .query("agent_performance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const existing = allEntries.find(e => 
      e.period === args.period && 
      e.periodStart === periodStart && 
      e.periodEnd === periodEnd
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        metrics: args.metrics,
        target: args.target,
        commission: args.commission,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("agent_performance", {
        userId: args.userId,
        period: args.period,
        periodStart,
        periodEnd,
        metrics: args.metrics,
        target: args.target,
        commission: args.commission,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const getAgentPerformance = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("agent_performance"),
    period: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    metrics: v.any(),
    target: v.any(),
    commission: v.any(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_performance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
  },
});

export const getAgentStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    totalSales: v.number(),
    totalRevenue: v.number(),
    totalCompletions: v.number(),
    averageRating: v.number(),
    pendingCommission: v.number(),
    totalCommissionPaid: v.number(),
  }),
  handler: async (ctx, args) => {
    const perfEntries = await ctx.db
      .query("agent_performance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let totalSales = 0;
    let totalRevenue = 0;
    let totalCompletions = 0;
    let totalRating = 0;
    let totalRatings = 0;
    let pendingCommission = 0;

    for (const entry of perfEntries) {
      totalSales += entry.metrics.totalSales;
      totalRevenue += entry.metrics.totalRevenue;
      totalCompletions += entry.metrics.completions;
      totalRating += entry.metrics.averageRating * entry.metrics.totalRatings;
      totalRatings += entry.metrics.totalRatings;
      
      // Commission not yet paid would be pending
      const paidPayouts = await ctx.db
        .query("payouts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      
      const totalPaid = paidPayouts
        .filter(p => p.type === "freelancer")
        .reduce((sum, p) => sum + p.amount, 0);
      
      pendingCommission = entry.commission.totalCommission - totalPaid;
    }

    return {
      totalSales,
      totalRevenue,
      totalCompletions,
      averageRating: totalRatings > 0 ? totalRating / totalRatings : 0,
      pendingCommission: Math.max(0, pendingCommission),
      totalCommissionPaid: totalCompletions * 0.1, // Placeholder
    };
  },
});

export const getAllAgentPerformance = query({
  args: { period: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))) },
  returns: v.array(v.object({
    userId: v.id("users"),
    userName: v.optional(v.string()),
    metrics: v.any(),
    target: v.any(),
    commission: v.any(),
  })),
  handler: async (ctx, args) => {
    const period = args.period ?? "weekly";
    const now = new Date();
    let periodStart: string;
    let periodEnd: string;

    if (period === "daily") {
      periodStart = now.toISOString().split("T")[0];
      periodEnd = periodStart;
    } else if (period === "weekly") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      periodStart = weekStart.toISOString().split("T")[0];
      periodEnd = now.toISOString().split("T")[0];
    } else {
      periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      periodEnd = now.toISOString().split("T")[0];
    }

    const entries = await ctx.db
      .query("agent_performance")
      .withIndex("by_period", (q) => 
        q.eq("period", period as any)
         .eq("periodStart", periodStart)
         .eq("periodEnd", periodEnd)
      )
      .collect();

    const result = [];
    for (const entry of entries) {
      const user = await ctx.db.get(entry.userId);
      result.push({
        userId: entry.userId,
        userName: user?.name ?? undefined,
        metrics: entry.metrics,
        target: entry.target,
        commission: entry.commission,
      });
    }
    return result;
  },
});

// Calculate commission based on performance
export const calculateCommission = mutation({
  args: { userId: v.id("users") },
  returns: v.object({
    baseCommission: v.number(),
    bonusCommission: v.number(),
    totalCommission: v.number(),
  }),
  handler: async (ctx, args) => {
    const perfEntries = await ctx.db
      .query("agent_performance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(10);

    if (perfEntries.length === 0) {
      return { baseCommission: 0, bonusCommission: 0, totalCommission: 0 };
    }

    // Calculate totals from recent entries
    let totalRevenue = 0;
    let completions = 0;
    let targetRevenue = 0;
    let targetCompletions = 0;

    for (const entry of perfEntries) {
      totalRevenue += entry.metrics.totalRevenue;
      completions += entry.metrics.completions;
      targetRevenue += entry.target.revenueTarget;
      targetCompletions += entry.target.completionTarget;
    }

    // Base commission: 10% of revenue
    const baseCommission = totalRevenue * 0.1;

    // Bonus: Extra 5% if hitting >80% of targets
    const revenueTargetRatio = targetRevenue > 0 ? totalRevenue / targetRevenue : 0;
    const completionTargetRatio = targetCompletions > 0 ? completions / targetCompletions : 0;
    
    let bonusRate = 0;
    if (revenueTargetRatio >= 1 && completionTargetRatio >= 1) {
      bonusRate = 0.05;
    } else if (revenueTargetRatio >= 0.8 && completionTargetRatio >= 0.8) {
      bonusRate = 0.03;
    }

    const bonusCommission = totalRevenue * bonusRate;

    return {
      baseCommission: Math.round(baseCommission * 100) / 100,
      bonusCommission: Math.round(bonusCommission * 100) / 100,
      totalCommission: Math.round((baseCommission + bonusCommission) * 100) / 100,
    };
  },
});