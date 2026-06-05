import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Web Push API integration
// ═══════════════════════════════════════════════════════════════════

// Get user's push subscriptions
export const getSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();
  },
});

// Subscribe to push notifications
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if subscription already exists
    const existing = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();

    const alreadyExists = existing.some((s) => s.endpoint === args.endpoint);
    if (alreadyExists) return { success: true, alreadySubscribed: true };

    // Remove old subscriptions for this endpoint (if any)
    for (const sub of existing) {
      if (sub.endpoint !== args.endpoint) {
        await ctx.db.delete(sub._id);
      }
    }

    await ctx.db.insert("push_subscriptions", {
      userId: identity.subject as any,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unsubscribe from push notifications
export const unsubscribe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const subs = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();

    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }

    return { success: true };
  },
});

// Check if user is subscribed
export const isSubscribed = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const subs = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();

    return subs.length > 0;
  },
});

// Get all subscriptions (for admin broadcast)
export const getAllSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("push_subscriptions").collect();
  },
});

// Get subscriptions by user ID (internal)
export const getSubscriptionsByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Send push notification to a single user
export const sendPushToUser = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (subs.length === 0) return { sent: 0 };

    // Store push notification for delivery
    let sent = 0;
    for (const sub of subs) {
      try {
        await ctx.db.insert("push_queue", {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          title: args.title,
          body: args.body,
          url: args.url || "/dashboard",
          tag: args.tag || `notif-${Date.now()}`,
          status: "pending",
          createdAt: Date.now(),
        });
        sent++;
      } catch {
        // Subscription might be expired, remove it
        await ctx.db.delete(sub._id);
      }
    }

    return { sent };
  },
});

// Send push notification to all users (broadcast)
export const sendPushBroadcast = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subs = await ctx.runQuery(
      "pushNotifications:getAllSubscriptions" as any,
      {}
    );

    if (!subs || subs.length === 0) return { sent: 0 };

    // VAPID keys from environment
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@dutchkemventures.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys not configured, cannot send push notifications");
      return { sent: 0, error: "VAPID keys not configured" };
    }

    // Import web-push dynamically
    let webpush: any;
    try {
      // @ts-ignore — web-push is an optional dependency
      webpush = await import("web-push");
    } catch {
      console.warn("web-push package not installed");
      return { sent: 0, error: "web-push not installed" };
    }

    webpush.default.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    );

    let sent = 0;
    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/dashboard",
      tag: args.tag || `broadcast-${Date.now()}`,
    });

    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await ctx.runMutation(
            "pushNotifications:removeSubscription" as any,
            { endpoint: sub.endpoint }
          );
        }
      }
    }

    return { sent, total: subs.length };
  },
});

// Remove subscription by endpoint (internal)
export const removeSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("push_subscriptions")
      .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
      .first();

    if (sub) {
      await ctx.db.delete(sub._id);
    }
  },
});

// Send push notification for a new in-app notification
export const triggerPushForNotification = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    // Only send push for important notification types
    const pushTypes = ["payment", "project", "referral"];
    if (!pushTypes.includes(args.type)) return { sent: 0 };

    const subs = await ctx.db
      .query("push_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (subs.length === 0) return { sent: 0 };

    let sent = 0;
    for (const sub of subs) {
      try {
        await ctx.db.insert("push_queue", {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          title: args.title,
          body: args.body,
          url: args.url || "/dashboard",
          tag: `${args.type}-${Date.now()}`,
          status: "pending",
          createdAt: Date.now(),
        });
        sent++;
      } catch {
        // Subscription might be expired
        await ctx.db.delete(sub._id);
      }
    }

    return { sent };
  },
});
