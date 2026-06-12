import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// USAGE ALERTS SERVICE
// Notify admin when API usage approaches free tier limits
// Thresholds: 80%, 90%, 95%, 100%
// ═══════════════════════════════════════════════════════════════════

// Free tier limits per service
const FREE_TIER_LIMITS: Record<string, { displayName: string; limit: number; unit: string }> = {
  deepgram: { displayName: "Deepgram STT/TTS", limit: 12000, unit: "minutes/year" }, // $200 free credit
  livekit: { displayName: "LiveKit Cloud", limit: 1000, unit: "minutes/month" },
  nvidia: { displayName: "NVIDIA NIM AI", limit: 1000, unit: "requests/month" },
  aws_ses: { displayName: "AWS SES Email", limit: 62000, unit: "emails/month" },
  aws_sns: { displayName: "AWS SNS SMS", limit: 100, unit: "SMS/month (free tier)" },
  resend: { displayName: "Resend Email", limit: 3000, unit: "emails/month" },
  kora: { displayName: "Kora Pay", limit: 100, unit: "transactions/month" },
};

const THRESHOLDS = [80, 90, 95, 100] as const;

/**
 * Check all service usage against thresholds and send alerts
 */
export const checkUsageThresholds = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const results: Array<any> = [];

    for (const [serviceName, config] of Object.entries(FREE_TIER_LIMITS)) {
      const usage: number = await ctx.runQuery(internal.usage_alerts.getServiceUsage, { serviceName });
      const percentage = (usage / config.limit) * 100;

      // Find highest threshold exceeded
      let highestThreshold: number | null = null;
      for (const threshold of THRESHOLDS) {
        if (percentage >= threshold) {
          highestThreshold = threshold;
        }
      }

      if (highestThreshold !== null) {
        // Check if we already sent this threshold alert
        const existing: any = await ctx.runQuery(internal.usage_alerts.getExistingAlert, {
          serviceName,
          threshold: String(highestThreshold) as any,
        });

        if (!existing || !existing.alertSent) {
          // Send alert
          await ctx.runMutation(internal.usage_alerts.createOrUpdateAlert, {
            serviceName,
            serviceDisplayName: config.displayName,
            freeTierLimit: config.limit,
            currentUsage: usage,
            usagePercentage: percentage,
            threshold: String(highestThreshold) as any,
          });

          // Send notification to admin
          await ctx.runMutation(internal.usage_alerts.sendAdminAlert, {
            serviceName,
            serviceDisplayName: config.displayName,
            percentage,
            threshold: highestThreshold,
            usage,
            limit: config.limit,
            unit: config.unit,
          });

          results.push({
            service: serviceName,
            threshold: highestThreshold,
            percentage: percentage.toFixed(1),
            alertSent: true,
          });
        }
      }
    }

    return { success: true, alertsSent: results.length, results };
  },
});

/**
 * Get current usage for a service
 */
export const getServiceUsage = internalQuery({
  args: { serviceName: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", `API_USE_${args.serviceName.toUpperCase()}`))
      .first();
    return (log?.value as number) || 0;
  },
});

/**
 * Get existing alert for a service + threshold
 */
export const getExistingAlert = internalQuery({
  args: { serviceName: v.string(), threshold: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("usage_alerts")
      .withIndex("by_service", (q) => q.eq("serviceName", args.serviceName))
      .filter((q) => q.eq(q.field("threshold"), args.threshold))
      .first();
  },
});

/**
 * Create or update a usage alert
 */
export const createOrUpdateAlert = internalMutation({
  args: {
    serviceName: v.string(),
    serviceDisplayName: v.string(),
    freeTierLimit: v.number(),
    currentUsage: v.number(),
    usagePercentage: v.number(),
    threshold: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("usage_alerts")
      .withIndex("by_service", (q) => q.eq("serviceName", args.serviceName))
      .filter((q) => q.eq(q.field("threshold"), args.threshold))
      .first();

    if (existing) {
      await ctx.db.patch("usage_alerts", existing._id, {
        currentUsage: args.currentUsage,
        usagePercentage: args.usagePercentage,
        lastChecked: Date.now(),
      });
    } else {
      await ctx.db.insert("usage_alerts", {
        serviceName: args.serviceName,
        serviceDisplayName: args.serviceDisplayName,
        freeTierLimit: args.freeTierLimit,
        currentUsage: args.currentUsage,
        usagePercentage: args.usagePercentage,
        threshold: args.threshold as any,
        alertSent: true,
        alertSentAt: Date.now(),
        acknowledged: false,
        lastChecked: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Send admin alert notification
 */
export const sendAdminAlert = internalMutation({
  args: {
    serviceName: v.string(),
    serviceDisplayName: v.string(),
    percentage: v.number(),
    threshold: v.number(),
    usage: v.number(),
    limit: v.number(),
    unit: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const severity =
      args.threshold >= 100 ? "critical" : args.threshold >= 95 ? "high" : args.threshold >= 90 ? "medium" : "warning";

    await ctx.db.insert("notifications", {
      userId: undefined, // broadcast to all admins
      title: `⚠️ ${args.serviceDisplayName} - ${args.threshold}% Usage Reached`,
      message: `${args.serviceDisplayName} usage is at ${args.percentage.toFixed(1)}% of free tier (${args.usage.toFixed(0)}/${args.limit} ${args.unit}). Severity: ${severity.toUpperCase()}.`,
      type: "usage_alert",
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Get all active usage alerts
 */
export const getActiveAlerts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("usage_alerts")
      .withIndex("by_alert_sent", (q) => q.eq("alertSent", true))
      .collect();
    return alerts
      .filter((a) => !a.acknowledged)
      .sort((a, b) => b.alertSentAt! - a.alertSentAt!);
  },
});

/**
 * Get usage summary for all services
 */
export const getUsageSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const summary: Array<any> = [];

    for (const [serviceName, config] of Object.entries(FREE_TIER_LIMITS)) {
      const log = await ctx.db
        .query("system_config")
        .withIndex("by_key", (q) => q.eq("key", `API_USE_${serviceName.toUpperCase()}`))
        .first();
      const usage = (log?.value as number) || 0;
      const percentage = (usage / config.limit) * 100;

      const alerts = await ctx.db
        .query("usage_alerts")
        .withIndex("by_service", (q) => q.eq("serviceName", serviceName))
        .collect();

      summary.push({
        service: serviceName,
        displayName: config.displayName,
        usage,
        limit: config.limit,
        unit: config.unit,
        percentage: Math.min(100, percentage),
        status: percentage >= 100 ? "exceeded" : percentage >= 95 ? "critical" : percentage >= 80 ? "warning" : "ok",
        alertsSent: alerts.filter((a) => a.alertSent).map((a) => a.threshold),
        acknowledgedAlerts: alerts.filter((a) => a.acknowledged).length,
      });
    }

    return summary.sort((a, b) => b.percentage - a.percentage);
  },
});

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = mutation({
  args: { alertId: v.id("usage_alerts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch("usage_alerts", args.alertId, {
      acknowledged: true,
      acknowledgedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Acknowledge all alerts for a service
 */
export const acknowledgeAllForService = mutation({
  args: { serviceName: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("usage_alerts")
      .withIndex("by_service", (q) => q.eq("serviceName", args.serviceName))
      .filter((q) => q.eq(q.field("acknowledged"), false))
      .collect();

    for (const alert of alerts) {
      await ctx.db.patch("usage_alerts", alert._id, {
        acknowledged: true,
        acknowledgedAt: Date.now(),
      });
    }
    return { success: true, count: alerts.length };
  },
});

/**
 * Reset monthly usage counters
 */
export const resetMonthlyCounters = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allConfigs = await ctx.db.query("system_config").collect();
    const usageLogs = allConfigs.filter((c) => c.key.startsWith("API_USE_"));

    for (const log of usageLogs) {
      await ctx.db.patch("system_config", log._id, { value: 0, updatedAt: Date.now() });
    }

    // Reset alerts
    const alerts = await ctx.db.query("usage_alerts").collect();
    for (const alert of alerts) {
      await ctx.db.patch("usage_alerts", alert._id, {
        alertSent: false,
        acknowledged: false,
        acknowledgedAt: undefined,
        alertSentAt: undefined,
        currentUsage: 0,
        usagePercentage: 0,
        resetAt: Date.now(),
      });
    }
    return null;
  },
});
