import { mutation, query, internalAction, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Feature 7: Custom Report Builder & Power BI Integration

export const createReport = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    metrics: v.array(v.object({
      type: v.union(v.literal("revenue"), v.literal("subscriptions"), v.literal("agent_usage"), v.literal("users"), v.literal("performance")),
      field: v.string(),
      aggregation: v.union(v.literal("sum"), v.literal("avg"), v.literal("count"), v.literal("min"), v.literal("max")),
    })),
    filters: v.optional(v.array(v.object({
      field: v.string(),
      operator: v.string(),
      value: v.any(),
    }))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      recipients: v.array(v.string()),
      enabled: v.boolean(),
    })),
  },
  returns: v.id("saved_reports"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("saved_reports", {
      ...args,
      lastGenerated: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateReport = mutation({
  args: {
    reportId: v.id("saved_reports"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    metrics: v.optional(v.array(v.object({
      type: v.union(v.literal("revenue"), v.literal("subscriptions"), v.literal("agent_usage"), v.literal("users"), v.literal("performance")),
      field: v.string(),
      aggregation: v.union(v.literal("sum"), v.literal("avg"), v.literal("count"), v.literal("min"), v.literal("max")),
    }))),
    filters: v.optional(v.array(v.object({
      field: v.string(),
      operator: v.string(),
      value: v.any(),
    }))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      recipients: v.array(v.string()),
      enabled: v.boolean(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    await ctx.db.patch(reportId, { ...updates, updatedAt: Date.now() });
    return null;
  },
});

export const deleteReport = mutation({
  args: { reportId: v.id("saved_reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reportId);
    return null;
  },
});

export const getReports = query({
  args: { createdBy: v.optional(v.id("users")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const createdBy = args.createdBy;
    if (createdBy) {
      return await ctx.db
        .query("saved_reports")
        .withIndex("by_creator", (q) => q.eq("createdBy", createdBy))
        .collect();
    }
    return await ctx.db.query("saved_reports").collect();
  },
});

export const generateReport = internalAction({
  args: { reportId: v.id("saved_reports") },
  returns: v.object({
    data: v.any(),
    generatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.reports.getReportById, { reportId: args.reportId });
    if (!report) throw new Error("Report not found");

    const data: any = {};

    for (const metric of report.metrics) {
      switch (metric.type) {
        case "revenue":
          data[metric.field] = await ctx.runQuery(internal.reports.getRevenueMetric, {
            field: metric.field,
            aggregation: metric.aggregation,
          });
          break;
        case "subscriptions":
          data[metric.field] = await ctx.runQuery(internal.reports.getSubscriptionMetric, {
            field: metric.field,
            aggregation: metric.aggregation,
          });
          break;
        case "users":
          data[metric.field] = await ctx.runQuery(internal.reports.getUserMetric, {
            field: metric.field,
            aggregation: metric.aggregation,
          });
          break;
        case "agent_usage":
          data[metric.field] = await ctx.runQuery(internal.reports.getAgentUsageMetric, {
            field: metric.field,
            aggregation: metric.aggregation,
          });
          break;
        case "performance":
          data[metric.field] = await ctx.runQuery(internal.reports.getPerformanceMetric, {
            field: metric.field,
            aggregation: metric.aggregation,
          });
          break;
      }
    }

    // Update last generated time
    await ctx.runMutation(internal.reports.updateLastGenerated, { reportId: args.reportId });

    return { data, generatedAt: Date.now() };
  },
});

// Public wrapper for frontend access
export const triggerGenerateReport = action({
  args: { reportId: v.id("saved_reports") },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const result: any = await ctx.runAction(internal.reports.generateReport, { reportId: args.reportId });
    return result;
  },
});

export const getReportById = internalQuery({
  args: { reportId: v.id("saved_reports") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});

export const updateLastGenerated = internalMutation({
  args: { reportId: v.id("saved_reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { lastGenerated: Date.now() });
    return null;
  },
});

// Metric aggregation functions
export const getRevenueMetric = internalQuery({
  args: { field: v.string(), aggregation: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const payouts = await ctx.db.query("payouts").collect();
    const values = payouts.map(p => p.amount);

    switch (args.aggregation) {
      case "sum": return values.reduce((a, b) => a + b, 0);
      case "avg": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case "count": return values.length;
      case "min": return values.length ? Math.min(...values) : 0;
      case "max": return values.length ? Math.max(...values) : 0;
      default: return 0;
    }
  },
});

export const getSubscriptionMetric = internalQuery({
  args: { field: v.string(), aggregation: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const values = subscriptions.map(s => s.endsAt);

    switch (args.aggregation) {
      case "count": return values.length;
      case "sum": return values.reduce((a, b) => a + b, 0);
      default: return values.length;
    }
  },
});

export const getUserMetric = internalQuery({
  args: { field: v.string(), aggregation: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();

    switch (args.aggregation) {
      case "count": return users.length;
      default: return users.length;
    }
  },
});

export const getAgentUsageMetric = internalQuery({
  args: { field: v.string(), aggregation: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").collect();

    switch (args.aggregation) {
      case "count": return projects.length;
      default: return projects.length;
    }
  },
});

export const getPerformanceMetric = internalQuery({
  args: { field: v.string(), aggregation: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Performance metrics would be calculated from agent_performance
    const perfEntries = await ctx.db.query("agent_performance").collect();
    return perfEntries;
  },
});

// Scheduled report generation
export const processScheduledReports = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const reports = await ctx.runQuery(internal.reports.getScheduledReports);

    for (const report of reports) {
      if (report.schedule?.enabled) {
        const now = new Date();
        let shouldGenerate = false;

        switch (report.schedule.frequency) {
          case "daily":
            shouldGenerate = true; // Would check if it's the right time of day
            break;
          case "weekly":
            shouldGenerate = now.getDay() === 1; // Monday
            break;
          case "monthly":
            shouldGenerate = now.getDate() === 1; // First of month
            break;
        }

        if (shouldGenerate) {
          await ctx.runAction(internal.reports.generateReport, { reportId: report._id });
        }
      }
    }
    return null;
  },
});

export const getScheduledReports = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const reports = await ctx.db.query("saved_reports").collect();
    return reports.filter((r: any) => r.schedule?.enabled);
  },
});

// Export functionality
export const exportReportToCsv = internalAction({
  args: { reportId: v.id("saved_reports") },
  returns: v.string(), // Returns CSV string
  handler: async (ctx, args): Promise<string> => {
    const report: any = await ctx.runQuery(internal.reports.getReportById, { reportId: args.reportId });
    if (!report) throw new Error("Report not found");

    const result: any = await ctx.runAction(internal.reports.generateReport, { reportId: args.reportId });

    // Convert to CSV
    const headers: string[] = report.metrics.map((m: any) => `${m.type}.${m.field}`);
    const rows: string[] = [headers.join(",")];
    rows.push(Object.values(result.data).join(","));

    return rows.join("\n");
  },
});