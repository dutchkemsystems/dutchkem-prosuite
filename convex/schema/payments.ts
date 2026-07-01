import { defineTable } from "convex/server";
import { v } from "convex/values";

export const paymentsTables = {
  checkout_sessions: defineTable({
    userId: v.id("users"),
    planId: v.string(),
    planName: v.string(),
    amount: v.number(),
    reference: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("abandoned"),
      v.literal("cancelled")
    ),
    recoveryStage: v.number(),
    createdAt: v.number(),
    abandonedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lastRecoveryAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),
  kora_webhook_events: defineTable({
    eventType: v.string(), // "transfer.completed", "transfer.failed", etc.
    reference: v.string(), // Kora reference
    amount: v.optional(v.number()),
    status: v.string(),
    rawPayload: v.any(),
    verified: v.boolean(),
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    relatedTransactionId: v.optional(v.string()),
    receivedAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_event_type", ["eventType"])
    .index("by_processed", ["processed"])
    .index("by_received", ["receivedAt"]),
  agentic_payment_methods: defineTable({
    methodId: v.string(),
    name: v.string(),
    type: v.string(),
    provider: v.string(),
    config: v.any(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_method_id", ["methodId"])
    .index("by_type", ["type"]),
  agentic_payment_transactions: defineTable({
    transactionId: v.string(),
    agentId: v.string(),
    methodId: v.string(),
    amountNgn: v.number(),
    recipient: v.string(),
    description: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("reversed")),
    koraReference: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  agentic_payment_limits: defineTable({
    agentId: v.string(),
    dailyLimitNgn: v.number(),
    monthlyLimitNgn: v.number(),
    perTransactionLimitNgn: v.number(),
    spentToday: v.number(),
    spentThisMonth: v.number(),
    lastResetAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"]),
  pre_subscription_exchanges: defineTable({
    userId: v.string(),
    agentId: v.string(),
    exchangeCount: v.number(),
    lastExchangeAt: v.number(),
    createdAt: v.number(),
  }).index("by_user_agent", ["userId", "agentId"]),
  kora_pending_transactions: defineTable({
    userId: v.string(),
    type: v.string(), // "credit_purchase", "subscription", "enterprise_addon"
    reference: v.string(),
    amount: v.number(),
    packageId: v.string(),
    credits: v.number(),
    email: v.string(),
    billingCycle: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),
};
