import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AI CROSS-SELL ENGINE — Smart service recommendations
// ═══════════════════════════════════════════════════════════════════

// Service catalog with cross-sell relationships
const SERVICE_CATALOG = {
  // Standard subscriptions
  weekly: {
    name: "Weekly Plan",
    price: 2000,
    category: "subscription",
    crossSells: ["monthly", "kdp_basic", "social_connect"],
  },
  monthly: {
    name: "Monthly Plan",
    price: 8000,
    category: "subscription",
    crossSells: ["quarterly", "kdp_pro", "marketplace_post"],
  },
  quarterly: {
    name: "Quarterly Plan",
    price: 25000,
    category: "subscription",
    crossSells: ["yearly", "kdp_enterprise", "social_auto"],
  },
  yearly: {
    name: "Yearly Plan",
    price: 80000,
    category: "subscription",
    crossSells: ["kdp_enterprise", "premium_features"],
  },

  // KDP plans
  kdp_basic: {
    name: "KDP Basic",
    price: 25000,
    category: "kdp",
    crossSells: ["kdp_pro", "book_publishing", "royalty_tracking"],
  },
  kdp_pro: {
    name: "KDP Pro",
    price: 60000,
    category: "kdp",
    crossSells: ["kdp_enterprise", "live_support", "advanced_analytics"],
  },
  kdp_enterprise: {
    name: "KDP Enterprise",
    price: 200000,
    category: "kdp",
    crossSells: ["priority_support", "custom_features"],
  },

  // Add-on services
  social_connect: {
    name: "Social Media Connection",
    price: 0,
    category: "addon",
    crossSells: ["social_auto", "social_analytics"],
  },
  social_auto: {
    name: "Auto-Posting",
    price: 5000,
    category: "addon",
    crossSells: ["social_analytics", "content_calendar"],
  },
  marketplace_post: {
    name: "Marketplace Job Post",
    price: 0,
    category: "marketplace",
    crossSells: ["premium_listing", "featured_job"],
  },
  book_publishing: {
    name: "Book Publishing",
    price: 15000,
    category: "service",
    crossSells: ["cover_design", "formatting", "marketing"],
  },
};

// User behavior tracking
interface UserBehavior {
  planHistory: string[];
  connectedPlatforms: number;
  marketplaceJobs: number;
  booksPublished: number;
  totalSpent: number;
  lastAction: string;
  interests: string[];
}

// Get personalized recommendations
export const getRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject as any;

    // Gather user data
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const platforms = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .collect();

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const purchases = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Build behavior profile
    const behavior: UserBehavior = {
      planHistory: subscriptions.map((s) => s.service || "standard"),
      connectedPlatforms: platforms.length,
      marketplaceJobs: projects.length,
      booksPublished: projects.filter((p) => p.format === "kdp").length,
      totalSpent: purchases
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
      lastAction: subscriptions.length > 0 ? "subscriber" : "free",
      interests: extractInterests(subscriptions, projects),
    };

    // Generate recommendations
    const recommendations = generateRecommendations(behavior);

    // Score and sort by relevance
    const scored = recommendations.map((rec) => ({
      ...rec,
      score: calculateRelevanceScore(rec, behavior),
      reason: getRecommendationReason(rec, behavior),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },
});

// Get cross-sell suggestions for a specific plan
export const getCrossSells = query({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const plan = SERVICE_CATALOG[args.planId as keyof typeof SERVICE_CATALOG];
    if (!plan) return [];

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject as any;

    // Get user's current subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeServices = subscriptions
      .filter((s) => s.status === "active")
      .map((s) => s.service || "standard");

    // Filter out already purchased cross-sells
    const suggestions = plan.crossSells
      .map((cs) => ({
        id: cs,
        ...(SERVICE_CATALOG[cs as keyof typeof SERVICE_CATALOG] || {}),
        isPurchased: activeServices.includes(cs as any),
      }))
      .filter((s) => !s.isPurchased);

    return suggestions;
  },
});

// Track user action for recommendations
export const trackAction = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      userId: args.userId,
      action: args.action,
      details: JSON.stringify(args.metadata || {}),
      ip: "system",
      userAgent: "cross_sell_tracker",
      createdAt: Date.now(),
    });
  },
});

// Get trending services (social proof)
export const getTrendingServices = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    const recentCheckouts = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect()
      .then((sessions) => sessions.filter((s) => now - (s.completedAt || s.createdAt) < oneWeek));

    // Count by plan
    const planCounts: Record<string, number> = {};
    for (const session of recentCheckouts) {
      planCounts[session.planId] = (planCounts[session.planId] || 0) + 1;
    }

    // Sort by popularity
    return Object.entries(planCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([planId, count]) => ({
        planId,
        name: SERVICE_CATALOG[planId as keyof typeof SERVICE_CATALOG]?.name || planId,
        recentPurchases: count,
        popularityScore: Math.min(100, count * 10),
      }));
  },
});

// Helper: Extract user interests from subscriptions
function extractInterests(subscriptions: any[], projects: any[]): string[] {
  const interests: string[] = [];

  for (const sub of subscriptions) {
    if (sub.service === "kdp") interests.push("publishing");
    if (sub.plan === "yearly" || sub.plan === "quarterly") interests.push("premium");
  }

  for (const project of projects) {
    if (project.type === "kdp") interests.push("books");
    if (project.category) interests.push(project.category);
  }

  return [...new Set(interests)];
}

// Helper: Generate recommendations based on behavior
function generateRecommendations(behavior: UserBehavior) {
  const recommendations: any[] = [];

  // Subscription upgrade suggestions
  if (behavior.planHistory.includes("weekly")) {
    recommendations.push({
      id: "upgrade_monthly",
      type: "upgrade",
      name: "Upgrade to Monthly",
      description: "Save 33% with a monthly plan",
      originalPrice: 8000,
      suggestedPrice: 5333,
      category: "subscription",
    });
  }

  if (behavior.planHistory.includes("monthly") && !behavior.planHistory.includes("quarterly")) {
    recommendations.push({
      id: "upgrade_quarterly",
      type: "upgrade",
      name: "Upgrade to Quarterly",
      description: "Save 22% with a quarterly plan",
      originalPrice: 25000,
      suggestedPrice: 19500,
      category: "subscription",
    });
  }

  // KDP suggestions
  if (behavior.connectedPlatforms >= 3 && behavior.booksPublished === 0) {
    recommendations.push({
      id: "start_kdp",
      type: "cross_sell",
      name: "Start Publishing with KDP",
      description: "Turn your content into income with Amazon KDP",
      price: 25000,
      category: "kdp",
    });
  }

  // Social media suggestions
  if (behavior.connectedPlatforms === 0 && behavior.planHistory.length > 0) {
    recommendations.push({
      id: "connect_social",
      type: "cross_sell",
      name: "Connect Social Media",
      description: "Auto-post your content to 12 platforms",
      price: 0,
      category: "addon",
    });
  }

  // Marketplace suggestions
  if (behavior.marketplaceJobs === 0 && behavior.totalSpent > 10000) {
    recommendations.push({
      id: "try_marketplace",
      type: "cross_sell",
      name: "Post a Freelance Job",
      description: "Find experts to handle your tasks",
      price: 0,
      category: "marketplace",
    });
  }

  return recommendations;
}

// Helper: Calculate relevance score
function calculateRelevanceScore(recommendation: any, behavior: UserBehavior): number {
  let score = 50; // Base score

  // Boost for matching interests
  if (recommendation.category === "kdp" && behavior.interests.includes("publishing")) {
    score += 20;
  }
  if (recommendation.category === "subscription" && behavior.planHistory.length > 0) {
    score += 15;
  }
  if (recommendation.category === "addon" && behavior.connectedPlatforms > 0) {
    score += 10;
  }

  // Boost for spending level
  if (behavior.totalSpent > 50000) score += 10;
  if (behavior.totalSpent > 100000) score += 10;

  // Boost for engagement
  if (behavior.marketplaceJobs > 3) score += 5;

  return Math.min(100, score);
}

// Helper: Get recommendation reason
function getRecommendationReason(recommendation: any, _behavior: UserBehavior): string {
  const reasons: Record<string, string> = {
    upgrade_monthly: "You're on a weekly plan — save 33% with monthly",
    upgrade_quarterly: "Upgrade to quarterly for even more savings",
    start_kdp: "With your social following, KDP could be perfect",
    connect_social: "Automate your content posting across all platforms",
    try_marketplace: "Find experts to help grow your business",
  };

  return reasons[recommendation.id] || "Recommended based on your activity";
}
