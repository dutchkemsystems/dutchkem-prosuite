import { defineTable } from "convex/server";
import { v } from "convex/values";

export const marketingTables = {
  rapidapi_connections: defineTable({
    platformId: v.string(),
    platformName: v.string(),
    isActive: v.boolean(),
    usageCount: v.number(),
    errorCount: v.number(),
    lastUsed: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_platform", ["platformId"]),
  rapidapi_post_logs: defineTable({
    platformId: v.string(),
    content: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("rate_limited")),
    errorMessage: v.optional(v.string()),
    responseData: v.optional(v.any()),
    fallbackTriggered: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platformId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  posting_config: defineTable({
    key: v.string(),     // "posting_mode", "auto_post_enabled", etc.
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  flyer_design_styles: defineTable({
    name: v.string(),
    description: v.string(),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    bgColor: v.string(),
    textColor: v.string(),
    fontFamily: v.string(),
    layout: v.union(v.literal("modern"), v.literal("bold"), v.literal("minimal"), v.literal("creative"), v.literal("corporate")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),
  flyer_auto_posting_engine: defineTable({
    status: v.union(v.literal("running"), v.literal("stopped")),
    postingIntervalHours: v.number(),
    lastTickAt: v.optional(v.number()),
    nextTickAt: v.optional(v.number()),
    currentModeIndex: v.number(),
    platforms: v.object({
      linkedin: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      facebook: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      instagram: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      youtube: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      reddit: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      threads: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      telegram: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      discord: v.object({ enabled: v.boolean(), paused: v.boolean() }),
    }),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    totalFailed: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  generated_flyers: defineTable({
    engineId: v.id("flyer_auto_posting_engine"),
    styleId: v.optional(v.id("flyer_design_styles")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
    nvidiaModel: v.optional(v.string()),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    status: v.union(v.literal("generated"), v.literal("posted"), v.literal("failed"), v.literal("queued")),
    createdAt: v.number(),
  }).index("by_engine", ["engineId"])
    .index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_created", ["createdAt"]),
  flyer_posting_queue: defineTable({
    flyerId: v.id("generated_flyers"),
    engineId: v.id("flyer_auto_posting_engine"),
    platform: v.string(),
    scheduledFor: v.number(),
    status: v.union(v.literal("pending"), v.literal("posting"), v.literal("posted"), v.literal("failed"), v.literal("cancelled")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_platform", ["platform"]),
  flyer_posting_logs: defineTable({
    flyerId: v.id("generated_flyers"),
    engineId: v.id("flyer_auto_posting_engine"),
    platform: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.number(),
    createdAt: v.number(),
  }).index("by_engine", ["engineId"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  sms_campaigns: defineTable({
    name: v.string(),
    message: v.string(),
    messageVariantB: v.optional(v.string()),
    recipients: v.array(v.string()),
    recipientCount: v.number(),
    scheduledTime: v.optional(v.string()),
    status: v.string(),
    isAbTest: v.optional(v.boolean()),
    splitPercentage: v.optional(v.number()),
    sentCount: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
    clickCount: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }),
  email_campaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    recipients: v.array(v.string()),
    recipientCount: v.number(),
    scheduledTime: v.optional(v.string()),
    status: v.string(),
    campaignType: v.optional(v.string()),
    sentCount: v.number(),
    openCount: v.number(),
    clickCount: v.number(),
    bounceCount: v.number(),
    createdAt: v.number(),
  }),
  communication_logs: defineTable({
    userId: v.id("users"),
    adminId: v.optional(v.id("users")),
    type: v.union(v.literal("call"), v.literal("whatsapp"), v.literal("sms"), v.literal("email")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    recipient: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("failed")),
    externalId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  popup_analytics: defineTable({
    userId: v.string(),
    popupType: v.string(),
    action: v.string(),
    createdAt: v.number(),
  }).index("by_type", ["popupType"])
    .index("by_action", ["action"]),

  seo_analyses: defineTable({
    url: v.string(),
    score: v.number(),
    issues: v.any(),
    suggestions: v.any(),
    keywords: v.any(),
    contentId: v.optional(v.string()),
    analyzedAt: v.number(),
  }).index("by_url", ["url"])
    .index("by_analyzed", ["analyzedAt"]),

  creative_pipeline_status: defineTable({
    enabled: v.boolean(),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // ═══════════════════════════════════════════════════════════════════
  // SUPPORT ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════
};
