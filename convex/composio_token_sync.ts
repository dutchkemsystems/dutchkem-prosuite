import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO TOKEN SYNC — Keeps Convex tokens fresh from Composio API
// Runs every 30 minutes via cron to prevent token staleness
// ═══════════════════════════════════════════════════════════════════

const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

async function composioFetch(apiKey: string, path: string): Promise<any> {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Composio ${res.status}: ${await res.text()}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERY: Get all Composio-connected platforms from Convex
// ═══════════════════════════════════════════════════════════════════
export const getComposioConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("platform_connections")
      .collect()
      .then((conns) => conns.filter((c: any) => c.integrationId === "composio" && c.isConnected));
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATION: Update platform connection with fresh token
// ═══════════════════════════════════════════════════════════════════
export const updateConnectionToken = internalMutation({
  args: {
    connectionId: v.id("platform_connections"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      ...(args.refreshToken ? { refreshToken: args.refreshToken } : {}),
      ...(args.expiresAt ? { expiresAt: args.expiresAt } : {}),
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATION: Log sync attempt
// ═══════════════════════════════════════════════════════════════════
export const logSyncAttempt = internalMutation({
  args: {
    platform: v.string(),
    status: v.string(),
    message: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("composio_enhancement_logs", {
      action: "token_sync",
      agentId: "system",
      agentName: "Token Sync",
      adminId: "system",
      tools: [],
      toolCount: 0,
      previousState: false,
      newState: false,
      bulkOperation: false,
      metadata: { platform: args.platform, status: args.status, message: args.message },
      timestamp: args.timestamp,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Sync all Composio tokens to Convex
// Called by cron every 30 minutes
// ═══════════════════════════════════════════════════════════════════
export const syncComposioTokens = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not set" };

    const now = Date.now();
    const connections = await ctx.runQuery(internal.composio_token_sync.getComposioConnections);

    if (connections.length === 0) {
      return { success: true, synced: 0, message: "No Composio connections to sync" };
    }

    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const conn of connections) {
      try {
        // Get fresh connection data from Composio API
        const composioConn = await composioFetch(apiKey, `/connected_accounts/${conn.platformUserId || conn.accessToken}`);

        if (composioConn.status !== "ACTIVE") {
          skipped++;
          results.push({ platform: conn.platformId, status: "skipped", reason: `Composio status: ${composioConn.status}` });
          continue;
        }

        // Extract fresh token from Composio response
        const tokenData = composioConn.state?.val || composioConn.data || {};
        const freshToken = tokenData.access_token || composioConn.accessToken;
        const freshRefresh = tokenData.refresh_token || composioConn.refreshToken;
        const expiresIn = tokenData.expires_in;
        const freshExpiresAt = expiresIn ? now + expiresIn * 1000 : undefined;

        if (!freshToken) {
          failed++;
          results.push({ platform: conn.platformId, status: "failed", reason: "No access token in Composio response" });
          continue;
        }

        // Check if token actually changed (avoid unnecessary writes)
        if (freshToken === conn.accessToken) {
          skipped++;
          results.push({ platform: conn.platformId, status: "skipped", reason: "Token unchanged" });
          continue;
        }

        // Update Convex with fresh token
        await ctx.runMutation(internal.composio_token_sync.updateConnectionToken, {
          connectionId: conn._id,
          accessToken: freshToken,
          refreshToken: freshRefresh,
          expiresAt: freshExpiresAt,
        });

        synced++;
        results.push({ platform: conn.platformId, status: "synced", expiresAt: freshExpiresAt });

      } catch (err: any) {
        failed++;
        results.push({ platform: conn.platformId, status: "error", reason: err.message });

        await ctx.runMutation(internal.composio_token_sync.logSyncAttempt, {
          platform: conn.platformId,
          status: "error",
          message: err.message,
          timestamp: now,
        });
      }
    }

    // Log the sync cycle
    await ctx.runMutation(internal.composio_token_sync.logSyncAttempt, {
      platform: "system",
      status: synced > 0 ? "success" : "no_changes",
      message: `Synced: ${synced}, Failed: ${failed}, Skipped: ${skipped}`,
      timestamp: now,
    });

    return {
      success: true,
      summary: { total: connections.length, synced, failed, skipped },
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Force reconnect a Composio platform
// Creates a new connection link and returns the OAuth URL
// ═══════════════════════════════════════════════════════════════════
export const forceReconnectComposio = action({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not set" };

    const COMPOSIO_APP_MAP: Record<string, string> = {
      x: "x", linkedin: "linkedin", facebook: "facebook",
      youtube: "youtube", reddit: "reddit", discord: "discord",
      tiktok: "tiktok", threads: "threads", pinterest: "pinterest",
    };

    const composioApp = COMPOSIO_APP_MAP[args.platform];
    if (!composioApp) return { success: false, error: `${args.platform} not supported via Composio` };

    try {
      // Get or create auth config
      const authConfigs = await composioFetch(apiKey, `/auth_configs?toolkit_slug=${composioApp}&is_composio_managed=true&limit=5`);
      const items = authConfigs?.items || authConfigs?.data?.items || [];
      const matching = items.filter((item: any) => (item?.toolkit?.slug || item?.toolkit_slug) === composioApp);

      let authConfigId: string;
      if (matching.length > 0) {
        authConfigId = matching[0].id || matching[0].auth_config?.id;
      } else {
        // Create new auth config
        const created = await composioFetch(apiKey, "/auth_configs");
        // POST requires different handling
        const createRes = await fetch(`${COMPOSIO_BASE}/auth_configs`, {
          method: "POST",
          headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit: { slug: composioApp }, type: "use_composio_managed_auth" }),
          signal: AbortSignal.timeout(15000),
        });
        const createdData = await createRes.json();
        authConfigId = createdData?.auth_config?.id || createdData?.id;
        if (!authConfigId) return { success: false, error: "Failed to create auth config" };
      }

      // Create connection link
      const linkRes = await fetch(`${COMPOSIO_BASE}/connected_accounts/link`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ auth_config_id: authConfigId, user_id: "admin-dashboard" }),
        signal: AbortSignal.timeout(15000),
      });
      const linkData = await linkRes.json();
      const payload = linkData?.data ?? linkData;
      const redirectUrl = payload?.redirect_url;
      const connectionId = payload?.connected_account_id;

      if (!redirectUrl) {
        return { success: false, error: `No redirect URL: ${JSON.stringify(linkData).slice(0, 200)}` };
      }

      return { success: true, redirectUrl, connectionId, authConfigId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});
