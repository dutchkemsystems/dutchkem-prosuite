import { defineTable } from "convex/server";
import { v } from "convex/values";

export const monetizationTables = {
  user_credits: defineTable({
    userId: v.string(),
    balance: v.number(),
    lifetimePurchased: v.number(),
    lifetimeUsed: v.number(),
    autoRechargeEnabled: v.boolean(),
    autoRechargeThreshold: v.number(),
    autoRechargeAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  credit_purchases: defineTable({
    userId: v.string(),
    amount: v.number(),
    priceNgN: v.number(),
    bonusCredits: v.number(),
    paymentReference: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_reference", ["paymentReference"])
    .index("by_status", ["status"]),
  credit_transactions: defineTable({
    userId: v.string(),
    amount: v.number(),
    transactionType: v.string(),
    description: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["transactionType"]),
  credit_expiry_config: defineTable({
    enabled: v.boolean(),
    expiryDays: v.number(), // default 30
    warningDays: v.number(), // warn before expiry (default 7)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["enabled"]),
  subscription_plans: defineTable({
    planId: v.string(), // "starter", "pro", "enterprise"
    name: v.string(),
    description: v.string(),
    monthlyPriceNgn: v.number(),
    annualPriceNgn: v.number(),
    annualDiscountPercent: v.number(),
    creditsIncluded: v.number(),
    messageLimitMonthly: v.number(), // -1 for unlimited
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_plan_id", ["planId"])
    .index("by_active", ["isActive"]),
  agent_pricing_tiers: defineTable({
    agentId: v.string(), // "A1"-"A15"
    agentName: v.string(),
    tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("enterprise")),
    monthlyPriceNgn: v.number(),
    creditsPerMessage: v.number(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_tier", ["tier"])
    .index("by_active", ["isActive"]),
  enterprise_addons: defineTable({
    addonId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.union(v.literal("api_access"), v.literal("custom_training"), v.literal("white_label"), v.literal("dedicated_support"), v.literal("custom_integration")),
    priceNgn: v.number(),
    billingCycle: v.union(v.literal("one_time"), v.literal("monthly"), v.literal("annual")),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_addon_id", ["addonId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),
  enterprise_addon_subscriptions: defineTable({
    orgId: v.id("enterprise_organizations"),
    addonId: v.string(),
    addonName: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    lastBillingAt: v.number(),
    nextBillingAt: v.optional(v.number()),
    amountPaid: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_addon", ["addonId"])
    .index("by_status", ["status"]),
  user_usage_tracking: defineTable({
    userId: v.string(),
    period: v.string(), // "2026-06"
    agentMessagesUsed: v.number(),
    documentUploadsUsed: v.number(),
    voiceMinutesUsed: v.number(),
    flyerGenerationsUsed: v.number(),
    socialPostsUsed: v.number(),
    researchTasksUsed: v.number(),
    overageCharges: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_period", ["userId", "period"])
    .index("by_period", ["period"]),
  overage_invoices: defineTable({
    userId: v.string(),
    period: v.string(),
    overageType: v.string(), // "agent_messages", "document_uploads", etc.
    quantity: v.number(),
    unitPrice: v.number(),
    totalNgn: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_period", ["period"])
    .index("by_status", ["status"]),
  freemium_conversion_events: defineTable({
    userId: v.string(),
    eventType: v.union(
      v.literal("free_credit_granted"),
      v.literal("free_limit_reached"),
      v.literal("upgrade_prompt_shown"),
      v.literal("upgrade_prompt_clicked"),
      v.literal("conversion_completed"),
      v.literal("trial_started"),
      v.literal("trial_expired")
    ),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_event", ["eventType"])
    .index("by_created", ["createdAt"]),
  revenue_daily_snapshots: defineTable({
    date: v.string(), // "2026-06-19"
    totalRevenueNgn: v.number(),
    subscriptionRevenue: v.number(),
    creditRevenue: v.number(),
    enterpriseRevenue: v.number(),
    marketplaceRevenue: v.number(),
    adRevenue: v.number(),
    addonRevenue: v.number(),
    overageRevenue: v.number(),
    newSubscriptions: v.number(),
    churnedSubscriptions: v.number(),
    activeUsers: v.number(),
    mrr: v.number(), // monthly recurring revenue
    arr: v.number(), // annual recurring revenue
    arpu: v.number(), // average revenue per user
    ltv: v.number(), // customer lifetime value
    conversionRate: v.number(),
    createdAt: v.number(),
  }).index("by_date", ["date"]),
  api_cost_logs: defineTable({
    provider: v.string(),
    cost: v.number(),
    tokens: v.optional(v.number()),
    model: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_provider", ["provider"])
    .index("by_timestamp", ["timestamp"]),

  outcome_events: defineTable({
    userId: v.string(),
    outcomeType: v.string(),
    outcomeValue: v.any(),
    amountCharged: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.string(),
    createdAt: v.number(),
    settledAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_type", ["outcomeType"])
    .index("by_status", ["status"]),
  outcome_pricing_rules: defineTable({
    outcomeType: v.string(),
    description: v.string(),
    priceNgN: v.number(),
    commissionPercentage: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_type", ["outcomeType"])
    .index("by_active", ["isActive"]),
  agent_performance_metrics: defineTable({
    agentId: v.string(),
    date: v.string(),
    totalQueries: v.number(),
    successfulResolutions: v.number(),
    avgResponseTimeMs: v.number(),
    userSatisfaction: v.number(),
    revenueGenerated: v.number(),
    costSaved: v.number(),
    roiPercentage: v.number(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_agent_date", ["agentId", "date"]),
};
