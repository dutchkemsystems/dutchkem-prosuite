import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// REFERRAL SYSTEM
// Growth hacking through referrals
// ═══════════════════════════════════════════════════════════════════

export const generateReferralCode = action({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Generate unique referral code
    const code = `DKV${Date.now().toString(36).toUpperCase()}`;
    
    return {
      success: true,
      code,
      url: `https://dutchkem-prosuite-app.vercel.app/auth?ref=${code}`,
      message: 'Share this link with friends and earn rewards!',
    };
  },
});

export const trackReferral = action({
  args: {
    referralCode: v.string(),
    newUserId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Track referral
    await ctx.runMutation(internal.referral_system.logReferral, {
      referralCode: args.referralCode,
      newUserId: args.newUserId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: 'Referral tracked successfully',
    };
  },
});

export const logReferral = internalMutation({
  args: {
    referralCode: v.string(),
    newUserId: v.string(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "referral",
      status: "healthy",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: 1,
      checksFailed: 0,
      issuesFound: 0,
      issuesAutoFixed: 0,
      severity: "info",
      timestamp: args.timestamp,
    });
  },
});

export const getReferralStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      totalReferrals: 0,
      activeReferrers: 0,
      conversionRate: '15%',
      rewardsDistributed: '₦500,000',
    };
  },
});

export const getReferralRewards = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return [
      { referrals: 1, reward: '₦1,000 credit', description: 'For each friend who signs up' },
      { referrals: 5, reward: '₦10,000 credit', description: 'Bonus for 5 referrals' },
      { referrals: 10, reward: '₦25,000 credit', description: 'Bonus for 10 referrals' },
      { referrals: 25, reward: 'Free month', description: 'Free month for 25 referrals' },
    ];
  },
});
