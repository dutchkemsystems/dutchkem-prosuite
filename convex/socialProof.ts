// convex/socialProof.ts
// Social proof & FOMO widgets — live activity feed, viewer counts, reviews

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Record user activity (purchase, signup, review, etc.)
// ═══════════════════════════════════════════════════════════════════
export const recordActivity = mutation({
  args: {
    type: v.union(
      v.literal("purchase"),
      v.literal("signup"),
      v.literal("review"),
      v.literal("download"),
      v.literal("subscription"),
      v.literal("upgrade"),
    ),
    userId: v.string(),
    userName: v.string(),
    agentName: v.string(),
    amount: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("social_activities", {
      type: args.type,
      userId: args.userId,
      userName: args.userName,
      agentName: args.agentName,
      amount: args.amount,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get last 20 activities for live feed
// ═══════════════════════════════════════════════════════════════════
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("social_activities")
      .order("desc")
      .take(20);
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get active viewer count for an agent
// ═══════════════════════════════════════════════════════════════════
export const getActiveViewers = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const stale = Date.now() - 60_000;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const viewers = await ctx.db
      .query("active_viewers")
      .withIndex("by_agent", (q) =>
        q.eq("agentId", args.agentId).gt("lastSeen", cutoff),
      )
      .take(200);
    const active = viewers.filter((v) => v.lastSeen > stale);
    return { count: active.length };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get activity stats (e.g. "500+ students used this week")
// ═══════════════════════════════════════════════════════════════════
export const getActivityStats = query({
  args: { agentName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let query = ctx.db.query("social_activities").withIndex("by_created");
    if (args.agentName) {
      query = query.filter((q) => q.eq(q.field("agentName"), args.agentName!));
    }
    const recent = await query.order("desc").take(100);

    const thisWeek = recent.filter((a) => a.createdAt > weekAgo);
    const thisMonth = recent.filter((a) => a.createdAt > monthAgo);

    const purchasesThisWeek = thisWeek.filter((a) => a.type === "purchase");
    const totalRevenue = purchasesThisWeek.reduce((sum, a) => sum + (a.amount ?? 0), 0);

    const uniqueUsers = new Set(thisWeek.map((a) => a.userId)).size;
    const uniqueUsersMonth = new Set(thisMonth.map((a) => a.userId)).size;

    return {
      usedThisWeek: `${Math.floor(uniqueUsers / 10) * 10}+`,
      usedThisMonth: `${Math.floor(uniqueUsersMonth / 10) * 10}+`,
      purchasesThisWeek: purchasesThisWeek.length,
      revenueThisWeek: totalRevenue,
      recentActivities: thisWeek.slice(0, 10),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Record that someone is viewing an agent
// ═══════════════════════════════════════════════════════════════════
export const recordViewer = mutation({
  args: {
    agentId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("active_viewers")
      .withIndex("by_agent", (q) =>
        q.eq("agentId", args.agentId).eq("lastSeen", args.sessionId as any),
      )
      .first();

    if (existing) {
      await ctx.db.patch("active_viewers", existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("active_viewers", {
        agentId: args.agentId,
        userId: args.userId,
        sessionId: args.sessionId,
        lastSeen: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Remove viewer on page leave
// ═══════════════════════════════════════════════════════════════════
export const removeViewer = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await ctx.db
      .query("active_viewers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (viewer) {
      await ctx.db.delete("active_viewers", viewer._id);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get reviews for an agent
// ═══════════════════════════════════════════════════════════════════
export const getAgentReviews = query({
  args: {
    agentId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const reviews = await ctx.db
      .query("agent_reviews")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return {
      reviews,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Add a review with verified purchase badge
// ═══════════════════════════════════════════════════════════════════
export const addReview = mutation({
  args: {
    agentId: v.string(),
    userId: v.string(),
    userName: v.string(),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const identity = await ctx.auth.getUserIdentity();

    const hasPurchase = await ctx.db
      .query("social_activities")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity?.subject ?? args.userId).eq("agentName", args.agentId),
      )
      .first();

    await ctx.db.insert("agent_reviews", {
      agentId: args.agentId,
      userId: identity?.subject ?? args.userId,
      userName: args.userName,
      rating: args.rating,
      comment: args.comment,
      verified: hasPurchase?.type === "purchase",
      createdAt: Date.now(),
    });

    return { verified: hasPurchase?.type === "purchase" };
  },
});
