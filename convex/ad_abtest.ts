import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createABTest = mutation({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    name: v.string(),
    testType: v.union(v.literal("creative"), v.literal("headline"), v.literal("cta"), v.literal("audience"), v.literal("budget_split")),
    variants: v.array(v.object({
      name: v.string(),
      adCopy: v.string(),
      headline: v.optional(v.string()),
      cta: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      audienceTarget: v.optional(v.string()),
      budgetPercent: v.number(),
    })),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    if (args.variants.length < 2) return { error: "Need at least 2 variants" };
    const totalPercent = args.variants.reduce((sum, v) => sum + v.budgetPercent, 0);
    if (Math.abs(totalPercent - 100) > 1) return { error: "Budget percentages must sum to 100" };

    const now = Date.now();
    const testId = await ctx.db.insert("ad_ab_tests", {
      campaignId: args.campaignId,
      name: args.name,
      status: "running",
      testType: args.testType,
      confidenceLevel: 0,
      startDate: now,
      createdBy: identity.name || "admin",
      createdAt: now,
      updatedAt: now,
    });

    for (const v of args.variants) {
      await ctx.db.insert("ad_ab_test_variants", {
        testId,
        campaignId: args.campaignId,
        name: v.name,
        adCopy: v.adCopy,
        headline: v.headline,
        cta: v.cta,
        imageUrl: v.imageUrl,
        audienceTarget: v.audienceTarget,
        budgetPercent: v.budgetPercent,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        status: "active",
        createdAt: now,
      });
    }

    return { success: true, testId };
  },
});

export const recordVariantImpression = mutation({
  args: {
    variantId: v.id("ad_ab_test_variants"),
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
    spend: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) return { error: "Variant not found" };

    await ctx.db.patch(args.variantId, {
      impressions: variant.impressions + (args.impressions || 0),
      clicks: variant.clicks + (args.clicks || 0),
      conversions: variant.conversions + (args.conversions || 0),
      spend: variant.spend + (args.spend || 0),
    });

    const test = await ctx.db.get(variant.testId);
    if (!test) return { error: "Test not found" };

    const variants = await ctx.db.query("ad_ab_test_variants")
      .withIndex("by_test", (q) => q.eq("testId", variant.testId))
      .collect();

    const bestCTR = variants.reduce((best, v) => {
      const ctr = v.clicks / Math.max(v.impressions, 1);
      return ctr > best.ctr ? { id: v._id, ctr } : best;
    }, { id: variant._id, ctr: 0 });

    const worstCTR = variants.reduce((worst, v) => {
      const ctr = v.clicks / Math.max(v.impressions, 1);
      return ctr < worst.ctr ? { id: v._id, ctr } : worst;
    }, { id: variant._id, ctr: 999 });

    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
    let confidence = 0;
    if (totalImpressions > 1000) {
      const lift = (bestCTR.ctr - worstCTR.ctr) / Math.max(worstCTR.ctr, 0.001);
      confidence = Math.min(99, Math.round(lift * 100));
    }

    if (confidence > 95 && test.status === "running") {
      await ctx.db.patch(test._id, {
        status: "completed",
        winnerVariantId: bestCTR.id,
        confidenceLevel: confidence,
        endDate: Date.now(),
        updatedAt: Date.now(),
      });

      for (const v of variants) {
        if (v._id === bestCTR.id) {
          await ctx.db.patch(v._id, { status: "winner" });
        } else {
          await ctx.db.patch(v._id, { status: "loser" });
        }
      }
    } else {
      await ctx.db.patch(test._id, { confidenceLevel: confidence, updatedAt: Date.now() });
    }

    return { success: true, confidence, totalImpressions };
  },
});

export const pauseABTest = mutation({
  args: { adminToken: v.string(), testId: v.id("ad_ab_tests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.testId, { status: "paused", updatedAt: Date.now() });
    return { success: true };
  },
});

export const resumeABTest = mutation({
  args: { adminToken: v.string(), testId: v.id("ad_ab_tests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.testId, { status: "running", updatedAt: Date.now() });
    return { success: true };
  },
});

export const listABTests = query({
  args: { adminToken: v.string(), campaignId: v.optional(v.id("ad_campaigns")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_ab_tests").order("desc");
    if (args.campaignId) q = q.withIndex("by_campaign", (iq) => iq.eq("campaignId", args.campaignId));
    return await q.collect();
  },
});

export const getABTestVariants = query({
  args: { testId: v.id("ad_ab_tests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_ab_test_variants")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();
  },
});
