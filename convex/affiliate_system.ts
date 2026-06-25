import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AFFILIATE SYSTEM
// Partner growth through affiliate commissions
// ═══════════════════════════════════════════════════════════════════

const COMMISSION_RATES = {
  standard: 0.10, // 10% commission
  premium: 0.15,  // 15% commission
  enterprise: 0.20, // 20% commission
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE AFFILIATE LINK
// ═══════════════════════════════════════════════════════════════════

export const generateAffiliateLink = action({
  args: {
    adminToken: v.string(),
    partnerName: v.string(),
    commissionTier: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const code = `AFF${Date.now().toString(36).toUpperCase()}`;
    const tier = args.commissionTier || "standard";
    const commissionRate = COMMISSION_RATES[tier as keyof typeof COMMISSION_RATES] || COMMISSION_RATES.standard;

    return {
      success: true,
      code,
      url: `https://dutchkem-prosuite-app.vercel.app/auth?aff=${code}`,
      partnerName: args.partnerName,
      commissionRate: `${commissionRate * 100}%`,
      tier,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// TRACK AFFILIATE CONVERSION
// ═══════════════════════════════════════════════════════════════════

export const trackAffiliateConversion = action({
  args: {
    affiliateCode: v.string(),
    newUserId: v.string(),
    amount: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Calculate commission
    const commission = args.amount * COMMISSION_RATES.standard;

    await ctx.runMutation(internal.affiliate_system.logConversion, {
      affiliateCode: args.affiliateCode,
      newUserId: args.newUserId,
      amount: args.amount,
      commission,
    });

    return {
      success: true,
      commission,
      message: `Commission of ₦${commission.toLocaleString()} earned`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// LOG CONVERSION
// ═══════════════════════════════════════════════════════════════════

export const logConversion = internalMutation({
  args: {
    affiliateCode: v.string(),
    newUserId: v.string(),
    amount: v.number(),
    commission: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "affiliate",
      status: "healthy",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: 1,
      checksFailed: 0,
      issuesFound: 0,
      issuesAutoFixed: 0,
      severity: "info",
      timestamp: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getAffiliateStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      totalAffiliates: 0,
      totalConversions: 0,
      totalCommissions: "₦0",
      conversionRate: "0%",
      topAffiliates: [],
    };
  },
});

export const getCommissionTiers = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return [
      { tier: "standard", rate: "10%", minReferrals: 0, description: "Standard commission for all partners" },
      { tier: "premium", rate: "15%", minReferrals: 10, description: "Premium commission for active partners" },
      { tier: "enterprise", rate: "20%", minReferrals: 50, description: "Enterprise commission for top partners" },
    ];
  },
});
