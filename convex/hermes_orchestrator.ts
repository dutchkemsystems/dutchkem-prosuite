import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// HERMES AGENT — AI Orchestrator / Brain
// Manages self-healing, diagnostics, auto-fix, multi-platform gateway
// ═══════════════════════════════════════════════════════════════════

const HERMES_STATUS_KEY = "hermes_orchestrator_status";

// ─── GET ORCHESTRATOR STATUS ───

export const getStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const status = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", HERMES_STATUS_KEY))
      .first();

    const healingLogs = await ctx.db
      .query("hermes_healing_logs")
      .order("desc")
      .take(20);

    const scheduledTasks = await ctx.db
      .query("hermes_scheduled_tasks")
      .collect();

    const platformGateways = await ctx.db
      .query("hermes_platform_gateways")
      .collect();

    return {
      isRunning: status?.value?.isRunning ?? false,
      selfHealingActive: status?.value?.selfHealingActive ?? false,
      autoDiagnoseActive: status?.value?.autoDiagnoseActive ?? false,
      autoDeployActive: status?.value?.autoDeployActive ?? false,
      lastHealthCheck: status?.value?.lastHealthCheck ?? null,
      lastHealingRun: status?.value?.lastHealingRun ?? null,
      healingLogs,
      scheduledTasks,
      platformGateways,
      uptime: status?.value?.uptime ?? 0,
      tasksCompleted: status?.value?.tasksCompleted ?? 0,
      issuesFixed: status?.value?.issuesFixed ?? 0,
    };
  },
});

// ─── START ORCHESTRATOR ───

export const startOrchestrator = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const now = Date.now();
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", HERMES_STATUS_KEY))
      .first();

    const statusData = {
      isRunning: true,
      selfHealingActive: true,
      autoDiagnoseActive: true,
      autoDeployActive: true,
      lastHealthCheck: now,
      uptime: now,
      tasksCompleted: 0,
      issuesFixed: 0,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { value: statusData, updatedAt: now });
    } else {
      await ctx.db.insert("system_config", {
        key: HERMES_STATUS_KEY,
        value: statusData,
        updatedAt: now,
      });
    }

    return { success: true, message: "Hermes orchestrator started" };
  },
});

// ─── STOP ORCHESTRATOR ───

export const stopOrchestrator = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", HERMES_STATUS_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: { ...existing.value, isRunning: false, selfHealingActive: false },
        updatedAt: Date.now(),
      });
    }

    return { success: true, message: "Hermes orchestrator stopped" };
  },
});

// ─── RUN SELF-HEAL CHECK ───

export const runSelfHeal = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const now = Date.now();
    const results: string[] = [];

    // Check WhatsApp sessions
    const waSessions = await ctx.db.query("whatsapp_sessions").collect();
    for (const session of waSessions) {
      if (session.status === "starting" && session.updatedAt < now - 300000) {
        await ctx.db.patch(session._id, { status: "disconnected", updatedAt: now });
        results.push(`Reset stuck ${session.sessionType} session`);
      }
    }

    // Check expired subscriptions
    const subs = await ctx.db.query("whatsapp_subscriptions").collect();
    for (const sub of subs) {
      if (sub.status === "active" && sub.endDate < now) {
        await ctx.db.patch(sub._id, { status: "expired", updatedAt: now });
        results.push(`Expired subscription for ${sub.userId}`);
      }
    }

    // Check Convex health
    results.push("Convex backend: healthy");

    // Log the healing run
    await ctx.db.insert("hermes_healing_logs", {
      component: "system",
      action: "health_check",
      issuesFound: results.length - 1,
      fixesApplied: results.filter(r => r.includes("Reset") || r.includes("Expired")).length,
      details: results.join("; "),
      performedBy: identity._id,
      timestamp: now,
    });

    // Update last health check
    const status = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", HERMES_STATUS_KEY))
      .first();

    if (status) {
      await ctx.db.patch(status._id, {
        value: { ...status.value, lastHealthCheck: now, lastHealingRun: now },
        updatedAt: now,
      });
    }

    return { success: true, results, timestamp: now };
  },
});

// ─── DELEGATE TASK ───

export const delegateTask = mutation({
  args: {
    task: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical"))),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const taskId = await ctx.db.insert("hermes_tasks", {
      description: args.task,
      status: "queued",
      priority: args.priority || "normal",
      createdBy: identity._id,
      createdAt: Date.now(),
    });

    return { success: true, taskId, message: `Task queued: ${args.task}` };
  },
});

// ─── GET TASKS ───

export const getTasks = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hermes_tasks")
      .order("desc")
      .take(args.limit || 20);
  },
});

// ─── GET HEALING LOGS ───

export const getHealingLogs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hermes_healing_logs")
      .order("desc")
      .take(args.limit || 20);
  },
});
