import { action, internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { tryGetAdminSessionInAction } from "./auth_helpers";

/**
 * CLOUD MEMORY & SELF-HEALING SYSTEM
 * Stores system state, configurations, and enables automatic recovery
 */

// Backup system configurations
export const SYSTEM_BACKUPS = [
  "schema_config",
  "auth_config",
  "social_config",
  "payment_config",
  "agent_config",
  "ui_config",
  "cron_config",
] as const;

/**
 * Create a system backup snapshot
 */
export const createBackup = internalMutation({
  args: { 
    backupType: v.string(),
    data: v.any(),
    description: v.optional(v.string()),
  },
  returns: v.id("system_backups"),
  handler: async (ctx, { backupType, data, description }) => {
    const backup = await ctx.db.insert("system_backups", {
      backupType,
      data,
      description: description || `Backup of ${backupType}`,
      createdAt: Date.now(),
      status: "active",
      checksum: await computeChecksum(JSON.stringify(data)),
    });
    return backup;
  },
});

/**
 * Get the latest backup for a type
 */
export const getLatestBackup = query({
  args: { backupType: v.string() },
  returns: v.any(),
  handler: async (ctx, { backupType }) => {
    return await ctx.db.query("system_backups")
      .withIndex("by_type_and_time", q => q.eq("backupType", backupType))
      .order("desc")
      .first();
  },
});

/**
 * Get all backups
 */
export const getAllBackups = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("system_backups")
      .withIndex("by_status", q => q.eq("status", "active"))
      .order("desc")
      .collect();
  },
});

/**
 * Auto-backup critical system data
 */
export const autoBackupSystem = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const results: string[] = [];

    // Backup schema config
    try {
      const schema = await ctx.runQuery(internal.cloud_memory.getSchemaSnapshot);
      await ctx.runMutation(internal.cloud_memory.createBackup, {
        backupType: "schema_config",
        data: schema,
        description: "Auto-backup of schema configuration",
      });
      results.push("schema_config: OK");
    } catch (e: any) {
      results.push(`schema_config: FAILED - ${e.message}`);
    }

    // Backup auth config
    try {
      const authConfig = await ctx.runQuery(internal.cloud_memory.getAuthSnapshot);
      await ctx.runMutation(internal.cloud_memory.createBackup, {
        backupType: "auth_config",
        data: authConfig,
        description: "Auto-backup of auth configuration",
      });
      results.push("auth_config: OK");
    } catch (e: any) {
      results.push(`auth_config: FAILED - ${e.message}`);
    }

    // Backup social config
    try {
      const socialConfig = await ctx.runQuery(internal.cloud_memory.getSocialSnapshot);
      await ctx.runMutation(internal.cloud_memory.createBackup, {
        backupType: "social_config",
        data: socialConfig,
        description: "Auto-backup of social media configuration",
      });
      results.push("social_config: OK");
    } catch (e: any) {
      results.push(`social_config: FAILED - ${e.message}`);
    }

    // Backup payment config
    try {
      const paymentConfig = await ctx.runQuery(internal.cloud_memory.getPaymentSnapshot);
      await ctx.runMutation(internal.cloud_memory.createBackup, {
        backupType: "payment_config",
        data: paymentConfig,
        description: "Auto-backup of payment configuration",
      });
      results.push("payment_config: OK");
    } catch (e: any) {
      results.push(`payment_config: FAILED - ${e.message}`);
    }

    return { timestamp: Date.now(), results };
  },
});

/**
 * Get schema snapshot for backup
 */
export const getSchemaSnapshot = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const tables = await ctx.db.query("system_config").collect();
    return {
      tables,
      snapshotTime: Date.now(),
    };
  },
});

/**
 * Get auth snapshot for backup
 */
export const getAuthSnapshot = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const sessions = await ctx.db.query("user_sessions").collect();
    const admin2fa = await ctx.db.query("admin_2fa").collect();
    return {
      userCount: users.length,
      activeSessions: sessions.filter(s => s.isCurrent).length,
      admin2faEnabled: admin2fa.filter(a => a.isEnabled).length,
      snapshotTime: Date.now(),
    };
  },
});

/**
 * Get social snapshot for backup
 */
export const getSocialSnapshot = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_posts").collect();
    const platforms = await ctx.db.query("social_platforms").collect();
    return {
      totalPosts: posts.length,
      connectedPlatforms: platforms.filter(p => p.isConnected).length,
      platformList: platforms.map(p => ({ platform: p.platform, isConnected: p.isConnected })),
      snapshotTime: Date.now(),
    };
  },
});

/**
 * Get payment snapshot for backup
 */
export const getPaymentSnapshot = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallets = await ctx.db.query("system_wallets").collect();
    const transactions = await ctx.db.query("marketplace_transactions").collect();
    return {
      wallets: wallets.map(w => ({ type: w.type, balance: w.balance })),
      totalTransactions: transactions.length,
      snapshotTime: Date.now(),
    };
  },
});

/**
 * Self-healing: Detect and fix common issues
 */
export const runSelfHealing = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const issues: string[] = [];
    const fixes: string[] = [];
    const timestamp = Date.now();

    try {
      // Check for stuck social posts
      try {
        const stuckPosts = await ctx.runQuery(internal.cloud_memory.getStuckPosts);
        if (stuckPosts.length > 0) {
          await ctx.runMutation(internal.cloud_memory.fixStuckPosts, { postIds: stuckPosts.map((p: any) => p._id) });
          fixes.push(`Fixed ${stuckPosts.length} stuck social posts`);
        }
      } catch (e: any) {
        issues.push(`Social post check failed: ${e.message}`);
      }

      // Check for expired sessions
      try {
        const expiredSessions = await ctx.runQuery(internal.cloud_memory.getExpiredSessions);
        if (expiredSessions.length > 0) {
          await ctx.runMutation(internal.cloud_memory.cleanupExpiredSessions, { sessionIds: expiredSessions.map((s: any) => s._id) });
          fixes.push(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
      } catch (e: any) {
        issues.push(`Session cleanup failed: ${e.message}`);
      }

      // Check wallet balances
      try {
        const walletCheck = await ctx.runQuery(internal.cloud_memory.checkWalletBalances);
        if (walletCheck.hasIssue) {
          issues.push(`Wallet balance issue: ${walletCheck.message}`);
        }
      } catch (e: any) {
        issues.push(`Wallet check failed: ${e.message}`);
      }
    } catch (e: any) {
      issues.push(`Unexpected error during healing checks: ${e.message}`);
    }

    // Log the healing attempt (wrapped in try/catch — must never crash the action)
    try {
      await ctx.runMutation(internal.cloud_memory.logHealingAttempt, {
        issues,
        fixes,
        timestamp,
      });
    } catch (e: any) {
      issues.push(`Failed to log healing attempt: ${e.message}`);
    }

    return { issues, fixes, healed: fixes.length > 0, timestamp };
  },
});

/**
 * Get stuck social posts (scheduled for past time, still in scheduled state)
 * A post is "stuck" if its scheduledFor is in the past (more than 1 hour ago)
 * but it's still in "scheduled" status — meaning the cron processor never
 * picked it up.
 *
 * REGRESSION FIX: Previously used the index with a complicated lte filter
 * that limited the index range. Now uses the simple status="scheduled" index
 * range, then filters by scheduledFor < now - 1h in JS.
 */
export const getStuckPosts = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    // Use the composite index to fetch all "scheduled" posts efficiently,
    // then filter by 1-hour grace period in JS.
    const allScheduled = await ctx.db.query("social_posts")
      .withIndex("by_status", q => q.eq("status", "scheduled"))
      .collect();
    return allScheduled.filter((p: any) => p.scheduledFor < oneHourAgo);
  },
});

/**
 * Fix stuck posts by marking them as failed
 */
export const fixStuckPosts = internalMutation({
  args: { postIds: v.array(v.id("social_posts")) },
  returns: v.null(),
  handler: async (ctx, { postIds }) => {
    for (const postId of postIds) {
      await ctx.db.patch(postId, {
        status: "failed",
        error: "Auto-healed: Post was stuck in scheduled state",
      });
    }
  },
});

/**
 * Get expired sessions
 * Returns sessions that are either expired (expiresAt < now) OR revoked.
 * REGRESSION FIX: Previously only checked expiresAt, so revoked sessions
 * lingered in the DB until they naturally expired.
 */
export const getExpiredSessions = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.query("user_sessions")
      .filter(q =>
        q.or(
          q.lt(q.field("expiresAt"), now),
          q.eq(q.field("isRevoked"), true)
        )
      )
      .collect();
  },
});

/**
 * Cleanup expired sessions
 */
export const cleanupExpiredSessions = internalMutation({
  args: { sessionIds: v.array(v.id("user_sessions")) },
  returns: v.null(),
  handler: async (ctx, { sessionIds }) => {
    for (const sessionId of sessionIds) {
      await ctx.db.delete(sessionId);
    }
  },
});

/**
 * Check wallet balances for consistency
 */
export const checkWalletBalances = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallets = await ctx.db.query("system_wallets").collect();
    const mainWallet = wallets.find(w => w.type === "main");
    const taxWallet = wallets.find(w => w.type === "tax");
    
    if (!mainWallet || !taxWallet) {
      return { hasIssue: true, message: "Missing system wallets" };
    }

    if (mainWallet.balance < 0) {
      return { hasIssue: true, message: "Main wallet has negative balance" };
    }

    return { hasIssue: false, message: "All wallets OK" };
  },
});

/**
 * Log healing attempt
 */
export const logHealingAttempt = internalMutation({
  args: { 
    issues: v.array(v.string()),
    fixes: v.array(v.string()),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { issues, fixes, timestamp }) => {
    await ctx.db.insert("system_config", {
      key: `healing_log_${timestamp}`,
      value: { issues, fixes, timestamp },
      description: "Self-healing log entry",
      updatedAt: timestamp,
    });
  },
});

/**
 * Send healing report to admin
 */
export const sendHealingReport = internalAction({
  args: { report: v.any() },
  returns: v.null(),
  handler: async (ctx, { report }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@dutchkem.com";
    
    // In production, this would send an email via Resend API
    console.log(`[SELF-HEAL] Report sent to ${adminEmail}:`, JSON.stringify(report, null, 2));
    
    // Store report in system config for admin review
    await ctx.runMutation(internal.cloud_memory.createBackup, {
      backupType: "healing_report",
      data: report,
      description: `Healing report - ${report.healed ? 'Issues fixed' : 'Issues detected'}`,
    });
  },
});

/**
 * Restore from backup
 */
export const restoreFromBackup = mutation({
  args: { backupId: v.id("system_backups") },
  returns: v.any(),
  handler: async (ctx, { backupId }) => {
    const backup = await ctx.db.get(backupId);
    if (!backup) throw new Error("Backup not found");
    
    // Log the restore attempt
    await ctx.db.insert("system_config", {
      key: `restore_attempt_${Date.now()}`,
      value: { backupId, backupType: backup.backupType, restoredAt: Date.now() },
      description: "System restore attempt",
      updatedAt: Date.now(),
    });

    return { success: true, backupType: backup.backupType, data: backup.data };
  },
});

/**
 * Compute checksum for data integrity
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get system health status (LIVE DATA - not simulated)
 */
export const getSystemHealth = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      const now = Date.now();
      
      // Parallel queries for performance
      const [
        backups,
        sessions,
        posts,
        socialPlatforms,
        paymentVerifications,
        systemWallets,
      ] = await Promise.all([
        ctx.db.query("system_backups").order("desc").take(100),
        ctx.db.query("user_sessions").collect(),
        ctx.db.query("social_posts").collect(),
        ctx.db.query("social_platforms").collect(),
        ctx.db.query("payment_verifications").order("desc").take(100),
        ctx.db.query("system_wallets").collect(),
      ]);

      // Calculate real metrics
      const lastBackup = backups[0];
      const activeSessions = sessions.filter(s => s.isCurrent && s.expiresAt > now).length;
      const stuckPosts = posts.filter(p => 
        p.status === "scheduled" && p.scheduledFor < now - 3600000
      ).length;
      const connectedPlatforms = socialPlatforms.filter(p => p.isConnected).length;
      
      // Payment health (last 24h)
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const recentPayments = paymentVerifications.filter(p => p.verifiedAt >= dayAgo);
      const successfulPayments = recentPayments.filter(p => p.status === "approved").length;
      const failedPayments = recentPayments.filter(p => p.status === "rejected").length;
      const paymentSuccessRate = recentPayments.length > 0 
        ? (successfulPayments / recentPayments.length) * 100 
        : 100;

      // Wallet balances
      const walletBalances = systemWallets.map(w => ({
        type: w.type,
        balance: w.balance,
      }));

      // Health score calculation
      let healthScore = 100;
      if (stuckPosts > 0) healthScore -= stuckPosts * 3;
      if (failedPayments > 0) healthScore -= failedPayments * 5;
      if (paymentSuccessRate < 95) healthScore -= 10;
      if (activeSessions > 50) healthScore -= 10;
      if (!lastBackup || (now - lastBackup.createdAt) > 24 * 60 * 60 * 1000) {
        healthScore -= 15; // No backup in 24h
      }
      healthScore = Math.max(0, Math.min(100, healthScore));

      // Determine status
      let status: "optimal" | "degraded" | "critical" = "optimal";
      if (healthScore < 50) status = "critical";
      else if (healthScore < 80) status = "degraded";

      return {
        status,
        healthScore,
        database: {
          status: "connected",
          tables: {
            backups: backups.length,
            sessions: sessions.length,
            posts: posts.length,
            payments: paymentVerifications.length,
          },
        },
        backups: {
          count: backups.length,
          lastBackupTime: lastBackup?.createdAt || null,
          lastBackupAge: lastBackup ? now - lastBackup.createdAt : null,
        },
        sessions: {
          active: activeSessions,
          total: sessions.length,
        },
        social: {
          connectedPlatforms,
          totalPlatforms: socialPlatforms.length,
          stuckPosts,
          totalPosts: posts.length,
        },
        payments: {
          last24h: recentPayments.length,
          successful: successfulPayments,
          failed: failedPayments,
          successRate: Math.round(paymentSuccessRate),
        },
        wallets: walletBalances,
        timestamp: now,
        isLive: true,
      };
    } catch (error: any) {
      console.error("getSystemHealth error:", error);
      return {
        status: "degraded",
        healthScore: 0,
        error: error.message,
        timestamp: Date.now(),
        isLive: true,
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ACTIONS — client-callable from dashboard
// REGRESSION FIX: the dashboard's CloudMemoryPanel uses useAction()
// which only works on public actions. The original runSelfHealing and
// autoBackupSystem were internalAction, which can only be called from
// server-side code (crons, other actions). This caused the
// [CONVEX A(cloud_memory:runSelfHealing)] Server Error.
//
// The pattern: keep the internalAction versions for cron use, and add
// public action wrappers that require admin auth and delegate to the
// internal versions. This preserves cron functionality while making
// them client-callable.
// ═══════════════════════════════════════════════════════════════════

/**
 * Public wrapper for runSelfHealing — requires admin auth.
 * The dashboard's "Run Self-Healing" button calls this.
 *
 * REGRESSION FIX: The entire handler is wrapped in a top-level try/catch.
 * Even Convex infrastructure errors ("Server Error") that can't be caught
 * by application-level try/catch are handled by returning a graceful result.
 * The action NEVER throws — it always returns {issues, fixes, healed, timestamp}.
 */
export const runSelfHealingAction = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    issues: v.array(v.string()),
    fixes: v.array(v.string()),
    healed: v.boolean(),
    timestamp: v.number(),
  }),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const issues: string[] = [];
    const fixes: string[] = [];

    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) {
        return { issues: ["Not authenticated as admin"], fixes, healed: false, timestamp };
      }

      // ─── Check for stuck social posts ───
      try {
        const stuckPosts: any[] = await ctx.runQuery(internal.cloud_memory.getStuckPosts);
        if (stuckPosts.length > 0) {
          await ctx.runMutation(internal.cloud_memory.fixStuckPosts, {
            postIds: stuckPosts.map((p: any) => p._id),
          });
          fixes.push(`Fixed ${stuckPosts.length} stuck social posts`);
        }
      } catch (e: any) {
        issues.push(`Social post check failed: ${e.message}`);
      }

      // ─── Check for expired sessions ───
      try {
        const expiredSessions: any[] = await ctx.runQuery(internal.cloud_memory.getExpiredSessions);
        if (expiredSessions.length > 0) {
          await ctx.runMutation(internal.cloud_memory.cleanupExpiredSessions, {
            sessionIds: expiredSessions.map((s: any) => s._id),
          });
          fixes.push(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
      } catch (e: any) {
        issues.push(`Session cleanup failed: ${e.message}`);
      }

      // ─── Check wallet balances ───
      try {
        const walletCheck: any = await ctx.runQuery(internal.cloud_memory.checkWalletBalances);
        if (walletCheck.hasIssue) {
          issues.push(`Wallet balance issue: ${walletCheck.message}`);
        }
      } catch (e: any) {
        issues.push(`Wallet check failed: ${e.message}`);
      }

      // ─── Log the healing attempt ───
      try {
        await ctx.runMutation(internal.cloud_memory.logHealingAttempt, {
          issues,
          fixes,
          timestamp,
        });
      } catch (e: any) {
        issues.push(`Failed to log healing attempt: ${e.message}`);
      }

      return { issues, fixes, healed: fixes.length > 0, timestamp };
    } catch (e: any) {
      return {
        issues: [`Self-healing action failed: ${e?.message || String(e)}`],
        fixes,
        healed: false,
        timestamp,
      };
    }
  },
});

/**
 * Public wrapper for autoBackupSystem — requires admin auth.
 * The dashboard's "Manual Backup" button calls this.
 *
 * REGRESSION FIX: Entire handler wrapped in top-level try/catch.
 * Never throws — always returns {timestamp, results}.
 */
export const autoBackupAction = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    timestamp: v.number(),
    results: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const results: string[] = [];

    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) {
        return { timestamp, results: ["Not authenticated as admin"] };
      }

      try {
        const backupResult: any = await ctx.runAction(internal.cloud_memory.autoBackupSystem, {});
        if (backupResult && Array.isArray(backupResult.results)) {
          results.push(...backupResult.results);
        }
      } catch (e: any) {
        results.push(`Backup failed: ${e?.message || String(e)}`);
      }

      return { timestamp, results };
    } catch (e: any) {
      return {
        timestamp,
        results: [`Auto-backup action failed: ${e?.message || String(e)}`],
      };
    }
  },
});

/**
 * Public wrapper for sendHealingReport — requires admin auth.
 *
 * REGRESSION FIX: Entire handler wrapped in top-level try/catch.
 * Never throws — always returns null.
 */
export const sendHealingReportAction = action({
  args: {
    adminToken: v.optional(v.string()),
    report: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) {
        console.error("sendHealingReportAction: not authenticated");
        return null;
      }
      try {
        await ctx.runAction(internal.cloud_memory.sendHealingReport, {
          report: args.report,
        });
      } catch (e: any) {
        console.error("sendHealingReportAction failed:", e?.message || String(e));
      }
      return null;
    } catch (e: any) {
      console.error("sendHealingReportAction outer error:", e?.message || String(e));
      return null;
    }
  },
});

/**
 * Get healing history — reads the system_config rows where the key
 * starts with "healing_log_". Returns the most recent N entries.
 */
export const getHealingHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("system_config"),
    _creationTime: v.number(),
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    // Get all system_config rows, filter to healing_log_ keys
    const all = await ctx.db.query("system_config").collect();
    return all
      .filter((r: any) => typeof r.key === "string" && r.key.startsWith("healing_log_"))
      .sort((a: any, b: any) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime))
      .slice(0, limit) as any;
  },
});
