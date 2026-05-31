import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * VOICE ROI - Return on Investment Analytics
 * Tracks Deepgram + LiveKit costs vs revenue generated
 */

// Cost per minute for voice services
const DEEPGRAM_COST_PER_MINUTE = 0.004; // $0.004/min for STT/TTS
const LIVEKIT_COST_PER_MINUTE = 0.02; // $0.02/min for LiveKit Cloud
const TOTAL_COST_PER_MINUTE = DEEPGRAM_COST_PER_MINUTE + LIVEKIT_COST_PER_MINUTE;

/**
 * Get voice ROI statistics
 */
export const getStats = query({
  args: { 
    timeRange: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("quarter"))
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime: number;
    
    switch (args.timeRange) {
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "quarter":
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get communication logs for voice calls
    const calls = await ctx.db.query("communication_logs")
      .filter(q => q.eq(q.field("type"), "call"))
      .filter(q => q.gte(q.field("createdAt"), startTime))
      .collect();

    // Calculate metrics
    const totalCalls = calls.length;
    const totalMinutes = calls.reduce((sum, call) => {
      const duration = call.metadata?.duration_seconds || 0;
      return sum + (duration / 60);
    }, 0);
    
    const totalCost = totalMinutes * TOTAL_COST_PER_MINUTE;
    
    // Get revenue from payments linked to voice calls
    const payments = await ctx.db.query("payment_verifications")
      .filter(q => q.eq(q.field("status"), "approved"))
      .filter(q => q.gte(q.field("verifiedAt"), startTime))
      .collect();
    
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const conversionRate = totalCalls > 0 ? (payments.length / totalCalls) * 100 : 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    // Agent breakdown
    const agentCalls: Record<string, { calls: number; minutes: number; revenue: number }> = {};
    for (const call of calls) {
      const agentId = call.metadata?.agent_id || "unknown";
      if (!agentCalls[agentId]) {
        agentCalls[agentId] = { calls: 0, minutes: 0, revenue: 0 };
      }
      agentCalls[agentId].calls++;
      agentCalls[agentId].minutes += (call.metadata?.duration_seconds || 0) / 60;
    }

    const agentBreakdown = Object.entries(agentCalls).map(([agentId, data]) => ({
      agentId,
      callVolume: data.calls,
      totalMinutes: data.minutes,
      cost: data.minutes * TOTAL_COST_PER_MINUTE,
      revenue: data.revenue,
      roi: data.revenue > 0 ? ((data.revenue - (data.minutes * TOTAL_COST_PER_MINUTE)) / (data.minutes * TOTAL_COST_PER_MINUTE)) * 100 : 0,
    }));

    return {
      totalCalls,
      totalMinutes: Math.round(totalMinutes * 100) / 100,
      totalRevenue,
      totalCost: Math.round(totalCost * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      agentBreakdown,
      timeRange: args.timeRange,
      startTime,
      endTime: now,
    };
  },
});

/**
 * Get call history
 */
export const getCallHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const calls = await ctx.db.query("communication_logs")
      .filter(q => q.eq(q.field("type"), "call"))
      .order("desc")
      .take(limit);

    return calls.map(call => ({
      id: call._id,
      timestamp: call.createdAt,
      user_id: call.userId,
      user_name: call.metadata?.user_name || "Unknown",
      agent_id: call.metadata?.agent_id || "unknown",
      duration_seconds: call.metadata?.duration_seconds || 0,
      cost: ((call.metadata?.duration_seconds || 0) / 60) * TOTAL_COST_PER_MINUTE,
      revenue: call.metadata?.revenue || 0,
      roi: call.metadata?.revenue 
        ? ((call.metadata?.revenue - ((call.metadata?.duration_seconds || 0) / 60) * TOTAL_COST_PER_MINUTE) / ((call.metadata?.duration_seconds || 0) / 60) * TOTAL_COST_PER_MINUTE) * 100 
        : 0,
      status: call.status,
      direction: call.direction,
    }));
  },
});

/**
 * Get daily metrics for charts
 */
export const getDailyMetrics = query({
  args: { days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const metrics = [];

    for (let i = args.days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const date = new Date(dayStart).toISOString().split("T")[0];

      // Get calls for this day
      const calls = await ctx.db.query("communication_logs")
        .filter(q => q.eq(q.field("type"), "call"))
        .filter(q => q.gte(q.field("createdAt"), dayStart))
        .filter(q => q.lt(q.field("createdAt"), dayEnd))
        .collect();

      // Get payments for this day
      const payments = await ctx.db.query("payment_verifications")
        .filter(q => q.eq(q.field("status"), "approved"))
        .filter(q => q.gte(q.field("verifiedAt"), dayStart))
        .filter(q => q.lt(q.field("verifiedAt"), dayEnd))
        .collect();

      const minutes = calls.reduce((sum, call) => sum + ((call.metadata?.duration_seconds || 0) / 60), 0);
      const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const cost = minutes * TOTAL_COST_PER_MINUTE;
      const conversionRate = calls.length > 0 ? (payments.length / calls.length) * 100 : 0;

      metrics.push({
        date,
        calls: calls.length,
        minutes: Math.round(minutes * 100) / 100,
        revenue,
        cost: Math.round(cost * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    }

    return metrics;
  },
});

/**
 * Update ROI settings
 */
export const updateSettings = mutation({
  args: {
    costPerMinute: v.optional(v.number()),
    deepgramCost: v.optional(v.number()),
    livekitCost: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const updates: Record<string, any> = {};
    
    if (args.deepgramCost !== undefined) {
      updates.VOICE_DEEPGRAM_COST = args.deepgramCost;
    }
    if (args.livekitCost !== undefined) {
      updates.VOICE_LIVEKIT_COST = args.livekitCost;
    }

    for (const [key, value] of Object.entries(updates)) {
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", key))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", { key, value, updatedAt: Date.now() });
      }
    }

    return { success: true };
  },
});

/**
 * Generate ROI report
 */
export const generateReport = mutation({
  args: { 
    timeRange: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("quarter"))
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // In production, this would generate a PDF/CSV report
    // For now, return the data
    const stats = await ctx.runQuery(api.voice_roi.getStats, { timeRange: args.timeRange });
    const metrics = await ctx.runQuery(api.voice_roi.getDailyMetrics, { 
      days: args.timeRange === "day" ? 1 : args.timeRange === "week" ? 7 : args.timeRange === "month" ? 30 : 90 
    });

    return {
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        timeRange: args.timeRange,
        summary: stats,
        dailyMetrics: metrics,
      },
      message: "Report generated successfully",
    };
  },
});
