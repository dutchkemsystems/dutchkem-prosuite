import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

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

export const getLoyaltyStatus = action({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Get loyalty points (mock data for now)
    const points = 2500;
    const tier = LOYALTY_TIERS.find(t => points >= t.minPoints) || LOYALTY_TIERS[0];
    const nextTier = LOYALTY_TIERS.find(t => t.minPoints > points);

    return {
      success: true,
      points,
      tier: tier.name,
      benefits: tier.benefits,
      nextTier: nextTier ? {
        name: nextTier.name,
        pointsNeeded: nextTier.minPoints - points,
      } : null,
      lifetimePoints: 5000,
      redeemedPoints: 2500,
    };
  },
});

export const redeemReward = action({
  args: {
    adminToken: v.string(),
    rewardId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    return {
      success: true,
      message: 'Reward redeemed successfully!',
      creditAdded: 500,
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

    return [
      { date: '2024-01-15', action: 'Purchase', points: 500, description: 'Subscription purchase' },
      { date: '2024-01-10', action: 'Referral', points: 1000, description: 'Friend signed up' },
      { date: '2024-01-05', action: 'Redemption', points: -500, description: 'Redeemed 500 credits' },
    ];
  },
});
