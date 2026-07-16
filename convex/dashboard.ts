import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

const emptyReturn = {
  user: {
    _id: "",
    name: "",
    image: undefined as string | undefined,
    email: "",
    balance: 0,
    referralCode: "",
    subscription: undefined as { plan: string; status: string } | undefined,
  },
  stats: { activeSubscriptions: 0, totalSpentThisMonth: 0, completedProjects: 0, referralEarnings: 0, savingsThisMonth: 0 },
  subscriptions: [] as any[],
  projects: [] as any[],
  notifications: [] as any[],
  paymentMethods: [] as any[],
  referrals: { friendsSignedUp: 0, totalEarned: 0, pendingEarnings: 0, availableBalance: 0, history: [] as any[] },
  sessions: [] as any[],
  agentEnhancement: [] as any[],
};

export const getDashboardData = query({
  args: {},
  returns: v.object({
    user: v.object({
      _id: v.string(),
      name: v.string(),
      image: v.optional(v.string()),
      email: v.string(),
      balance: v.number(),
      referralCode: v.string(),
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
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch {
      return emptyReturn;
    }
    if (!userId) {
      return emptyReturn;
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      return emptyReturn;
    }

    // Bounded queries with .take() instead of .collect()
    let subscriptions: any[] = [];
    try {
      const allSubs = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(20);
      subscriptions = allSubs.filter((s: any) => s.status === "active");
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch subscriptions:", e?.message);
    }

    let projects: any[] = [];
    try {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(10);
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch projects:", e?.message);
    }

    let notifications: any[] = [];
    try {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(10);
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch notifications:", e?.message);
    }

    let mergedNotifications: any[] = [];
    try {
      // Get broadcast notifications (userId is null) using the by_user index
      const broadcasts = await ctx.db.query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", undefined as any))
        .order("desc")
        .take(5);
      // Filter out duplicates and merge with user notifications
      const uniqueBroadcasts = broadcasts.filter((n: any) => !notifications.some((pn: any) => pn._id === n._id));
      mergedNotifications = [...notifications, ...uniqueBroadcasts].sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 15);
    } catch (e: any) {
      console.error("[Dashboard] Failed to merge notifications:", e?.message);
      mergedNotifications = notifications;
    }

    let paymentMethods: any[] = [];
    try {
      paymentMethods = await ctx.db
        .query("payment_methods")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(10);
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch payment methods:", e?.message);
    }

    let sessions: any[] = [];
    try {
      sessions = await ctx.db
        .query("user_sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(5);
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch sessions:", e?.message);
    }

    // Use index-based query instead of full table scan for referrals
    let referredCount = 0;
    let referredHistory: any[] = [];
    try {
      const referred = await ctx.db
        .query("users")
        .withIndex("by_referredBy", (q) => q.eq("referredBy", userId))
        .take(20);
      referredCount = referred.length;
      referredHistory = referred.map((u: any) => ({
        name: u.name,
        date: u._creationTime,
        commission: 500,
      }));
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch referrals:", e?.message);
    }

    let totalEarned = 0;
    try {
      const referralPayouts = await ctx.db
        .query("payouts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(50);
      totalEarned = referralPayouts
        .filter((p: any) => p.type === "referral")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch payout history:", e?.message);
    }

    const availableBalance = user.balance ?? 0;
    const activeSubscription = subscriptions[0];

    // Bounded query for agent enhancement settings
    let agentEnhancement: any[] = [];
    try {
      agentEnhancement = (await ctx.db.query("composio_agent_settings").take(30)).map((s: any) => ({
        agentId: String(s.agentId ?? ""),
        enhanced: Boolean(s.enabled ?? false),
        toolCount: Number(s.toolCount ?? 0),
      }));
    } catch (e: any) {
      console.error("[Dashboard] Failed to fetch agent settings:", e?.message);
    }

    return {
      user: {
        _id: String(user._id),
        name: String(user.name ?? ""),
        image: user.image ? String(user.image) : undefined,
        email: String(user.email ?? ""),
        balance: Number(user.balance ?? 0),
        referralCode: String(user.referralCode ?? ""),
        subscription: activeSubscription ? {
          plan: String(activeSubscription.plan ?? "monthly"),
          status: String(activeSubscription.status ?? "active"),
        } : undefined,
      },
      stats: {
        activeSubscriptions: subscriptions.length,
        totalSpentThisMonth: 0,
        completedProjects: projects.filter((p: any) => p.status === "completed").length,
        referralEarnings: totalEarned,
        savingsThisMonth: 0,
      },
      subscriptions: subscriptions.map((s: any) => ({
        _id: String(s._id),
        plan: String(s.plan ?? "monthly"),
        status: String(s.status ?? "active"),
        endsAt: Number(s.endsAt ?? Date.now()),
        autoRenew: Boolean(s.autoRenew ?? false),
      })),
      projects: projects.map((p: any) => ({
        _id: String(p._id),
        name: String(p.name ?? "Untitled"),
        agentId: String(p.agentId ?? "A1"),
        status: String(p.status ?? "in-progress"),
        format: String(p.format ?? "pdf"),
        createdAt: Number(p.createdAt ?? Date.now()),
        completedAt: p.completedAt ? Number(p.completedAt) : undefined,
        downloadUrl: p.downloadUrl ? String(p.downloadUrl) : undefined,
      })),
      notifications: mergedNotifications.map((n: any) => ({
        _id: String(n._id),
        title: String(n.title ?? ""),
        message: String(n.message ?? ""),
        type: String(n.type ?? "info"),
        read: Boolean(n.read ?? false),
        createdAt: Number(n.createdAt ?? Date.now()),
      })),
      paymentMethods: paymentMethods.map((pm: any) => ({
        _id: String(pm._id),
        type: String(pm.type ?? "card"),
        provider: String(pm.provider ?? ""),
        last4: pm.last4 ? String(pm.last4) : undefined,
        isDefault: Boolean(pm.isDefault ?? false),
      })),
      referrals: {
        friendsSignedUp: referredCount,
        totalEarned,
        pendingEarnings: 0,
        availableBalance,
        history: referredHistory,
      },
      sessions: sessions.map((s: any) => ({
        _id: String(s._id),
        device: String(s.device ?? "Unknown"),
        location: String(s.location ?? "Unknown"),
        ip: String(s.ip ?? "0.0.0.0"),
        lastActive: Number(s.lastActive ?? Date.now()),
        isCurrent: Boolean(s.isCurrent ?? false),
      })),
      agentEnhancement,
    };
  },
});


