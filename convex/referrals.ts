// convex/referrals.ts — Viral Referral & Affiliate System
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const COMMISSION_RATE = 0.20;
const COMMISSION_MONTHS = 3;
const TIERS = [
  { name: "Bronze", min: 5, reward: "5% bonus commission" },
  { name: "Silver", min: 20, reward: "10% bonus commission" },
  { name: "Gold", min: 100, reward: "Free month subscription" },
  { name: "Diamond", min: 500, reward: "Lifetime premium access" },
];

export const generateReferralCode = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("referral_codes").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (existing) return { code: existing.code, link: `https://prosuite.dutchkemventures.com/ref/${existing.code}` };
    const code = `PROS${args.userId.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    await ctx.db.insert("referral_codes", { code, userId: args.userId, totalRefs: 0, totalEarnings: 0, createdAt: Date.now() });
    return { code, link: `https://prosuite.dutchkemventures.com/ref/${code}` };
  },
});

export const getReferralStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const code = await ctx.db.query("referral_codes").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!code) return { code: null, totalRefs: 0, totalEarnings: 0, tier: "None", nextTier: TIERS[0], conversions: [] };
    const conversions = await ctx.db.query("referral_conversions").withIndex("by_referrer", (q) => q.eq("referrerId", args.userId)).take(50);
    const tier = TIERS.slice().reverse().find((t) => code.totalRefs >= t.min) || { name: "None", min: 0, reward: "" };
    const nextTier = TIERS.find((t) => code.totalRefs < t.min) || null;
    return { code: code.code, totalRefs: code.totalRefs, totalEarnings: code.totalEarnings, tier: tier.name, nextTier, conversions };
  },
});

export const getReferralLink = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const code = await ctx.db.query("referral_codes").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!code) return null;
    return { code: code.code, link: `https://prosuite.dutchkemventures.com/ref/${code.code}` };
  },
});

export const applyReferralCode = mutation({
  args: { code: v.string(), newUserId: v.string() },
  handler: async (ctx, args) => {
    const referrer = await ctx.db.query("referral_codes").withIndex("by_code", (q) => q.eq("code", args.code)).first();
    if (!referrer) throw new Error("Invalid referral code");
    if (referrer.userId === args.newUserId) throw new Error("Cannot refer yourself");
    await ctx.db.insert("referral_conversions", {
      referrerId: referrer.userId, referredUserId: args.newUserId,
      amount: 0, commission: 0, status: "pending", createdAt: Date.now(),
    });
    await ctx.db.patch(referrer._id, { totalRefs: referrer.totalRefs + 1 });
    return { success: true, referrerName: referrer.code };
  },
});

export const getReferralLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const codes = await ctx.db.query("referral_codes").order("desc").take(20);
    return codes.map((c) => ({ userId: c.userId, code: c.code, totalRefs: c.totalRefs, totalEarnings: c.totalEarnings }));
  },
});

export const getReferralTiers = query({
  args: {},
  handler: async () => TIERS,
});

export const trackReferralConversion = internalMutation({
  args: { referrerId: v.string(), referredUserId: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const commission = args.amount * COMMISSION_RATE;
    await ctx.db.insert("referral_conversions", {
      referrerId: args.referrerId, referredUserId: args.referredUserId,
      amount: args.amount, commission, status: "earned", createdAt: Date.now(),
    });
    const code = await ctx.db.query("referral_codes").withIndex("by_user", (q) => q.eq("userId", args.referrerId)).first();
    if (code) await ctx.db.patch(code._id, { totalEarnings: code.totalEarnings + commission });
  },
});

export const processWeeklyPayouts = internalAction({
  args: {},
  handler: async (ctx) => {
    const conversions = await ctx.runQuery(internal.referrals.getUnpaidConversions);
    const byUser = new Map<string, number>();
    for (const c of conversions) {
      byUser.set(c.referrerId, (byUser.get(c.referrerId) || 0) + c.commission);
    }
    for (const [userId, amount] of byUser) {
      await ctx.runMutation(internal.referrals.createPayout, { userId, amount });
    }
  },
});

export const getUnpaidConversions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("referral_conversions").withIndex("by_status", (q) => q.eq("status", "earned")).take(100);
  },
});

export const createPayout = internalMutation({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("referral_payouts", { userId: args.amount, amount: args.amount, status: "pending", period: new Date().toISOString().substring(0, 7), createdAt: Date.now() });
  },
});
