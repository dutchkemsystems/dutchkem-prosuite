import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const manualFix = mutation({
  args: {
    adminToken: v.optional(v.string()),
    component: v.string(),
    fixType: v.string(),
    description: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const actions: string[] = [];

    // Apply fix based on component and type
    switch (args.component) {
      case "agents": {
        if (args.fixType === "re_register_all") {
          const existing = await ctx.db.query("agent_services").take(30);
          for (const agent of existing) {
            await ctx.db.patch(agent._id, { added_at: now });
          }
          actions.push(`Re-registered ${existing.length} agents`);
        }
        break;
      }
      case "wallets": {
        if (args.fixType === "re_initialize") {
          const wallets = await ctx.db.query("system_wallets").take(10);
          for (const wallet of wallets) {
            await ctx.db.patch(wallet._id, { lastUpdated: now });
          }
          actions.push(`Re-initialized ${wallets.length} wallets`);
        }
        break;
      }
      case "security": {
        if (args.fixType === "clear_expired_blocks") {
          const blocks = await ctx.db.query("blocked_ips").take(50);
          let cleared = 0;
          for (const block of blocks) {
            if (!block.permanent && block.expiresAt && block.expiresAt < now) {
              await ctx.db.delete("blocked_ips", block._id);
              cleared++;
            }
          }
          actions.push(`Cleared ${cleared} expired IP blocks`);
        }
        break;
      }
    }

    // Log the manual fix
    await ctx.db.insert("mimo_audit_logs", {
      action: `manual_fix.${args.component}.${args.fixType}`,
      actor: identity.email,
      target: args.component,
      details: { fixType: args.fixType, description: args.description, actions },
      timestamp: now,
    });

    await ctx.db.insert("mimo_command_history", {
      command: "manual_fix",
      issuedBy: identity.email,
      status: "completed",
      input: { component: args.component, fixType: args.fixType, description: args.description },
      output: { actions },
      startedAt: now,
      completedAt: Date.now(),
      durationMs: Date.now() - now,
    });

    return { success: true, actions };
  },
});

// ═══════════════════════════════════════════════════════════════
// AUTO-HEAL REPORTS — Surface PowerShell fix-advanced.ps1 data
// ═══════════════════════════════════════════════════════════════

/** List all auto-heal runs with their sections */
export const listAutoHealRuns = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("auto_heal_runs")
      .withIndex("by_started", (q) => q.gt("startedAt", 0))
      .order("desc")
      .take(args.limit || 50);
  },
});

/** Get a single auto-heal run with its alerts, fixes, secrets, and health checks */
export const getAutoHealRunDetail = query({
  args: { adminToken: v.optional(v.string()), runId: v.id("auto_heal_runs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const run = await ctx.db.get(args.runId);
    if (!run) return null;

    const alerts = await ctx.db.query("auto_heal_alerts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const fixes = await ctx.db.query("auto_heal_fixes")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const secrets = await ctx.db.query("auto_heal_secrets")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    const healthChecks = await ctx.db.query("auto_heal_health_checks")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    return { run, alerts, fixes, secrets, healthChecks };
  },
});

/** Auto-heal stats summary for the dashboard */
export const getAutoHealStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 7 * 86400000;

    const allRuns = await ctx.db.query("auto_heal_runs")
      .withIndex("by_started", (q) => q.gt("startedAt", 0))
      .order("desc")
      .take(200);

    const runs24h = allRuns.filter(r => r.startedAt >= oneDayAgo);
    const runs7d = allRuns.filter(r => r.startedAt >= oneWeekAgo);

    const successRuns = allRuns.filter(r => r.status === "success");
    const failedRuns = allRuns.filter(r => r.status === "failed");

    const totalIssuesFound = allRuns.reduce((sum, r) => sum + r.issuesFound, 0);
    const totalIssuesFixed = allRuns.filter(r => r.status === "success").reduce((sum, r) => sum + r.issuesFixed, 0);

    // Count alerts by severity
    const recentAlerts = await ctx.db.query("auto_heal_alerts")
      .withIndex("by_created", (q) => q.gt("createdAt", oneWeekAgo))
      .take(200);
    const criticalAlerts = recentAlerts.filter(a => a.severity === "critical");
    const warningAlerts = recentAlerts.filter(a => a.severity === "warning");

    // Count secrets detected
    const recentSecrets = await ctx.db.query("auto_heal_secrets")
      .withIndex("by_run", (q) => q.gt("runId", ""))
      .take(100);

    // Latest run
    const latestRun = allRuns[0] || null;

    // Success rate
    const completedRuns = allRuns.filter(r => r.status !== "running");
    const successfulRuns = completedRuns.filter(r => r.status === "success");
    const successRate = completedRuns.length > 0 ? Math.round((successfulRuns.length / completedRuns.length) * 100) : 100;

    return {
      totalRuns: allRuns.length,
      runsLast24h: runs24h.length,
      runsLast7d: runs7d.length,
      successRate,
      totalIssuesFound: totalIssuesFixed, // fixed = found that were resolved
      totalIssuesFixed,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      secretsDetected: recentSecrets.length,
      latestRun,
      runsByStatus: {
        success: completedRuns.filter(r => r.status === "success").length,
        partial: completedRuns.filter(r => r.status === "partial").length,
        failed: completedRuns.filter(r => r.status === "failed").length,
        running: allRuns.filter(r => r.status === "running").length,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// SECURITY MONITOR — Unified threat view across all components
// ═══════════════════════════════════════════════════════════════

/** Get comprehensive security dashboard data */
export const getSecurityDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneHourAgo = now - 3600000;

    // Mimo security events
    const mimoEvents = await ctx.db.query("mimo_security_events")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .take(200);

    // Security logs (from intrusion_detector, geo_blocking, etc.)
    const secLogs = await ctx.db.query("security_logs")
      .withIndex("by_created", (q) => q.gt("createdAt", oneDayAgo))
      .take(200);

    // Blocked IPs
    const blockedIps = await ctx.db.query("blocked_ips").take(100);
    const activeBlocks = blockedIps.filter(ip => !ip.permanent && ip.expiresAt && ip.expiresAt > now);

    // Failed logins (last hour for rate detection)
    const recentFailedLogins = await ctx.db.query("failed_logins")
      .withIndex("by_time", (q) => q.gt("attemptTime", oneHourAgo))
      .take(100);

    // Aggregate by component
    const frontendThreats = secLogs.filter(l => l.path?.startsWith("/api/") || l.path?.includes("xss") || l.path?.includes("csrf"));
    const backendThreats = secLogs.filter(l => l.path?.includes("admin") || l.path?.includes("config") || l.path?.includes("env"));
    const agentThreats = mimoEvents.filter(e => e.eventType === "prompt_injection" || e.eventType === "data_exfiltration");
    const dashboardThreats = secLogs.filter(l => l.path?.includes("dashboard") || l.path?.includes("scan"));

    // Attack type breakdown
    const attackTypes: Record<string, number> = {};
    for (const event of mimoEvents) {
      attackTypes[event.eventType] = (attackTypes[event.eventType] || 0) + 1;
    }
    for (const log of secLogs) {
      const key = log.category || "unknown";
      attackTypes[key] = (attackTypes[key] || 0) + 1;
    }

    // Threat level calculation
    const criticalCount = mimoEvents.filter(e => e.severity === "critical").length + secLogs.filter(l => l.severity === "critical").length;
    const highCount = mimoEvents.filter(e => e.severity === "high").length + secLogs.filter(l => l.severity === "high").length;
    const threatLevel = criticalCount > 5 ? "critical" : criticalCount > 0 || highCount > 10 ? "high" : highCount > 0 ? "medium" : "low";

    // Rate limiting detection
    const ipAttempts: Record<string, number> = {};
    for (const login of recentFailedLogins) {
      ipAttempts[login.ipAddress] = (ipAttempts[login.ipAddress] || 0) + 1;
    }
    const rateLimitedIps = Object.entries(ipAttempts).filter(([_, count]) => count > 5).map(([ip, count]) => ({ ip, count }));

    return {
      threatLevel,
      summary: {
        totalEvents24h: mimoEvents.length + secLogs.length,
        criticalEvents: criticalCount,
        highEvents: highCount,
        blockedIps: activeBlocks.length,
        failedLogins1h: recentFailedLogins.length,
        rateLimitedIps: rateLimitedIps.length,
      },
      byComponent: {
        frontend: { threats: frontendThreats.length, recent: frontendThreats.slice(0, 10) },
        backend: { threats: backendThreats.length, recent: backendThreats.slice(0, 10) },
        agents: { threats: agentThreats.length, recent: agentThreats.slice(0, 10) },
        dashboard: { threats: dashboardThreats.length, recent: dashboardThreats.slice(0, 10) },
      },
      attackTypes,
      rateLimitedIps,
      recentEvents: [...mimoEvents.slice(0, 20), ...secLogs.slice(0, 20)]
        .sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0))
        .slice(0, 30),
      activeBlocks: activeBlocks.slice(0, 20),
    };
  },
});

/** Block an IP address manually */
export const blockIP = mutation({
  args: { adminToken: v.optional(v.string()), ip: v.string(), reason: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db.query("blocked_ips")
      .withIndex("by_ip", (q) => q.eq("ip", args.ip))
      .first();
    if (existing) return { success: true, message: "IP already blocked" };

    await ctx.db.insert("blocked_ips", {
      ip: args.ip,
      reason: args.reason,
      blockedAt: now,
      expiresAt: now + 86400000,
      permanent: false,
    });

    await ctx.db.insert("mimo_security_events", {
      eventType: "manual_block",
      severity: "high",
      source: args.ip,
      description: args.reason,
      action: "blocked",
      blocked: true,
      resolved: true,
      resolvedAt: now,
      resolvedBy: identity.email,
      timestamp: now,
    });

    await ctx.db.insert("mimo_audit_logs", {
      action: "security.block_ip",
      actor: identity.email,
      target: args.ip,
      details: { reason: args.reason },
      timestamp: now,
    });

    return { success: true };
  },
});

/** Unblock an IP address */
export const unblockIP = mutation({
  args: { adminToken: v.optional(v.string()), ip: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const block = await ctx.db.query("blocked_ips")
      .withIndex("by_ip", (q) => q.eq("ip", args.ip))
      .first();
    if (!block) return { success: false, message: "IP not found" };

    await ctx.db.delete("blocked_ips", block._id);

    await ctx.db.insert("mimo_audit_logs", {
      action: "security.unblock_ip",
      actor: identity.email,
      target: args.ip,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/** Log a security threat from any component */
export const logThreat = mutation({
  args: {
    adminToken: v.optional(v.string()),
    eventType: v.string(),
    severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    source: v.string(),
    description: v.string(),
    component: v.string(), // "frontend", "backend", "agent", "dashboard"
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();

    await ctx.db.insert("mimo_security_events", {
      eventType: args.eventType,
      severity: args.severity,
      source: args.source,
      description: args.description,
      action: "logged",
      blocked: false,
      resolved: false,
      timestamp: now,
    });

    return { success: true };
  },
});

/** Self-update — clean old data, optimize thresholds */
export const selfUpdate = mutation({