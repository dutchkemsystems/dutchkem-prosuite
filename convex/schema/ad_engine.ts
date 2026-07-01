import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ad_engineTables = {
  ad_engine_status: defineTable({
    singleton: v.string(), // always "global" — single-row table
    enabled: v.boolean(),
    autoPost: v.boolean(),
    dailyPostLimit: v.number(),
    postsToday: v.number(),
    lastResetDate: v.string(), // YYYY-MM-DD
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),
  ad_campaigns: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    platform: v.string(), // single platform per campaign: "x", "linkedin", etc.
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("archived")),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    spent: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    goals: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_createdAt", ["createdAt"]),
  ad_ads: defineTable({
    campaignId: v.id("ad_campaigns"),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    flyerId: v.optional(v.id("ad_flyers")),
    platform: v.string(),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("posted"), v.literal("failed")),
    scheduledFor: v.optional(v.number()),
    postedAt: v.optional(v.number()),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
    impressions: v.number(),
    clicks: v.number(),
    engagements: v.number(),
    lastImpressionAt: v.optional(v.number()),
    lastClickAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_status", ["status"])
    .index("by_status_and_scheduled", ["status", "scheduledFor"]),
  ad_flyers: defineTable({
    campaignId: v.optional(v.id("ad_campaigns")),
    prompt: v.string(),
    style: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    headline: v.optional(v.string()),
    body: v.optional(v.string()),
    cta: v.optional(v.string()),
    colorScheme: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    generatedBy: v.string(), // "ai" or "manual"
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"]),
  ad_analytics: defineTable({
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    date: v.string(), // YYYY-MM-DD
    impressions: v.number(),
    clicks: v.number(),
    engagements: v.number(),
    conversions: v.number(),
    spend: v.number(),
  }).index("by_ad", ["adId"])
    .index("by_campaign", ["campaignId"])
    .index("by_date", ["date"])
    .index("by_ad_date", ["adId", "date"])
    .index("by_campaign_date", ["campaignId", "date"]),
  ad_budget_rules: defineTable({
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    minDailyBudget: v.number(),
    maxDailyBudget: v.number(),
    currentDailyBudget: v.number(),
    priority: v.number(), // 1=highest — budget shifts here first
    autoOptimize: v.boolean(),
    alertThresholdPercent: v.optional(v.number()), // e.g., 80 = alert at 80% spend
    lastOptimizedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_platform", ["platform"]),
  ad_budget_alerts: defineTable({
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    ruleId: v.id("ad_budget_rules"),
    alertType: v.union(
      v.literal("threshold_reached"),
      v.literal("budget_exceeded"),
      v.literal("auto_paused"),
      v.literal("optimization_applied")
    ),
    message: v.string(),
    currentSpend: v.number(),
    budgetLimit: v.number(),
    percentUsed: v.number(),
    acknowledged: v.boolean(),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_acknowledged", ["acknowledged"])
    .index("by_createdAt", ["createdAt"]),
  ad_ab_tests: defineTable({
    campaignId: v.id("ad_campaigns"),
    name: v.string(),
    status: v.union(v.literal("running"), v.literal("paused"), v.literal("completed"), v.literal("archived")),
    testType: v.union(v.literal("creative"), v.literal("headline"), v.literal("cta"), v.literal("audience"), v.literal("budget_split")),
    winnerVariantId: v.optional(v.id("ad_ab_test_variants")),
    confidenceLevel: v.number(), // 0-100%
    startDate: v.number(),
    endDate: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_status", ["status"]),
  ad_ab_test_variants: defineTable({
    testId: v.id("ad_ab_tests"),
    campaignId: v.id("ad_campaigns"),
    name: v.string(),
    adCopy: v.string(),
    headline: v.optional(v.string()),
    cta: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    audienceTarget: v.optional(v.string()),
    budgetPercent: v.number(), // % of test budget
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.number(),
    spend: v.number(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("winner"), v.literal("loser")),
    createdAt: v.number(),
  }).index("by_test", ["testId"])
    .index("by_campaign", ["campaignId"]),
  ad_compliance_rules: defineTable({
    platform: v.string(), // "all" or specific platform
    ruleName: v.string(),
    category: v.union(v.literal("prohibited_words"), v.literal("image_policy"), v.literal("content_length"), v.literal("hashtag_limit"), v.literal("url_policy"), v.literal("brand_safety")),
    pattern: v.string(), // regex or keyword list (comma-separated)
    severity: v.union(v.literal("block"), v.literal("warn"), v.literal("info")),
    replacement: v.optional(v.string()),
    enabled: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platform"])
    .index("by_category", ["category"]),
  ad_compliance_logs: defineTable({
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    overallScore: v.number(), // 0-100
    passed: v.boolean(),
    violations: v.array(v.object({
      ruleName: v.string(),
      category: v.string(),
      severity: v.string(),
      message: v.string(),
      suggestion: v.optional(v.string()),
    })),
    checkedAt: v.number(),
  }).index("by_ad", ["adId"])
    .index("by_campaign", ["campaignId"]),
  ad_account_connections: defineTable({
    platform: v.string(), // "meta", "google_ads", "tiktok_ads", "linkedin_ads", etc.
    accountName: v.string(),
    accountId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("expired"), v.literal("pending")),
    metadata: v.optional(v.any()), // platform-specific fields
    createdBy: v.string(),
    connectedAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"]),
  ad_monetization_plans: defineTable({
    name: v.string(), // "basic", "pro", "enterprise"
    monthlyFeeNgn: v.number(),
    successFeePercent: v.number(), // % of ad spend
    maxPlatforms: v.number(),
    features: v.array(v.string()),
    enabled: v.boolean(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),
  ad_monetization_invoices: defineTable({
    companyId: v.string(),
    planName: v.string(),
    period: v.string(), // "YYYY-MM"
    flatFeeNgn: v.number(),
    adSpendTotalNgn: v.number(),
    successFeeNgn: v.number(),
    totalNgn: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled")),
    paidAt: v.optional(v.number()),
    dueAt: v.number(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_period", ["period"]),
  ad_recommendations: defineTable({
    campaignId: v.id("ad_campaigns"),
    type: v.union(v.literal("budget"), v.literal("creative"), v.literal("audience"), v.literal("schedule"), v.literal("platform")),
    title: v.string(),
    description: v.string(),
    impact: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    estimatedImprovement: v.optional(v.string()),
    applied: v.boolean(),
    appliedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_applied", ["applied"]),
  ad_performance_snapshots: defineTable({
    campaignId: v.id("ad_campaigns"),
    date: v.string(), // YYYY-MM-DD
    totalImpressions: v.number(),
    totalClicks: v.number(),
    totalEngagements: v.number(),
    totalConversions: v.number(),
    totalSpendNgn: v.number(),
    roas: v.number(), // return on ad spend %
    ctr: v.number(), // click-through rate %
    cpc: v.number(), // cost per click
    cpa: v.number(), // cost per acquisition
    platformBreakdown: v.any(), // { linkedin: { impressions, clicks, spend }, ... }
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_date", ["date"])
    .index("by_campaign_date", ["campaignId", "date"]),
  ad_orchestrator_status: defineTable({
    enabled: v.boolean(),
    autoGenerate: v.boolean(),
    autoPost: v.boolean(),
    lastRun: v.union(v.null(), v.number()),
    nextRun: v.union(v.null(), v.number()),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    platforms: v.array(v.object({
      id: v.string(),
      enabled: v.boolean(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  ad_generated_content: defineTable({
    headline: v.string(),
    description: v.string(),
    cta: v.string(),
    hashtags: v.array(v.string()),
    targetAudience: v.string(),
    socialPosts: v.array(v.object({
      templateId: v.string(),
      style: v.string(),
      fullContent: v.string(),
      platformPosts: v.any(),
    })),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("ready"), v.literal("posted"), v.literal("rejected"))),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectReason: v.optional(v.string()),
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_created", ["createdAt"])
    .index("by_status", ["status"]),
  ad_posting_logs: defineTable({
    contentId: v.id("ad_generated_content"),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_content", ["contentId"]),
  ad_tracking_urls: defineTable({
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    destinationUrl: v.string(),
    trackingUrl: v.string(),
    utmParams: v.object({
      source: v.string(),
      medium: v.string(),
      campaign: v.string(),
      content: v.string(),
      term: v.string(),
    }),
    clicks: v.number(),
    conversions: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ad", ["adId"])
    .index("by_campaign", ["campaignId"]),
  ad_conversions: defineTable({
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    conversionType: v.union(v.literal("click"), v.literal("lead"), v.literal("signup"), v.literal("purchase"), v.literal("custom")),
    value: v.number(),
    currency: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_ad", ["adId"])
    .index("by_campaign", ["campaignId"])
    .index("by_type", ["conversionType"]),
  ad_scheduling_recommendations: defineTable({
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    recommendations: v.array(v.object({
      hour: v.number(),
      day: v.number(),
      dayName: v.string(),
      score: v.number(),
      historicalCTR: v.number(),
      platformDefault: v.number(),
      recommendation: v.string(),
      localTime: v.string(),
      timezone: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_campaign_platform", ["campaignId", "platform"]),
  ad_webhook_configs: defineTable({
    platform: v.string(),
    campaignId: v.id("ad_campaigns"),
    callbackUrl: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    isActive: v.boolean(),
    lastReceivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_platform_campaign", ["platform", "campaignId"]),
  ad_webhook_events: defineTable({
    platform: v.string(),
    eventType: v.string(),
    data: v.any(),
    resourceId: v.optional(v.string()),
    processedAt: v.number(),
    createdAt: v.number(),
  }).index("by_platform", ["platform"])
    .index("by_eventType", ["eventType"]),
  ad_alert_emails: defineTable({
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    alertType: v.string(),
    email: v.string(),
    subject: v.string(),
    resendId: v.optional(v.string()),
    sentAt: v.number(),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_sentAt", ["sentAt"]),
  ad_alert_preferences: defineTable({
    userId: v.string(),
    emailEnabled: v.boolean(),
    pushEnabled: v.boolean(),
    thresholdPercent: v.number(),
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  ad_batch_operations: defineTable({
    campaignId: v.id("ad_campaigns"),
    totalAds: v.number(),
    successCount: v.number(),
    failCount: v.number(),
    results: v.array(v.any()),
    operatedBy: v.string(),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"]),
};
