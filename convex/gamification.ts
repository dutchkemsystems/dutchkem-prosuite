import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// GAMIFICATION & LOYALTY POINTS — XP, levels, streaks, achievements
// ═══════════════════════════════════════════════════════════════════

// Points awarded per action
const POINTS_CONFIG = {
  // Subscriptions
  subscribe_weekly: 50,
  subscribe_monthly: 200,
  subscribe_quarterly: 500,
  subscribe_yearly: 1500,
  subscription_renewal: 100,

  // Referrals
  referral_signup: 100,
  referral_conversion: 300,

  // Social
  connect_platform: 25,
  first_post: 50,
  social_post: 10,

  // Marketplace
  post_job: 50,
  complete_job: 200,
  approve_job: 100,

  // Engagement
  daily_login: 5,
  weekly_streak_bonus: 50,
  monthly_streak_bonus: 200,
  leave_review: 25,
  complete_profile: 100,

  // KDP
  publish_book: 500,
  royalty_milestone: 250,

  // Milestones
  first_purchase: 150,
  tenth_purchase: 500,
};

// Level thresholds (cumulative XP)
const LEVELS = [
  { level: 1, name: "Newcomer", minXp: 0, icon: "🌱" },
  { level: 2, name: "Explorer", minXp: 500, icon: "🔍" },
  { level: 3, name: "Regular", minXp: 1500, icon: "⭐" },
  { level: 4, name: "Pro", minXp: 4000, icon: "🏆" },
  { level: 5, name: "Elite", minXp: 10000, icon: "👑" },
  { level: 6, name: "Legend", minXp: 25000, icon: "💎" },
  { level: 7, name: "Master", minXp: 50000, icon: "🔥" },
  { level: 8, name: "Grandmaster", minXp: 100000, icon: "🌟" },
];

// Get user gamification profile
export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("gamification_profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .first();

    if (!profile) return null;

    const badges = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();

    const currentLevel = getCurrentLevel(profile.totalXp);
    const nextLevel = getNextLevel(profile.totalXp);
    const xpForNext = nextLevel ? nextLevel.minXp - currentLevel.minXp : 0;
    const xpProgress = nextLevel
      ? ((profile.totalXp - currentLevel.minXp) / xpForNext) * 100
      : 100;

    return {
      ...profile,
      currentLevel,
      nextLevel,
      xpProgress: Math.min(100, xpProgress),
      badges,
      streakDays: profile.currentStreak,
    };
  },
});

// Award points for an action
export const awardPoints = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    amount: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const points = args.amount || POINTS_CONFIG[args.action as keyof typeof POINTS_CONFIG] || 0;
    if (points <= 0) return { awarded: 0 };

    // Get or create profile
    let profile = await ctx.db
      .query("gamification_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      const profileId = await ctx.db.insert("gamification_profiles", {
        userId: args.userId,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString().split("T")[0],
        totalActions: 0,
        createdAt: Date.now(),
      });
      profile = await ctx.db.get("gamification_profiles", profileId);
    }

    if (!profile) return { awarded: 0 };

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let newStreak = profile.currentStreak;

    if (profile.lastActiveDate === today) {
      // Already active today, no streak change
    } else if (profile.lastActiveDate === yesterday) {
      newStreak = profile.currentStreak + 1;
    } else {
      newStreak = 1; // Streak broken
    }

    const newLongestStreak = Math.max(newStreak, profile.longestStreak);
    const newTotalXp = profile.totalXp + points;
    const newLevel = getCurrentLevel(newTotalXp).level;

    await ctx.db.patch("gamification_profiles", profile._id, {
      totalXp: newTotalXp,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActiveDate: today,
      totalActions: profile.totalActions + 1,
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("gamification_log", {
      userId: args.userId,
      action: args.action,
      points,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    // Check for level-up notification
    if (newLevel > profile.level) {
      const levelInfo = LEVELS.find((l) => l.level === newLevel);
      if (levelInfo) {
        await ctx.db.insert("notifications", {
          userId: args.userId,
          title: `Level Up! ${levelInfo.icon}`,
          message: `You've reached Level ${newLevel}: ${levelInfo.name}! You earned ${points} XP.`,
          type: "system",
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    // Check for streak bonuses
    if (newStreak > 0 && newStreak % 7 === 0) {
      const bonusPoints = POINTS_CONFIG.weekly_streak_bonus;
      await ctx.db.patch("gamification_profiles", profile._id, { totalXp: newTotalXp + bonusPoints });
      await ctx.db.insert("gamification_log", {
        userId: args.userId,
        action: "weekly_streak_bonus",
        points: bonusPoints,
        metadata: { streak: newStreak },
        createdAt: Date.now(),
      });
    }

    return { awarded: points, newTotal: newTotalXp, level: newLevel };
  },
});

// Get user's point history
export const getPointHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("gamification_log")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .order("desc")
      .take(args.limit || 20);
  },
});

// Get leaderboard (all users)
export const getLeaderboard = query({
  args: {
    period: v.optional(v.union(v.literal("weekly"), v.literal("monthly"), v.literal("all_time"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("gamification_profiles").collect();

    // Sort by XP
    const sorted = profiles
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, args.limit || 50)
      .map((p, i) => ({
        rank: i + 1,
        userId: p.userId,
        totalXp: p.totalXp,
        level: p.level,
        currentStreak: p.currentStreak,
        longestStreak: p.longestStreak,
        levelInfo: getCurrentLevel(p.totalXp),
      }));

    return sorted;
  },
});

// Get user's achievements
export const getAchievements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
      .collect();
  },
});

// Award an achievement
export const awardAchievement = internalMutation({
  args: {
    userId: v.id("users"),
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    rarity: v.union(
      v.literal("common"),
      v.literal("uncommon"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
  },
  handler: async (ctx, args) => {
    // Check if already earned
    const existing = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (existing.some((a) => a.achievementId === args.achievementId)) {
      return { alreadyEarned: true };
    }

    await ctx.db.insert("user_achievements", {
      userId: args.userId,
      achievementId: args.achievementId,
      name: args.name,
      description: args.description,
      icon: args.icon,
      rarity: args.rarity,
      earnedAt: Date.now(),
    });

    // Award bonus XP based on rarity
    const bonusXp: Record<string, number> = {
      common: 25,
      uncommon: 50,
      rare: 100,
      epic: 250,
      legendary: 500,
    };

    await ctx.db.insert("gamification_log", {
      userId: args.userId,
      action: `achievement_${args.achievementId}`,
      points: bonusXp[args.rarity] || 0,
      metadata: { achievement: args.name, rarity: args.rarity },
      createdAt: Date.now(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: `Achievement Unlocked! ${args.icon}`,
      message: `You earned "${args.name}" — ${args.description}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
    });

    return { earned: true, xpAwarded: bonusXp[args.rarity] || 0 };
  },
});

// Get all available achievements
export const getAllAchievements = query({
  args: {},
  handler: async (_ctx) => {
    return ACHIEVEMENTS;
  },
});

// Helper: Get current level from XP
function getCurrentLevel(xp: number) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXp) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

// Helper: Get next level
function getNextLevel(xp: number) {
  for (const level of LEVELS) {
    if (xp < level.minXp) {
      return level;
    }
  }
  return null;
}

// Achievement definitions
const ACHIEVEMENTS = [
  { id: "first_steps", name: "First Steps", description: "Complete your first action", icon: "👶", rarity: "common" as const, requirement: 1 },
  { id: "social_butterfly", name: "Social Butterfly", description: "Connect 5 social platforms", icon: "🦋", rarity: "uncommon" as const, requirement: 5 },
  { id: "platform_master", name: "Platform Master", description: "Connect all 12 platforms", icon: "🌐", rarity: "rare" as const, requirement: 12 },
  { id: "streak_warrior", name: "Streak Warrior", description: "Maintain a 30-day streak", icon: "⚔️", rarity: "epic" as const, requirement: 30 },
  { id: "referral_king", name: "Referral King", description: "Refer 10 users", icon: "👑", rarity: "uncommon" as const, requirement: 10 },
  { id: "referral_legend", name: "Referral Legend", description: "Refer 50 users", icon: "🏅", rarity: "legendary" as const, requirement: 50 },
  { id: "book_author", name: "Book Author", description: "Publish your first book", icon: "📚", rarity: "uncommon" as const, requirement: 1 },
  { id: "bestseller", name: "Bestseller", description: "Publish 10 books", icon: "🏆", rarity: "epic" as const, requirement: 10 },
  { id: "job_provider", name: "Job Provider", description: "Post 5 marketplace jobs", icon: "💼", rarity: "uncommon" as const, requirement: 5 },
  { id: "reviewer", name: "Reviewer", description: "Leave 10 reviews", icon: "⭐", rarity: "uncommon" as const, requirement: 10 },
  { id: "night_owl", name: "Night Owl", description: "Active after midnight", icon: "🦉", rarity: "common" as const, requirement: 1 },
  { id: "early_bird", name: "Early Bird", description: "Active before 6 AM", icon: "🐦", rarity: "common" as const, requirement: 1 },
  { id: "whale", name: "Whale", description: "Spend ₦500,000 total", icon: "🐋", rarity: "legendary" as const, requirement: 500000 },
  { id: "century", name: "Century", description: "Reach Level 100", icon: "💯", rarity: "legendary" as const, requirement: 100 },
];

// Check and award achievements for a user
export const checkAchievements = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("gamification_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return;

    const existing = await ctx.db
      .query("user_achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const earnedIds = new Set(existing.map((a) => a.achievementId));

    // Check streak achievements
    if (profile.currentStreak >= 30 && !earnedIds.has("streak_warrior")) {
      await ctx.runMutation(internal.gamification.awardAchievement, {
        userId: args.userId,
        achievementId: "streak_warrior",
        name: "Streak Warrior",
        description: "Maintain a 30-day streak",
        icon: "⚔️",
        rarity: "epic",
      });
    }

    // Check level achievements
    if (profile.level >= 100 && !earnedIds.has("century")) {
      await ctx.runMutation(internal.gamification.awardAchievement, {
        userId: args.userId,
        achievementId: "century",
        name: "Century",
        description: "Reach Level 100",
        icon: "💯",
        rarity: "legendary",
      });
    }
  },
});

// Get XP configuration (for UI display)
export const getXpConfig = query({
  args: {},
  handler: async () => {
    return {
      actions: POINTS_CONFIG,
      levels: LEVELS,
    };
  },
});
