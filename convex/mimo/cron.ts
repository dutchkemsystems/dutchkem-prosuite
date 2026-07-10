import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const selfUpdate = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const actions: string[] = [];

    // 1. Clean expired IP blocks
    const blocks = await ctx.db.query("blocked_ips").take(100);
    let cleaned = 0;
    for (const block of blocks) {
      if (!block.permanent && block.expiresAt && block.expiresAt < now) {
        await ctx.db.delete("blocked_ips", block._id);
        cleaned++;
      }
    }
    if (cleaned > 0) actions.push(`Cleaned ${cleaned} expired IP blocks`);

    // 2. Clean old mimo security events (keep last 30 days)
    const thirtyDaysAgo = now - 30 * 86400000;
    const oldEvents = await ctx.db.query("mimo_security_events")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", thirtyDaysAgo))
      .take(50);
    for (const event of oldEvents) {
      await ctx.db.delete("mimo_security_events", event._id);
    }
    if (oldEvents.length > 0) actions.push(`Archived ${oldEvents.length} old security events`);

    // 3. Clean old health logs (keep last 14 days)
    const fourteenDaysAgo = now - 14 * 86400000;
    const oldHealth = await ctx.db.query("mimo_health_logs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", fourteenDaysAgo))
      .take(100);
    for (const log of oldHealth) {
      await ctx.db.delete("mimo_health_logs", log._id);
    }
    if (oldHealth.length > 0) actions.push(`Archived ${oldHealth.length} old health logs`);

    // 4. Update core state
    const coreState = await ctx.db.query("mimo_core_state")
      .withIndex("by_singleton", (q) => q.eq("singleton", "mimo_core"))
      .first();
    if (coreState) {
      await ctx.db.patch(coreState._id, {
        version: "2.5.1",
        updatedAt: now,
      });
      actions.push("Updated Mimo version to 2.5.1");
    }

    // Log command
    await ctx.db.insert("mimo_command_history", {
      command: "self_update",
      issuedBy: identity.email,
      status: "completed",
      output: { actions },
      startedAt: now,
      completedAt: Date.now(),
      durationMs: Date.now() - now,
    });

    return { success: true, actions, durationMs: Date.now() - now };
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL — Cron-triggered self-update (no auth required)
// ═══════════════════════════════════════════════════════════════

/** Cron: self-update — clean old data, run security scan, optimize */
export const cronSelfUpdate = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const actions: string[] = [];

    // 1. Clean expired IP blocks
    const blocks = await ctx.db.query("blocked_ips").take(100);
    let cleaned = 0;
    for (const block of blocks) {
      if (!block.permanent && block.expiresAt && block.expiresAt < now) {
        await ctx.db.delete("blocked_ips", block._id);
        cleaned++;
      }
    }
    if (cleaned > 0) actions.push(`Cleaned ${cleaned} expired IP blocks`);

    // 2. Clean old security events (30 days)
    const thirtyDaysAgo = now - 30 * 86400000;
    const oldEvents = await ctx.db.query("mimo_security_events")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", thirtyDaysAgo))
      .take(50);
    for (const event of oldEvents) {
      await ctx.db.delete("mimo_security_events", event._id);
    }
    if (oldEvents.length > 0) actions.push(`Archived ${oldEvents.length} old security events`);

    // 3. Clean old health logs (14 days)
    const fourteenDaysAgo = now - 14 * 86400000;
    const oldHealth = await ctx.db.query("mimo_health_logs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", fourteenDaysAgo))
      .take(100);
    for (const log of oldHealth) {
      await ctx.db.delete("mimo_health_logs", log._id);
    }
    if (oldHealth.length > 0) actions.push(`Archived ${oldHealth.length} old health logs`);

    // 4. Auto-block IPs with >20 failed logins in last hour
    const oneHourAgo = now - 3600000;
    const recentFailed = await ctx.db.query("failed_logins")
      .withIndex("by_time", (q) => q.gt("attemptTime", oneHourAgo))
      .take(200);
    const ipCounts: Record<string, number> = {};
    for (const login of recentFailed) {
      ipCounts[login.ipAddress] = (ipCounts[login.ipAddress] || 0) + 1;
    }
    let blocked = 0;
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count > 20) {
        const existing = await ctx.db.query("blocked_ips")
          .withIndex("by_ip", (q) => q.eq("ip", ip))
          .first();
        if (!existing) {
          await ctx.db.insert("blocked_ips", {
            ip,
            reason: `Auto-blocked: ${count} failed logins in 1 hour (cron)`,
            blockedAt: now,
            expiresAt: now + 86400000,
            permanent: false,
          });
          blocked++;
        }
      }
    }
    if (blocked > 0) actions.push(`Auto-blocked ${blocked} IPs`);

    // 5. Update core state
    const coreState = await ctx.db.query("mimo_core_state")
      .withIndex("by_singleton", (q) => q.eq("singleton", "mimo_core"))
      .first();
    if (coreState) {
      await ctx.db.patch(coreState._id, {
        version: "2.5.1",
        updatedAt: now,
      });
    }

    return { success: true, actions, timestamp: now };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CRON JOB MANAGEMENT — Mimo V.2.5 Cron Manager
// ═══════════════════════════════════════════════════════════════════

/** List all cron jobs with metadata */
export const listCronJobs = query({
  args: {
    adminToken: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    let query = ctx.db.query("cron_jobs");
    if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category));
    }
    return await query.collect();
  },
});

/** Get detailed info about a specific cron job */
export const getCronJobDetail = query({
  args: {
    adminToken: v.optional(v.string()),
    cronJobId: v.id("cron_jobs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.cronJobId);
    if (!job) throw new Error("Cron job not found");

    const executions = await ctx.db
      .query("cron_executions")
      .withIndex("by_cron_job", (q) => q.eq("cronJobId", args.cronJobId))
      .order("desc")
      .take(20);

    return { job, executions };
  },
});

/** Get cron execution history */
export const getCronExecutionHistory = query({
  args: {
    adminToken: v.optional(v.string()),
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("running"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 50;
    let query = ctx.db.query("cron_executions");
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    return await query.order("desc").take(limit);
  },
});

/** Get cron job statistics */
export const getCronStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const jobs = await ctx.db.query("cron_jobs").collect();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const executions = await ctx.db.query("cron_executions").collect();
    const recentExecutions = executions.filter((e) => e.startedAt > oneDayAgo);

    const jobsByCategory: Record<string, number> = {};
    for (const job of jobs) {
      jobsByCategory[job.category] = (jobsByCategory[job.category] || 0) + 1;
    }

    return {
      totalJobs: jobs.length,
      enabledJobs: jobs.filter((j) => j.isEnabled).length,
      disabledJobs: jobs.filter((j) => !j.isEnabled).length,
      jobsByCategory,
      executions24h: recentExecutions.length,
      success24h: recentExecutions.filter((e) => e.status === "success").length,
      failed24h: recentExecutions.filter((e) => e.status === "failed").length,
      avgDurationMs: recentExecutions.length > 0
        ? Math.round(recentExecutions.reduce((sum, e) => sum + (e.durationMs || 0), 0) / recentExecutions.length)
        : 0,
    };
  },
});

/** Manually trigger a cron job */
export const triggerCronJob = mutation({
  args: {
    adminToken: v.optional(v.string()),
    cronJobId: v.id("cron_jobs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.cronJobId);
    if (!job) throw new Error("Cron job not found");

    const executionId = await ctx.db.insert("cron_executions", {
      cronJobId: job._id,
      cronJobName: job.name,
      status: "running",
      startedAt: Date.now(),
      triggeredBy: "manual",
    });

    // Update job last run
    await ctx.db.patch(job._id, {
      lastRunAt: Date.now(),
      lastRunStatus: "running",
      totalRuns: job.totalRuns + 1,
      updatedAt: Date.now(),
    });

    return { success: true, executionId, message: `Triggered: ${job.name}` };
  },
});

/** Mark cron execution as completed */
export const completeCronExecution = mutation({
  args: {
    adminToken: v.optional(v.string()),
    executionId: v.id("cron_executions"),
    status: v.union(v.literal("success"), v.literal("failed")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    const durationMs = Date.now() - execution.startedAt;

    await ctx.db.patch(args.executionId, {
      status: args.status,
      completedAt: Date.now(),
      durationMs,
      result: args.result,
      error: args.error,
    });

    // Update job stats
    const job = await ctx.db.get(execution.cronJobId);
    if (job) {
      await ctx.db.patch(job._id, {
        lastRunStatus: args.status,
        lastRunDurationMs: durationMs,
        successCount: args.status === "success" ? job.successCount + 1 : job.successCount,
        failureCount: args.status === "failed" ? job.failureCount + 1 : job.failureCount,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Toggle cron job enabled/disabled */
export const toggleCronJob = mutation({
  args: {
    adminToken: v.optional(v.string()),
    cronJobId: v.id("cron_jobs"),
    isEnabled: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.cronJobId);
    if (!job) throw new Error("Cron job not found");

    await ctx.db.patch(args.cronJobId, {
      isEnabled: args.isEnabled,
      updatedAt: Date.now(),
    });

    return { success: true, message: `${job.name} ${args.isEnabled ? "enabled" : "disabled"}` };
  },
});

/** Seed cron jobs from crons.ts definitions (run once) */
export const seedCronJobs = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existingJobs = await ctx.db.query("cron_jobs").collect();
    const existingNames = new Set(existingJobs.map((j) => j.name));

    const cronDefinitions = [
      // Financials
      { name: "freelancer marketplace payouts", schedule: "0 14 * * 5", scheduleType: "cron", functionPath: "internal.marketplace.runMarketplacePayouts", category: "financial", description: "Process freelancer marketplace escrow payouts every Friday 2 PM" },
      { name: "freelancer weekly payouts", schedule: "0 14 * * 5", scheduleType: "cron", functionPath: "internal.payouts.runFreelancerPayouts", category: "financial", description: "Weekly freelancer payout processing" },
      { name: "referral weekly payouts", schedule: "30 14 * * 5", scheduleType: "cron", functionPath: "internal.payouts.runReferralPayouts", category: "financial", description: "Weekly referral commission payouts" },
      { name: "owner daily sweep", schedule: "0 22 * * *", scheduleType: "cron", functionPath: "api.payouts.runDailySweep", category: "financial", description: "Daily owner revenue sweep at 10 PM" },
      { name: "monthly api cost deduction", schedule: "0 1 1 * *", scheduleType: "cron", functionPath: "internal.api_costs.deductMonthlyApiCosts", category: "financial", description: "Monthly API cost deduction on 1st" },
      { name: "process subscription renewals", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.payments.processSubscriptionRenewals", category: "financial", description: "Check subscription renewals every hour" },
      { name: "process 29-day subscription renewals", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.subscription_renewal.processAutoRenewals", category: "financial", description: "Auto-renew 29-day subscriptions hourly" },
      { name: "seed default subscription configs", schedule: "0 0 1 * *", scheduleType: "cron", functionPath: "internal.subscription_renewal.seedDefaultConfigs", category: "financial", description: "Monthly safety net for subscription configs" },

      // Tax & Ledger
      { name: "daily tax deduction", schedule: "59 22 * * *", scheduleType: "cron", functionPath: "internal.tax.runDailyTaxDeduction", category: "financial", description: "Daily tax deduction at 10:59 PM" },
      { name: "daily interest accrual", schedule: "59 22 * * *", scheduleType: "cron", functionPath: "internal.tax.runDailyInterestAccrual", category: "financial", description: "Daily interest accrual at 10:59 PM" },
      { name: "annual tax filing", schedule: "0 23 31 12 *", scheduleType: "cron", functionPath: "internal.tax.runAnnualTaxFiling", category: "financial", description: "Annual CAC tax filing on Dec 31" },
      { name: "daily tithe deduction", schedule: "55 23 * * *", scheduleType: "cron", functionPath: "internal.tithe_deductions.runDailyTitheDeduction", category: "financial", description: "Daily tithe deduction (10% of revenue)" },
      { name: "monthly tithe transfer", schedule: "58 23 28-31 * *", scheduleType: "cron", functionPath: "internal.tithe_deductions.runMonthlyTitheTransfer", category: "financial", description: "Monthly tithe transfer to designated account" },
      { name: "monthly CAC deduction", schedule: "5 0 1 * *", scheduleType: "cron", functionPath: "internal.cac_deductions.runMonthlyCacDeduction", category: "financial", description: "Monthly CAC annual fraction deduction" },
      { name: "annual CAC filing", schedule: "30 23 31 12 *", scheduleType: "cron", functionPath: "internal.cac_deductions.runAnnualCacFiling", category: "financial", description: "Annual CAC filing on Dec 31" },
      { name: "daily platform fee sweep", schedule: "0 23 * * *", scheduleType: "cron", functionPath: "internal.marketplace.runDailyPlatformSweep", category: "financial", description: "Daily platform fee collection at 11 PM" },

      // Security
      { name: "cleanup expired passkeys", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.transfer_passkeys.cleanupExpiredPasskeys", category: "security", description: "Hourly cleanup of expired passkeys" },
      { name: "monitor login attempts", schedule: "{ minutes: 15 }", scheduleType: "interval", functionPath: "internal.intrusion_detector._monitorLoginAttempts", category: "security", description: "Monitor login attempts every 15 minutes" },

      // Healing & Monitoring
      { name: "full diagnosis", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "api.guardian_watch.runFullDiagnosis", category: "healing", description: "Full system diagnosis every hour" },
      { name: "rapid agent pulse", schedule: "{ minutes: 15 }", scheduleType: "interval", functionPath: "internal.guardian_watch.testAgents", category: "healing", description: "Quick agent health check every 15 minutes" },
      { name: "payment gateway check", schedule: "{ minutes: 30 }", scheduleType: "interval", functionPath: "internal.guardian_watch.testPaymentGateways", category: "healing", description: "Payment gateway health check every 30 minutes" },
      { name: "model health recovery", schedule: "{ minutes: 5 }", scheduleType: "interval", functionPath: "internal.model_recovery.recoverModelHealth", category: "healing", description: "AI model health recovery every 5 minutes" },
      { name: "auto-heal check", schedule: "{ minutes: 30 }", scheduleType: "interval", functionPath: "internal.auto_healer.runAutoHeal", category: "healing", description: "Auto-heal system check every 30 minutes" },
      { name: "daily health report", schedule: "0 23 * * *", scheduleType: "cron", functionPath: "internal.auto_healer.dailyHealthReport", category: "healing", description: "Daily health report at 11 PM" },
      { name: "auto-test all agents", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.auto_healer.autoTestAllAgents", category: "healing", description: "Auto-test all 15 agents every hour" },
      { name: "detect underperforming agents", schedule: "{ hours: 6 }", scheduleType: "interval", functionPath: "internal.agent_performance._takeAgentSnapshots", category: "healing", description: "Detect underperforming agents every 6 hours" },
      { name: "agent snapshot collection", schedule: "{ hours: 4 }", scheduleType: "interval", functionPath: "internal.agent_performance._takeAgentSnapshots", category: "healing", description: "Collect agent performance snapshots every 4 hours" },
      { name: "self-healing check", schedule: "{ minutes: 30 }", scheduleType: "interval", functionPath: "internal.cloud_memory.runSelfHealing", category: "healing", description: "Cloud memory self-healing check every 30 minutes" },
      { name: "auto backup system", schedule: "{ hours: 6 }", scheduleType: "interval", functionPath: "internal.cloud_memory.autoBackupSystem", category: "healing", description: "Auto-backup system every 6 hours" },
      { name: "consolidate cloud memory", schedule: "0 2 * * *", scheduleType: "cron", functionPath: "internal.cloud_memory.consolidateMemory", category: "healing", description: "Consolidate cloud memory daily at 2 AM" },
      { name: "mimo self-update", schedule: "{ hours: 24 }", scheduleType: "interval", functionPath: "internal.mimo_core.cronSelfUpdate", category: "healing", description: "Mimo V.2.5 self-update every 24 hours" },

      // Social
      { name: "process scheduled social posts", schedule: "{ minutes: 1 }", scheduleType: "interval", functionPath: "internal.scheduledPosts.processScheduledPosts", category: "social", description: "Process scheduled social posts every minute" },
      { name: "refresh social platform tokens", schedule: "{ hours: 6 }", scheduleType: "interval", functionPath: "internal.social.refreshExpiredTokens", category: "social", description: "Refresh expired social platform tokens every 6 hours" },
      { name: "refresh social follower counts", schedule: "{ hours: 12 }", scheduleType: "interval", functionPath: "internal.social.refreshFollowerCounts", category: "social", description: "Refresh follower counts for connected platforms every 12 hours" },
      { name: "rapidapi auto-post", schedule: "{ hours: 4 }", scheduleType: "interval", functionPath: "internal.rapidapi._autoPostTick", category: "social", description: "Auto-post via RapidAPI every 4 hours" },
      { name: "flyer auto-post tick", schedule: "{ hours: 4 }", scheduleType: "interval", functionPath: "internal.flyer_posting.autoPostTick", category: "social", description: "Auto flyer posting every 4 hours" },

      // Ad Engine
      { name: "process scheduled ad posts", schedule: "{ minutes: 1 }", scheduleType: "interval", functionPath: "internal.adEngine.processScheduledAds", category: "social", description: "Process scheduled ad posts every minute" },
      { name: "ad orchestrator auto-generate", schedule: "{ hours: 4 }", scheduleType: "interval", functionPath: "internal.adOrchestrator.runAutoGenerateAndPost", category: "social", description: "Auto-generate and post adverts every 4 hours" },

      // Enterprise
      { name: "abandoned checkout recovery", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "api.abandonedCheckouts.processAbandonedCheckouts", category: "enterprise", description: "Recover abandoned checkouts every hour" },
      { name: "cancel old abandoned checkouts", schedule: "0 3 * * *", scheduleType: "cron", functionPath: "internal.abandonedCheckouts.cancelOldCheckouts", category: "enterprise", description: "Cancel old abandoned checkouts daily at 3 AM" },
      { name: "expire flash sales", schedule: "{ minutes: 5 }", scheduleType: "interval", functionPath: "internal.flashSales.expireFlashSales", category: "enterprise", description: "Check flash sale expiry every 5 minutes" },
      { name: "process TryPost due posts", schedule: "{ minutes: 1 }", scheduleType: "interval", functionPath: "internal.trypost.processDuePosts", category: "social", description: "Process TryPost scheduled posts every minute" },
      { name: "refresh TryPost analytics", schedule: "{ hours: 4 }", scheduleType: "interval", functionPath: "internal.trypost.refreshAnalytics", category: "social", description: "Refresh TryPost analytics every 4 hours" },
      { name: "cleanup expired composio sessions", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.composioEnhanced.cleanupExpiredSessions", category: "enterprise", description: "Cleanup expired Composio sessions every hour" },
      { name: "refresh composio tool catalog", schedule: "0 3 * * *", scheduleType: "cron", functionPath: "internal.composioEnhanced.refreshToolCatalog", category: "enterprise", description: "Refresh Composio tool catalog daily at 3 AM" },

      // CRM & Reporting
      { name: "calculate lead scores", schedule: "0 2 * * *", scheduleType: "cron", functionPath: "internal.lead_scoring.calculateAllLeadScores", category: "enterprise", description: "Calculate lead scores daily at 2 AM" },
      { name: "evaluate workflows", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.workflows.evaluateWorkflows", category: "enterprise", description: "Evaluate scheduled workflows every hour" },
      { name: "process scheduled reports", schedule: "{ hours: 1 }", scheduleType: "interval", functionPath: "internal.reports.processScheduledReports", category: "enterprise", description: "Process scheduled reports every hour" },
      { name: "crm hygiene scan", schedule: "0 3 * * 0", scheduleType: "cron", functionPath: "internal.crm_hygiene.runHygieneScan", category: "enterprise", description: "CRM hygiene scan Sunday 3 AM" },
      { name: "check usage thresholds", schedule: "{ hours: 6 }", scheduleType: "interval", functionPath: "internal.usage_alerts.checkUsageThresholds", category: "enterprise", description: "Check usage thresholds every 6 hours" },
      { name: "auto backup synthetic agents", schedule: "{ hours: 12 }", scheduleType: "interval", functionPath: "internal.agent_backups.autoBackup", category: "healing", description: "Auto-backup synthetic agent configs every 12 hours" },
    ];

    let seeded = 0;
    const now = Date.now();

    for (const def of cronDefinitions) {
      if (!existingNames.has(def.name)) {
        await ctx.db.insert("cron_jobs", {
          name: def.name,
          schedule: def.schedule,
          scheduleType: def.scheduleType as "cron" | "interval",
          functionPath: def.functionPath,
          isEnabled: true,
          category: def.category,
          description: def.description,
          totalRuns: 0,
          successCount: 0,
          failureCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        seeded++;
      }
    }

    return { success: true, seeded, total: cronDefinitions.length, existing: existingNames.size };
  },
});

/** Get cron categories */
export const getCronCategories = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const jobs = await ctx.db.query("cron_jobs").collect();
    const categories: Record<string, { total: number; enabled: number; failed: number }> = {};

    for (const job of jobs) {
      if (!categories[job.category]) {
        categories[job.category] = { total: 0, enabled: 0, failed: 0 };
      }
      categories[job.category].total++;
      if (job.isEnabled) categories[job.category].enabled++;
      if (job.failureCount > 0) categories[job.category].failed++;
    }

    return categories;
  },
});

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE METRICS — System Performance Monitoring
// ═══════════════════════════════════════════════════════════════════

/** Get performance metrics overview */
export const getPerformanceMetrics = query({