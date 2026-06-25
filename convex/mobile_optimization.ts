import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// MOBILE OPTIMIZATION
// Optimized endpoints for mobile devices
// ═══════════════════════════════════════════════════════════════════

export const getMobileDashboard = action({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Get condensed data for mobile
    const stats = await ctx.runQuery(internal.mobile_optimization.getMobileStats, { adminToken: args.adminToken });
    const alerts = await ctx.runQuery(internal.mobile_optimization.getMobileAlerts, { adminToken: args.adminToken });

    return {
      success: true,
      stats,
      alerts: alerts.slice(0, 5), // Limit for mobile
      lastUpdated: Date.now(),
    };
  },
});

export const getMobileStats = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get condensed stats
    const campaigns = await ctx.db.query("ad_campaigns").collect();
    const recentLogs = await ctx.db.query("mimo_health_logs")
      .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
      .collect();

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c: any) => c.status === "active").length,
      healthChecks: recentLogs.length,
      systemStatus: "operational",
    };
  },
});

export const getMobileAlerts = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const alerts = await ctx.db.query("mimo_health_logs")
      .filter((q) => 
        q.or(q.eq(q.field("severity"), "warning"), q.eq(q.field("severity"), "critical"))
      )
      .order("desc")
      .take(5);

    return alerts;
  },
});

export const getMobileQuickActions = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return [
      { id: "create-ad", label: "Create Ad", icon: "🎨", action: "create_ad" },
      { id: "view-campaigns", label: "View Campaigns", icon: "📊", action: "view_campaigns" },
      { id: "check-health", label: "Check Health", icon: "🏥", action: "check_health" },
      { id: "post-telegram", label: "Post to Telegram", icon: "📱", action: "post_telegram" },
      { id: "generate-video", label: "Generate Video", icon: "🎬", action: "generate_video" },
      { id: "generate-poster", label: "Generate Poster", icon: "🖼️", action: "generate_poster" },
    ];
  },
});
