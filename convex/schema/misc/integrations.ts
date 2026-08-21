import { defineTable } from "convex/server";
import { v } from "convex/values";

export const integrationsTables = {
  ai_model_status: defineTable({
    modelName: v.string(),
    displayName: v.string(),
    isEnabled: v.boolean(),
    icon: v.string(),
    providerType: v.string(),
    description: v.string(),
    lastToggledAt: v.optional(v.number()),
    toggledBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_model", ["modelName"]),
  ai_model_toggle_logs: defineTable({
    modelName: v.string(),
    action: v.string(),
    enabled: v.boolean(),
    performedBy: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_model", ["modelName"]).index("by_timestamp", ["timestamp"]),
  ai_model_usage: defineTable({
    modelName: v.string(),
    taskType: v.string(),
    input: v.string(),
    agentId: v.optional(v.string()),
    success: v.boolean(),
    responseTimeMs: v.number(),
    errorMessage: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_model", ["modelName"])
    .index("by_timestamp", ["timestamp"])
    .index("by_task", ["taskType"])
    .index("by_success", ["success"])
    .index("by_model_timestamp", ["modelName", "timestamp"]),

  // ═══════════════════════════════════════════════════════════════════
  // MISSING TABLES — Added to fix server errors
  // ═══════════════════════════════════════════════════════════════════

  // Flash Sales & Promo Codes
  unified_orchestrator_status: defineTable({
    enabled: v.boolean(),
    autoGenerate: v.boolean(),
    autoPost: v.boolean(),
    platforms: v.array(v.object({
      id: v.string(),
      enabled: v.boolean(),
    })),
    lastRun: v.union(v.null(), v.number()),
    nextRun: v.union(v.null(), v.number()),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  unified_ad_content: defineTable({
    headline: v.string(),
    description: v.string(),
    cta: v.string(),
    platforms: v.array(v.string()),
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
  unified_scheduled_posts: defineTable({
    content: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed")
    ),
    hashtags: v.optional(v.array(v.string())),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"]),
  unified_posting_logs: defineTable({
    contentId: v.string(),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_content", ["contentId"]),
  freellmapi_usage: defineTable({
    model: v.string(),
    routedVia: v.string(),
    latencyMs: v.number(),
    tokensUsed: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_model", ["model"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // PERFORMANCE MONITORING
  // ═══════════════════════════════════════════════════════════════════
  developer_api_keys: defineTable({
    userId: v.string(),
    apiKey: v.string(),
    apiSecret: v.string(),
    tier: v.union(v.literal("developer"), v.literal("professional"), v.literal("business"), v.literal("enterprise")),
    monthlyCallLimit: v.number(),
    callsUsed: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_key", ["apiKey"])
    .index("by_active", ["isActive"]),
  developer_api_usage_logs: defineTable({
    apiKeyId: v.id("developer_api_keys"),
    endpoint: v.string(),
    method: v.string(),
    responseTimeMs: v.number(),
    statusCode: v.number(),
    createdAt: v.number(),
  }).index("by_key", ["apiKeyId"])
    .index("by_created", ["createdAt"]),
  exchange_rates: defineTable({
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
    source: v.string(),
    effectiveDate: v.string(),
    createdAt: v.number(),
  }).index("by_currencies", ["fromCurrency", "toCurrency"]),

  teams: defineTable({
    name: v.string(),
    ownerId: v.string(),
    plan: v.string(),
    maxMembers: v.number(),
    currentMembers: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted")),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  team_members: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("member"), v.literal("viewer")),
    invitedBy: v.string(),
    joinedAt: v.number(),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("removed")),
  }).index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  team_invites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member"), v.literal("viewer")),
    invitedBy: v.string(),
    inviteCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_code", ["inviteCode"]),

  // USD Wallet
};
