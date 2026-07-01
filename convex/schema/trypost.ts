import { defineTable } from "convex/server";
import { v } from "convex/values";

export const trypostTables = {
  trypost_brand_profile: defineTable({
    brandName: v.string(),
    voice: v.string(), // e.g., "Professional", "Casual", "Witty"
    toneKeywords: v.array(v.string()),
    targetAudience: v.string(),
    colorPalette: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    autoHashtags: v.optional(v.array(v.string())),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  trypost_scheduled_posts: defineTable({
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    carouselSlides: v.optional(v.array(v.any())),
    platforms: v.array(v.string()), // ["twitter", "linkedin", ...]
    scheduledFor: v.number(),
    timezone: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
    agentId: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    aiGenerated: v.optional(v.boolean()),
    publishResults: v.optional(v.any()),
    publishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // v3 additions
    recurrence: v.optional(v.union(
      v.literal("none"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    )),
    parentRecurrenceId: v.optional(v.id("trypost_scheduled_posts")),
    requiresApproval: v.optional(v.boolean()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedReason: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_scheduled", ["scheduledFor"])
    .index("by_status", ["status"])
    .index("by_agent", ["agentId"])
    .index("by_workflow", ["workflowId"])
    .index("by_category", ["category"])
    .index("by_recurrence", ["recurrence"]),
  trypost_media: defineTable({
    name: v.string(),
    url: v.string(),
    type: v.union(v.literal("image"), v.literal("video"), v.literal("gif")),
    tags: v.optional(v.array(v.string())),
    sizeBytes: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    uploadedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),
  trypost_templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    content: v.string(),
    hashtags: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    variables: v.optional(v.array(v.string())),
    useCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_use_count", ["useCount"]),
  trypost_post_comments: defineTable({
    postId: v.id("trypost_scheduled_posts"),
    author: v.string(),
    text: v.string(),
    isInternal: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_created", ["createdAt"]),
  trypost_workflows: defineTable({
    name: v.string(),
    description: v.string(),
    triggerType: v.string(), // "manual", "blog-published", "agent-completed", "schedule"
    triggerConfig: v.optional(v.any()),
    steps: v.array(v.any()),
    platforms: v.array(v.string()),
    active: v.boolean(),
    lastRunAt: v.optional(v.number()),
    runCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_trigger_type", ["triggerType"]),
  trypost_workflow_runs: defineTable({
    workflowId: v.id("trypost_workflows"),
    triggeredBy: v.string(), // "manual", "cron", "blog-123", etc.
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    postsCreated: v.number(),
    postsPublished: v.number(),
    errors: v.optional(v.array(v.string())),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),
  trypost_carousels: defineTable({
    topic: v.string(),
    platform: v.string(),
    slides: v.array(v.any()),
    caption: v.optional(v.string()),
    aiPrompt: v.optional(v.string()),
    generatedBy: v.string(),
    status: v.union(
      v.literal("generating"),
      v.literal("ready"),
      v.literal("published"),
      v.literal("failed")
    ),
    scheduledFor: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_platform", ["platform"]),
  trypost_analytics: defineTable({
    postId: v.id("trypost_scheduled_posts"),
    platform: v.string(),
    impressions: v.optional(v.number()),
    reach: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    clicks: v.optional(v.number()),
    engagementRate: v.optional(v.number()),
    recordedAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_platform", ["platform"])
    .index("by_recorded", ["recordedAt"]),
  trypost_webhook_events: defineTable({
    eventType: v.string(), // "post.published", "post.failed", "analytics.updated"
    reference: v.string(),
    platform: v.optional(v.string()),
    payload: v.any(),
    verified: v.boolean(),
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    receivedAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_event_type", ["eventType"])
    .index("by_processed", ["processed"])
    .index("by_received", ["receivedAt"]),
};
