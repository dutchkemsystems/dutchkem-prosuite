import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE PRE-CHECK SYSTEM
// Automatically checks compliance before every ad post
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PRE-CHECK BEFORE AD POST
// ═══════════════════════════════════════════════════════════════════

export const preCheckAdPost = action({
  args: {
    adminToken: v.string(),
    adCopy: v.string(),
    headline: v.optional(v.string()),
    platform: v.string(),
    imageUrl: v.optional(v.string()),
    campaignId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized", canPost: false };

    // Run compliance check
    const complianceResult = await ctx.runAction(internal.ad_compliance_enhanced.checkComplianceRealtime, {
      adminToken: args.adminToken,
      adCopy: args.adCopy,
      headline: args.headline,
      platform: args.platform,
      imageUrl: args.imageUrl,
      autoFix: true,
    });

    // Check token status
    const tokenStatus = await ctx.runQuery(internal.ad_compliance_precheck.getTokenStatusForPlatform, {
      platform: args.platform,
    });

    // Determine if posting is allowed
    const canPost = complianceResult.passed && tokenStatus.isConnected && !tokenStatus.isExpired;

    // Log the pre-check
    await ctx.runMutation(internal.ad_compliance_precheck.logPreCheck, {
      platform: args.platform,
      campaignId: args.campaignId,
      complianceScore: complianceResult.score,
      compliancePassed: complianceResult.passed,
      violationsCount: complianceResult.violations?.length || 0,
      tokenStatus: tokenStatus.status,
      canPost,
      timestamp: Date.now(),
    });

    return {
      canPost,
      compliance: {
        score: complianceResult.score,
        passed: complianceResult.passed,
        violations: complianceResult.violations || [],
        autoFixes: complianceResult.autoFixes || [],
        fixedText: complianceResult.fixedText,
      },
      token: {
        isConnected: tokenStatus.isConnected,
        isExpired: tokenStatus.isExpired,
        hoursUntilExpiry: tokenStatus.hoursUntilExpiry,
        status: tokenStatus.status,
      },
      recommendations: generateRecommendations(complianceResult, tokenStatus),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function generateRecommendations(compliance: any, token: any): string[] {
  const recommendations: string[] = [];

  if (!compliance.passed) {
    recommendations.push("Fix compliance violations before posting");
    if (compliance.autoFixes?.length > 0) {
      recommendations.push(`Auto-fixes applied: ${compliance.autoFixes.join(", ")}`);
    }
  }

  if (token.isExpired) {
    recommendations.push("Re-authorize the platform connection");
  } else if (token.status === "critical") {
    recommendations.push("Token expiring soon - will be auto-refreshed");
  }

  if (compliance.score < 70) {
    recommendations.push("Consider revising ad copy for better compliance");
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getTokenStatusForPlatform = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const conn = await ctx.db.query("platform_connections")
      .filter((q) => 
        q.eq(q.field("platformId"), args.platform).and(
          q.eq(q.field("isConnected"), true)
        )
      )
      .first();

    if (!conn) {
      return { isConnected: false, isExpired: true, status: "disconnected", hoursUntilExpiry: 0 };
    }

    const expiresAt = conn.expiresAt || 0;
    const timeUntilExpiry = expiresAt - now;
    const hoursUntilExpiry = Math.max(0, Math.round(timeUntilExpiry / (1000 * 60 * 60)));

    let status = "healthy";
    if (timeUntilExpiry <= 0) status = "expired";
    else if (timeUntilExpiry <= 5 * 60 * 1000) status = "critical";
    else if (timeUntilExpiry <= 60 * 60 * 1000) status = "warning";

    return {
      isConnected: conn.isConnected,
      isExpired: timeUntilExpiry <= 0,
      status,
      hoursUntilExpiry,
      hasRefreshToken: !!conn.refreshToken,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const logPreCheck = internalMutation({
  args: {
    platform: v.string(),
    campaignId: v.optional(v.string()),
    complianceScore: v.number(),
    compliancePassed: v.boolean(),
    violationsCount: v.number(),
    tokenStatus: v.string(),
    canPost: v.boolean(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `precheck_${args.platform}`,
      status: args.canPost ? "healthy" : "warning",
      responseTimeMs: 0,
      details: JSON.stringify({
        complianceScore: args.complianceScore,
        compliancePassed: args.compliancePassed,
        violationsCount: args.violationsCount,
        tokenStatus: args.tokenStatus,
        canPost: args.canPost,
      }),
      checksRun: 2,
      checksPassed: args.compliancePassed && args.tokenStatus !== "expired" ? 2 : 1,
      checksFailed: args.compliancePassed && args.tokenStatus !== "expired" ? 0 : 1,
      issuesFound: args.violationsCount,
      issuesAutoFixed: 0,
      severity: args.canPost ? "info" : "warning",
      timestamp: args.timestamp,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getPreCheckHistory = query({
  args: { adminToken: v.string(), platform: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("mimo_health_logs")
      .filter((q) => q.gt(q.field("component"), "precheck_").and(q.lt(q.field("component"), "precheck_z")));

    if (args.platform) {
      q = q.filter((q) => q.eq(q.field("component"), `precheck_${args.platform}`));
    }

    return await q.order("desc").take(args.limit || 20);
  },
});

export const getPreCheckStats = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentChecks = await ctx.db.query("mimo_health_logs")
      .filter((q) => 
        q.gte(q.field("timestamp"), oneWeekAgo).and(
          q.gt(q.field("component"), "precheck_").and(q.lt(q.field("component"), "precheck_z"))
        )
      )
      .collect();

    const todayChecks = recentChecks.filter((c) => c.timestamp >= oneDayAgo);
    const passedChecks = recentChecks.filter((c) => c.status === "healthy");
    const failedChecks = recentChecks.filter((c) => c.status !== "healthy");

    return {
      thisWeek: {
        total: recentChecks.length,
        passed: passedChecks.length,
        failed: failedChecks.length,
        successRate: recentChecks.length > 0 ? ((passedChecks.length / recentChecks.length) * 100).toFixed(1) : "0",
      },
      today: {
        total: todayChecks.length,
        passed: todayChecks.filter((c) => c.status === "healthy").length,
        failed: todayChecks.filter((c) => c.status !== "healthy").length,
      },
      platforms: [...new Set(recentChecks.map((c) => c.component.replace("precheck_", "")))],
    };
  },
});
