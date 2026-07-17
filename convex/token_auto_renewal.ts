import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// TOKEN AUTO-RENEWAL SYSTEM
// Automatically renews tokens before expiry
// ═══════════════════════════════════════════════════════════════════

const PROACTIVE_THRESHOLD_HOURS = 1; // Renew 1 hour before expiry
const CRITICAL_THRESHOLD_MINUTES = 5; // Force renew within 5 minutes

// ═══════════════════════════════════════════════════════════════════
// CHECK AND RENEW TOKENS
// ═══════════════════════════════════════════════════════════════════

export const checkAndRenewTokens = action({
  args: {
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const now = Date.now();
    const proactiveThreshold = now + PROACTIVE_THRESHOLD_HOURS * 60 * 60 * 1000;
    const criticalThreshold = now + CRITICAL_THRESHOLD_MINUTES * 60 * 1000;

    // Get all connected platforms
    const connections = await ctx.runQuery(internal.token_auto_renewal.getActiveConnections);

    const results = [];
    let renewed = 0;
    let failed = 0;
    let skipped = 0;

    for (const conn of connections) {
      // Skip if no expiry set
      if (!conn.expiresAt) {
        skipped++;
        continue;
      }

      // Skip if not expiring soon
      if (conn.expiresAt > proactiveThreshold) {
        skipped++;
        continue;
      }

      // Skip if no refresh token (for non-Composio platforms)
      if (!conn.refreshToken && conn.integrationId !== "composio") {
        failed++;
        await ctx.runMutation(internal.token_auto_renewal.logRenewal, {
          platform: conn.platformId,
          status: "failed",
          message: "No refresh token available",
        });
        continue;
      }

      // Attempt renewal
      const isCritical = conn.expiresAt <= criticalThreshold;
      const result = await ctx.runAction(internal.token_auto_renewal.renewToken, {
        connectionId: conn._id,
        platform: conn.platformId,
        refreshToken: conn.refreshToken,
        isCritical,
      });

      results.push({ platform: conn.platformId, ...result });
      if (result.success) renewed++;
      else failed++;
    }

    return {
      success: true,
      summary: {
        total: connections.length,
        renewed,
        failed,
        skipped,
      },
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// RENEW SINGLE TOKEN
// ═══════════════════════════════════════════════════════════════════

export const renewToken = internalAction({
  args: {
    connectionId: v.string(),
    platform: v.string(),
    refreshToken: v.string(),
    isCritical: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Handle Composio platforms — sync from Composio API
    if (args.refreshToken === "composio_managed") {
      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not set" };

      try {
        // Get fresh connection from Composio
        const conn = await ctx.db.get(args.connectionId as Id<"platform_connections">);
        if (!conn) return { success: false, error: "Connection not found" };

        const composioId = (conn).platformUserId || (conn).accessToken;
        const res = await fetch(`https://backend.composio.dev/api/v3.1/connected_accounts/${composioId}`, {
          headers: { "x-api-key": apiKey },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return { success: false, error: `Composio ${res.status}` };
        const data = await res.json();
        const tokenData = data?.state?.val || data?.data || {};
        const freshToken = tokenData.access_token;

        if (freshToken && freshToken !== (conn).accessToken) {
          await ctx.db.patch(args.connectionId as Id<"platform_connections">, {
            accessToken: freshToken,
            updatedAt: Date.now(),
          });
          return { success: true, platform: args.platform, source: "composio_sync" };
        }
        return { success: true, platform: args.platform, source: "composio_unchanged" };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Standard OAuth refresh for non-Composio platforms
    const platformTokenUrls: Record<string, string> = {
      x: "https://api.twitter.com/2/oauth2/token",
      linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
      youtube: "https://oauth2.googleapis.com/token",
      reddit: "https://www.reddit.com/api/v1/access_token",
      discord: "https://discord.com/api/v10/oauth2/token",
      pinterest: "https://api.pinterest.com/v5/oauth/token",
      threads: "https://graph.threads.net/v1.0/access_token",
    };

    const tokenUrl = platformTokenUrls[args.platform];
    if (!tokenUrl) {
      return { success: false, error: `No token URL for ${args.platform}` };
    }

    const credentials = await ctx.runQuery(internal.token_auto_renewal.getClientCredentials, {
      platform: args.platform,
    });

    if (!credentials?.clientId || !credentials?.clientSecret) {
      return { success: false, error: `Missing credentials for ${args.platform}` };
    }

    try {
      const response = await fetch(tokenUrl, {
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
        const error = await response.text();
        await ctx.runMutation(internal.token_auto_renewal.logRenewal, {
          platform: args.platform,
          status: "failed",
          message: `HTTP ${response.status}: ${error}`,
        });
        return { success: false, error: `Refresh failed: ${response.status}` };
      }

      const data = await response.json();

      // Update connection with new tokens
      await ctx.runMutation(internal.token_auto_renewal.updateTokens, {
        connectionId: args.connectionId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || args.refreshToken,
        expiresIn: data.expires_in,
      });

      await ctx.runMutation(internal.token_auto_renewal.logRenewal, {
        platform: args.platform,
        status: "success",
        message: `Renewed successfully, expires in ${data.expires_in}s`,
      });

      return {
        success: true,
        expiresIn: data.expires_in,
        isCritical: args.isCritical,
      };
    } catch (error: any) {
      await ctx.runMutation(internal.token_auto_renewal.logRenewal, {
        platform: args.platform,
        status: "failed",
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export const getActiveConnections = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .withIndex("by_isConnected", (q) => q.eq("isConnected", true))
      .collect();
  },
});

export const getClientCredentials = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // In production, these would come from environment variables
    return { clientId: null, clientSecret: null };
  },
});

export const updateTokens = internalMutation({
  args: {
    connectionId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId as Id<"platform_connections">, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: Date.now() + args.expiresIn * 1000,
      updatedAt: Date.now(),
    });
  },
});

export const logRenewal = internalMutation({
  args: {
    platform: v.string(),
    status: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `token_renewal_${args.platform}`,
      status: args.status as "healthy" | "degraded" | "down" | "unknown",
      responseTimeMs: 0,
      details: args.message,
      checksRun: 1,
      checksPassed: args.status === "success" ? 1 : 0,
      checksFailed: args.status === "success" ? 0 : 1,
      issuesFound: args.status === "success" ? 0 : 1,
      issuesAutoFixed: 0,
      severity: args.status === "success" ? "info" : "warning",
      timestamp: Date.now(),
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
      .withIndex("by_isConnected", (q) => q.eq("isConnected", true))
      .collect();

    return connections.map((conn: any) => {
      const expiresAt = conn.expiresAt || 0;
      const hoursUntilExpiry = Math.max(0, Math.round((expiresAt - now) / (1000 * 60 * 60)));

      let status = "healthy";
      if (expiresAt <= 0) status = "expired";
      else if (expiresAt <= now + 5 * 60 * 1000) status = "critical";
      else if (expiresAt <= now + 60 * 60 * 1000) status = "warning";

      return {
        platform: conn.platformId,
        platformName: conn.platformName,
        status,
        hoursUntilExpiry,
        hasRefreshToken: !!conn.refreshToken,
      };
    });
  },
});

export const getRenewalHistory = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("mimo_health_logs")
      .withIndex("by_component", (q) => q.gte("component", "token_renewal_").lt("component", "token_renewal_z"))
      .order("desc")
      .take(args.limit || 20);
  },
});
