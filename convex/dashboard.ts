import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDashboardData = query({
  args: {},
  returns: v.object({
    user: v.object({
      _id: v.string(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      balance: v.optional(v.number()),
      referralCode: v.optional(v.string()),
      subscription: v.optional(v.object({
        plan: v.string(),
        status: v.string(),
      })),
    }),
    stats: v.object({
      activeSubscriptions: v.number(),
      totalSpentThisMonth: v.number(),
      completedProjects: v.number(),
      referralEarnings: v.number(),
      savingsThisMonth: v.number(),
    }),
    subscriptions: v.array(v.object({
      _id: v.string(),
      plan: v.string(),
      status: v.string(),
      endsAt: v.number(),
      autoRenew: v.boolean(),
    })),
    projects: v.array(v.object({
      _id: v.string(),
      name: v.string(),
      agentId: v.string(),
      status: v.string(),
      format: v.string(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      downloadUrl: v.optional(v.string()),
    })),
    notifications: v.array(v.object({
      _id: v.string(),
      title: v.string(),
      message: v.string(),
      type: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
    })),
    paymentMethods: v.array(v.object({
      _id: v.string(),
      type: v.string(),
      provider: v.string(),
      last4: v.optional(v.string()),
      isDefault: v.boolean(),
    })),
    referrals: v.object({
      friendsSignedUp: v.number(),
      totalEarned: v.number(),
      pendingEarnings: v.number(),
      availableBalance: v.number(),
      history: v.array(v.object({
        name: v.optional(v.string()),
        date: v.number(),
        commission: v.number(),
      })),
    }),
    sessions: v.array(v.object({
      _id: v.string(),
      device: v.string(),
      location: v.string(),
      ip: v.string(),
      lastActive: v.number(),
      isCurrent: v.boolean(),
    })),
    agentEnhancement: v.array(v.object({
      agentId: v.string(),
      enhanced: v.boolean(),
      toolCount: v.number(),
    })),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Please sign in again");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found: Please create an account");
    }

    let subscriptions: any[] = [];
    try {
      subscriptions = (await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).filter(s => s.status === "active");
    } catch {}

    let projects: any[] = [];
    try {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(10);
    } catch {}

    let notifications: any[] = [];
    try {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(10);
    } catch {}

    let mergedNotifications: any[] = [];
    try {
      const allNotifications = await ctx.db.query("notifications").order("desc").take(50);
      const broadcasts = allNotifications.filter((n: any) => !n.userId && !notifications.some((pn: any) => pn._id === n._id)).slice(0, 5);
      mergedNotifications = [...notifications, ...broadcasts].sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 15);
    } catch {
      mergedNotifications = notifications;
    }

    let paymentMethods: any[] = [];
    try {
      paymentMethods = await ctx.db
        .query("payment_methods")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    } catch {}

    let sessions: any[] = [];
    try {
      sessions = await ctx.db
        .query("user_sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    } catch {}

    let referredUsers: any[] = [];
    try {
      referredUsers = (await ctx.db
        .query("users")
        .collect()).filter(u => (u as any).referredBy === userId);
    } catch {}

    let referralPayouts: any[] = [];
    try {
      referralPayouts = (await ctx.db
        .query("payouts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).filter(p => (p as any).type === "referral");
    } catch {}

    const totalEarned = referralPayouts.reduce((sum, p) => sum + ((p as any).amount || 0), 0);
    const availableBalance = (user as any).balance ?? 0;

    const stats = {
      activeSubscriptions: subscriptions.length,
      totalSpentThisMonth: 0,
      completedProjects: projects.filter(p => p.status === "completed").length,
      referralEarnings: totalEarned,
      savingsThisMonth: 0,
    };

    const activeSubscription = subscriptions[0];

    let agentEnhancement: any[] = [];
    try {
      agentEnhancement = (await ctx.db.query("composio_agent_settings").collect()).map((s: any) => ({
        agentId: s.agentId ?? "",
        enhanced: s.enabled ?? false,
        toolCount: s.toolCount ?? 0,
      }));
    } catch {}

    return {
      user: {
        _id: user._id,
        name: (user as any).name,
        image: (user as any).image,
        email: (user as any).email,
        balance: (user as any).balance,
        referralCode: (user as any).referralCode,
        subscription: activeSubscription ? {
          plan: activeSubscription.plan,
          status: activeSubscription.status,
        } : undefined,
      },
      stats,
      subscriptions: subscriptions.map(s => ({
        _id: s._id,
        plan: s.plan,
        status: s.status,
        endsAt: s.endsAt,
        autoRenew: s.autoRenew,
      })),
      projects: projects.map(p => ({
        _id: p._id,
        name: p.name,
        agentId: p.agentId,
        status: p.status,
        format: p.format,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
        downloadUrl: p.downloadUrl,
      })),
      notifications: mergedNotifications.map(n => ({
        _id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
      })),
      paymentMethods: paymentMethods.map(pm => ({
        _id: pm._id,
        type: pm.type,
        provider: pm.provider,
        last4: pm.last4,
        isDefault: pm.isDefault,
      })),
      referrals: {
        friendsSignedUp: referredUsers.length,
        totalEarned,
        pendingEarnings: 0,
        availableBalance,
        history: referredUsers.map(u => ({
          name: (u as any).name,
          date: u._creationTime,
          commission: 500,
        })),
      },
      sessions: sessions.map(s => ({
        _id: s._id,
        device: s.device,
        location: s.location,
        ip: s.ip,
        lastActive: s.lastActive,
        isCurrent: s.isCurrent,
      })),
      agentEnhancement,
    };
  },
});
