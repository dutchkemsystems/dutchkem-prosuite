import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AI MODEL USAGE ANALYTICS
// Track model usage, performance, success rates, task distribution
// ═══════════════════════════════════════════════════════════════════

// ─── LOG USAGE (called by AI router after each request) ───

export const logUsage = internalMutation({
  args: {
    modelName: v.string(),
    taskType: v.string(),
    input: v.string(),
    agentId: v.optional(v.string()),
    success: v.boolean(),
    responseTimeMs: v.number(),
    errorMessage: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ai_model_usage", {
      modelName: args.modelName,
      taskType: args.taskType,
      input: args.input.substring(0, 200),
      agentId: args.agentId || "",
      success: args.success,
      responseTimeMs: args.responseTimeMs,
      errorMessage: args.errorMessage || "",
      tokenCount: args.tokenCount || 0,
      timestamp: Date.now(),
    });
  },
});

// Public wrapper for testing
export const logUsagePublic = mutation({
  args: {
    modelName: v.string(),
    taskType: v.string(),
    input: v.string(),
    agentId: v.optional(v.string()),
    success: v.boolean(),
    responseTimeMs: v.number(),
    errorMessage: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ai_model_usage", {
      modelName: args.modelName,
      taskType: args.taskType,
      input: args.input.substring(0, 200),
      agentId: args.agentId || "",
      success: args.success,
      responseTimeMs: args.responseTimeMs,
      errorMessage: args.errorMessage || "",
      tokenCount: args.tokenCount || 0,
      timestamp: Date.now(),
    });
  },
});

// ─── OVERVIEW STATS ───

export const getOverview = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_usage").take(500);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    const total = all.length;
    const successful = all.filter((u) => u.success).length;
    const failed = all.filter((u) => !u.success).length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : "0";

    const lastHour = all.filter((u) => now - u.timestamp < oneHour).length;
    const lastDay = all.filter((u) => now - u.timestamp < oneDay).length;
    const lastWeek = all.filter((u) => now - u.timestamp < oneWeek).length;

    const avgResponseTime = total > 0
      ? Math.round(all.reduce((sum, u) => sum + u.responseTimeMs, 0) / total)
      : 0;

    const totalTokens = all.reduce((sum, u) => sum + (u.tokenCount || 0), 0);

    // By model
    const byModel: Record<string, { count: number; success: number; failed: number; avgTime: number; tokens: number }> = {};
    for (const u of all) {
      if (!byModel[u.modelName]) byModel[u.modelName] = { count: 0, success: 0, failed: 0, avgTime: 0, tokens: 0 };
      byModel[u.modelName].count++;
      if (u.success) byModel[u.modelName].success++;
      else byModel[u.modelName].failed++;
      byModel[u.modelName].avgTime += u.responseTimeMs;
      byModel[u.modelName].tokens += u.tokenCount || 0;
    }
    for (const key of Object.keys(byModel)) {
      byModel[key].avgTime = Math.round(byModel[key].avgTime / byModel[key].count);
    }

    // By task type
    const byTask: Record<string, { count: number; success: number; failed: number }> = {};
    for (const u of all) {
      if (!byTask[u.taskType]) byTask[u.taskType] = { count: 0, success: 0, failed: 0 };
      byTask[u.taskType].count++;
      if (u.success) byTask[u.taskType].success++;
      else byTask[u.taskType].failed++;
    }

    // Hourly trend (last 24 hours)
    const hourlyTrend: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      const hourStart = now - (24 - i) * oneHour;
      const hourEnd = hourStart + oneHour;
      const hourKey = new Date(hourStart).getHours().toString().padStart(2, "0") + ":00";
      hourlyTrend[hourKey] = all.filter((u) => u.timestamp >= hourStart && u.timestamp < hourEnd).length;
    }

    // Recent errors
    const recentErrors = all
      .filter((u) => !u.success && u.errorMessage)
      .slice(0, 10)
      .map((u) => ({
        model: u.modelName,
        task: u.taskType,
        error: u.errorMessage,
        time: new Date(u.timestamp).toLocaleString(),
      }));

    return {
      total,
      successful,
      failed,
      successRate,
      lastHour,
      lastDay,
      lastWeek,
      avgResponseTime,
      totalTokens,
      byModel,
      byTask,
      hourlyTrend,
      recentErrors,
    };
  },
});

// ─── MODEL PERFORMANCE ───

export const getModelPerformance = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_usage").take(500);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Dynamic model detection from usage data
    const allModels = [...new Set(all.map(u => u.modelName))];
    const models = allModels.length > 0 ? allModels : ["groq", "openrouter", "aiml", "mimo", "nvidia"];
    const results = [];

    for (const model of models) {
      const modelUsage = all.filter((u) => u.modelName === model);
      const dayUsage = modelUsage.filter((u) => now - u.timestamp < oneDay);

      const total = modelUsage.length;
      const dayTotal = dayUsage.length;
      const success = modelUsage.filter((u) => u.success).length;
      const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "0";
      const avgResponseTime = total > 0
        ? Math.round(modelUsage.reduce((sum, u) => sum + u.responseTimeMs, 0) / total)
        : 0;
      const totalTokens = modelUsage.reduce((sum, u) => sum + (u.tokenCount || 0), 0);

      // P95 response time
      const sorted = modelUsage.map((u) => u.responseTimeMs).sort((a, b) => a - b);
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

      // Error rate by task
      const errorsByTask: Record<string, number> = {};
      modelUsage.filter((u) => !u.success).forEach((u) => {
        errorsByTask[u.taskType] = (errorsByTask[u.taskType] || 0) + 1;
      });

      results.push({
        model,
        total,
        dayTotal,
        success,
        failed: total - success,
        successRate,
        avgResponseTime,
        p95ResponseTime: p95,
        totalTokens,
        errorsByTask,
      });
    }

    return results;
  },
});

// ─── A8 AGENT PERFORMANCE ───

export const getA8Performance = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_usage").take(500);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Filter for A8 agent (video tasks)
    const a8Usage = all.filter((u) => u.agentId === "A8" || u.taskType === "video");
    const a8Day = a8Usage.filter((u) => now - u.timestamp < oneDay);

    // Video productions
    const videoProductions = await ctx.db.query("video_productions").take(100);
    const completedVideos = videoProductions.filter((v) => v.status === "completed");
    const failedVideos = videoProductions.filter((v) => v.status === "failed");
    const todayVideos = videoProductions.filter((v) => now - v.createdAt < oneDay);

    // Model usage for A8
    const byModel: Record<string, { count: number; success: number; avgTime: number }> = {};
    for (const u of a8Usage) {
      if (!byModel[u.modelName]) byModel[u.modelName] = { count: 0, success: 0, avgTime: 0 };
      byModel[u.modelName].count++;
      if (u.success) byModel[u.modelName].success++;
      byModel[u.modelName].avgTime += u.responseTimeMs;
    }
    for (const key of Object.keys(byModel)) {
      byModel[key].avgTime = Math.round(byModel[key].avgTime / byModel[key].count);
    }

    const totalA8 = a8Usage.length;
    const successA8 = a8Usage.filter((u) => u.success).length;
    const successRate = totalA8 > 0 ? ((successA8 / totalA8) * 100).toFixed(1) : "0";
    const avgResponseTime = totalA8 > 0
      ? Math.round(a8Usage.reduce((sum, u) => sum + u.responseTimeMs, 0) / totalA8)
      : 0;

    return {
      agent: "A8 - MediaStudio Pro",
      totalRequests: totalA8,
      dayRequests: a8Day.length,
      successRate,
      avgResponseTime,
      videoStats: {
        totalProduced: videoProductions.length,
        completed: completedVideos.length,
        failed: failedVideos.length,
        todayProduced: todayVideos.length,
        completionRate: videoProductions.length > 0
          ? ((completedVideos.length / videoProductions.length) * 100).toFixed(1)
          : "0",
      },
      models: byModel,
      capabilities: ["video", "animation", "design", "audio", "voiceover"],
      qualityPresets: ["draft (480p)", "standard (720p)", "hd (1080p)", "4k (2160p)"],
    };
  },
});

// ─── TASK DISTRIBUTION ───

export const getTaskDistribution = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_usage").take(500);
    const tasks: Record<string, { count: number; byModel: Record<string, number>; avgTime: number; successRate: string }> = {};

    for (const u of all) {
      if (!tasks[u.taskType]) {
        tasks[u.taskType] = { count: 0, byModel: {}, avgTime: 0, successRate: "0" };
      }
      tasks[u.taskType].count++;
      tasks[u.taskType].byModel[u.modelName] = (tasks[u.taskType].byModel[u.modelName] || 0) + 1;
      tasks[u.taskType].avgTime += u.responseTimeMs;
    }

    for (const key of Object.keys(tasks)) {
      const t = tasks[key];
      const successCount = all.filter((u) => u.taskType === key && u.success).length;
      t.avgTime = Math.round(t.avgTime / t.count);
      t.successRate = t.count > 0 ? ((successCount / t.count) * 100).toFixed(1) : "0";
    }

    return tasks;
  },
});

// ─── RECENT USAGE ───

export const getRecentUsage = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ai_model_usage")
      .order("desc")
      .take(args.limit || 50);
  },
});

// ─── MODEL REVENUE ANALYTICS ───

const MODEL_REVENUE_CONFIG: Record<string, { costPerToken: number; revenuePerRequest: number }> = {
  groq: { costPerToken: 0.0000006, revenuePerRequest: 0.5 },
  openrouter: { costPerToken: 0.0000003, revenuePerRequest: 0.3 },
  aiml: { costPerToken: 0.000001, revenuePerRequest: 1.0 },
  mimo: { costPerToken: 0.0000008, revenuePerRequest: 0.8 },
  nvidia: { costPerToken: 0.0000015, revenuePerRequest: 1.5 },
};

export const getModelRevenue = query({
  args: {
    period: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    )),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const period = args.period || "daily";
    const all = await ctx.db.query("ai_model_usage").take(500);
    const now = Date.now();

    const periodMs: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };
    const cutoff = now - (periodMs[period] || periodMs.daily);

    const periodUsage = all.filter((u) => u.timestamp >= cutoff);
    
    // Dynamic model detection from usage data
    const allModels = [...new Set(periodUsage.map(u => u.modelName))];
    const models = allModels.length > 0 ? allModels : ["groq", "openrouter", "aiml", "mimo", "nvidia"];

    const byModel: Record<string, {
      totalRequests: number;
      totalTokens: number;
      estimatedRevenue: number;
      avgRevenuePerRequest: number;
      successRate: string;
    }> = {};

    let grandTotalRevenue = 0;
    let grandTotalRequests = 0;

    for (const model of models) {
      const modelUsage = periodUsage.filter((u) => u.modelName === model);
      const totalRequests = modelUsage.length;
      const totalTokens = modelUsage.reduce((sum, u) => sum + (u.tokenCount || 0), 0);
      const config = MODEL_REVENUE_CONFIG[model] || { costPerToken: 0.000001, revenuePerRequest: 0.5 };

      const tokenRevenue = totalTokens * config.costPerToken;
      const requestRevenue = totalRequests * config.revenuePerRequest;
      const estimatedRevenue = Math.round((tokenRevenue + requestRevenue) * 100) / 100;
      const avgRevenuePerRequest = totalRequests > 0 ? Math.round((estimatedRevenue / totalRequests) * 100) / 100 : 0;

      const successCount = modelUsage.filter((u) => u.success).length;
      const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : "0";

      byModel[model] = {
        totalRequests,
        totalTokens,
        estimatedRevenue,
        avgRevenuePerRequest,
        successRate,
      };

      grandTotalRevenue += estimatedRevenue;
      grandTotalRequests += totalRequests;
    }

    const totalTokens = periodUsage.reduce((sum, u) => sum + (u.tokenCount || 0), 0);

    return {
      period,
      periodLabel: `${period.charAt(0).toUpperCase() + period.slice(1)}`,
      grandTotalRevenue: Math.round(grandTotalRevenue * 100) / 100,
      grandTotalRequests,
      totalTokens,
      avgRevenuePerRequest: grandTotalRequests > 0
        ? Math.round((grandTotalRevenue / grandTotalRequests) * 100) / 100
        : 0,
      byModel,
    };
  },
});

// ─── CLEANUP (keep last 30 days) ───

export const cleanupOldUsage = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("ai_model_usage")
      .filter((q) => q.lt(q.field("timestamp"), thirtyDaysAgo))
      .take(100);

    for (const doc of old) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: old.length };
  },
});
