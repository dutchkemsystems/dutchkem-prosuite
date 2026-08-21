import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession } from "../auth_helpers";
import { DAILY_POSTING_TIMES } from "./platforms";

export const getAnalytics = query({
  args: { adminToken: v.optional(v.string()), period: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, period }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const since = Date.now() - (period === "30d" ? 30 : period === "7d" ? 7 : 1) * 86400000;

    const analytics = await ctx.db
      .query("trypost_analytics")
      .withIndex("by_recorded")
      .filter((q) => q.gt(q.field("recordedAt"), since))
      .collect();

    const posts = await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const publishedInPeriod = posts.filter((p) => (p.publishedAt ?? 0) >= since);

    // Aggregate by platform
    const byPlatform: Record<string, any> = {};
    for (const a of analytics) {
      if (!byPlatform[a.platform]) {
        byPlatform[a.platform] = {
          posts: 0,
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          engagementRate: 0,
        };
      }
      byPlatform[a.platform].posts++;
      byPlatform[a.platform].impressions += a.impressions ?? 0;
      byPlatform[a.platform].likes += a.likes ?? 0;
      byPlatform[a.platform].comments += a.comments ?? 0;
      byPlatform[a.platform].shares += a.shares ?? 0;
      byPlatform[a.platform].clicks += a.clicks ?? 0;
    }
    for (const key of Object.keys(byPlatform)) {
      const p = byPlatform[key];
      const totalEng = p.likes + p.comments + p.shares;
      p.engagementRate = p.impressions > 0 ? (totalEng / p.impressions) * 100 : 0;
    }

    const totalImpressions = Object.values(byPlatform).reduce((s: number, p: any) => s + p.impressions, 0);
    const totalEngagement = Object.values(byPlatform).reduce(
      (s: number, p: any) => s + p.likes + p.comments + p.shares,
      0
    );

    return {
      authError: false,
      period: period ?? "24h",
      summary: {
        postsPublished: publishedInPeriod.length,
        totalImpressions,
        totalEngagement,
        engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      },
      byPlatform,
    };
  },
});

export const getPostingSchedule = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, times: [] };
    return { authError: false, times: DAILY_POSTING_TIMES };
  },
});

export const refreshAnalytics = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const internalAny: any = internal.trypost;
    const recent = await ctx.runQuery(internalAny._getRecentlyPublished, {});
    let refreshed = 0;
    for (const post of recent) {
      const apiKey = process.env.TRYPOST_API_KEY;
      if (!apiKey) continue;
      try {
        const apiUrl = process.env.TRYPOST_API_URL ?? "http://localhost:4000";
        const response = await fetch(`${apiUrl}/api/analytics/post/${post._id}`, {
          headers: { "x-api-key": apiKey },
        });
        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internalAny._upsertAnalytics, {
            postId: post._id,
            platform: post.platforms[0],
            ...data,
          });
          refreshed++;
        }
      } catch {
        // Silently ignore individual fetch errors
      }
    }
    return { success: true, refreshed };
  },
});

export const _getRecentlyPublished = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 86400000;
    return await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .filter((q) => q.gt(q.field("publishedAt"), oneDayAgo))
      .take(50);
  },
});

export const _upsertAnalytics = internalMutation({
  args: {
    postId: v.id("trypost_scheduled_posts"),
    platform: v.string(),
    impressions: v.optional(v.number()),
    reach: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    clicks: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const engagementRate =
      args.impressions && args.impressions > 0
        ? (((args.likes ?? 0) + (args.comments ?? 0) + (args.shares ?? 0)) / args.impressions) * 100
        : 0;
    await ctx.db.insert("trypost_analytics", {
      postId: args.postId,
      platform: args.platform,
      impressions: args.impressions,
      reach: args.reach,
      likes: args.likes,
      comments: args.comments,
      shares: args.shares,
      clicks: args.clicks,
      engagementRate,
      recordedAt: Date.now(),
    });
  },
});

export const _getDuePosts = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("trypost_scheduled_posts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .filter((q) => q.lte(q.field("scheduledFor"), now))
      .collect();
  },
});
