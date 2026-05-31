import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * PLATFORM ANALYTICS - Track visits, registrations, subscriptions, revenue per platform
 */

// Supported platforms
const PLATFORMS = [
  { id: "web", name: "Website", icon: "🌐" },
  { id: "x", name: "X (Twitter)", icon: "𝕏" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "🎬" },
  { id: "direct", name: "Direct Traffic", icon: "🔗" },
];

/**
 * Get platform analytics summary
 */
export const getPlatformAnalyticsSummary = query({
  args: {
    timeRange: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime: number;
    
    switch (args.timeRange) {
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get leads by source
    const leads = await ctx.db.query("leads")
      .filter(q => q.gte(q.field("receivedAt"), startTime))
      .collect();

    // Get users by registration source
    const users = await ctx.db.query("users")
      .filter(q => q.gte(q.field("_creationTime"), startTime))
      .collect();

    // Get subscriptions
    const subscriptions = await ctx.db.query("subscriptions")
      .filter(q => q.gte(q.field("_creationTime"), startTime))
      .collect();

    // Get payments
    const payments = await ctx.db.query("payment_verifications")
      .filter(q => q.eq(q.field("status"), "approved"))
      .filter(q => q.gte(q.field("verifiedAt"), startTime))
      .collect();

    // Calculate per-platform metrics
    const platformMetrics = PLATFORMS.map(platform => {
      const platformLeads = leads.filter(l => l.source === platform.id);
      const platformUsers = users.filter(u => {
        // Match by email from leads
        const leadEmails = platformLeads.filter(l => l.email).map(l => l.email);
        return u.email && leadEmails.includes(u.email);
      });
      const platformSubs = subscriptions.filter(s => {
        const user = users.find(u => u._id === s.userId);
        return user && platformUsers.some(pu => pu._id === user._id);
      });
      const platformPayments = payments.filter(p => {
        const user = users.find(u => u._id === p.userId);
        return user && platformUsers.some(pu => pu._id === user._id);
      });

      const revenue = platformPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...platform,
        visits: platformLeads.length * 10, // Estimate: 10 visits per lead
        registrations: platformUsers.length,
        subscriptions: platformSubs.length,
        revenue,
        conversionRate: platformLeads.length > 0 
          ? Math.round((platformSubs.length / platformLeads.length) * 100)
          : 0,
      };
    });

    // Total metrics
    const totalVisits = platformMetrics.reduce((sum, p) => sum + p.visits, 0);
    const totalRegistrations = platformMetrics.reduce((sum, p) => sum + p.registrations, 0);
    const totalSubscriptions = platformMetrics.reduce((sum, p) => sum + p.subscriptions, 0);
    const totalRevenue = platformMetrics.reduce((sum, p) => sum + p.revenue, 0);

    return {
      platforms: platformMetrics,
      totals: {
        visits: totalVisits,
        registrations: totalRegistrations,
        subscriptions: totalSubscriptions,
        revenue: totalRevenue,
        conversionRate: totalVisits > 0 
          ? Math.round((totalSubscriptions / totalVisits) * 100)
          : 0,
      },
      timeRange: args.timeRange,
      startTime,
      endTime: now,
    };
  },
});

/**
 * Get daily platform metrics for charts
 */
export const getDailyPlatformMetrics = query({
  args: { days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const metrics = [];

    for (let i = args.days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const date = new Date(dayStart).toISOString().split("T")[0];

      // Get leads for this day
      const leads = await ctx.db.query("leads")
        .filter(q => q.gte(q.field("receivedAt"), dayStart))
        .filter(q => q.lt(q.field("receivedAt"), dayEnd))
        .collect();

      // Get payments for this day
      const payments = await ctx.db.query("payment_verifications")
        .filter(q => q.eq(q.field("status"), "approved"))
        .filter(q => q.gte(q.field("verifiedAt"), dayStart))
        .filter(q => q.lt(q.field("verifiedAt"), dayEnd))
        .collect();

      const revenue = payments.reduce((sum, p) => sum + p.amount, 0);

      metrics.push({
        date,
        visits: leads.length * 10,
        registrations: leads.filter(l => l.status === "converted").length,
        revenue,
      });
    }

    return metrics;
  },
});

/**
 * Track page visit
 */
export const trackVisit = mutation({
  args: {
    platform: v.string(),
    page: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Increment visit counter
    const key = `VISIT_${args.platform.toUpperCase()}_${new Date().toISOString().split("T")[0]}`;
    
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: ((existing.value as number) || 0) + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: 1,
        description: `Visit counter for ${args.platform}`,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
