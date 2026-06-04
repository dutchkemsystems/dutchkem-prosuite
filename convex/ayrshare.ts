// convex/ayrshare.ts
// Direct Ayrshare API integration for unified multi-platform social posting.
// Ayrshare (https://www.ayrshare.com) provides a single API to post to
// 10+ social networks. We use the direct API because Composio's Ayrshare
// toolkit only exposes 3 tools (auto-schedule, delete, history) — missing
// the critical create-post endpoint. We can re-wrap with Composio later
// when they add the missing tools.
//
// All endpoints use Bearer auth with AYRSHARE_API_KEY env var.
// Base URL: https://app.ayrshare.com/api
//
// Endpoints used:
//   GET  /user                    — account info & quota
//   POST /profiles                — list connected social accounts
//   POST /post                    — create/schedule a post
//   DELETE /post/{id}             — delete a post
//   GET  /history                 — get post history
//   GET  /analytics/post          — post-level analytics
//   GET  /analytics/social        — account-level analytics
//   POST /auto-schedule           — create recurring schedule
//   GET  /auto-schedule/list      — list recurring schedules
//   DELETE /auto-schedule/{id}    — delete recurring schedule

import { action, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { tryGetAdminSessionInAction, requireAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PLATFORM MAPPING
// ═══════════════════════════════════════════════════════════════════
// Ayrshare uses its own platform names. Map our internal IDs ↔ Ayrshare slugs.

export const AYRSHARE_PLATFORM_MAP: Record<string, string> = {
  x: "twitter",
  linkedin: "linkedin",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  pinterest: "pinterest",
  reddit: "reddit",
  threads: "threads",
  telegram: "telegram",
  bluesky: "bluesky", // Ayrshare supports Bluesky natively
};

// Ayrshare's currently supported platforms (we filter to these when posting)
export const AYRSHARE_SUPPORTED = Object.keys(AYRSHARE_PLATFORM_MAP);

// ═══════════════════════════════════════════════════════════════════
// LOW-LEVEL API HELPER
// ═══════════════════════════════════════════════════════════════════

const AYRSHARE_BASE = "https://app.ayrshare.com/api";

type AyrshareResult<T = any> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

async function ayrshareFetch<T = any>(
  path: string,
  init: { method?: string; body?: any; adminToken?: string } = {},
): Promise<AyrshareResult<T>> {
  const apiKey = process.env.AYRSHARE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: "AYRSHARE_API_KEY not configured" };
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  try {
    const res = await fetch(`${AYRSHARE_BASE}${path}`, {
      method: init.method || "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const errMsg = data?.message || data?.error || res.statusText || `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: errMsg };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUERY: Account info (quota, plan, email)
// ═══════════════════════════════════════════════════════════════════

export const getAyrshareAccount = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    account: v.optional(v.object({
      email: v.optional(v.string()),
      title: v.optional(v.string()),
      monthlyPostQuota: v.optional(v.number()),
      monthlyPostCount: v.optional(v.number()),
      monthlyApiCalls: v.optional(v.number()),
      refId: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const r = await ayrshareFetch("/user");
    if (!r.ok) return { ok: false, error: r.error || "Ayrshare API error" };
    const d: any = r.data || {};
    return {
      ok: true,
      account: {
        email: d.email,
        title: d.title,
        monthlyPostQuota: d.monthlyPostQuota,
        monthlyPostCount: d.monthlyPostCount,
        monthlyApiCalls: d.monthlyApiCalls,
        refId: d.refId,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Connected social accounts (which platforms the user has linked on Ayrshare)
// ═══════════════════════════════════════════════════════════════════

export const getAyrshareProfiles = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    profiles: v.optional(v.array(v.object({
      platform: v.string(),
      username: v.optional(v.string()),
      connected: v.boolean(),
    }))),
  }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const r = await ayrshareFetch("/profiles", { method: "POST" });
    if (!r.ok) return { ok: false, error: r.error || "Ayrshare API error" };
    const data: any = r.data || [];
    const profiles: { platform: string; username?: string; connected: boolean }[] = [];
    // Ayrshare returns: [{ profileKey: "twitter", username: "@x", displayName: "...", ... }, ...]
    if (Array.isArray(data)) {
      for (const p of data) {
        if (!p) continue;
        profiles.push({
          platform: p.profileKey || p.platform || p.refId || "unknown",
          username: p.username || p.displayName,
          connected: true,
        });
      }
    }
    return { ok: true, profiles };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Create / schedule a post (broadcast to multiple platforms)
// ═══════════════════════════════════════════════════════════════════

export const ayrsharePost = action({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),        // our internal IDs: ["x","linkedin","facebook"]
    mediaUrls: v.optional(v.array(v.string())),
    scheduleDate: v.optional(v.string()), // ISO 8601 datetime (e.g. "2026-06-05T15:00:00Z")
    adminToken: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    postId: v.optional(v.string()),
    status: v.optional(v.string()),
    platformResults: v.optional(v.array(v.object({
      platform: v.string(),
      status: v.string(),
      postUrl: v.optional(v.string()),
      error: v.optional(v.string()),
    }))),
    scheduled: v.optional(v.boolean()),
  }),
  handler: async (ctx, args): Promise<any> => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };

    if (!args.content || args.content.trim().length === 0) {
      return { ok: false, error: "Post content is required" };
    }
    if (!args.platforms || args.platforms.length === 0) {
      return { ok: false, error: "At least one platform is required" };
    }

    // Map our internal IDs to Ayrshare platform names; filter unsupported
    const aysPlatforms: string[] = [];
    const skipped: string[] = [];
    for (const p of args.platforms) {
      const ays = AYRSHARE_PLATFORM_MAP[p];
      if (ays) aysPlatforms.push(ays);
      else skipped.push(p);
    }
    if (aysPlatforms.length === 0) {
      return { ok: false, error: `None of the requested platforms are supported by Ayrshare (skipped: ${skipped.join(", ")})` };
    }

    const body: Record<string, any> = {
      post: args.content,
      platforms: aysPlatforms,
    };
    if (args.mediaUrls && args.mediaUrls.length > 0) {
      body.mediaUrls = args.mediaUrls;
    }
    if (args.scheduleDate) {
      // Ayrshare expects ISO 8601 with timezone
      body.scheduleDate = args.scheduleDate;
    }

    const r = await ayrshareFetch("/post", { method: "POST", body });
    if (!r.ok) return { ok: false, error: r.error || "Ayrshare post failed" };

    const data: any = r.data || {};
    const platformResults: any[] = [];
    if (Array.isArray(data.platforms)) {
      for (const pr of data.platforms) {
        platformResults.push({
          platform: pr.platform,
          status: pr.status,
          postUrl: pr.postUrl || pr.url,
          error: pr.error,
        });
      }
    } else if (Array.isArray(data.errors) && data.errors.length > 0) {
      for (const e of data.errors) {
        platformResults.push({ platform: e.platform || "unknown", status: "error", error: e.message || e.error });
      }
    }

    // Cache the post to our DB for history/analytics
    if (data.id) {
      await ctx.runMutation(internal.ayrshare.cacheAyrsharePost, {
        adminId: identity._id,
        aysPostId: String(data.id),
        content: args.content,
        platforms: args.platforms,
        aysPlatforms,
        mediaUrls: args.mediaUrls || [],
        scheduled: !!args.scheduleDate,
        scheduledFor: args.scheduleDate ? new Date(args.scheduleDate).getTime() : undefined,
        platformResults,
        status: data.status || (args.scheduleDate ? "scheduled" : "published"),
      });
    }

    return {
      ok: true,
      postId: data.id ? String(data.id) : undefined,
      status: data.status || (args.scheduleDate ? "scheduled" : "published"),
      platformResults,
      scheduled: !!args.scheduleDate,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Delete a post
// ═══════════════════════════════════════════════════════════════════

export const deleteAyrsharePost = action({
  args: {
    aysPostId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const r = await ayrshareFetch(`/post/${encodeURIComponent(args.aysPostId)}`, { method: "DELETE" });
    if (!r.ok) return { ok: false, error: r.error || "Delete failed" };
    await ctx.runMutation(internal.ayrshare.markPostDeleted, { aysPostId: args.aysPostId });
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Get post history
// ═══════════════════════════════════════════════════════════════════

export const getAyrshareHistory = action({
  args: {
    limit: v.optional(v.number()),
    lastDays: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    history: v.optional(v.array(v.any())),
  }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const params = new URLSearchParams();
    if (args.limit) params.set("limit", String(args.limit));
    if (args.lastDays) params.set("lastDays", String(args.lastDays));
    const qs = params.toString();
    const r = await ayrshareFetch(`/history${qs ? `?${qs}` : ""}`);
    if (!r.ok) return { ok: false, error: r.error || "History fetch failed" };
    const data: any = r.data;
    const history: any[] = Array.isArray(data) ? data : (data?.history || data?.posts || []);
    return { ok: true, history };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Post-level analytics
// ═══════════════════════════════════════════════════════════════════

export const getAyrsharePostAnalytics = action({
  args: {
    aysPostId: v.optional(v.string()),
    lastDays: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()), analytics: v.optional(v.any()) }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const params = new URLSearchParams();
    if (args.aysPostId) params.set("id", args.aysPostId);
    if (args.lastDays) params.set("lastDays", String(args.lastDays));
    const qs = params.toString();
    const r = await ayrshareFetch(`/analytics/post${qs ? `?${qs}` : ""}`);
    if (!r.ok) return { ok: false, error: r.error || "Analytics fetch failed" };
    return { ok: true, analytics: r.data };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Social-account-level analytics
// ═══════════════════════════════════════════════════════════════════

export const getAyrshareSocialAnalytics = action({
  args: {
    platforms: v.optional(v.array(v.string())), // our internal IDs
    adminToken: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()), analytics: v.optional(v.any()) }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const aysPlatforms = (args.platforms || []).map(p => AYRSHARE_PLATFORM_MAP[p] || p);
    const body = aysPlatforms.length > 0 ? { platforms: aysPlatforms } : undefined;
    const r = await ayrshareFetch("/analytics/social", { method: "POST", body });
    if (!r.ok) return { ok: false, error: r.error || "Analytics fetch failed" };
    return { ok: true, analytics: r.data };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Auto-schedule (recurring post schedule)
// ═══════════════════════════════════════════════════════════════════

export const createAyrshareAutoSchedule = action({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),
    times: v.array(v.string()),              // e.g. ["09:00", "15:00", "21:00"]
    weekdays: v.optional(v.array(v.number())), // 0=Sunday..6=Saturday (omit for all days)
    mediaUrls: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()), scheduleId: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };

    const aysPlatforms = args.platforms
      .map(p => AYRSHARE_PLATFORM_MAP[p])
      .filter(Boolean) as string[];
    if (aysPlatforms.length === 0) return { ok: false, error: "No supported platforms" };

    const body: Record<string, any> = {
      post: args.content,
      platforms: aysPlatforms,
      times: args.times,
    };
    if (args.weekdays && args.weekdays.length > 0) {
      body.weekdays = args.weekdays;
    }
    if (args.mediaUrls && args.mediaUrls.length > 0) {
      body.mediaUrls = args.mediaUrls;
    }

    const r = await ayrshareFetch("/auto-schedule", { method: "POST", body });
    if (!r.ok) return { ok: false, error: r.error || "Auto-schedule creation failed" };

    const data: any = r.data || {};
    return { ok: true, scheduleId: data.id ? String(data.id) : undefined };
  },
});

export const listAyrshareAutoSchedules = action({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    schedules: v.optional(v.array(v.any())),
  }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const r = await ayrshareFetch("/auto-schedule/list", { method: "GET" });
    if (!r.ok) return { ok: false, error: r.error || "Failed to list schedules" };
    const data: any = r.data;
    const schedules: any[] = Array.isArray(data) ? data : (data?.schedules || []);
    return { ok: true, schedules };
  },
});

export const deleteAyrshareAutoSchedule = action({
  args: { scheduleId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) return { ok: false, error: "Not authenticated" };
    const r = await ayrshareFetch(`/auto-schedule/${encodeURIComponent(args.scheduleId)}`, { method: "DELETE" });
    if (!r.ok) return { ok: false, error: r.error || "Delete failed" };
    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS — cache Ayrshare state to Convex
// ═══════════════════════════════════════════════════════════════════

export const cacheAyrsharePost = internalMutation({
  args: {
    adminId: v.string(),
    aysPostId: v.string(),
    content: v.string(),
    platforms: v.array(v.string()),
    aysPlatforms: v.array(v.string()),
    mediaUrls: v.array(v.string()),
    scheduled: v.boolean(),
    scheduledFor: v.optional(v.number()),
    platformResults: v.array(v.object({
      platform: v.string(),
      status: v.string(),
      postUrl: v.optional(v.string()),
      error: v.optional(v.string()),
    })),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ayrshare_posts")
      .withIndex("by_ays_id", (q) => q.eq("aysPostId", args.aysPostId))
      .first();
    const doc = {
      adminId: args.adminId,
      aysPostId: args.aysPostId,
      content: args.content,
      platforms: args.platforms,
      aysPlatforms: args.aysPlatforms,
      mediaUrls: args.mediaUrls,
      scheduled: args.scheduled,
      scheduledFor: args.scheduledFor,
      platformResults: args.platformResults,
      status: args.status,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      deletedAt: existing?.deletedAt,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("ayrshare_posts", doc);
    }
  },
});

export const markPostDeleted = internalMutation({
  args: { aysPostId: v.string() },
  handler: async (ctx, { aysPostId }) => {
    const existing = await ctx.db
      .query("ayrshare_posts")
      .withIndex("by_ays_id", (q) => q.eq("aysPostId", aysPostId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { deletedAt: Date.now(), status: "deleted" });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES — read cached Ayrshare state
// ═══════════════════════════════════════════════════════════════════

export const getCachedAyrsharePosts = query({
  args: { adminId: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let posts;
    if (args.adminId) {
      posts = await ctx.db
        .query("ayrshare_posts")
        .withIndex("by_admin", (q) => q.eq("adminId", args.adminId!))
        .order("desc")
        .take(100);
    } else {
      posts = await ctx.db.query("ayrshare_posts").order("desc").take(100);
    }
    return posts;
  },
});

export const getAyrshareStats = query({
  args: {},
  returns: v.object({
    postsCached: v.number(),
    scheduledCount: v.number(),
    publishedCount: v.number(),
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("ayrshare_posts").collect();
    return {
      postsCached: all.length,
      scheduledCount: all.filter(p => p.scheduled && !p.deletedAt).length,
      publishedCount: all.filter(p => !p.scheduled && !p.deletedAt && p.status === "published").length,
      deletedCount: all.filter(p => !!p.deletedAt).length,
    };
  },
});
