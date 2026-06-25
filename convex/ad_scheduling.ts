import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// SCHEDULING INTELLIGENCE — Best time to post analysis
// ═══════════════════════════════════════════════════════════════════

// Platform-specific optimal posting times (based on research)
const PLATFORM_OPTIMAL_TIMES: Record<string, Array<{ hour: number; day: number; score: number }>> = {
  x: [
    { hour: 8, day: 1, score: 0.9 }, { hour: 12, day: 3, score: 0.85 },
    { hour: 17, day: 5, score: 0.88 }, { hour: 9, day: 2, score: 0.82 },
    { hour: 14, day: 4, score: 0.8 },
  ],
  linkedin: [
    { hour: 7, day: 2, score: 0.92 }, { hour: 10, day: 3, score: 0.88 },
    { hour: 12, day: 4, score: 0.85 }, { hour: 17, day: 1, score: 0.8 },
    { hour: 8, day: 5, score: 0.78 },
  ],
  facebook: [
    { hour: 9, day: 5, score: 0.88 }, { hour: 13, day: 3, score: 0.85 },
    { hour: 15, day: 4, score: 0.82 }, { hour: 10, day: 1, score: 0.8 },
    { hour: 14, day: 2, score: 0.78 },
  ],
  instagram: [
    { hour: 11, day: 5, score: 0.9 }, { hour: 14, day: 3, score: 0.88 },
    { hour: 19, day: 6, score: 0.85 }, { hour: 12, day: 4, score: 0.82 },
    { hour: 10, day: 2, score: 0.8 },
  ],
  tiktok: [
    { hour: 10, day: 6, score: 0.92 }, { hour: 14, day: 2, score: 0.88 },
    { hour: 19, day: 4, score: 0.85 }, { hour: 7, day: 3, score: 0.82 },
    { hour: 21, day: 5, score: 0.8 },
  ],
  youtube: [
    { hour: 12, day: 5, score: 0.9 }, { hour: 15, day: 6, score: 0.88 },
    { hour: 18, day: 4, score: 0.85 }, { hour: 10, day: 3, score: 0.82 },
    { hour: 20, day: 2, score: 0.8 },
  ],
};

export const getOptimalPostingTimes = action({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    // Get historical performance data
    const historicalData = await ctx.runQuery(internal.ad_scheduling.getHistoricalPerformance, {
      campaignId: args.campaignId,
      platform: args.platform,
      days: 30,
    });

    // Get platform optimal times
    const platformTimes = PLATFORM_OPTIMAL_TIMES[args.platform] || PLATFORM_OPTIMAL_TIMES.x;

    // Analyze historical performance by hour and day
    const performanceByHour: Record<number, { impressions: number; clicks: number; conversions: number }> = {};
    const performanceByDay: Record<number, { impressions: number; clicks: number; conversions: number }> = {};

    for (const entry of historicalData) {
      const date = new Date(entry.date);
      const hour = date.getHours();
      const day = date.getDay();

      if (!performanceByHour[hour]) performanceByHour[hour] = { impressions: 0, clicks: 0, conversions: 0 };
      if (!performanceByDay[day]) performanceByDay[day] = { impressions: 0, clicks: 0, conversions: 0 };

      performanceByHour[hour].impressions += entry.impressions;
      performanceByHour[hour].clicks += entry.clicks;
      performanceByHour[hour].conversions += entry.conversions;

      performanceByDay[day].impressions += entry.impressions;
      performanceByDay[day].clicks += entry.clicks;
      performanceByDay[day].conversions += entry.conversions;
    }

    // Calculate CTR by hour and find top hours
    const hourlyScores = Object.entries(performanceByHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      ctr: data.clicks / Math.max(data.impressions, 1),
      totalEngagement: data.clicks + data.conversions,
    })).sort((a, b) => b.ctr - a.ctr);

    // Calculate performance by day
    const dailyScores = Object.entries(performanceByDay).map(([day, data]) => ({
      day: parseInt(day),
      dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parseInt(day)],
      ctr: data.clicks / Math.max(data.impressions, 1),
      totalEngagement: data.clicks + data.conversions,
    })).sort((a, b) => b.ctr - a.ctr);

    // Combine historical data with platform defaults
    const recommendations = platformTimes.map((t) => {
      const historicalCTR = hourlyScores.find(h => h.hour === t.hour)?.ctr || 0;
      const historicalEngagement = hourlyScores.find(h => h.hour === t.hour)?.totalEngagement || 0;
      
      // Score: 60% historical + 40% platform default
      const combinedScore = (historicalCTR * 0.6 + t.score * 0.4);
      
      return {
        hour: t.hour,
        day: t.day,
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][t.day],
        score: combinedScore,
        historicalCTR,
        platformDefault: t.score,
        recommendation: combinedScore > 0.85 ? "excellent" : combinedScore > 0.75 ? "good" : "average",
      };
    }).sort((a, b) => b.score - a.score);

    // Get timezone-adjusted times
    const timezone = args.timezone || "Africa/Lagos";
    const adjustedRecommendations = recommendations.map((rec) => {
      // Convert to timezone (simplified - in production use a timezone library)
      return {
        ...rec,
        localTime: `${rec.hour.toString().padStart(2, "0")}:00`,
        timezone,
      };
    });

    // Save recommendations
    await ctx.runMutation(internal.ad_scheduling.saveSchedulingRecommendations, {
      campaignId: args.campaignId,
      platform: args.platform,
      recommendations: adjustedRecommendations.slice(0, 5),
    });

    return {
      success: true,
      platform: args.platform,
      topTimes: adjustedRecommendations.slice(0, 5),
      hourlyPerformance: hourlyScores,
      dailyPerformance: dailyScores,
      totalDataPoints: historicalData.length,
    };
  },
});

export const getHistoricalPerformance = internalQuery({
  args: { campaignId: v.id("ad_campaigns"), platform: v.string(), days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results = [];
    const now = Date.now();
    
    for (let i = 0; i < args.days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dayAnalytics = await ctx.db.query("ad_analytics")
        .withIndex("by_campaign_date", (q) => q.eq("campaignId", args.campaignId).eq("date", date))
        .filter((q) => q.eq(q.field("platform"), args.platform))
        .collect();
      
      for (const entry of dayAnalytics) {
        results.push({
          ...entry,
          hour: new Date(date).getHours(),
          dayOfWeek: new Date(date).getDay(),
        });
      }
    }
    
    return results;
  },
});

export const saveSchedulingRecommendations = internalMutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    recommendations: v.array(v.object({
      hour: v.number(),
      day: v.number(),
      dayName: v.string(),
      score: v.number(),
      historicalCTR: v.number(),
      platformDefault: v.number(),
      recommendation: v.string(),
      localTime: v.string(),
      timezone: v.string(),
    })),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Check if recommendations exist for this campaign/platform
    const existing = await ctx.db.query("ad_scheduling_recommendations")
      .withIndex("by_campaign_platform", (q) => q.eq("campaignId", args.campaignId).eq("platform", args.platform))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        recommendations: args.recommendations,
        updatedAt: Date.now(),
      });
      return { success: true, updated: true };
    }

    await ctx.db.insert("ad_scheduling_recommendations", {
      campaignId: args.campaignId,
      platform: args.platform,
      recommendations: args.recommendations,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, inserted: true };
  },
});

export const getSchedulingRecommendations = query({
  args: { adminToken: v.string(), campaignId: v.id("ad_campaigns"), platform: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_scheduling_recommendations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId));

    if (args.platform) {
      q = q.filter((q) => q.eq(q.field("platform"), args.platform));
    }

    return await q.collect();
  },
});

export const autoScheduleAd = action({
  args: {
    adminToken: v.string(),
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    // Get recommendations
    const recommendations = await ctx.runQuery(internal.ad_scheduling.getSchedulingRecommendationsForAd, {
      campaignId: args.campaignId,
      platform: args.platform,
    });

    if (!recommendations || recommendations.length === 0) {
      // Use platform defaults
      const platformTimes = PLATFORM_OPTIMAL_TIMES[args.platform] || PLATFORM_OPTIMAL_TIMES.x;
      const bestTime = platformTimes[0];
      
      const nextOccurrence = getNextOccurrence(bestTime.hour, bestTime.day);
      
      await ctx.runMutation(internal.ad_scheduling.scheduleAd, {
        adId: args.adId,
        scheduledFor: nextOccurrence,
      });

      return {
        success: true,
        scheduledFor: nextOccurrence,
        reason: "Using platform default optimal time",
      };
    }

    // Use top recommendation
    const topRec = recommendations[0];
    const nextOccurrence = getNextOccurrence(topRec.hour, topRec.day);

    await ctx.runMutation(internal.ad_scheduling.scheduleAd, {
      adId: args.adId,
      scheduledFor: nextOccurrence,
    });

    return {
      success: true,
      scheduledFor: nextOccurrence,
      reason: `Scheduled based on ${topRec.recommendation} performance score (${(topRec.score * 100).toFixed(1)}%)`,
    };
  },
});

export const getSchedulingRecommendationsForAd = internalQuery({
  args: { campaignId: v.id("ad_campaigns"), platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rec = await ctx.db.query("ad_scheduling_recommendations")
      .withIndex("by_campaign_platform", (q) => q.eq("campaignId", args.campaignId).eq("platform", args.platform))
      .first();
    
    return rec?.recommendations || [];
  },
});

export const scheduleAd = internalMutation({
  args: { adId: v.id("ad_ads"), scheduledFor: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.adId, {
      scheduledFor: args.scheduledFor,
      status: "scheduled",
    });
    return { success: true };
  },
});

function getNextOccurrence(hour: number, dayOfWeek: number): number {
  const now = new Date();
  const target = new Date();
  
  // Set target time
  target.setHours(hour, 0, 0, 0);
  
  // Calculate days until target day of week
  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;
  
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  // If it's the same day but time has passed, add a week
  if (daysUntilTarget === 0 && target <= now) {
    daysUntilTarget = 7;
  }
  
  target.setDate(target.getDate() + daysUntilTarget);
  
  return target.getTime();
}

export const getOptimalTimesForPlatform = query({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return PLATFORM_OPTIMAL_TIMES[args.platform] || PLATFORM_OPTIMAL_TIMES.x;
  },
});
