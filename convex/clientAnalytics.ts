import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// CLIENT ANALYTICS DASHBOARD — User behavior insights & metrics
// ═══════════════════════════════════════════════════════════════════

// Track user events
export const trackEvent = internalMutation({
  args: {
    userId: v.id("users"),
    event: v.string(),
    properties: v.optional(v.any()),
    page: v.optional(v.string()),
    duration: v.optional(v.number()),
    referrer: v.optional(v.string()),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analytics_events", {
      userId: args.userId,
      event: args.event,
      properties: args.properties,
      page: args.page,
      duration: args.duration,
      referrer: args.referrer,
      device: args.device,
      browser: args.browser,
      os: args.os,
      createdAt: Date.now(),
    });
  },
});

// Get user analytics dashboard data
export const getUserAnalytics = query({
  args: {
    period: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject as any;
    const periodDays = args.period === "90d" ? 90 : args.period === "30d" ? 30 : 7;
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("analytics_events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const recentEvents = events.filter((e) => e.createdAt >= cutoff);

    // Event counts by type
    const eventCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    }

    // Page views
    const pageViews: Record<string, number> = {};
    for (const event of recentEvents.filter((e) => e.event === "page_view")) {
      const page = event.page || "unknown";
      pageViews[page] = (pageViews[page] || 0) + 1;
    }

    // Sessions (unique days with activity)
    const uniqueDays = new Set(
      recentEvents.map((e) => new Date(e.createdAt).toISOString().split("T")[0])
    );

    // Average session duration
    const durationEvents = recentEvents.filter((e) => e.duration && e.duration > 0);
    const avgDuration =
      durationEvents.length > 0
        ? durationEvents.reduce((sum, e) => sum + (e.duration || 0), 0) /
          durationEvents.length
        : 0;

    // Device breakdown
    const devices: Record<string, number> = {};
    for (const event of recentEvents) {
      const device = event.device || "unknown";
      devices[device] = (devices[device] || 0) + 1;
    }

    // Browser breakdown
    const browsers: Record<string, number> = {};
    for (const event of recentEvents) {
      const browser = event.browser || "unknown";
      browsers[browser] = (browsers[browser] || 0) + 1;
    }

    // Referrer sources
    const referrers: Record<string, number> = {};
    for (const event of recentEvents) {
      const referrer = event.referrer || "direct";
      referrers[referrer] = (referrers[referrer] || 0) + 1;
    }

    // Daily activity (last 7 days)
    const dailyActivity: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const count = recentEvents.filter(
        (e) => new Date(e.createdAt).toISOString().split("T")[0] === date
      ).length;
      dailyActivity.push({ date, count });
    }

    return {
      totalEvents: recentEvents.length,
      uniqueSessions: uniqueDays.size,
      avgSessionDuration: Math.round(avgDuration),
      eventCounts,
      pageViews: Object.entries(pageViews)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      devices: Object.entries(devices).map(([device, count]) => ({
        device,
        count,
        percentage: Math.round((count / recentEvents.length) * 100),
      })),
      browsers: Object.entries(browsers).map(([browser, count]) => ({
        browser,
        count,
        percentage: Math.round((count / recentEvents.length) * 100),
      })),
      referrers: Object.entries(referrers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([source, count]) => ({ source, count })),
      dailyActivity,
    };
  },
});

// Get admin analytics (all users)
export const getAdminAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Check admin role
    const user = await ctx.db.get(identity.subject as any) as any;
    if (!user || user.role !== "admin") return null;

    const events = await ctx.db.query("analytics_events").collect();
    const users = await ctx.db.query("users").collect();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    // Active users (last 7 days)
    const activeUsers = new Set(
      events
        .filter((e) => now - e.createdAt < oneWeek)
        .map((e) => e.userId)
    ).size;

    // New users (last 30 days)
    const thirtyDaysAgo = now - 30 * oneDay;
    const newUsers = users.filter(
      (u) => u._creationTime >= thirtyDaysAgo
    ).length;

    // Total events today
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEvents = events.filter((e) => e.createdAt >= todayStart).length;

    // Top pages
    const pageViews: Record<string, number> = {};
    for (const event of events.filter((e) => e.event === "page_view")) {
      const page = event.page || "unknown";
      pageViews[page] = (pageViews[page] || 0) + 1;
    }

    // Event trends (last 7 days)
    const eventTrends: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * oneDay).toISOString().split("T")[0];
      const count = events.filter(
        (e) => new Date(e.createdAt).toISOString().split("T")[0] === date
      ).length;
      eventTrends.push({ date, count });
    }

    return {
      totalUsers: users.length,
      activeUsers,
      newUsers,
      totalEvents: events.length,
      todayEvents,
      topPages: Object.entries(pageViews)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      eventTrends,
    };
  },
});

// Get funnel analysis
export const getFunnelAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject as any;

    const events = await ctx.db
      .query("analytics_events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Define funnel steps
    const funnelSteps = [
      { name: "Visit", event: "page_view" },
      { name: "Sign Up", event: "signup" },
      { name: "First Action", event: "first_action" },
      { name: "Subscription", event: "subscribe" },
      { name: "Retention", event: "return_visit" },
    ];

    const funnel: Array<{ name: string; event: string; count: number; conversionRate: number }> = funnelSteps.map((step) => ({
      ...step,
      count: events.filter((e) => e.event === step.event).length,
      conversionRate: 0,
    }));

    // Calculate conversion rates
    for (let i = 1; i < funnel.length; i++) {
      const prevCount = funnel[i - 1].count;
      const currentCount = funnel[i].count;
      funnel[i].conversionRate =
        prevCount > 0 ? Math.round((currentCount / prevCount) * 100) : 0;
    }

    return funnel;
  },
});
