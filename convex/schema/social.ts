import { defineTable } from "convex/server";
import { v } from "convex/values";

export const socialTables = {
  social_posts: defineTable({
    agentId: v.string(),
    adminId: v.optional(v.string()),
    platform: v.string(), // "X", "LinkedIn", "Facebook", etc.
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("posted"), v.literal("failed")),
    scheduledFor: v.number(),
    postedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    externalId: v.optional(v.string()),
    anonymous: v.optional(v.boolean()),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_status_and_scheduled", ["status", "scheduledFor"])
    .index("by_admin", ["adminId"]),
  social_platforms: defineTable({
    userId: v.optional(v.id("users")), // Owner of this connection
    platform: v.string(), // "x", "linkedin", "facebook", "instagram", "threads", etc.
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    isConnected: v.boolean(),
    connectedAt: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
    postsCount: v.number(),
    followersCount: v.number(),
    username: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    // Posting control fields
    postingMode: v.optional(v.union(v.literal("auto"), v.literal("manual"), v.literal("paused"))),
    scheduleTime: v.optional(v.string()),
    postingFrequency: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
  }).index("by_platform", ["platform"])
    .index("by_connected", ["isConnected"])
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_platform", ["userId", "platform"]),
  oauth_states: defineTable({
    state: v.string(),
    platform: v.string(),
    redirectUri: v.optional(v.string()),
    adminId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    codeVerifier: v.optional(v.string()),
  }).index("by_state", ["state"]),
  platform_connections: defineTable({
    adminId: v.string(),
    platformId: v.string(),
    platformName: v.string(),
    integrationId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),
    isConnected: v.boolean(),
    autoPostEnabled: v.boolean(),
    connectedAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    scopes: v.optional(v.string()),
    anonymousByDefault: v.optional(v.boolean()),
    followersCount: v.optional(v.number()),
  })
    .index("by_admin", ["adminId"])
    .index("by_admin_platform", ["adminId", "platformId"]),
  token_refresh_logs: defineTable({
    platform: v.string(),
    adminId: v.optional(v.string()),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
    oldExpiresAt: v.optional(v.number()),
    newExpiresAt: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),
  social_activities: defineTable({
    type: v.string(),
    userId: v.string(),
    userName: v.string(),
    agentName: v.string(),
    amount: v.optional(v.number()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]).index("by_user", ["userId", "agentName"]),
  content_calendar: defineTable({
    title: v.string(),
    contentType: v.string(),
    platform: v.string(),
    scheduledDate: v.number(),
    keywords: v.array(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("archived")
    ),
    createdAt: v.number(),
  })
    .index("by_date", ["scheduledDate"])
    .index("by_status", ["status"]),
  social_commerce_conversations: defineTable({
    platform: v.string(),
    customerHandle: v.string(),
    conversationData: v.any(),
    buyingIntentScore: v.number(),
    status: v.union(v.literal("open"), v.literal("engaged"), v.literal("converted"), v.literal("closed")),
    leadId: v.optional(v.string()),
    convertedToSale: v.boolean(),
    saleAmount: v.optional(v.number()),
    commissionEarned: v.optional(v.number()),
    createdAt: v.number(),
    convertedAt: v.optional(v.number()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_intent", ["buyingIntentScore"]),
  dm_automation_rules: defineTable({
    triggerKeywords: v.array(v.string()),
    responseTemplate: v.string(),
    productRecommendation: v.optional(v.string()),
    discountCode: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),
  social_engagement_logs: defineTable({
    platform: v.string(),
    postId: v.string(),
    commentText: v.string(),
    buyingIntent: v.boolean(),
    autoReplied: v.boolean(),
    replyText: v.optional(v.string()),
    converted: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platform"])
    .index("by_intent", ["buyingIntent"])
    .index("by_created", ["createdAt"]),
};
