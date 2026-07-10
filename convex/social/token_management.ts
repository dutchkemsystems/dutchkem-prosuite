import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { PLATFORM_CONFIGS } from "./platform_configs";

export const refreshExpiredTokens = internalAction({
  args: {},
  returns: v.object({ refreshed: v.number(), failed: v.number(), skipped: v.number() }),
  handler: async (ctx): Promise<{ refreshed: number; failed: number; skipped: number }> => {
    const now = Date.now();
    // Refresh tokens expiring within 7 days (not just 24 hours)
    const threshold = now + 7 * 24 * 60 * 60 * 1000;
    const connections = await ctx.db.query("platform_connections")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    let refreshed = 0;
    let failed = 0;
    let skipped = 0;

    for (const conn of connections) {
      // Skip if no expiry set or not expiring soon
      if (!conn.expiresAt || conn.expiresAt > threshold) { skipped++; continue; }
      // Skip if no refresh token available
      if (!conn.refreshToken) {
        failed++;
        await ctx.db.insert("token_refresh_logs", {
          platform: conn.platformId,
          adminId: conn.adminId,
          status: "failed",
          error: "No refresh token available - requires re-authorization",
          oldExpiresAt: conn.expiresAt,
          timestamp: now,
        });
        continue;
      }

      // Handle Composio-connected platforms differently
      if (conn.integrationId === "composio") {
        try {
          // For Composio, we need to use the Composio API to refresh
          // But since Composio manages tokens internally, we mark as needing re-auth
          // if the token is expired. Composio handles refresh on its own.
          if (conn.expiresAt <= now) {
            failed++;
            await ctx.db.insert("token_refresh_logs", {
              platform: conn.platformId,
              adminId: conn.adminId,
              status: "failed",
              error: "Composio token expired - requires re-authorization via Composio Hub",
              oldExpiresAt: conn.expiresAt,
              timestamp: now,
            });
          } else {
            // Token still valid, just skip
            skipped++;
          }
          continue;
        } catch (error: any) {
          failed++;
          await ctx.db.insert("token_refresh_logs", {
            platform: conn.platformId,
            adminId: conn.adminId,
            status: "failed",
            error: `Composio refresh failed: ${error?.message}`,
            oldExpiresAt: conn.expiresAt,
            timestamp: now,
          });
          continue;
        }
      }

      try {
        const config = PLATFORM_CONFIGS[conn.platformId];
        if (!config?.tokenUrl) {
          failed++;
          await ctx.db.insert("token_refresh_logs", {
            platform: conn.platformId,
            adminId: conn.adminId,
            status: "failed",
            error: `No token URL configured for ${conn.platformId}`,
            oldExpiresAt: conn.expiresAt,
            timestamp: now,
          });
          continue;
        }

        const clientId = getPlatformClientId(conn.platformId);
        const clientSecret = getPlatformClientSecret(conn.platformId);
        if (!clientId || !clientSecret) {
          failed++;
          await ctx.db.insert("token_refresh_logs", {
            platform: conn.platformId,
            adminId: conn.adminId,
            status: "failed",
            error: `Missing client credentials for ${conn.platformId}`,
            oldExpiresAt: conn.expiresAt,
            timestamp: now,
          });
          continue;
        }

        const res = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: conn.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        });

        if (!res.ok) {
          const errorText = await res.text();
          failed++;
          await ctx.db.insert("token_refresh_logs", {
            platform: conn.platformId,
            adminId: conn.adminId,
            status: "failed",
            error: `HTTP ${res.status}: ${errorText.substring(0, 200)}`,
            oldExpiresAt: conn.expiresAt,
            timestamp: now,
          });
          continue;
        }

        const data = await res.json();
        if (!data.access_token) {
          failed++;
          await ctx.db.insert("token_refresh_logs", {
            platform: conn.platformId,
            adminId: conn.adminId,
            status: "failed",
            error: "No access_token in response",
            oldExpiresAt: conn.expiresAt,
            timestamp: now,
          });
          continue;
        }

        const newExpiresAt = data.expires_in ? now + data.expires_in * 1000 : undefined;

        await ctx.db.patch(conn._id, {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || conn.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: now,
        });

        await ctx.db.insert("token_refresh_logs", {
          platform: conn.platformId,
          adminId: conn.adminId,
          status: "success",
          oldExpiresAt: conn.expiresAt,
          newExpiresAt,
          timestamp: now,
        });
        refreshed++;
      } catch (error: any) {
        failed++;
        await ctx.db.insert("token_refresh_logs", {
          platform: conn.platformId,
          adminId: conn.adminId,
          status: "failed",
          error: error?.message || "Unknown error",
          oldExpiresAt: conn.expiresAt,
          timestamp: now,
        });
      }
    }

    return { refreshed, failed, skipped };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL ACTION: Fetch real follower counts for connected platforms
// ═══════════════════════════════════════════════════════════════════
export const refreshFollowerCounts = internalAction({
  args: {},
  returns: v.object({ updated: v.number(), failed: v.number() }),
  handler: async (ctx): Promise<{ updated: number; failed: number }> => {
    const connections = await ctx.db.query("platform_connections")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    let updated = 0;
    let failed = 0;

    for (const conn of connections) {
      if (!conn.accessToken || !conn.expiresAt || conn.expiresAt <= Date.now()) { failed++; continue; }

      try {
        let followersCount = 0;
        switch (conn.platformId) {
          case "x": {
            const res = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
              headers: { Authorization: `Bearer ${conn.accessToken}` },
            });
            const data = await res.json();
            followersCount = data.data?.public_metrics?.followers_count || 0;
            break;
          }
          case "facebook":
          case "instagram": {
            const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=followers_count&access_token=${conn.accessToken}`);
            const data = await res.json();
            followersCount = data.followers_count || 0;
            break;
          }
          case "tiktok": {
            const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count", {
              headers: { Authorization: `Bearer ${conn.accessToken}` },
            });
            const data = await res.json();
            followersCount = data.data?.user?.follower_count || 0;
            break;
          }
          case "youtube": {
            const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", {
              headers: { Authorization: `Bearer ${conn.accessToken}` },
            });
            const data = await res.json();
            followersCount = Number(data.items?.[0]?.statistics?.subscriberCount) || 0;
            break;
          }
          default:
            failed++;
            continue;
        }

        if (followersCount > 0) {
          await ctx.db.patch(conn._id, {
            followersCount,
            updatedAt: Date.now(),
          });
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { updated, failed };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get token status for all platforms (admin dashboard)
// ═══════════════════════════════════════════════════════════════════
export const getTokenStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const connections = await ctx.db.query("platform_connections").collect();

    const tokenStatuses = SUPPORTED_PLATFORMS.map((platform) => {
      const conn = connections.find(
        (c) => c.platformId === platform.id && c.isConnected
      );

      if (!conn) {
        return {
          platform: platform.id,
          name: platform.name,
          icon: platform.icon,
          status: "not_connected",
          isConnected: false,
          expiresAt: null,
          expiresIn: null,
          lastRefreshed: null,
        };
      }

      const expiresAt = conn.expiresAt;
      const expiresIn = expiresAt ? expiresAt - now : null;
      let status = "valid";

      if (!expiresAt) {
        status = "unknown";
      } else if (expiresAt <= now) {
        status = "expired";
      } else if (expiresIn <= oneDay) {
        status = "critical";
      } else if (expiresIn <= sevenDays) {
        status = "expiring_soon";
      }

      return {
        platform: platform.id,
        name: platform.name,
        icon: platform.icon,
        status,
        isConnected: conn.isConnected,
        expiresAt,
        expiresIn,
        expiresInDays: expiresIn ? Math.floor(expiresIn / (24 * 60 * 60 * 1000)) : null,
        lastRefreshed: conn.updatedAt,
        integrationId: conn.integrationId,
        platformUsername: conn.platformUsername,
      };
    });

    // Get recent refresh logs
    const recentLogs = await ctx.db
      .query("token_refresh_logs")
      .order("desc")
      .take(20);

    return {
      platforms: tokenStatuses,
      summary: {
        total: tokenStatuses.length,
        connected: tokenStatuses.filter((t) => t.isConnected).length,
        valid: tokenStatuses.filter((t) => t.status === "valid").length,
        expiringSoon: tokenStatuses.filter((t) => t.status === "expiring_soon").length,
        critical: tokenStatuses.filter((t) => t.status === "critical").length,
        expired: tokenStatuses.filter((t) => t.status === "expired").length,
      },
      recentLogs: recentLogs.map((log) => ({
        platform: log.platform,
        status: log.status,
        error: log.error,
        timestamp: log.timestamp,
      })),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Manual refresh a single platform token
// ═══════════════════════════════════════════════════════════════════
export const manualRefreshToken = mutation({
  args: {
    platform: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { platform, adminToken }) => {
    const now = Date.now();
    const conn = await ctx.db
      .query("platform_connections")
      .filter((q) =>
        q.eq(q.field("platformId"), platform).eq(q.field("isConnected"), true)
      )
      .first();

    if (!conn) {
      return { success: false, error: "Platform not connected" };
    }

    if (!conn.refreshToken) {
      return { success: false, error: "No refresh token - requires re-authorization" };
    }

    try {
      const config = PLATFORM_CONFIGS[platform];
      if (!config?.tokenUrl) {
        return { success: false, error: `No token URL for ${platform}` };
      }

      const clientId = getPlatformClientId(platform);
      const clientSecret = getPlatformClientSecret(platform);
      if (!clientId || !clientSecret) {
        return { success: false, error: `Missing credentials for ${platform}` };
      }

      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: conn.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        await ctx.db.insert("token_refresh_logs", {
          platform,
          adminId: conn.adminId,
          status: "failed",
          error: `HTTP ${res.status}: ${errorText.substring(0, 200)}`,
          oldExpiresAt: conn.expiresAt,
          timestamp: now,
        });
        return { success: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      if (!data.access_token) {
        return { success: false, error: "No access_token in response" };
      }

      const newExpiresAt = data.expires_in ? now + data.expires_in * 1000 : undefined;

      await ctx.db.patch(conn._id, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || conn.refreshToken,
        expiresAt: newExpiresAt,
        updatedAt: now,
      });

      await ctx.db.insert("token_refresh_logs", {
        platform,
        adminId: conn.adminId,
        status: "success",
        oldExpiresAt: conn.expiresAt,
        newExpiresAt,
        timestamp: now,
      });

      return {
        success: true,
        expiresAt: newExpiresAt,
        expiresInDays: data.expires_in ? Math.floor(data.expires_in / (24 * 60 * 60)) : null,
      };
    } catch (error: any) {
      await ctx.db.insert("token_refresh_logs", {
        platform,
        adminId: conn.adminId,
        status: "failed",
        error: error?.message || "Unknown error",
        oldExpiresAt: conn.expiresAt,
        timestamp: now,
      });
      return { success: false, error: error?.message || "Unknown error" };
    }
  },
});
