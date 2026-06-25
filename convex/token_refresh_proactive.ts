import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PROACTIVE TOKEN REFRESH SYSTEM
// Refreshes tokens 1 hour before expiry to prevent interruptions
// ═══════════════════════════════════════════════════════════════════

const PROACTIVE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour before expiry
const CRITICAL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

// ═══════════════════════════════════════════════════════════════════
// PROACTIVE REFRESH ACTION
// ═══════════════════════════════════════════════════════════════════

export const proactiveRefreshTokens = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    const now = Date.now();
    const proactiveThreshold = now + PROACTIVE_THRESHOLD_MS;
    const criticalThreshold = now + CRITICAL_THRESHOLD_MS;

    // Get all connected platforms
    const connections = await ctx.runQuery(internal.token_refresh_proactive.getActiveConnections);

    const results: any[] = [];
    let refreshed = 0;
    let failed = 0;
    let skipped = 0;
    let critical = 0;

    for (const conn of connections) {
      // Skip if no expiry set
      if (!conn.expiresAt) {
        skipped++;
        continue;
      }

      // Check if token is critically close to expiry (within 5 minutes)
      if (conn.expiresAt <= criticalThreshold) {
        critical++;
        // Force refresh for critical tokens
        const result = await ctx.runAction(internal.token_refresh_proactive.refreshSingleToken, {
          connectionId: conn._id,
          platform: conn.platformId,
          adminId: conn.adminId,
          refreshToken: conn.refreshToken,
          integrationId: conn.integrationId,
          forceRefresh: true,
        });
        results.push({ platform: conn.platformId, ...result });
        if (result.success) refreshed++;
        else failed++;
        continue;
      }

      // Check if token needs proactive refresh (within 1 hour)
      if (conn.expiresAt <= proactiveThreshold) {
        const result = await ctx.runAction(internal.token_refresh_proactive.refreshSingleToken, {
          connectionId: conn._id,
          platform: conn.platformId,
          adminId: conn.adminId,
          refreshToken: conn.refreshToken,
          integrationId: conn.integrationId,
          forceRefresh: false,
        });
        results.push({ platform: conn.platformId, ...result });
        if (result.success) refreshed++;
        else failed++;
        continue;
      }

      skipped++;
    }

    // Log the refresh cycle
    await ctx.runMutation(internal.token_refresh_proactive.logRefreshCycle, {
      totalConnections: connections.length,
      refreshed,
      failed,
      skipped,
      critical,
      timestamp: now,
    });

    return {
      success: true,
      summary: {
        total: connections.length,
        refreshed,
        failed,
        skipped,
        critical,
      },
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// REFRESH SINGLE TOKEN
// ═══════════════════════════════════════════════════════════════════

export const refreshSingleToken = internalAction({
  args: {
    connectionId: v.string(),
    platform: v.string(),
    adminId: v.string(),
    refreshToken: v.string(),
    integrationId: v.optional(v.string()),
    forceRefresh: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Handle Composio-connected platforms
    if (args.integrationId === "composio") {
      // Composio manages tokens internally
      // Just log that we attempted refresh
      await ctx.runMutation(internal.token_refresh_proactive.logRefreshAttempt, {
        platform: args.platform,
        adminId: args.adminId,
        status: "skipped",
        message: "Composio manages tokens internally",
        timestamp: now,
      });
      return { success: true, message: "Composio token managed externally" };
    }

    // Skip platforms without refresh tokens
    if (!args.refreshToken) {
      await ctx.runMutation(internal.token_refresh_proactive.logRefreshAttempt, {
        platform: args.platform,
        adminId: args.adminId,
        status: "failed",
        message: "No refresh token available",
        timestamp: now,
      });
      return { success: false, error: "No refresh token available" };
    }

    // Get platform config
    const config = await ctx.runQuery(internal.token_refresh_proactive.getPlatformConfig, { platform: args.platform });
    if (!config?.tokenUrl) {
      return { success: false, error: `No token URL for ${args.platform}` };
    }

    // Get client credentials
    const credentials = await ctx.runQuery(internal.token_refresh_proactive.getClientCredentials, { platform: args.platform });
    if (!credentials?.clientId || !credentials?.clientSecret) {
      return { success: false, error: `Missing credentials for ${args.platform}` };
    }

    // Attempt token refresh
    try {
      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: args.refreshToken,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internal.token_refresh_proactive.logRefreshAttempt, {
          platform: args.platform,
          adminId: args.adminId,
          status: "failed",
          message: `HTTP ${response.status}: ${errorText}`,
          timestamp: now,
        });
        return { success: false, error: `Refresh failed: ${response.status}` };
      }

      const data = await response.json();
      
      // Update the connection with new tokens
      await ctx.runMutation(internal.token_refresh_proactive.updateConnectionTokens, {
        connectionId: args.connectionId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || args.refreshToken,
        expiresIn: data.expires_in,
      });

      await ctx.runMutation(internal.token_refresh_proactive.logRefreshAttempt, {
        platform: args.platform,
        adminId: args.adminId,
        status: "success",
        message: `Token refreshed successfully, expires in ${data.expires_in}s`,
        timestamp: now,
      });

      return { 
        success: true, 
        expiresIn: data.expires_in,
        newRefreshToken: data.refresh_token ? true : false,
      };
    } catch (error: any) {
      await ctx.runMutation(internal.token_refresh_proactive.logRefreshAttempt, {
        platform: args.platform,
        adminId: args.adminId,
        status: "failed",
        message: error.message,
        timestamp: now,
      });
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getActiveConnections = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();
  },
});

export const getPlatformConfig = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Platform token URLs
    const tokenUrls: Record<string, string> = {
      x: "https://api.twitter.com/2/oauth2/token",
      linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
      facebook: "https://graph.facebook.com/v19.0/oauth/access_token",
      instagram: "https://graph.facebook.com/v19.0/oauth/access_token",
      youtube: "https://oauth2.googleapis.com/token",
      reddit: "https://www.reddit.com/api/v1/access_token",
      discord: "https://discord.com/api/v10/oauth2/token",
      pinterest: "https://api.pinterest.com/v5/oauth/token",
      threads: "https://graph.threads.net/v1.0/access_token",
    };
    return { tokenUrl: tokenUrls[args.platform] };
  },
});

export const getClientCredentials = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // In production, these would come from environment variables
    // For now, return null to indicate credentials need to be configured
    return { clientId: null, clientSecret: null };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const updateConnectionTokens = internalMutation({
  args: {
    connectionId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId as any, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: Date.now() + args.expiresIn * 1000,
      updatedAt: Date.now(),
    });
  },
});

export const logRefreshAttempt = internalMutation({
  args: {
    platform: v.string(),
    adminId: v.string(),
    status: v.string(),
    message: v.string(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("token_refresh_logs", {
      platform: args.platform,
      adminId: args.adminId,
      status: args.status as any,
      error: args.message,
      oldExpiresAt: null,
      timestamp: args.timestamp,
    });
  },
});

export const logRefreshCycle = internalMutation({
  args: {
    totalConnections: v.number(),
    refreshed: v.number(),
    failed: v.number(),
    skipped: v.number(),
    critical: v.number(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "token_refresh",
      status: args.failed === 0 ? "healthy" : args.critical > 0 ? "critical" : "warning",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: args.totalConnections,
      checksPassed: args.refreshed + args.skipped,
      checksFailed: args.failed,
      issuesFound: args.failed,
      issuesAutoFixed: args.refreshed,
      severity: args.critical > 0 ? "critical" : args.failed > 0 ? "warning" : "info",
      timestamp: args.timestamp,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getTokenStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const now = Date.now();
    const connections = await ctx.db.query("platform_connections")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    const tokenStatus = connections.map((conn: any) => {
      const expiresAt = conn.expiresAt || 0;
      const timeUntilExpiry = expiresAt - now;
      const hoursUntilExpiry = Math.max(0, Math.round(timeUntilExpiry / (1000 * 60 * 60)));
      
      let status = "healthy";
      if (timeUntilExpiry <= 0) status = "expired";
      else if (timeUntilExpiry <= 5 * 60 * 1000) status = "critical";
      else if (timeUntilExpiry <= 60 * 60 * 1000) status = "warning";

      return {
        platform: conn.platformId,
        platformName: conn.platformName,
        isConnected: conn.isConnected,
        expiresAt,
        hoursUntilExpiry,
        status,
        hasRefreshToken: !!conn.refreshToken,
        integrationId: conn.integrationId,
      };
    });

    const criticalCount = tokenStatus.filter((t: any) => t.status === "critical" || t.status === "expired").length;
    const warningCount = tokenStatus.filter((t: any) => t.status === "warning").length;

    return {
      connections: tokenStatus,
      summary: {
        total: tokenStatus.length,
        healthy: tokenStatus.filter((t: any) => t.status === "healthy").length,
        warning: warningCount,
        critical: criticalCount,
        expired: tokenStatus.filter((t: any) => t.status === "expired").length,
      },
    };
  },
});

export const getRefreshHistory = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("token_refresh_logs")
      .order("desc")
      .take(args.limit || 20);
  },
});
