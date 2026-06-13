import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Get or create auto-scaling config for an org */
export const getScalingConfig = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const configs = await ctx.db.query("enterprise_scaling_config")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return configs;
  },
});

/** Create or update scaling config */
export const upsertScalingConfig = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    configType: v.union(v.literal("auto_scaling"), v.literal("cdn"), v.literal("redis"), v.literal("multi_region")),
    settings: v.any(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_scaling_config")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("configType"), args.configType))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { settings: args.settings, enabled: args.enabled, updatedAt: now });
      return { success: true, updated: true };
    }

    await ctx.db.insert("enterprise_scaling_config", {
      orgId: args.orgId,
      companyId: args.companyId,
      configType: args.configType,
      settings: args.settings,
      enabled: args.enabled,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, created: true };
  },
});

/** Get scaling dashboard stats */
export const getScalingDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const configs = await ctx.db.query("enterprise_scaling_config").collect();
    const logs = await ctx.db.query("enterprise_scaling_logs").order("desc").take(20);
    const metrics = await ctx.db.query("enterprise_monitoring_metrics").order("desc").take(100);
    const alerts = await ctx.db.query("enterprise_monitoring_alerts")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .take(10);

    const autoScaling = configs.find((c: any) => c.configType === "auto_scaling");
    const cdn = configs.find((c: any) => c.configType === "cdn");
    const redis = configs.find((c: any) => c.configType === "redis");
    const multiRegion = configs.find((c: any) => c.configType === "multi_region");

    const latestCpu = metrics.find((m: any) => m.metricType === "cpu");
    const latestMemory = metrics.find((m: any) => m.metricType === "memory");
    const latestRequests = metrics.find((m: any) => m.metricType === "requests");
    const latestLatency = metrics.find((m: any) => m.metricType === "latency");

    return {
      configs: { autoScaling, cdn, redis, multiRegion },
      currentMetrics: {
        cpu: latestCpu?.value ?? 45,
        memory: latestMemory?.value ?? 62,
        requests: latestRequests?.value ?? 850,
        latency: latestLatency?.value ?? 120,
      },
      scalingLogs: logs,
      activeAlerts: alerts,
      totalConfigs: configs.length,
      enabledConfigs: configs.filter((c: any) => c.enabled).length,
    };
  },
});

/** Log a scaling event */
export const logScalingEvent = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    action: v.string(),
    instanceCount: v.optional(v.number()),
    metrics: v.optional(v.any()),
    reason: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("enterprise_scaling_logs", {
      ...args,
      timestamp: Date.now(),
    });
    return { success: true, logId: recordId };
  },
});

/** Record a monitoring metric */
export const recordMetric = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    metricType: v.union(v.literal("cpu"), v.literal("memory"), v.literal("requests"), v.literal("latency"), v.literal("errors"), v.literal("uptime")),
    value: v.number(),
    unit: v.string(),
    tags: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("enterprise_monitoring_metrics", {
      ...args,
      timestamp: Date.now(),
    });
    return { success: true, metricId: recordId };
  },
});

/** Create a monitoring alert */
export const createAlert = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    title: v.string(),
    message: v.string(),
    metric: v.optional(v.string()),
    threshold: v.optional(v.number()),
    currentValue: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("enterprise_monitoring_alerts", {
      ...args,
      status: "active",
      timestamp: Date.now(),
    });
    return { success: true, alertId: recordId };
  },
});

/** Acknowledge or resolve an alert */
export const resolveAlert = mutation({
  args: {
    alertId: v.id("enterprise_monitoring_alerts"),
    status: v.union(v.literal("acknowledged"), v.literal("resolved")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const patch: any = { status: args.status };
    if (args.status === "resolved") patch.resolvedAt = Date.now();
    await ctx.db.patch(args.alertId, patch);
    return { success: true };
  },
});

/** Seed sample monitoring data for demo */
export const seedSampleMetrics = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const types = ["cpu", "memory", "requests", "latency", "errors", "uptime"] as const;
    const units = ["%", "%", "req/s", "ms", "count", "%"];
    const baselines = [45, 62, 850, 120, 2, 99.999];

    let count = 0;
    for (let i = 0; i < 30; i++) {
      for (let t = 0; t < types.length; t++) {
        const variance = (Math.random() - 0.5) * 20;
        await ctx.db.insert("enterprise_monitoring_metrics", {
          metricType: types[t],
          value: Math.max(0, baselines[t] + variance),
          unit: units[t],
          timestamp: now - (30 - i) * 60000,
        });
        count++;
      }
    }

    await ctx.db.insert("enterprise_monitoring_alerts", {
      severity: "warning",
      title: "High CPU Usage Detected",
      message: "CPU usage exceeded 75% threshold on region us-east-1",
      metric: "cpu",
      threshold: 70,
      currentValue: 78.5,
      status: "active",
      timestamp: now,
    });

    await ctx.db.insert("enterprise_monitoring_alerts", {
      severity: "info",
      title: "Auto-Scaling Triggered",
      message: "Instances scaled from 2 to 3 due to increased request volume",
      status: "active",
      timestamp: now - 300000,
    });

    return { success: true, metricsSeeded: count, alertsCreated: 2 };
  },
});
