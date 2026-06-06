// composio_admin.ts
// ═══════════════════════════════════════════════════════════════════
// Composio admin helpers — caching, pre-warming, diagnostics.
// This module centralises Composio auth_config management so the
// hot path (startComposioOAuth in social.ts) doesn't have to list
// configs on every call.
// ═══════════════════════════════════════════════════════════════════

import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

// Toolkits that ACTUALLY exist in Composio as of 2026-06-04
// (verified against /api/v3.1/toolkits?limit=500)
const SUPPORTED_COMPOSIO_TOOLKITS = [
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
  "reddit",
  "discord",
];

async function composioFetch(apiKey: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Composio ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

// QUERY: Get cached auth_config for a toolkit (returns null if not cached)
export const getCachedAuthConfig = query({
  args: { toolkit: v.string() },
  handler: async (ctx, { toolkit }) => {
    return await ctx.db.query("composio_auth_configs")
      .withIndex("by_toolkit", (q) => q.eq("toolkit", toolkit))
      .first();
  },
});

// INTERNAL MUTATION: Upsert cached auth_config
export const upsertAuthConfig = internalMutation({
  args: {
    toolkit: v.string(),
    authConfigId: v.string(),
    isManaged: v.boolean(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("composio_auth_configs")
      .withIndex("by_toolkit", (q) => q.eq("toolkit", args.toolkit))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch("composio_auth_configs", existing._id, {
        authConfigId: args.authConfigId,
        isManaged: args.isManaged,
        lastVerifiedAt: now,
        lastError: args.lastError,
      });
    } else {
      await ctx.db.insert("composio_auth_configs", {
        toolkit: args.toolkit,
        authConfigId: args.authConfigId,
        isManaged: args.isManaged,
        createdAt: now,
        lastVerifiedAt: now,
        lastError: args.lastError,
      });
    }
  },
});

// INTERNAL MUTATION: Record a failed creation
export const recordAuthConfigError = internalMutation({
  args: { toolkit: v.string(), error: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("composio_auth_configs")
      .withIndex("by_toolkit", (q) => q.eq("toolkit", args.toolkit))
      .first();
    if (existing) {
      await ctx.db.patch("composio_auth_configs", existing._id, {
        lastError: args.error,
        lastVerifiedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("composio_auth_configs", {
        toolkit: args.toolkit,
        authConfigId: "",
        isManaged: false,
        createdAt: Date.now(),
        lastVerifiedAt: Date.now(),
        lastError: args.error,
      });
    }
  },
});

// ACTION: Get or create auth_config_id with caching
// This is the hot-path helper — used by startComposioOAuth.
// It first checks the DB cache, then lists from Composio, then
// creates a new managed config if none exists. The result is
// always cached.
export const getOrCreateAuthConfigIdCached = action({
  args: { toolkit: v.string() },
  handler: async (ctx, { toolkit }): Promise<{ authConfigId: string | null; error?: string; fromCache: boolean }> => {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) return { authConfigId: null, error: "COMPOSIO_API_KEY not set", fromCache: false };

    // 1) Check DB cache (skip if last error is recent — retry every 5 min)
    const cached: any = await ctx.runQuery(api.composio_admin.getCachedAuthConfig, { toolkit });
    if (cached?.authConfigId && (!cached.lastError || Date.now() - cached.lastVerifiedAt > 5 * 60 * 1000)) {
      return { authConfigId: cached.authConfigId, fromCache: true };
    }

    // 2) List existing configs from Composio
    let existingId: string | null = null;
    try {
      const list = await composioFetch(
        apiKey,
        `/auth_configs?toolkit_slug=${encodeURIComponent(toolkit)}&is_composio_managed=true&limit=1`
      );
      const items = list?.items || list?.data?.items || [];
      if (items.length > 0) {
        existingId = items[0].id || items[0].auth_config?.id;
      }
    } catch (e: any) {
      console.warn("List auth configs error:", e?.message || String(e));
    }

    if (existingId) {
      await ctx.runMutation(internal.composio_admin.upsertAuthConfig, {
        toolkit, authConfigId: existingId, isManaged: true, lastError: undefined,
      });
      return { authConfigId: existingId, fromCache: false };
    }

    // 3) Create new managed config
    try {
      const created = await composioFetch(apiKey, "/auth_configs", {
        method: "POST",
        body: JSON.stringify({
          toolkit: { slug: toolkit },
          type: "use_composio_managed_auth",
        }),
      });
      const newId = created?.auth_config?.id || created?.id;
      if (!newId) {
        const errMsg = `Composio did not return auth_config.id — response: ${JSON.stringify(created).slice(0, 200)}`;
        await ctx.runMutation(internal.composio_admin.recordAuthConfigError, { toolkit, error: errMsg });
        return { authConfigId: null, error: errMsg, fromCache: false };
      }
      await ctx.runMutation(internal.composio_admin.upsertAuthConfig, {
        toolkit, authConfigId: newId, isManaged: true, lastError: undefined,
      });
      return { authConfigId: newId, fromCache: false };
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      await ctx.runMutation(internal.composio_admin.recordAuthConfigError, { toolkit, error: errMsg });
      return { authConfigId: null, error: errMsg, fromCache: false };
    }
  },
});

// ACTION: Pre-warm all known toolkit auth configs (admin-only).
// Idempotent: safe to call repeatedly. Use on deploy or via cron.
export const prewarmAllAuthConfigs = action({
  args: {},
  handler: async (ctx): Promise<{ results: Array<{ toolkit: string; status: "ok" | "failed"; authConfigId?: string; error?: string }> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { results: [{ toolkit: "ALL", status: "failed", error: "Not authenticated" }] };

    const results: Array<{ toolkit: string; status: "ok" | "failed"; authConfigId?: string; error?: string }> = [];
    for (const toolkit of SUPPORTED_COMPOSIO_TOOLKITS) {
      const r = await ctx.runAction(api.composio_admin.getOrCreateAuthConfigIdCached, { toolkit });
      if (r.authConfigId) {
        results.push({ toolkit, status: "ok", authConfigId: r.authConfigId });
      } else {
        results.push({ toolkit, status: "failed", error: r.error });
      }
    }
    return { results };
  },
});

// ACTION: Diagnostic — runs the full Composio flow for a platform end-to-end
// and returns detailed info about every step. Useful for debugging
// the [CONVEX M(social:generateOAuthUrl)] error.
export const diagnoseComposioFlow = action({
  args: { platform: v.string() },
  handler: async (ctx, { platform }): Promise<{
    platform: string;
    steps: Array<{ step: string; status: "ok" | "failed"; details?: any; error?: string; durationMs: number }>;
    finalAuthUrl?: string;
    finalConnectionId?: string;
  }> => {
    const steps: Array<{ step: string; status: "ok" | "failed"; details?: any; error?: string; durationMs: number }> = [];

    const time = async <T,>(step: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      try {
        const result = await fn();
        steps.push({ step, status: "ok", details: typeof result === "object" ? JSON.stringify(result).slice(0, 200) : String(result), durationMs: Date.now() - start });
        return result;
      } catch (e: any) {
        steps.push({ step, status: "failed", error: e?.message || String(e), durationMs: Date.now() - start });
        throw e;
      }
    };

    const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
      x: "twitter",
      linkedin: "linkedin",
      facebook: "facebook",
      youtube: "youtube",
      reddit: "reddit",
      discord: "discord",
    };

    const apiKey = process.env.COMPOSIO_API_KEY;
    steps.push({ step: "env_check", status: apiKey ? "ok" : "failed", details: `COMPOSIO_API_KEY set: ${!!apiKey}`, durationMs: 0 });
    if (!apiKey) {
      return { platform, steps };
    }

    const composioApp = COMPOSIO_APP_MAP[platform];
    steps.push({ step: "platform_map", status: composioApp ? "ok" : "failed", details: `composioApp=${composioApp}`, durationMs: 0 });
    if (!composioApp) {
      return { platform, steps };
    }

    let authConfigId: string | null = null;
    try {
      const r = await time("get_or_create_auth_config", async () => {
        return await ctx.runAction(api.composio_admin.getOrCreateAuthConfigIdCached, { toolkit: composioApp });
      });
      authConfigId = r.authConfigId;
    } catch {
      return { platform, steps };
    }

    if (!authConfigId) {
      steps.push({ step: "create_link", status: "failed", error: "No authConfigId available — likely toolkit does not have managed creds", durationMs: 0 });
      return { platform, steps };
    }

    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "diagnostic-user";

    const linkResult = await time("create_connect_link", async () => {
      return await composioFetch(apiKey, "/connected_accounts/link", {
        method: "POST",
        body: JSON.stringify({
          auth_config_id: authConfigId,
          user_id: userId,
        }),
      });
    });

    const payload = linkResult?.data ?? linkResult;
    const redirectUrl = payload?.redirect_url;
    const connectionId = payload?.connected_account_id;

    if (redirectUrl) {
      steps.push({ step: "link_parsed", status: "ok", details: `redirectUrl starts with ${redirectUrl.slice(0, 30)}...`, durationMs: 0 });
    } else {
      steps.push({ step: "link_parsed", status: "failed", error: "No redirect_url in response", durationMs: 0 });
    }

    return {
      platform,
      steps,
      finalAuthUrl: redirectUrl,
      finalConnectionId: connectionId,
    };
  },
});
