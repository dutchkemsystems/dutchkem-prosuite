import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE MONITOR — Track function execution, errors, usage
// ═══════════════════════════════════════════════════════════════════

// ─── LOG FUNCTION CALL ───

export const logFunctionCall = internalMutation({
  args: {
    functionName: v.string(),
    module: v.string(),
    executionTimeMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    argsSize: v.optional(v.number()),
    resultSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const hour = new Date(now).toISOString().slice(0, 13); // YYYY-MM-DDTHH

    // Upsert hourly aggregate
    const existing = await ctx.db.query("performance_metrics")
      .withIndex("by_function_hour", (q) => q.eq("functionName", args.functionName).eq("hour", hour))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalCalls: existing.totalCalls + 1,
        successCalls: existing.successCalls + (args.success ? 1 : 0),
        errorCalls: existing.errorCalls + (args.success ? 0 : 1),
        totalExecutionTimeMs: existing.totalExecutionTimeMs + args.executionTimeMs,
        avgExecutionTimeMs: Math.round((existing.totalExecutionTimeMs + args.executionTimeMs) / (existing.totalCalls + 1)),
        lastError: args.error || existing.lastError,
        lastCallAt: now,
      });
    } else {
      await ctx.db.insert("performance_metrics", {
        functionName: args.functionName,
        module: args.module,
        hour,
        totalCalls: 1,
        successCalls: args.success ? 1 : 0,
        errorCalls: args.success ? 0 : 1,
        totalExecutionTimeMs: args.executionTimeMs,
        avgExecutionTimeMs: args.executionTimeMs,
        maxExecutionTimeMs: args.executionTimeMs,
        lastError: args.error,
        lastCallAt: now,
        createdAt: now,
      });
    }

    // Log individual call for debugging (keep last 1000)
    await ctx.db.insert("performance_logs", {
      functionName: args.functionName,
      module: args.module,
      executionTimeMs: args.executionTimeMs,
      success: args.success,
      error: args.error,
      timestamp: now,
    });

    return null;
  },
});

// ─── GET FUNCTION PERFORMANCE ───

export const getFunctionPerformance = query({
  args: { functionName: v.string(), hours: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().slice(0, 13);

    const metrics = await ctx.db.query("performance_metrics")
      .withIndex("by_function_hour", (q) => q.eq("functionName", args.functionName))
      .collect();

    const recent = metrics.filter(m => m.hour >= cutoff);

    const totalCalls = recent.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = recent.reduce((sum, m) => sum + m.errorCalls, 0);
    const avgExecutionTime = recent.length > 0
      ? Math.round(recent.reduce((sum, m) => sum + m.avgExecutionTimeMs, 0) / recent.length)
      : 0;

    return {
      functionName: args.functionName,
      period: `${hours}h`,
      totalCalls,
      totalErrors,
      errorRate: totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(2) + "%" : "0%",
      avgExecutionTimeMs: avgExecutionTime,
      hourlyBreakdown: recent.map(m => ({
        hour: m.hour,
        calls: m.totalCalls,
        errors: m.errorCalls,
        avgTime: m.avgExecutionTimeMs,
      })),
    };
  },
});

// ─── GET MODULE PERFORMANCE ───

export const getModulePerformance = query({
  args: { module: v.string(), hours: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().slice(0, 13);

    const metrics = await ctx.db.query("performance_metrics").collect();
    const moduleMetrics = metrics.filter(m => m.module === args.module && m.hour >= cutoff);

    const byFunction: Record<string, { calls: number; errors: number; avgTime: number }> = {};
    for (const m of moduleMetrics) {
      if (!byFunction[m.functionName]) {
        byFunction[m.functionName] = { calls: 0, errors: 0, avgTime: 0 };
      }
      byFunction[m.functionName].calls += m.totalCalls;
      byFunction[m.functionName].errors += m.errorCalls;
      byFunction[m.functionName].avgTime = m.avgExecutionTimeMs;
    }

    const totalCalls = moduleMetrics.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = moduleMetrics.reduce((sum, m) => sum + m.errorCalls, 0);

    return {
      module: args.module,
      period: `${hours}h`,
      totalCalls,
      totalErrors,
      errorRate: totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(2) + "%" : "0%",
      functions: Object.entries(byFunction)
        .sort(([, a], [, b]) => b.calls - a.calls)
        .map(([name, data]) => ({ name, ...data })),
    };
  },
});

// ─── GET SLOWEST FUNCTIONS ───

export const getSlowestFunctions = query({
  args: { limit: v.optional(v.number()), hours: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().slice(0, 13);

    const metrics = await ctx.db.query("performance_metrics").collect();
    const recent = metrics.filter(m => m.hour >= cutoff);

    const byFunction: Record<string, { totalCalls: number; totalTime: number; errors: number; avgTime: number }> = {};
    for (const m of recent) {
      if (!byFunction[m.functionName]) {
        byFunction[m.functionName] = { totalCalls: 0, totalTime: 0, errors: 0, avgTime: 0 };
      }
      byFunction[m.functionName].totalCalls += m.totalCalls;
      byFunction[m.functionName].totalTime += m.totalExecutionTimeMs;
      byFunction[m.functionName].errors += m.errorCalls;
      byFunction[m.functionName].avgTime = m.avgExecutionTimeMs;
    }

    return Object.entries(byFunction)
      .map(([name, data]) => ({
        name,
        avgTimeMs: data.totalCalls > 0 ? Math.round(data.totalTime / data.totalCalls) : 0,
        totalCalls: data.totalCalls,
        errors: data.errors,
      }))
      .sort((a, b) => b.avgTimeMs - a.avgTimeMs)
      .slice(0, args.limit || 20);
  },
});

// ─── GET ERROR SUMMARY ───

export const getErrorSummary = query({
  args: { hours: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const logs = await ctx.db.query("performance_logs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .collect();

    const errors = logs.filter(l => !l.success && l.error);
    const byFunction: Record<string, number> = {};
    for (const e of errors) {
      byFunction[e.functionName] = (byFunction[e.functionName] || 0) + 1;
    }

    return {
      period: `${hours}h`,
      totalErrors: errors.length,
      uniqueErrors: errors.length,
      byFunction: Object.entries(byFunction)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count })),
      recentErrors: errors.slice(-10).map(e => ({
        function: e.functionName,
        error: e.error,
        time: new Date(e.timestamp).toISOString(),
      })),
    };
  },
});

// ─── GET USAGE STATS ───

export const getUsageStats = query({
  args: { hours: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().slice(0, 13);

    const metrics = await ctx.db.query("performance_metrics").collect();
    const recent = metrics.filter(m => m.hour >= cutoff);

    const totalCalls = recent.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = recent.reduce((sum, m) => sum + m.errorCalls, 0);
    const totalExecutionTime = recent.reduce((sum, m) => sum + m.totalExecutionTimeMs, 0);

    const byModule: Record<string, { calls: number; errors: number }> = {};
    for (const m of recent) {
      if (!byModule[m.module]) byModule[m.module] = { calls: 0, errors: 0 };
      byModule[m.module].calls += m.totalCalls;
      byModule[m.module].errors += m.errorCalls;
    }

    const uniqueFunctions = new Set(recent.map(m => m.functionName)).size;

    return {
      period: `${hours}h`,
      totalCalls,
      totalErrors,
      errorRate: totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(2) + "%" : "0%",
      totalExecutionTimeMs: totalExecutionTime,
      avgExecutionTimeMs: totalCalls > 0 ? Math.round(totalExecutionTime / totalCalls) : 0,
      uniqueFunctions,
      byModule: Object.entries(byModule)
        .sort(([, a], [, b]) => b.calls - a.calls)
        .map(([name, data]) => ({ name, calls: data.calls, errors: data.errors })),
    };
  },
});

// ─── GET RECENT LOGS ───

export const getRecentLogs = query({
  args: { functionName: v.optional(v.string()), limit: v.optional(v.number()), errorsOnly: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const functionName = args.functionName;
    const logs = functionName
      ? await ctx.db.query("performance_logs")
          .withIndex("by_function", (iq) => iq.eq("functionName", functionName))
          .order("desc")
          .take(args.limit || 50)
      : await ctx.db.query("performance_logs").order("desc").take(args.limit || 50);

    if (args.errorsOnly) {
      return logs.filter(l => !l.success);
    }

    return logs;
  },
});
