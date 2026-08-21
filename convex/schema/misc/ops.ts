import { defineTable } from "convex/server";
import { v } from "convex/values";

export const opsTables = {
  active_viewers: defineTable({
    agentId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    lastSeen: v.number(),
  }).index("by_agent", ["agentId", "lastSeen"]).index("by_session", ["sessionId"]),
  analytics_events: defineTable({
    userId: v.id("users"),
    event: v.string(),
    properties: v.optional(v.any()),
    page: v.optional(v.string()),
    duration: v.optional(v.number()),
    referrer: v.optional(v.string()),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_event", ["event"])
    .index("by_page", ["page"]),
  chatbot_conversations: defineTable({
    visitorId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended")),
    state: v.string(),
    messages: v.array(v.any()),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    leadData: v.optional(v.any()),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_status", ["status"]),
  testimonials: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    service: v.string(),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    result: v.optional(v.string()),
    industry: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    featured: v.boolean(),
    verified: v.boolean(),
    helpful: v.number(),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_service", ["service"])
    .index("by_featured", ["featured"])
    .index("by_rating", ["rating"]),
  generated_receipts: defineTable({
    receiptNumber: v.string(), // DKV-XXXXX-XXXX format
    transactionType: v.string(), // "subscription_renewal", "tithe", "cac", "sweep", "transfer"
    transactionId: v.optional(v.string()), // related transaction id
    amountNgn: v.number(),
    fromAccount: v.string(),
    toAccount: v.string(),
    toBank: v.string(),
    toName: v.string(),
    koraReference: v.optional(v.string()),
    date: v.number(),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptData: v.any(), // Full receipt data for regeneration
    jpgUrl: v.optional(v.string()), // Storage URL for JPG
    pdfUrl: v.optional(v.string()), // Storage URL for PDF
    downloads: v.number(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_receipt_number", ["receiptNumber"])
    .index("by_transaction", ["transactionType", "transactionId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),
  live_feeds: defineTable({
    feedType: v.string(),
    title: v.string(),
    message: v.string(),
    severity: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["feedType"])
    .index("by_created", ["createdAt"]),
  transaction_analytics: defineTable({
    transactionId: v.optional(v.string()),
    amountNgn: v.optional(v.number()),
    amountUsd: v.optional(v.number()),
    exchangeRateUsed: v.optional(v.number()),
    transactionHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"]),
  saved_reports: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    metrics: v.array(v.object({
      type: v.union(v.literal("revenue"), v.literal("subscriptions"), v.literal("agent_usage"), v.literal("users"), v.literal("performance")),
      field: v.string(),
      aggregation: v.union(v.literal("sum"), v.literal("avg"), v.literal("count"), v.literal("min"), v.literal("max")),
    })),
    filters: v.optional(v.array(v.object({
      field: v.string(),
      operator: v.string(),
      value: v.any(),
    }))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      recipients: v.array(v.string()),
      enabled: v.boolean(),
    })),
    lastGenerated: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creator", ["createdBy"]),
  client_locations: defineTable({
    userId: v.id("users"),
    ip: v.optional(v.string()),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"])
    .index("by_location", ["country", "region"])
    .index("by_coordinates", ["latitude", "longitude"]),
  territories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    boundaries: v.array(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    color: v.string(),
    assignedAgents: v.array(v.id("users")),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  hygiene_reports: defineTable({
    type: v.union(v.literal("duplicate_email"), v.literal("duplicate_phone"), v.literal("incomplete_profile")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    affectedUsers: v.array(v.id("users")),
    details: v.any(),
    actionTaken: v.optional(v.string()),
    reportDate: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_type", ["type"])
    .index("by_date", ["reportDate"]),
  system_backups: defineTable({
    backupType: v.string(), // "schema_config", "auth_config", "social_config", etc.
    data: v.any(),
    description: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("deleted")),
    checksum: v.string(),
  }).index("by_type_and_time", ["backupType", "createdAt"])
    .index("by_status", ["status"]),
  synthetic_performance_logs: defineTable({
    agentId: v.string(),
    eventType: v.union(
      v.literal("generation"),
      v.literal("error"),
      v.literal("fallback"),
      v.literal("timeout")
    ),
    prompt: v.string(),
    response: v.optional(v.string()),
    model: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_agent", ["agentId", "timestamp"])
    .index("by_event", ["eventType", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
  admin_users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  health_logs: defineTable({
    component: v.string(),
    status: v.string(),
    details: v.string(),
    severity: v.string(),
    timestamp: v.number(),
    responseTimeMs: v.optional(v.number()),
  }).index("by_component", ["component"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity", ["severity"]),

  security_events: defineTable({
    eventType: v.string(),
    description: v.string(),
    severity: v.string(),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    blocked: v.optional(v.boolean()),
    timestamp: v.number(),
  }).index("by_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity", ["severity"]),

  // Misc Single-File Tables
  guardian_tests: defineTable({
    testName: v.string(),
    category: v.string(),
    status: v.string(),
    fixAction: v.optional(v.string()),
    autoFixApplied: v.optional(v.boolean()),
    latency: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_category", ["category"])
    .index("by_status", ["status"]),

  payment_notification_logs: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    amount: v.optional(v.number()),
    channel: v.string(),
    sentAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_sent", ["sentAt"]),

  performance_metrics: defineTable({
    functionName: v.string(),
    module: v.string(),
    hour: v.string(), // YYYY-MM-DDTHH
    totalCalls: v.number(),
    successCalls: v.number(),
    errorCalls: v.number(),
    totalExecutionTimeMs: v.number(),
    avgExecutionTimeMs: v.number(),
    maxExecutionTimeMs: v.number(),
    lastError: v.optional(v.string()),
    lastCallAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_function_hour", ["functionName", "hour"])
    .index("by_module_hour", ["module", "hour"])
    .index("by_hour", ["hour"]),
  performance_logs: defineTable({
    functionName: v.string(),
    module: v.string(),
    executionTimeMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_function", ["functionName"])
    .index("by_timestamp", ["timestamp"])
    .index("by_success", ["success"]),
  flash_sales: defineTable({
    name: v.string(),
    discountPercent: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    applicablePlans: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  promo_codes: defineTable({
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    currentUses: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Team Accounts
  business_hours: defineTable({
    schedule: v.any(),
    timezone: v.string(),
    closedMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  update_history: defineTable({
    cycle: v.string(),
    version: v.string(),
    status: v.union(v.literal("applied"), v.literal("failed"), v.literal("rolled_back")),
    snapshot: v.any(),
    timestamp: v.number(),
  }).index("by_cycle", ["cycle"]),
};
