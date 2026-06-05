import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO CLIENT — View-only queries for client dashboard
// ═══════════════════════════════════════════════════════════════════
// This module provides ONLY read queries and safe mutations for the
// client dashboard. Clients see:
//   - Activity feed (what agents did for them)
//   - Quick action buttons (trigger agent tasks)
//   - Notification preferences (simple toggles)
//   - Performance summary (value delivered)
//
// Clients CANNOT:
//   - Connect to external APIs
//   - See tool lists or integration settings
//   - Modify Composio configurations
//   - Call any function from composioHub.ts
//
// Auth: Uses Convex Auth (useConvexAuth), NOT the custom admin session.
// The userId is derived from the authenticated Convex identity.

// ─── ACTIVITY FEED ───
// Shows what agents did for this client using Composio

export const getActivityFeed = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { limit }) => {
    // Get the authenticated user's ID from Convex Auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Look up the user by their auth subject
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    // Get action logs where clientId matches this user
    const logs = await ctx.db.query("composio_action_logs")
      .withIndex("by_client", q => q.eq("clientId", user._id))
      .order("desc")
      .take(limit || 20);

    return logs.map(log => ({
      id: log._id,
      platform: log.platform,
      action: log.action,
      status: log.status,
      agentId: log.agentId,
      content: log.content,
      timestamp: log.timestamp,
      durationMs: log.durationMs,
      error: log.error,
      icon: getPlatformIcon(log.platform),
      label: getActionLabel(log.action),
    }));
  },
});

// ─── QUICK ACTIONS ───
// Available agent tasks the client can trigger

export const getQuickActions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Quick actions are predefined agent tasks clients can trigger
    return [
      {
        id: "generate_content",
        agentId: "A3",
        name: "Generate Content",
        description: "Create SEO blog posts, social content, or sales copy",
        icon: "✍️",
        category: "content",
        enabled: true,
      },
      {
        id: "research",
        agentId: "A1",
        name: "Research Report",
        description: "Get a detailed research report or literature review",
        icon: "🎓",
        category: "research",
        enabled: true,
      },
      {
        id: "business_plan",
        agentId: "A2",
        name: "Business Plan",
        description: "Generate a business plan or financial model",
        icon: "💼",
        category: "business",
        enabled: true,
      },
      {
        id: "resume",
        agentId: "A4",
        name: "Resume / CV",
        description: "Create or optimize your resume and cover letter",
        icon: "📄",
        category: "career",
        enabled: true,
      },
      {
        id: "exam_prep",
        agentId: "A6",
        name: "Exam Prep",
        description: "Study guides, practice tests, and exam strategies",
        icon: "📝",
        category: "education",
        enabled: true,
      },
      {
        id: "finance",
        agentId: "A7",
        name: "Financial Advice",
        description: "Budget planning, investment advice, tax planning",
        icon: "💰",
        category: "finance",
        enabled: true,
      },
      {
        id: "video",
        agentId: "A8",
        name: "Video Production",
        description: "Video editing, animation, and motion graphics",
        icon: "🎬",
        category: "media",
        enabled: true,
      },
      {
        id: "wellness",
        agentId: "A9",
        name: "Wellness Plan",
        description: "Meal plans, workout routines, and health coaching",
        icon: "🏥",
        category: "health",
        enabled: true,
      },
      {
        id: "home_services",
        agentId: "A10",
        name: "Home Services",
        description: "Cleaning schedules, maintenance planning",
        icon: "🧹",
        category: "home",
        enabled: true,
      },
      {
        id: "translation",
        agentId: "A14",
        name: "Translation",
        description: "Document translation and localization services",
        icon: "🗣️",
        category: "language",
        enabled: true,
      },
    ];
  },
});

// ─── NOTIFICATION PREFERENCES ───

export const getNotificationPrefs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    const prefs = await ctx.db.query("composio_notification_prefs")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    // Return defaults if no prefs exist
    return prefs ?? {
      emailOnAction: true,
      pushOnAction: true,
      weeklyReport: true,
      agentActivityDigest: false,
    };
  },
});

export const updateNotificationPrefs = mutation({
  args: {
    emailOnAction: v.optional(v.boolean()),
    pushOnAction: v.optional(v.boolean()),
    weeklyReport: v.optional(v.boolean()),
    agentActivityDigest: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db.query("composio_notification_prefs")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    const patch: any = { updatedAt: Date.now() };
    if (args.emailOnAction !== undefined) patch.emailOnAction = args.emailOnAction;
    if (args.pushOnAction !== undefined) patch.pushOnAction = args.pushOnAction;
    if (args.weeklyReport !== undefined) patch.weeklyReport = args.weeklyReport;
    if (args.agentActivityDigest !== undefined) patch.agentActivityDigest = args.agentActivityDigest;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("composio_notification_prefs", {
        userId: user._id,
        emailOnAction: args.emailOnAction ?? true,
        pushOnAction: args.pushOnAction ?? true,
        weeklyReport: args.weeklyReport ?? true,
        agentActivityDigest: args.agentActivityDigest ?? false,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── PERFORMANCE SUMMARY ───
// Value delivered to this client by agents

export const getPerformanceSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    const oneWeekAgo = now - 604800000;
    const oneMonthAgo = now - 2592000000;

    // Get this client's action logs
    const allLogs = await ctx.db.query("composio_action_logs")
      .withIndex("by_client", q => q.eq("clientId", user._id))
      .collect();

    const thisWeek = allLogs.filter(l => l.timestamp > oneWeekAgo);
    const thisMonth = allLogs.filter(l => l.timestamp > oneMonthAgo);

    // Get platform breakdown
    const platformStats: Record<string, { actions: number; success: number }> = {};
    for (const log of thisMonth) {
      if (!platformStats[log.platform]) {
        platformStats[log.platform] = { actions: 0, success: 0 };
      }
      platformStats[log.platform].actions++;
      if (log.status === "success") platformStats[log.platform].success++;
    }

    // Get agent breakdown
    const agentStats: Record<string, { actions: number; success: number }> = {};
    for (const log of thisMonth) {
      if (!log.agentId) continue;
      if (!agentStats[log.agentId]) {
        agentStats[log.agentId] = { actions: 0, success: 0 };
      }
      agentStats[log.agentId].actions++;
      if (log.status === "success") agentStats[log.agentId].success++;
    }

    return {
      thisWeek: {
        totalActions: thisWeek.length,
        successRate: thisWeek.length > 0
          ? Math.round((thisWeek.filter(l => l.status === "success").length / thisWeek.length) * 100)
          : 0,
        platformsUsed: new Set(thisWeek.map(l => l.platform)).size,
        agentsUsed: new Set(thisWeek.filter(l => l.agentId).map(l => l.agentId)).size,
      },
      thisMonth: {
        totalActions: thisMonth.length,
        successRate: thisMonth.length > 0
          ? Math.round((thisMonth.filter(l => l.status === "success").length / thisMonth.length) * 100)
          : 0,
        platformsUsed: new Set(thisMonth.map(l => l.platform)).size,
        agentsUsed: new Set(thisMonth.filter(l => l.agentId).map(l => l.agentId)).size,
      },
      platformStats,
      agentStats,
    };
  },
});

// ─── HELPERS ───

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: "🐦", linkedin: "💼", facebook: "📘", youtube: "📺",
    reddit: "🤖", discord: "💬", instagram: "📸", tiktok: "🎵",
    pinterest: "📌", threads: "🧵", bluesky: "🦋", telegram: "✈️",
  };
  return icons[platform] ?? "📱";
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    post: "Published a post",
    schedule: "Scheduled content",
    sync: "Synced data",
    engage: "Engaged with audience",
    analyze: "Analyzed performance",
    report: "Generated report",
    optimize: "Optimized content",
  };
  return labels[action] ?? `Performed ${action}`;
}
