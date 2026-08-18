import { defineTable } from "convex/server";
import { v } from "convex/values";

export const supportTables = {
  support_chats: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.string(),
    agentType: v.union(v.literal("sales"), v.literal("support")),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      timestamp: v.number(),
      confidence: v.optional(v.number()),
    })),
    status: v.union(v.literal("active"), v.literal("escalated"), v.literal("resolved")),
    escalatedTo: v.optional(v.string()),
    escalatedAt: v.optional(v.number()),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  support_interactions: defineTable({
    userId: v.string(),
    message: v.string(),
    response: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    confidence: v.string(),
    routed: v.boolean(),
    sentiment: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"]),

  support_escalations: defineTable({
    userId: v.string(),
    interactionId: v.optional(v.id("support_interactions")),
    agentId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("resolved")),
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
    responses: v.optional(v.array(v.object({
      text: v.string(),
      timestamp: v.number(),
    }))),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_interaction", ["interactionId"])
    .index("by_agent", ["agentId"]),

  client_tasks: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    packageName: v.string(),
    packageId: v.string(),
    deliverable: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    content: v.optional(v.string()),
    paymentReference: v.string(),
    amount: v.number(),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_payment_ref", ["paymentReference"]),

  // ═══════════════════════════════════════════════════════════════════
  // FREELLMAPI USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════
  admin_task_log: defineTable({
    adminId: v.id("users"),
    agentId: v.string(),
    userEmail: v.optional(v.string()),
    serviceId: v.string(),
    prompt: v.string(),
    output: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    timestamp: v.number(),
  }).index("by_admin", ["adminId"]),
};
