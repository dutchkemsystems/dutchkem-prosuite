import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSessionInAction } from "../auth_helpers";
import { PLATFORM_CONFIGS, COMPOSIO_APP_MAP, TRYPOST_PLATFORMS } from "./platform_configs";

export const startComposioOAuth = action({
  args: {
    platform: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; redirectUrl?: string; connectionId?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) {
        return { success: false, error: "COMPOSIO_API_KEY not configured — set it in Convex dashboard env vars" };
      }

      const composioApp = COMPOSIO_APP_MAP[args.platform];
      if (!composioApp) {
        return { success: false, error: `${config.name} does not support Composio (use Telegram bot token instead)` };
      }

      const redirectUri = getRedirectUri(args.platform);
      const authConfigId = await getOrCreateAuthConfigId(apiKey, composioApp);

      const link: any = await composioFetch(apiKey, "/connected_accounts/link", {
        method: "POST",
        body: JSON.stringify({
          auth_config_id: authConfigId,
          user_id: identity._id,
          callback_url: redirectUri,
        }),
      });

      const payload = link?.data ?? link;
      const redirectUrl = payload?.redirect_url;
      const connectionId = payload?.connected_account_id;
      if (!redirectUrl) {
        return {
          success: false,
          error: `Composio did not return a redirect URL — response: ${JSON.stringify(link).slice(0, 200)}`,
        };
      }

      return { success: true, redirectUrl, connectionId };
    } catch (err: any) {
      return { success: false, error: `Composio OAuth start failed: ${err?.message || String(err)}` };
    }
  },
});

export const handleComposioCallback = action({
  args: {
    platform: v.string(),
    connectionId: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; platformName?: string; username?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const config = PLATFORM_CONFIGS[args.platform];
      if (!config) return { success: false, error: `Unsupported platform: ${args.platform}` };

      const apiKey = process.env.COMPOSIO_API_KEY;
      if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured" };

      const data: any = await composioFetch(
        apiKey, `/connected_accounts/${encodeURIComponent(args.connectionId)}`
      );

      const status = data?.status;
      if (status !== "ACTIVE") {
        return { success: false, error: `Connection not active (status: ${status || "unknown"})` };
      }

      const tokenVal = data?.state?.val || data?.data || {};
      const accessToken: string | undefined =
        tokenVal.access_token || tokenVal.oauth_token || data?.accessToken || data?.access_token;
      const refreshToken: string =
        tokenVal.refresh_token || data?.refreshToken || data?.refresh_token || "";

      if (!accessToken) {
        return { success: false, error: "Composio connection active but no access token returned" };
      }

      const username: string = data?.username || data?.meta?.username || config.name;
      const platformUserId: string = data?.id || data?.uuid || args.connectionId;

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id,
        platform: args.platform,
        platformName: config.name,
        accessToken,
        refreshToken,
        platformUserId,
        platformUsername: username,
        scopes: config.scopes.join(","),
        anonymousByDefault: config.anonymousSupported,
        integrationId: "composio", // FIX: now accepted by savePlatformConnection
      });

      return { success: true, platformName: config.name, username };
    } catch (err: any) {
      return { success: false, error: `Composio callback failed: ${err?.message || String(err)}` };
    }
  },
});

export const getOAuthProviderStatus = query({
  args: {},
  handler: async () => {
    const composioKeySet = !!process.env.COMPOSIO_API_KEY;
    const composioPlatforms = Object.entries(COMPOSIO_APP_MAP)
      .filter(([, slug]) => slug)
      .map(([id]) => id);
    const trypostUrl = process.env.TRYPOST_URL || "";
    const trypostPlatforms = trypostUrl ? Object.keys(TRYPOST_PLATFORMS) : [];
    return { directEnabled: true, composioEnabled: composioKeySet, composioPlatforms, trypostEnabled: !!trypostUrl, trypostPlatforms, trypostUrl };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Start TryPost OAuth for unsupported platforms
// ═══════════════════════════════════════════════════════════════════
export const startTryPostOAuth = action({
  args: {
    platform: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; redirectUrl?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const trypostUrl = process.env.TRYPOST_URL;
      if (!trypostUrl) return { success: false, error: "TryPost URL not configured" };

      const trypostPlatform = TRYPOST_PLATFORMS[args.platform];
      if (!trypostPlatform) return { success: false, error: `${args.platform} not supported via TryPost` };

      const state = uuidV4();
      await ctx.runMutation(internal.social.storeOAuthState, {
        state,
        platform: `trypost_${args.platform}`,
        adminId: identity._id,
      });

      const redirectUrl = `${trypostUrl}/connect/${trypostPlatform}`;
      return { success: true, redirectUrl };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Sync connected accounts from TryPost API
// ═══════════════════════════════════════════════════════════════════
export const syncFromTryPost = action({
  args: {
    platform: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; synced?: number; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      const trypostUrl = process.env.TRYPOST_URL;
      const trypostApiKey = process.env.TRYPOST_API_KEY;
      if (!trypostUrl) return { success: false, error: "TRYPOST_URL not configured" };
      if (!trypostApiKey) return { success: false, error: "TRYPOST_API_KEY not configured" };

      const res = await fetch(`${trypostUrl}/api/social-accounts`, {
        headers: { "Authorization": `Bearer ${trypostApiKey}`, "Accept": "application/json" },
      });
      if (!res.ok) return { success: false, error: `TryPost API ${res.status}` };

      const data = await res.json();
      const accounts = data?.data || data || [];
      let synced = 0;

      for (const account of accounts) {
        if (args.platform && account.platform !== args.platform) continue;
        if (!account.access_token || !account.is_active) continue;

        const platformName = account.platform?.charAt(0).toUpperCase() + account.platform?.slice(1) || account.platform;

        await ctx.runMutation(internal.social.savePlatformConnection, {
          adminId: identity._id,
          platform: account.platform,
          platformName,
          accessToken: account.access_token,
          refreshToken: account.refresh_token || "",
          platformUserId: account.platform_user_id || "",
          platformUsername: account.username || account.display_name || "",
          expiresAt: account.token_expires_at ? new Date(account.token_expires_at).getTime() : undefined,
          scopes: account.scopes || "",
          anonymousByDefault: true,
          integrationId: "trypost",
        });
        synced++;
      }

      return { success: true, synced };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Telegram via bot token
// ═══════════════════════════════════════════════════════════════════