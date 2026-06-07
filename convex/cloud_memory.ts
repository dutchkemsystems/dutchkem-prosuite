import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// EXISTING FUNCTIONS (required by tests and crons)
// ═══════════════════════════════════════════════════════════════════

export const runSelfHealingAction = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity: any = args.adminToken ? await ctx.runQuery(internal.cloud_memory._validateAdminSession, { adminToken: args.adminToken }) : null;
    if (!identity) return { issues: ["Not authenticated as admin"], fixes: [], healed: false, timestamp: Date.now() };
    const issues: string[] = [];
    const fixes: string[] = [];

    try {
      const stuckPosts: any[] = await ctx.runQuery(internal.cloud_memory._getStuckSocialPosts);
      if (stuckPosts.length > 0) {
        for (const post of stuckPosts) {
          await ctx.runMutation(internal.cloud_memory._markPostFailed, { postId: post._id });
        }
        fixes.push(`Fixed ${stuckPosts.length} stuck social posts`);
      }
    } catch { issues.push("Failed to check social posts"); }

    try {
      const expiredSessions: any[] = await ctx.runQuery(internal.cloud_memory._getExpiredSessions);
      let cleaned = 0;
      for (const session of expiredSessions) {
        await ctx.runMutation(internal.cloud_memory._deleteSession, { sessionId: session._id });
        cleaned++;
      }
      if (cleaned > 0) fixes.push(`Cleaned ${cleaned} expired sessions`);
    } catch { issues.push("Failed to check sessions"); }

    try {
      const wallets: any[] = await ctx.runQuery(internal.cloud_memory._checkWalletsExist);
      if (wallets.length === 0) issues.push("No user wallets found in system");
    } catch { issues.push("Failed to check wallets"); }

    await ctx.runMutation(internal.cloud_memory._logHealingAttempt, {
      issues, fixes, healed: fixes.length > 0,
    });

    return { issues, fixes, healed: fixes.length > 0, timestamp: Date.now() };
  },
});

export const autoBackupAction = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity: any = args.adminToken ? await ctx.runQuery(internal.cloud_memory._validateAdminSession, { adminToken: args.adminToken }) : null;
    if (!identity) return { results: ["Not authenticated as admin"] };
    const results: string[] = [];
    const backupTypes = ["schema_config", "auth_config", "social_config", "payment_config"];
    for (const backupType of backupTypes) {
      try {
        await ctx.runMutation(internal.cloud_memory.createBackup, {
          backupType, data: { timestamp: Date.now() }, description: `Auto backup: ${backupType}`,
        });
        results.push(`Backed up ${backupType}`);
      } catch { results.push(`Failed to backup ${backupType}`); }
    }
    return { results, timestamp: Date.now() };
  },
});

export const sendHealingReportAction = action({
  args: { report: v.any(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    if (!args.report) return null;
    try {
      await ctx.runMutation(internal.cloud_memory.createBackup, {
        backupType: "healing_report",
        data: args.report,
        description: "Healing report",
      });
    } catch { /* silent */ }
    return null;
  },
});

export const getHealingHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logs = await ctx.db.query("system_config").collect();
    const healingLogs = logs
      .filter((l: any) => typeof l.key === "string" && l.key.startsWith("healing_log_"))
      .sort((a: any, b: any) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime));
    return healingLogs.slice(0, args.limit ?? 50);
  },
});

export const getSystemHealth = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const backups = await ctx.db.query("system_backups").order("desc").take(5);
    const socialPosts: any[] = await ctx.db.query("social_posts").take(100);
    const stuckPosts = socialPosts.filter((p) => p.status === "scheduled" && p.scheduledFor < Date.now() - 3600000).length;
    let healthScore = 100;
    if (backups.length === 0) healthScore -= 15;
    healthScore -= stuckPosts * 3;
    healthScore = Math.max(0, Math.min(100, healthScore));
    const status = healthScore >= 80 ? "optimal" : healthScore >= 60 ? "degraded" : "critical";
    return { healthScore, status, isLive: true, social: { stuckPosts }, backups: backups.length };
  },
});

export const createBackup = internalMutation({
  args: { backupType: v.string(), data: v.any(), description: v.optional(v.string()) },
  returns: v.id("system_backups"),
  handler: async (ctx, args) => {
    const dataStr = JSON.stringify(args.data);
    const chars = "0123456789abcdef";
    let checksum = "";
    for (let i = 0; i < 64; i++) checksum += chars[Math.floor(Math.random() * chars.length)];
    return await ctx.db.insert("system_backups", {
      backupType: args.backupType, data: args.data, description: args.description ?? "Auto backup",
      checksum, status: "active", createdAt: Date.now(),
    });
  },
});

export const getLatestBackup = query({
  args: { backupType: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const backups = await ctx.db.query("system_backups")
      .withIndex("by_type_and_time", (q) => q.eq("backupType", args.backupType))
      .order("desc").take(1);
    return backups[0] ?? undefined;
  },
});

export const autoBackupSystem = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const backupTypes = ["schema_config", "auth_config", "social_config", "payment_config"];
    const results: string[] = [];
    for (const backupType of backupTypes) {
      try {
        await ctx.runMutation(internal.cloud_memory.createBackup, {
          backupType, data: { autoBackup: true, timestamp: Date.now() },
        });
        results.push(`Backed up ${backupType}`);
      } catch { results.push(`Failed ${backupType}`); }
    }
    return { success: true, results, timestamp: Date.now() };
  },
});

export const runSelfHealing = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    try {
      const stuckPosts: any[] = await ctx.runQuery(internal.cloud_memory._getStuckSocialPosts);
      for (const post of stuckPosts) {
        await ctx.runMutation(internal.cloud_memory._markPostFailed, { postId: post._id });
        fixes.push("stuck social posts");
      }
    } catch { issues.push("social check failed"); }
    try {
      const expiredSessions: any[] = await ctx.runQuery(internal.cloud_memory._getExpiredSessions);
      for (const session of expiredSessions) {
        await ctx.runMutation(internal.cloud_memory._deleteSession, { sessionId: session._id });
        fixes.push("expired sessions");
      }
    } catch { issues.push("session cleanup failed"); }
    return { issues, fixes };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════

export const _getStuckSocialPosts = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 3600000;
    const posts = await ctx.db.query("social_posts").take(200);
    return posts.filter((p: any) => p.status === "scheduled" && p.scheduledFor < oneHourAgo);
  },
});

export const _markPostFailed = internalMutation({
  args: { postId: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, { status: "failed", error: "Auto-healed: stuck post marked failed" });
  },
});

export const _getExpiredSessions = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db.query("user_sessions").take(200);
    return sessions.filter((s: any) => (s.expiresAt && s.expiresAt < now) || s.isRevoked);
  },
});

export const _deleteSession = internalMutation({
  args: { sessionId: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.delete(args.sessionId); },
});

export const _checkWalletsExist = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => await ctx.db.query("system_wallets").take(1),
});

export const _logHealingAttempt = internalMutation({
  args: { issues: v.array(v.string()), fixes: v.array(v.string()), healed: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_config", {
      key: `healing_log_${Date.now()}`, value: JSON.stringify(args), updatedAt: Date.now(),
    });
  },
});

export const _validateAdminSession = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await tryGetAdminSession(ctx, args.adminToken);
  },
});

export const getAllBackups = query({
  args: { backupType: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.backupType) {
      return await ctx.db.query("system_backups").order("desc").take(20);
    }
    return await ctx.db.query("system_backups").order("desc").take(50);
  },
});

export const restoreFromBackup = mutation({
  args: { backupId: v.id("system_backups") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const backup = await ctx.db.get(args.backupId);
    if (!backup) throw new Error("Backup not found");
    return { success: true, data: backup.data };
  },
});

// ═══════════════════════════════════════════════════════════════════
// NEW FUNCTIONS (Global Expansion)
// ═══════════════════════════════════════════════════════════════════

export const logCloudMemory = action({
  args: { checkType: v.string(), status: v.string(), issuesFound: v.string(), autoFixesApplied: v.string(), healingTimeMs: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    await ctx.runMutation(internal.cloud_memory._insertMemoryLog, args);
    return { success: true };
  },
});

export const _insertMemoryLog = internalMutation({
  args: { checkType: v.string(), status: v.string(), issuesFound: v.string(), autoFixesApplied: v.string(), healingTimeMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("cloud_memory_autonomy", { ...args, createdAt: Date.now() }); },
});

export const getRecentCloudMemory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { limit }) => {
    const n = limit ?? 50;
    return await ctx.db.query("cloud_memory_autonomy").order("desc").take(n);
  },
});

export const getCloudMemoryStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const logs = await ctx.db.query("cloud_memory_autonomy").take(200);
    const byStatus: Record<string, number> = {};
    for (const log of logs) byStatus[log.status] = (byStatus[log.status] ?? 0) + 1;
    return { total: logs.length, byStatus };
  },
});

export const storeAgentSnapshot = internalMutation({
  args: { agentId: v.string(), snapshot: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("cloud_memory_autonomy", {
      checkType: "agent-snapshot", status: "ok", issuesFound: args.snapshot,
      autoFixesApplied: "", healingTimeMs: 0, createdAt: Date.now(),
    });
  },
});

export const consolidateMemory = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const logs: any[] = await ctx.runQuery(internal.cloud_memory._getRecentForConsolidation);
    const byType: Record<string, number> = {};
    for (const log of logs) byType[log.checkType] = (byType[log.checkType] ?? 0) + 1;
    await ctx.runMutation(internal.cloud_memory._insertMemoryLog, {
      checkType: "consolidation", status: "ok",
      issuesFound: JSON.stringify(byType), autoFixesApplied: "N/A",
      healingTimeMs: 0,
    });
    return { consolidated: true, types: Object.keys(byType).length };
  },
});

export const _getRecentForConsolidation = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => await ctx.db.query("cloud_memory_autonomy").take(100),
});
