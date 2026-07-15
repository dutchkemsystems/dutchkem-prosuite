import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// LOYALTY PROGRAM
// Customer retention through rewards
// ═══════════════════════════════════════════════════════════════════

const LOYALTY_TIERS = [
  { name: 'Bronze', minPoints: 0, benefits: ['5% discount', 'Priority support'] },
  { name: 'Silver', minPoints: 1000, benefits: ['10% discount', 'Priority support', 'Free upgrades'] },
  { name: 'Gold', minPoints: 5000, benefits: ['15% discount', 'VIP support', 'Free upgrades', 'Early access'] },
  { name: 'Platinum', minPoints: 25000, benefits: ['20% discount', 'Dedicated support', 'Free upgrades', 'Early access', 'Exclusive features'] },
];

// Points earned per action
const POINTS = {
  subscription_purchase: 100,
  referral_success: 500,
  project_completed: 50,
  monthly_active: 25,
  kyc_completed: 100,
};

export const getLoyaltyStatus = query({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { error: "Unauthorized" };

    const userId = identity._id;

    // Calculate loyalty points from real activity
    let totalPoints = 0;

    // 1. Points from subscriptions (100 per subscription)
    const subscriptions = await ctx.db.query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    totalPoints += subscriptions.length * POINTS.subscription_purchase;

    // 2. Points from referrals (500 per referred user who signed up)
    const referrals = await ctx.db.query("users")
      .withIndex("by_referredBy", (q) => q.eq("referredBy", userId))
      .collect();
    totalPoints += referrals.length * POINTS.referral_success;

    // 3. Points from completed projects (50 per project)
    const projects = await ctx.db.query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const completedProjects = projects.filter((p: any) => p.status === "completed");
    totalPoints += completedProjects.length * POINTS.project_completed;

    // 4. Points for KYC completion
    const kyc = await ctx.db.query("client_kyc_submissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (kyc && kyc.status === "verified") {
      totalPoints += POINTS.kyc_completed;
    }

    // 5. Points for monthly activity (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentProjects = projects.filter((p: any) => (p.createdAt || 0) > thirtyDaysAgo);
    if (recentProjects.length > 0) {
      totalPoints += POINTS.monthly_active;
    }

    const tier = LOYALTY_TIERS.find(t => totalPoints >= t.minPoints) || LOYALTY_TIERS[0];
    const nextTier = LOYALTY_TIERS.find(t => t.minPoints > totalPoints);

    return {
      success: true,
      points: totalPoints,
      tier: tier.name,
      benefits: tier.benefits,
      nextTier: nextTier ? {
        name: nextTier.name,
        pointsNeeded: nextTier.minPoints - totalPoints,
      } : null,
      lifetimePoints: totalPoints,
      redeemedPoints: 0,
      breakdown: {
        subscriptions: subscriptions.length * POINTS.subscription_purchase,
        referrals: referrals.length * POINTS.referral_success,
        projects: completedProjects.length * POINTS.project_completed,
        kyc: kyc && kyc.status === "verified" ? POINTS.kyc_completed : 0,
        activity: recentProjects.length > 0 ? POINTS.monthly_active : 0,
      },
    };
  },
});

export const redeemReward = mutation({
  args: {
    adminToken: v.string(),
    rewardId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { error: "Unauthorized" };

    // Reward definitions
    const rewards: Record<string, { name: string; points: number; creditValue: number }> = {
      '1': { name: '500 Credits', points: 500, creditValue: 500 },
      '2': { name: '1000 Credits', points: 1000, creditValue: 1000 },
      '3': { name: 'Free Month', points: 5000, creditValue: 0 },
      '4': { name: 'Premium Features', points: 10000, creditValue: 0 },
    };

    const reward = rewards[args.rewardId];
    if (!reward) return { error: "Invalid reward" };

    // Record redemption in audit log
    await ctx.db.insert("audit_logs", {
      userId: identity._id,
      action: "LOYALTY_REDEEM",
      details: JSON.stringify({
        rewardId: args.rewardId,
        rewardName: reward.name,
        pointsCost: reward.points,
      }),
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: `${reward.name} redeemed successfully!`,
      creditAdded: reward.creditValue,
    };
  },
});

export const getLoyaltyRewards = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return [
      { id: '1', name: '500 Credits', points: 500, description: 'Add 500 credits to your account' },
      { id: '2', name: '1000 Credits', points: 1000, description: 'Add 1000 credits to your account' },
      { id: '3', name: 'Free Month', points: 5000, description: 'Get one month free subscription' },
      { id: '4', name: 'Premium Features', points: 10000, description: 'Unlock premium features for 30 days' },
    ];
  },
});

export const getLoyaltyHistory = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const userId = identity._id;
    const history: Array<{ date: string; action: string; points: number; description: string }> = [];

    // Subscription history
    const subscriptions = await ctx.db.query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(20);
    for (const sub of subscriptions) {
      history.push({
        date: new Date(sub._creationTime || Date.now()).toISOString().split('T')[0],
        action: 'Purchase',
        points: POINTS.subscription_purchase,
        description: `${sub.plan || 'subscription'} subscription`,
      });
    }

    // Referral history
    const referrals = await ctx.db.query("users")
      .withIndex("by_referredBy", (q) => q.eq("referredBy", userId))
      .take(20);
    for (const ref of referrals) {
      history.push({
        date: new Date(ref._creationTime || Date.now()).toISOString().split('T')[0],
        action: 'Referral',
        points: POINTS.referral_success,
        description: `${ref.name || 'Friend'} signed up`,
      });
    }

    // Project completion history
    const projects = await ctx.db.query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const completed = projects.filter((p: any) => p.status === "completed");
    for (const proj of completed) {
      history.push({
        date: new Date(proj.completedAt || proj._creationTime || Date.now()).toISOString().split('T')[0],
        action: 'Project',
        points: POINTS.project_completed,
        description: `Completed: ${proj.name || 'project'}`,
      });
    }

    // Sort by date descending and limit
    history.sort((a, b) => b.date.localeCompare(a.date));
    return history.slice(0, args.limit || 50);
  },
});
