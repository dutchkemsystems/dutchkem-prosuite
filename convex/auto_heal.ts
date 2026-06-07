import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AUTO-HEAL & SECURITY SYSTEM
// ═══════════════════════════════════════════════════════════════════
// The PowerShell script (fix-advanced.ps1) reports into this module:
//   - runStart()     → mark a new diagnostic run
//   - recordSection() → log a section's status (deps, security, ts, lint, etc.)
//   - recordAlert()   → log a critical alert
//   - recordFix()     → log an applied fix
//   - recordSecret()  → log a detected hardcoded secret
//   - recordHealthCheck() → log an endpoint probe
//   - runComplete()   → mark run finished
//
// The admin UI queries run history, alerts, and health checks.
// Alerts can be dismissed and notified via email/SMS.

const EMAIL_PROVIDERS = {
  resend: "RESEND_API_KEY",
  sendgrid: "SENDGRID_API_KEY",
};

const TERMII_SMS = "TERMII_API_KEY";

// ─── MUTATIONS (called by PowerShell script via httpAction) ───

export const startRun = mutation({
  args: {
    runId: v.string(),
    triggeredBy: v.string(),
    hostInfo: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("auto_heal_runs", {
      runId: args.runId,
      triggeredBy: args.triggeredBy,
      status: "running",
      startedAt: Date.now(),
      sections: [],
      issuesFound: 0,
      issuesFixed: 0,
      convexDeployed: false,
      vercelDeployed: false,
      hostInfo: args.hostInfo,
    });
    return { id, runId: args.runId };
  },
});

export const recordSection = mutation({
  args: {
    runId: v.string(),
    name: v.string(),
    status: v.union(v.literal("ok"), v.literal("warn"), v.literal("error")),
    durationMs: v.optional(v.number()),
    message: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) return;
    const sections = [...run.sections];
    sections.push({
      name: args.name,
      status: args.status,
      durationMs: args.durationMs,
      message: args.message,
      details: args.details,
    });
    await ctx.db.patch(run._id, { sections });
  },
});

export const recordAlert = mutation({
  args: {
    runId: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    category: v.string(),
    title: v.string(),
    message: v.string(),
    source: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    autoFixable: v.boolean(),
    autoFixed: v.boolean(),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
  },
  returns: v.id("auto_heal_alerts"),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) throw new Error(`Run not found: ${args.runId}`);
    const id = await ctx.db.insert("auto_heal_alerts", {
      runId: run._id,
      severity: args.severity,
      category: args.category,
      title: args.title,
      message: args.message,
      source: args.source,
      lineNumber: args.lineNumber,
      autoFixable: args.autoFixable,
      autoFixed: args.autoFixed,
      dismissed: false,
      notifyEmail: args.notifyEmail,
      notifySms: args.notifySms,
      createdAt: Date.now(),
    });
    // Trigger notifications (best-effort)
    if (args.notifyEmail || args.notifySms) {
      await ctx.scheduler.runAfter(0, internal.auto_heal._dispatchNotification, {
        alertId: id,
        severity: args.severity,
        title: args.title,
        message: args.message,
        email: args.notifyEmail,
        sms: args.notifySms,
      });
    }
    return id;
  },
});

export const recordFix = mutation({
  args: {
    runId: v.string(),
    filePath: v.string(),
    fixType: v.string(),
    description: v.string(),
    beforeSnippet: v.optional(v.string()),
    afterSnippet: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    applied: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) return;
    await ctx.db.insert("auto_heal_fixes", {
      runId: run._id,
      filePath: args.filePath,
      fixType: args.fixType,
      description: args.description,
      beforeSnippet: args.beforeSnippet,
      afterSnippet: args.afterSnippet,
      lineNumber: args.lineNumber,
      applied: args.applied,
      appliedAt: Date.now(),
    });
  },
});

export const recordSecret = mutation({
  args: {
    runId: v.string(),
    filePath: v.string(),
    lineNumber: v.number(),
    secretType: v.string(),
    redactedValue: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    recommendedAction: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) return;
    await ctx.db.insert("auto_heal_secrets", {
      runId: run._id,
      filePath: args.filePath,
      lineNumber: args.lineNumber,
      secretType: args.secretType,
      redactedValue: args.redactedValue,
      severity: args.severity,
      recommendedAction: args.recommendedAction,
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

export const recordHealthCheck = mutation({
  args: {
    runId: v.string(),
    endpoint: v.string(),
    url: v.string(),
    method: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    responseCode: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) return;
    await ctx.db.insert("auto_heal_health_checks", {
      runId: run._id,
      endpoint: args.endpoint,
      url: args.url,
      method: args.method,
      status: args.status,
      responseCode: args.responseCode,
      responseTimeMs: args.responseTimeMs,
      error: args.error,
      checkedAt: Date.now(),
    });
  },
});

export const completeRun = mutation({
  args: {
    runId: v.string(),
    status: v.union(v.literal("success"), v.literal("partial"), v.literal("failed")),
    issuesFound: v.number(),
    issuesFixed: v.number(),
    commitSha: v.optional(v.string()),
    convexDeployed: v.boolean(),
    vercelDeployed: v.boolean(),
    summary: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getRunByRunId(ctx, args.runId);
    if (!run) return;
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: args.status,
      completedAt: now,
      durationMs: now - run.startedAt,
      issuesFound: args.issuesFound,
      issuesFixed: args.issuesFixed,
      commitSha: args.commitSha,
      convexDeployed: args.convexDeployed,
      vercelDeployed: args.vercelDeployed,
      summary: args.summary,
    });
  },
});

async function getRunByRunId(ctx: any, runId: string) {
  return await ctx.db
    .query("auto_heal_runs")
    .withIndex("by_run", (q: any) => q.eq("runId", runId))
    .first();
}

// ─── QUERIES (called by admin UI) ───

export const listRuns = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, runs: [] };
    const runs = await ctx.db
      .query("auto_heal_runs")
      .withIndex("by_started")
      .order("desc")
      .take(limit ?? 50);
    return { authError: false, runs };
  },
});

export const getRun = query({
  args: { adminToken: v.optional(v.string()), runId: v.id("auto_heal_runs") },
  returns: v.any(),
  handler: async (ctx, { adminToken, runId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };
    const run = await ctx.db.get(runId);
    if (!run) return { authError: false, run: null };
    const alerts = await ctx.db
      .query("auto_heal_alerts")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
    const fixes = await ctx.db
      .query("auto_heal_fixes")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
    const secrets = await ctx.db
      .query("auto_heal_secrets")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
    const health = await ctx.db
      .query("auto_heal_health_checks")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
    return { authError: false, run, alerts, fixes, secrets, health };
  },
});

export const listAlerts = query({
  args: {
    adminToken: v.optional(v.string()),
    severity: v.optional(v.string()),
    dismissed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { adminToken, severity, dismissed, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, alerts: [] };

    let alerts;
    if (dismissed === false) {
      alerts = await ctx.db
        .query("auto_heal_alerts")
        .withIndex("by_dismissed", (q) => q.eq("dismissed", false))
        .order("desc")
        .take(limit ?? 100);
    } else if (dismissed === true) {
      alerts = await ctx.db
        .query("auto_heal_alerts")
        .withIndex("by_dismissed", (q) => q.eq("dismissed", true))
        .order("desc")
        .take(limit ?? 100);
    } else {
      alerts = await ctx.db
        .query("auto_heal_alerts")
        .withIndex("by_created")
        .order("desc")
        .take(limit ?? 100);
    }
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    return { authError: false, alerts };
  },
});

export const dismissAlert = mutation({
  args: { adminToken: v.string(), alertId: v.id("auto_heal_alerts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.alertId, {
      dismissed: true,
      dismissedBy: identity._id,
      dismissedAt: Date.now(),
    });
    return { success: true };
  },
});

export const markSecretResolved = mutation({
  args: { adminToken: v.string(), secretId: v.id("auto_heal_secrets") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.secretId, { resolved: true, resolvedAt: Date.now() });
    return { success: true };
  },
});

export const getSummary = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const allRuns = await ctx.db.query("auto_heal_runs").order("desc").take(100);
    const allAlerts = await ctx.db.query("auto_heal_alerts").order("desc").take(200);
    const allSecrets = await ctx.db.query("auto_heal_secrets").order("desc").take(200);
    const allHealth = await ctx.db
      .query("auto_heal_health_checks")
      .withIndex("by_checked")
      .order("desc")
      .take(50);

    const totalRuns = allRuns.length;
    const successRuns = allRuns.filter((r) => r.status === "success").length;
    const partialRuns = allRuns.filter((r) => r.status === "partial").length;
    const failedRuns = allRuns.filter((r) => r.status === "failed").length;
    const runningRuns = allRuns.filter((r) => r.status === "running").length;

    const lastRun = allRuns[0] ?? null;
    const last24h = allRuns.filter((r) => r.startedAt > Date.now() - 86400000).length;

    const activeAlerts = allAlerts.filter((a) => !a.dismissed);
    const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
    const warningAlerts = activeAlerts.filter((a) => a.severity === "warning");
    const unresolvedSecrets = allSecrets.filter((s) => !s.resolved);

    const healthOk = allHealth.filter((h) => h.status === "healthy").length;
    const healthDown = allHealth.filter((h) => h.status === "down").length;

    return {
      authError: false,
      summary: {
        totalRuns,
        running: runningRuns,
        success: successRuns,
        partial: partialRuns,
        failed: failedRuns,
        last24h,
        lastRun,
        healthScore:
          totalRuns > 0
            ? Math.round((successRuns / totalRuns) * 100)
            : 100,
      },
      alerts: {
        total: allAlerts.length,
        active: activeAlerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
      },
      secrets: {
        total: allSecrets.length,
        unresolved: unresolvedSecrets.length,
        critical: unresolvedSecrets.filter((s) => s.severity === "critical").length,
      },
      health: {
        total: allHealth.length,
        healthy: healthOk,
        down: healthDown,
      },
    };
  },
});

// ─── INTERNAL: Notification dispatch (best-effort) ───

export const _dispatchNotification = internalAction({
  args: {
    alertId: v.id("auto_heal_alerts"),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    email: v.boolean(),
    sms: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Email via Resend
    if (args.email) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "DutchKem Auto-Heal <alerts@dutchkem.com>",
              to: ["admin@dutchkem.com"],
              subject: `[${args.severity.toUpperCase()}] ${args.title}`,
              text: `${args.title}\n\n${args.message}\n\nRun: ${args.alertId}\nTime: ${new Date().toISOString()}`,
            }),
          });
        } catch (e) {
          // best-effort
        }
      }
    }

    // SMS via Termii
    if (args.sms && args.severity === "critical") {
      const termiiKey = process.env.TERMII_API_KEY;
      if (termiiKey) {
        try {
          await fetch("https://v3.api.termii.com/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: termiiKey,
              to: "2348000000000", // placeholder admin phone
              from: "N-Alert",
              sms: `[AutoHeal ${args.severity}] ${args.title}: ${args.message.slice(0, 100)}`,
              type: "plain",
              channel: "generic",
            }),
          });
        } catch (e) {
          // best-effort
        }
      }
    }
    return null;
  },
});

// ─── ACTION: Run live endpoint health check (for admin UI) ───

export const runLiveHealthCheck = action({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.auto_heal;
    const identity = await ctx.runQuery(internalAny._verifyAdminAction, {
      adminToken: args.adminToken,
    });
    if (!identity) throw new Error("Unauthorized");

    const endpoints = [
      { name: "Vercel App", url: "https://dutchkem-prosuite-app.vercel.app" },
      { name: "Convex Cloud", url: "https://warmhearted-aardvark-280.convex.cloud/version" },
      { name: "Convex Site", url: "https://warmhearted-aardvark-280.convex.site" },
      { name: "GitHub Repo", url: "https://github.com/dutchkemsystems/dutchkem-prosuite" },
    ];

    const results: any[] = [];
    for (const ep of endpoints) {
      const start = Date.now();
      try {
        const response = await fetch(ep.url, { method: "GET" });
        const responseTime = Date.now() - start;
        let status: "healthy" | "degraded" | "down" = "healthy";
        if (response.status >= 500) status = "down";
        else if (response.status >= 400) status = "degraded";
        results.push({
          endpoint: ep.name,
          url: ep.url,
          method: "GET",
          status,
          responseCode: response.status,
          responseTimeMs: responseTime,
        });
      } catch (e: any) {
        results.push({
          endpoint: ep.name,
          url: ep.url,
          method: "GET",
          status: "down",
          responseTimeMs: Date.now() - start,
          error: e?.message ?? String(e),
        });
      }
    }

    return { success: true, results, checkedAt: Date.now() };
  },
});

export const _verifyAdminAction = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    return await tryGetAdminSession(ctx, adminToken);
  },
});

// ─── ACTION: Trigger a full PowerShell script run remotely (best-effort) ───

export const triggerAutoHealRun = action({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.auto_heal;
    const identity = await ctx.runQuery(internalAny._verifyAdminAction, {
      adminToken: args.adminToken,
    });
    if (!identity) throw new Error("Unauthorized");

    // Best-effort: trigger PowerShell via webhook (if configured)
    const triggerUrl = process.env.AUTO_HEAL_WEBHOOK_URL;
    if (!triggerUrl) {
      return {
        success: false,
        message: "AUTO_HEAL_WEBHOOK_URL not configured. Run fix-advanced.ps1 manually on the host.",
      };
    }

    try {
      const response = await fetch(triggerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "admin-ui", runId: `run-${Date.now()}` }),
      });
      return { success: response.ok, message: "Trigger sent" };
    } catch (e: any) {
      return { success: false, message: e?.message ?? String(e) };
    }
  },
});
