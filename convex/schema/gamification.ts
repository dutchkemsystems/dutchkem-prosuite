import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gamificationTables = {
  badges: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.union(v.literal("sales"), v.literal("completion"), v.literal("rating"), v.literal("milestone")),
    requirement: v.object({
      type: v.string(),
      threshold: v.number(),
    }),
    isActive: v.boolean(),
  }),
  user_badges: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    awardedAt: v.number(),
    milestone: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_badge", ["badgeId"]),
  leaderboard_entries: defineTable({
    userId: v.id("users"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("all_time")),
    periodStart: v.string(),
    periodEnd: v.string(),
    rank: v.number(),
    score: v.number(),
    metrics: v.object({
      sales: v.number(),
      completions: v.number(),
      rating: v.number(),
      responseTime: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_period", ["period", "periodStart", "periodEnd"])
    .index("by_user", ["userId"])
    .index("by_rank", ["period", "periodStart", "periodEnd", "rank"]),
  gamification_profiles: defineTable({
    userId: v.id("users"),
    totalXp: v.number(),
    level: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDate: v.string(),
    totalActions: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_level", ["level"])
    .index("by_xp", ["totalXp"]),
  gamification_log: defineTable({
    userId: v.id("users"),
    action: v.string(),
    points: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_action", ["action"]),
  user_achievements: defineTable({
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
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_achievement", ["achievementId"]),
};
