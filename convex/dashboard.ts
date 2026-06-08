import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDashboardData = query({
  args: {},
  returns: v.object({
    user: v.object({
      _id: v.id("users"),
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
      _id: v.id("subscriptions"),
      plan: v.string(),
      status: v.string(),
      endsAt: v.number(),
      autoRenew: v.boolean(),
    })),
    projects: v.array(v.object({
      _id: v.id("projects"),
      name: v.string(),
      agentId: v.string(),
      status: v.string(),
      format: v.string(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      downloadUrl: v.optional(v.string()),
    })),
    notifications: v.array(v.object({
      _id: v.id("notifications"),
      title: v.string(),
      message: v.string(),
      type: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
    })),
    paymentMethods: v.array(v.object({
      _id: v.id("payment_methods"),
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
      _id: v.id("user_sessions"),
      device: v.string(),
      location: v.string(),
      ip: v.string(),
      lastActive: v.number(),
      isCurrent: v.boolean(),
    })),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found");
    }

    const subscriptions = (await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()).filter(s => s.status === "active");

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    const paymentMethods = await ctx.db
      .query("payment_methods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = await ctx.db
      .query("user_sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Referrals
    const referredUsers = (await ctx.db
      .query("users")
      .collect()).filter(u => u.referredBy === userId);

    const referralPayouts = (await ctx.db
      .query("payouts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()).filter(p => p.type === "referral");

    const totalEarned = referralPayouts.reduce((sum, p) => sum + p.amount, 0);
    const availableBalance = user.balance ?? 0;

    // Calculate from real data
    const stats = {
      activeSubscriptions: subscriptions.length,
      totalSpentThisMonth: projects.reduce((sum, p) => sum + (p as any).amount || 0, 0),
      completedProjects: projects.filter(p => p.status === "completed").length,
      referralEarnings: totalEarned,
      savingsThisMonth: 0,
    };

    const activeSubscription = subscriptions[0]; // Primary active subscription

    return {
      user: {
        _id: user._id,
        name: user.name,
        image: user.image,
        email: user.email,
        balance: user.balance,
        referralCode: user.referralCode,
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
      notifications: notifications.map(n => ({
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
          name: u.name,
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
      // Composio agent enhancement status for client dashboard
      agentEnhancement: (await ctx.db.query("composio_agent_settings").collect()).map((s: any) => ({
        agentId: s.agentId,
        enhanced: s.enabled,
        toolCount: s.toolCount ?? 0,
      })),
    };
  },
});
