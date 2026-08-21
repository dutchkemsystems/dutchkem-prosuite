import { v } from "convex/values";
import { query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// PREDICTIVE ANALYTICS ENGINE - Rule-based ML predictions
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// QUERY: Predict churn risk for users
// ═══════════════════════════════════════════════════════════════════
export const predictChurnRisk = query({
  args: { days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const interactions = await ctx.db.query("support_interactions")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const escalations = await ctx.db.query("support_escalations")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const userActivity: Record<string, { interactions: number; escalations: number; lastActive: number }> = {};
    for (const i of interactions) {
      if (!userActivity[i.userId]) userActivity[i.userId] = { interactions: 0, escalations: 0, lastActive: 0 };
      userActivity[i.userId].interactions++;
      userActivity[i.userId].lastActive = Math.max(userActivity[i.userId].lastActive, i.createdAt);
    }
    for (const e of escalations) {
      if (!userActivity[e.userId]) userActivity[e.userId] = { interactions: 0, escalations: 0, lastActive: 0 };
      userActivity[e.userId].escalations++;
    }

    const predictions = Object.entries(userActivity).map(([userId, data]) => {
      const daysSinceActive = (Date.now() - data.lastActive) / (24 * 60 * 60 * 1000);
      let riskScore = 0;
      if (daysSinceActive > 14) riskScore += 40;
      else if (daysSinceActive > 7) riskScore += 20;
      if (data.escalations > 2) riskScore += 30;
      else if (data.escalations > 0) riskScore += 15;
      if (data.interactions < 3) riskScore += 20;
      riskScore = Math.min(riskScore, 100);

      return {
        userId,
        riskScore,
        riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
        factors: {
          daysSinceActive: Math.round(daysSinceActive),
          interactions: data.interactions,
          escalations: data.escalations,
        },
      };
    });

    predictions.sort((a, b) => b.riskScore - a.riskScore);

    return {
      predictions,
      summary: {
        highRisk: predictions.filter((p) => p.riskLevel === 'high').length,
        mediumRisk: predictions.filter((p) => p.riskLevel === 'medium').length,
        lowRisk: predictions.filter((p) => p.riskLevel === 'low').length,
        totalUsers: predictions.length,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Predict revenue forecast
// ═══════════════════════════════════════════════════════════════════
export const predictRevenue = query({
  args: { months: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const months = args.months || 6;
    const snapshots = await ctx.db.query("revenue_daily_snapshots").order("desc").take(90);

    const avgDailyRevenue = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + (s.totalRevenueNgn || 0), 0) / snapshots.length
      : 0;

    const avgGrowthRate = snapshots.length > 7
      ? (() => {
          const recent = snapshots.slice(0, 7).reduce((sum, s) => sum + (s.totalRevenueNgn || 0), 0) / 7;
          const older = snapshots.slice(7, 14).reduce((sum, s) => sum + (s.totalRevenueNgn || 0), 0) / 7;
          return older > 0 ? (recent - older) / older : 0.05;
        })()
      : 0.05;

    const forecast = [];
    let projected = avgDailyRevenue * 30;
    for (let i = 1; i <= months; i++) {
      projected *= (1 + avgGrowthRate);
      forecast.push({
        month: i,
        projected: Math.round(projected),
        confidence: Math.max(50, 90 - (i * 5)),
      });
    }

    return {
      currentMRR: Math.round(avgDailyRevenue * 30),
      growthRate: Math.round(avgGrowthRate * 100),
      forecast,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get analytics summary
// ═══════════════════════════════════════════════════════════════════
export const getAnalyticsSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const interactions = await ctx.db.query("support_interactions").take(1000);
    const escalations = await ctx.db.query("support_escalations").take(500);

    const agentCounts: Record<string, number> = {};
    for (const i of interactions) { agentCounts[i.agentId] = (agentCounts[i.agentId] || 0) + 1; }

    const confidenceCounts = { high: 0, medium: 0, low: 0 };
    for (const i of interactions) {
      const c = i.confidence as keyof typeof confidenceCounts;
      if (c in confidenceCounts) confidenceCounts[c]++;
    }

    return {
      totalInteractions: interactions.length,
      totalEscalations: escalations.length,
      agentCounts,
      confidenceCounts,
      avgResponseTime: interactions.length > 0
        ? Math.round(interactions.reduce((sum, i) => sum + (i.responseTimeMs || 0), 0) / interactions.length)
        : 0,
    };
  },
});
