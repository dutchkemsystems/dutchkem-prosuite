import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

const ATTACK_PATTERNS = [
  { pattern: /(<script[\s>]|javascript:|onerror=|onclick=)/i, type: "XSS", severity: "high" as const },
  { pattern: /(UNION\s+SELECT|DROP\s+TABLE|;--|'\s*OR\s*)/i, type: "SQLi", severity: "critical" as const },
  { pattern: /(\.\.\/|\.\.\\|%2e%2e%2f)/i, type: "PathTraversal", severity: "high" as const },
  { pattern: /(cmd=|exec\(|system\(|passthru\()/i, type: "CommandInjection", severity: "critical" as const },
  { pattern: /(curl\s|wget\s|fetch\(|XMLHttpRequest)/i, type: "SSRF", severity: "medium" as const },
  { pattern: /(\/etc\/passwd|\/etc\/shadow|C:\\Windows)/i, type: "FileRead", severity: "critical" as const },
];

const LOGIN_FAILURE_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 900000; // 15 minutes

export const detectAttack = internalMutation({
  args: { ip: v.string(), path: v.string(), userId: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    for (const rule of ATTACK_PATTERNS) {
      if (rule.pattern.test(args.path)) {
        await ctx.db.insert("security_logs", {
          type: rule.type, ip: args.ip, path: args.path, userId: args.userId,
          details: `Attack pattern detected: ${rule.type}`, severity: rule.severity,
          resolved: false, createdAt: Date.now(),
        });
        return true;
      }
    }
    return false;
  },
});

export const recordFailedLogin = mutation({
  args: { ip: v.string(), userId: v.optional(v.string()), email: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const recent = await ctx.db.query("security_logs")
      .withIndex("by_type", (q) => q.eq("type", "failed-login"))
      .order("desc").take(20);
    const matching = recent.filter((l) => l.ip === args.ip);
    if (matching.length >= LOGIN_FAILURE_THRESHOLD) {
      await ctx.db.insert("security_logs", {
        type: "login-lockout", ip: args.ip, userId: args.userId, path: args.email,
        details: `IP locked after ${LOGIN_FAILURE_THRESHOLD} failures`,
        severity: "high", resolved: false, createdAt: Date.now(),
      });
      await ctx.db.insert("blocked_ips", {
        ip: args.ip, reason: "Too many failed logins", blockedAt: Date.now(),
        expiresAt: Date.now() + LOCKOUT_DURATION_MS, permanent: false,
      });
      return { locked: true };
    }
    await ctx.db.insert("security_logs", {
      type: "failed-login", ip: args.ip, userId: args.userId, path: args.email,
      details: `Failed login attempt ${matching.length + 1}/${LOGIN_FAILURE_THRESHOLD}`,
      severity: "low", resolved: false, createdAt: Date.now(),
    });
    return { locked: false, attempts: matching.length + 1 };
  },
});

export const isIpBlocked = internalQuery({
  args: { ip: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const blocked = await ctx.db.query("blocked_ips").withIndex("by_ip", (q) => q.eq("ip", args.ip)).first();
    if (!blocked) return false;
    if (blocked.permanent) return true;
    if (blocked.expiresAt && blocked.expiresAt > Date.now()) return true;
    await ctx.db.delete(blocked._id);
    return false;
  },
});

export const getSecurityDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const twentyFourH = Date.now() - 86400000;
    const logs = await ctx.db.query("security_logs").order("desc").take(500);
    const recentLogs = logs.filter((l) => l.createdAt > twentyFourH);

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const log of recentLogs) {
      bySeverity[log.severity] = (bySeverity[log.severity] ?? 0) + 1;
      byType[log.type] = (byType[log.type] ?? 0) + 1;
    }

    const blockedIps = await ctx.db.query("blocked_ips").collect();
    const activeBlock = blockedIps.filter((b) => b.expiresAt && b.expiresAt > Date.now());

    return {
      authError: false,
      totalIncidents: recentLogs.length,
      criticalCount: bySeverity["critical"] ?? 0,
      highCount: bySeverity["high"] ?? 0,
      mediumCount: bySeverity["medium"] ?? 0,
      lowCount: bySeverity["low"] ?? 0,
      byType,
      activeBlockedIps: activeBlock.length,
      recentLogs: recentLogs.slice(0, 50),
    };
  },
});

export const resolveSecurityLog = mutation({
  args: { adminToken: v.string(), logId: v.id("security_logs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.logId, { resolved: true });
    return { success: true };
  },
});

export const unblockIp = mutation({
  args: { adminToken: v.string(), ipId: v.id("blocked_ips") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.delete(args.ipId);
    return { success: true };
  },
});

export const sendTelegramSecurityAlert = internalAction({
  args: { message: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return false;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: "admin", text: args.message }),
      });
      return res.ok;
    } catch { return false; }
  },
});

export const _monitorLoginAttempts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const logs = await ctx.runQuery(internal.intrusion_detector._getFailedLogins);
    let alerts = 0;
    for (const log of logs) {
      await ctx.runMutation(internal.intrusion_detector._flagSuspiciousLogin, { logId: log._id });
      alerts++;
    }
    return { alerts };
  },
});

export const _getFailedLogins = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("security_logs").withIndex("by_type", (q) => q.eq("type", "failed-login")).take(100);
  },
});

export const _flagSuspiciousLogin = internalMutation({
  args: { logId: v.id("security_logs") },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.patch(args.logId, { resolved: false }); },
});
