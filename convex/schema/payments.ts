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
    .index("by_created", ["createdAt"])
    .index("by_transaction_id", ["transactionId"]),
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
    amountNgn: v.optional(v.number()),
    currency: v.optional(v.string()),
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
  kora_refunds: defineTable({
    refundId: v.string(),
    originalReference: v.string(),
    amount: v.number(),
    reason: v.string(),
    adminId: v.string(),
    koraRefundId: v.string(),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
    completedAt: v.optional(v.number()),
    rawPayload: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_refund_id", ["refundId"])
    .index("by_original_reference", ["originalReference"])
    .index("by_status", ["status"]),
  invoices: defineTable({
    invoiceId: v.string(),
    reference: v.string(),
    userId: v.string(),
    email: v.string(),
    amount: v.number(),
    type: v.string(),
    packageId: v.string(),
    credits: v.number(),
    billingCycle: v.optional(v.string()),
    status: v.union(v.literal("generated"), v.literal("sent"), v.literal("viewed")),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_invoice_id", ["invoiceId"])
    .index("by_reference", ["reference"])
    .index("by_user", ["userId"]),
  renewal_transactions: defineTable({
    subscriptionId: v.string(),
    userId: v.string(),
    service: v.string(),
    plan: v.string(),
    amount: v.number(),
    reference: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),
  subscription_renewals: defineTable({
    subscriptionId: v.string(),
    userId: v.string(),
    service: v.string(),
    plan: v.string(),
    amount: v.number(),
    reference: v.string(),
    previousExpiry: v.number(),
    newExpiry: v.number(),
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_user", ["userId"]),
};
