import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// EXIT-INTENT POPUP — Capture leaving users with targeted offers
// ═══════════════════════════════════════════════════════════════════

// Popup configurations
const POPUP_CONFIGS = {
  // New user (no subscription)
  new_visitor: {
    title: "Wait! Get 20% Off Your First Month",
    subtitle: "Join 10,000+ users growing with Dutchkem Ventures",
    offer: "20% OFF",
    code: "WELCOME20",
    discountPercent: 20,
    cta: "Claim My Discount",
    urgency: "Limited time — offer expires in 24 hours",
    plan: "monthly",
  },

  // Free trial user
  trial_user: {
    title: "Don't Lose Your Progress!",
    subtitle: "Your projects and connections are waiting",
    offer: "Continue Free Trial",
    code: null,
    discountPercent: 0,
    cta: "Continue Free Trial",
    urgency: "Your trial ends soon — upgrade now to keep everything",
    plan: "monthly",
  },

  // Weekly subscriber (upsell)
  weekly_subscriber: {
    title: "Upgrade & Save 33%",
    subtitle: "Monthly plans include priority support",
    offer: "33% OFF Monthly",
    code: "UPGRADE33",
    discountPercent: 33,
    cta: "Upgrade Now",
    urgency: "This upgrade discount is only available today",
    plan: "monthly",
  },

  // Monthly subscriber (upsell)
  monthly_subscriber: {
    title: "Go Quarterly & Save More",
    subtitle: "Quarterly plans include 3 free months",
    offer: "22% OFF Quarterly",
    code: "QUARTER22",
    discountPercent: 22,
    cta: "Upgrade to Quarterly",
    urgency: "Lock in this rate before it changes",
    plan: "quarterly",
  },

  // KDP user (cross-sell)
  kdp_user: {
    title: "Expand Your Reach",
    subtitle: "Auto-post your books to social media",
    offer: "Free Social Setup",
    code: "KDP2026",
    discountPercent: 100,
    cta: "Connect Social Media",
    urgency: "Free setup — normally ₦5,000",
    plan: "social_auto",
  },

  // Inactive user (win-back)
  inactive_user: {
    title: "We Miss You!",
    subtitle: "Come back for a special welcome-back offer",
    offer: "40% OFF",
    code: "WELCOMEBACK",
    discountPercent: 40,
    cta: "Claim Welcome Back Offer",
    urgency: "This exclusive offer expires in 48 hours",
    plan: "monthly",
  },

  // High-value user (VIP)
  vip_user: {
    title: "VIP Exclusive Offer",
    subtitle: "As a valued customer, enjoy premium perks",
    offer: "Free Upgrade",
    code: "VIP2026",
    discountPercent: 50,
    cta: "Claim VIP Offer",
    urgency: "Exclusive to our top customers",
    plan: "yearly",
  },
};

// Determine which popup to show
export const getPopupConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return POPUP_CONFIGS.new_visitor;
    }

    const userId = identity.subject as any;

    // Get user data
    const user = await ctx.db.get(userId);
    if (!user) return POPUP_CONFIGS.new_visitor;

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");

    // Determine user type
    if (activeSubscriptions.length === 0) {
      // Check if they had a subscription before
      if (subscriptions.length > 0) {
        return POPUP_CONFIGS.inactive_user;
      }
      return POPUP_CONFIGS.new_visitor;
    }

    const currentPlan = activeSubscriptions[0];

    // KDP user
    if (currentPlan.service === "kdp") {
      return POPUP_CONFIGS.kdp_user;
    }

    // Plan-based upsell
    if (currentPlan.plan === "weekly") {
      return POPUP_CONFIGS.weekly_subscriber;
    }
    if (currentPlan.plan === "monthly") {
      return POPUP_CONFIGS.monthly_subscriber;
    }

    // VIP (quarterly or yearly)
    if (currentPlan.plan === "quarterly" || currentPlan.plan === "yearly") {
      return POPUP_CONFIGS.vip_user;
    }

    return POPUP_CONFIGS.new_visitor;
  },
});

// Track popup impression
export const trackImpression = mutation({
  args: {
    popupType: v.string(),
    action: v.union(v.literal("shown"), v.literal("dismissed"), v.literal("converted")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject as any || "anonymous";

    await ctx.db.insert("popup_analytics", {
      userId,
      popupType: args.popupType,
      action: args.action,
      createdAt: Date.now(),
    });

    return { tracked: true };
  },
});

// Get popup analytics (admin)
export const getPopupAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("popup_analytics").collect();

    const stats = {
      totalImpressions: all.filter((p) => p.action === "shown").length,
      totalDismissed: all.filter((p) => p.action === "dismissed").length,
      totalConverted: all.filter((p) => p.action === "converted").length,
      conversionRate: 0,
      byType: {} as Record<string, { shown: number; dismissed: number; converted: number }>,
    };

    for (const popup of all) {
      if (!stats.byType[popup.popupType]) {
        stats.byType[popup.popupType] = { shown: 0, dismissed: 0, converted: 0 };
      }
      stats.byType[popup.popupType][popup.action as keyof typeof stats.byType[string]]++;
    }

    stats.conversionRate =
      stats.totalImpressions > 0
        ? Math.round((stats.totalConverted / stats.totalImpressions) * 100)
        : 0;

    return stats;
  },
});

// Get popup display settings
export const getDisplaySettings = query({
  args: {},
  handler: async () => {
    return {
      // Don't show if user dismissed in last 7 days
      dismissCooldownDays: 7,
      // Don't show if user converted in last 30 days
      conversionCooldownDays: 30,
      // Maximum impressions per session
      maxImpressionsPerSession: 2,
      // Delay before showing (ms)
      showDelayMs: 5000,
      // Exit intent threshold (pixels from top)
      exitIntentThreshold: 10,
    };
  },
});
