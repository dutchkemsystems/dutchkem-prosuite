import { defineTable } from "convex/server";
import { v } from "convex/values";

export const agentsTables = {
  ai_agents: defineTable({
    name: v.string(),
    description: v.string(),
    type: v.string(), // e.g., "guardian", "analyst", "translator"
  }),
  agent_conversations: defineTable({
    userId: v.id("users"),
    agentId: v.id("ai_agents"),
    title: v.string(),
  }).index("by_user", ["userId"]),
  agent_messages: defineTable({
    conversationId: v.id("agent_conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_conversation", ["conversationId"]),
  agent_performance: defineTable({
    userId: v.id("users"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    periodStart: v.string(),
    periodEnd: v.string(),
    metrics: v.object({
      totalSales: v.number(),
      totalRevenue: v.number(),
      completions: v.number(),
      averageRating: v.number(),
      totalRatings: v.number(),
      responseTimeAvg: v.number(),
      leadsHandled: v.number(),
      conversionRate: v.number(),
    }),
    target: v.object({
      salesTarget: v.number(),
      revenueTarget: v.number(),
      completionTarget: v.number(),
    }),
    commission: v.object({
      baseRate: v.number(),
      bonusRate: v.number(),
      totalCommission: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_period", ["period", "periodStart", "periodEnd"]),
  agent_reviews: defineTable({
    agentId: v.string(),
    userId: v.string(),
    userName: v.string(),
    rating: v.number(),
    comment: v.string(),
    verified: v.boolean(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId", "createdAt"]),
  agent_autonomy_logs: defineTable({
    agentId: v.string(),
    actionType: v.string(),
    actionDetails: v.string(),
    executedBy: v.string(),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"]),
  agent_marketplace_templates: defineTable({
    templateId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    author: v.string(),
    version: v.string(),
    priceNgn: v.number(),
    isFree: v.boolean(),
    config: v.any(),
    tags: v.array(v.string()),
    installCount: v.number(),
    rating: v.number(),
    reviewCount: v.number(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template_id", ["templateId"])
    .index("by_category", ["category"])
    .index("by_author", ["author"])
    .index("by_published", ["isPublished"]),
  agent_marketplace_reviews: defineTable({
    templateId: v.string(),
    reviewerId: v.string(),
    reviewerName: v.string(),
    rating: v.number(),
    title: v.string(),
    comment: v.string(),
    helpful: v.number(),
    createdAt: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_reviewer", ["reviewerId"]),
  agent_marketplace_installations: defineTable({
    templateId: v.string(),
    installedBy: v.string(),
    agentId: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("uninstalled")),
    installedAt: v.number(),
    uninstalledAt: v.optional(v.number()),
  })
    .index("by_template", ["templateId"])
    .index("by_installer", ["installedBy"])
    .index("by_status", ["status"]),
  agent_analytics_metrics: defineTable({
    agentId: v.string(),
    metricType: v.string(),
    value: v.number(),
    dimensions: v.any(),
    recordedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_metric", ["metricType"])
    .index("by_recorded", ["recordedAt"]),
  agent_version_control: defineTable({
    agentId: v.string(),
    version: v.string(),
    config: v.any(),
    changelog: v.string(),
    createdBy: v.string(),
    isRollback: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_version", ["version"]),
  agent_subscriptions: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("canceled")),
    endsAt: v.number(),
    autoRenew: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"]),
  agent_payment_pending: defineTable({
    reference: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    email: v.string(),
    name: v.string(),
    checkoutUrl: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    subscriptionId: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_reference", ["reference"])
    .index("by_status", ["status"]),
  agent_receipts: defineTable({
    userId: v.id("users"),
    reference: v.string(),
    receiptNumber: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("failed")),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_reference", ["reference"])
    .index("by_receipt_number", ["receiptNumber"]),
};
