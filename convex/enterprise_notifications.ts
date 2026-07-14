import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE NOTIFICATIONS - Real-time in-app notifications
// ═══════════════════════════════════════════════════════════════════

// QUERY: Get notifications for enterprise org (real-time via useQuery)
export const getEnterpriseNotifications = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return { notifications: [], unreadCount: 0 };

    // Get notifications for this org
    const notifications = await ctx.db.query("enterprise_notifications")
      .withIndex("by_org", (q: any) => q.eq("orgId", session.orgId))
      .order("desc")
      .take(args.limit || 20);

    // Count unread
    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return { notifications, unreadCount };
  },
});

// MUTATION: Mark single notification as read
export const markEnterpriseNotificationRead = mutation({
  args: {
    notificationId: v.id("enterprise_notifications"),
    token: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return false;

    // Mark as read
    await ctx.db.patch(args.notificationId, { read: true });
    return true;
  },
});

// MUTATION: Mark all notifications as read for org
export const markAllEnterpriseRead = mutation({
  args: {
    token: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return 0;

    // Get unread notifications for this org
    const unread = await ctx.db.query("enterprise_notifications")
      .withIndex("by_org_read", (q: any) => q.eq("orgId", session.orgId).eq("read", false))
      .collect();

    // Mark all as read
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
    return unread.length;
  },
});

// MUTATION: Create enterprise notification
export const createEnterpriseNotification = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
  },
  returns: v.id("enterprise_notifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("enterprise_notifications", {
      orgId: args.orgId,
      title: args.title,
      message: args.message,
      type: args.type,
      read: false,
      createdAt: Date.now(),
    });
  },
});
