import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("freelancer"))),
    balance: v.optional(v.number()), // For payouts/referrals
    referralCode: v.optional(v.string()),
    referredBy: v.optional(v.id("users")),
    bankAccount: v.optional(v.object({
      bankName: v.string(),
      accountNumber: v.string(),
      accountName: v.string(),
    })),
    // Admin Security
    adminPasswordHash: v.optional(v.string()),
    adminTwoFactorSecret: v.optional(v.string()),
    adminTwoFactorEnabled: v.optional(v.boolean()),
    adminBackupCodes: v.optional(v.array(v.string())),
    adminFailedLoginAttempts: v.optional(v.number()),
    adminLockedUntil: v.optional(v.number()),
    adminLastLoginAt: v.optional(v.number()),
    adminAllowedIps: v.optional(v.array(v.string())),
    adminForcePasswordChange: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("referralCode", ["referralCode"])
    .index("by_role", ["role"])
    .index("by_referredBy", ["referredBy"]),

  jobs: defineTable({
    freelancerId: v.id("users"),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("approved"), v.literal("paid")),
    description: v.string(),
    completedAt: v.optional(v.number()),
  }).index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")),
    service: v.optional(v.union(v.literal("standard"), v.literal("kdp"))),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("canceled"), v.literal("expired"), v.literal("suspended")),
    endsAt: v.number(),
    autoRenew: v.boolean(),
    paymentMethodId: v.optional(v.id("payment_methods")),
    failureCount: v.number(),
    nextRetryAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_status_and_endsAt", ["status", "endsAt"])
    .index("by_retry", ["status", "nextRetryAt"]),

  refunds: defineTable({
    userId: v.id("users"),
    paymentReference: v.string(),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("processed")),
    reason: v.string(),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  payouts: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    type: v.union(v.literal("referral"), v.literal("freelancer"), v.literal("sweep")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  daily_sweeps: defineTable({
    sweep_id: v.string(),
    date: v.string(), // YYYY-MM-DD
    amount: v.number(),
    balance_before: v.number(),
    balance_after: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    kora_reference: v.optional(v.string()),
    timestamp: v.number(),
    notes: v.optional(v.string()),
    beneficiaryId: v.optional(v.id("beneficiaries")),
  }).index("by_date", ["date"]),

  beneficiaries: defineTable({
    userId: v.optional(v.id("users")), // null for system/admin
    bankCode: v.string(),
    bankName: v.string(),
    encryptedAccountNumber: v.string(),
    encryptedAccountName: v.string(),
    encryptionIv: v.string(),
    encryptionTag: v.string(),
    isDefault: v.boolean(),
    status: v.union(v.literal("active"), v.literal("archived")),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  tax_wallet: defineTable({
    balance: v.number(),
    total_deducted_lifetime: v.number(),
    total_remitted: v.number(),
    last_deduction_date: v.number(),
    last_interest_date: v.number(),
  }),

  tax_transactions: defineTable({
    type: v.union(v.literal("DAILY_DEDUCTION"), v.literal("WEEKLY_DEDUCTION"), v.literal("MONTHLY_DEDUCTION"), v.literal("YEARLY_FILING")),
    amount: v.number(),
    from_wallet: v.string(),
    to_wallet: v.string(),
    date: v.number(),
    earnings_period_start: v.number(),
    earnings_period_end: v.number(),
    earnings_amount: v.number(),
    tax_rate_applied: v.number(),
    notes: v.optional(v.string()),
    reference: v.string(),
  }).index("by_date", ["date"]),

  interest_earnings: defineTable({
    date: v.number(),
    tax_wallet_balance_before: v.number(),
    interest_rate_daily: v.number(),
    interest_earned: v.number(),
    paid_to_wallet: v.string(),
    status: v.union(v.literal("PAID"), v.literal("PENDING")),
  }).index("by_date", ["date"]),

  annual_tax_filing: defineTable({
    tax_year: v.number(),
    total_earnings: v.number(),
    total_tax_owed: v.number(),
    total_tax_paid_via_deductions: v.number(),
    balance_due: v.number(),
    development_levy: v.number(),
    vat_collected: v.number(),
    filing_date: v.number(),
    payment_date: v.optional(v.number()),
    status: v.union(v.literal("FILED"), v.literal("PAID"), v.literal("PENDING")),
  }).index("by_year", ["tax_year"]),

  holiday_discounts: defineTable({
    name: v.string(),
    code: v.string(),
    percent: v.number(),
    banner_icon: v.string(),
    banner_text: v.string(),
    start_date: v.number(), // timestamp
    end_date: v.number(),   // timestamp
    is_active: v.boolean(),
    type: v.union(v.literal("holiday"), v.literal("seasonal")),
  }).index("by_active", ["is_active"])
    .index("by_name", ["name"]),

  agent_services: defineTable({
    agent_id: v.string(), // e.g., "A1"
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    added_at: v.number(),
    category: v.optional(v.string()),
  }).index("by_agent", ["agent_id"])
    .index("by_added_at", ["added_at"]),

  service_updates: defineTable({
    cycle: v.string(), // "SPRING_2026", etc.
    applied_at: v.number(),
  }).index("by_cycle", ["cycle"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    agentId: v.string(), // identifier like 'a1', 'a2', or the name
    status: v.union(v.literal("in-progress"), v.literal("completed"), v.literal("revision")),
    format: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    downloadUrl: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.optional(v.id("users")), // null means broadcast to all
    title: v.string(),
    message: v.string(),
    type: v.string(), // "payment", "project", "referral", "system", "broadcast"
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  payment_methods: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("card"), v.literal("bank")),
    provider: v.string(), // "Visa", "Mastercard", "OPay", "GTBank"
    last4: v.optional(v.string()),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  user_sessions: defineTable({
    userId: v.id("users"),
    userType: v.union(v.literal("client"), v.literal("admin")),
    device: v.string(),
    location: v.string(),
    ip: v.string(),
    fingerprint: v.string(),
    lastActive: v.number(),
    isCurrent: v.boolean(),
    isTwoFactorVerified: v.optional(v.boolean()),
    deviceInfo: v.object({
      userAgent: v.string(),
      deviceType: v.optional(v.string()),
      browser: v.optional(v.string()),
      os: v.optional(v.string()),
    }),
    refreshToken: v.optional(v.string()),
    isRevoked: v.boolean(),
    expiresAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_fingerprint", ["fingerprint"])
    .index("by_user_type", ["userType"])
    .index("by_refresh_token", ["refreshToken"]),

  api_keys: defineTable({
    userId: v.id("users"),
    key: v.string(),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
  }).index("by_key", ["key"]),

  audit_logs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    details: v.string(),
    ip: v.string(),
    userAgent: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  failed_logins: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    ipAddress: v.string(),
    attemptTime: v.number(),
    success: v.boolean(),
  }).index("by_email", ["email"])
    .index("by_ip", ["ipAddress"])
    .index("by_time", ["attemptTime"]),

  admin_audit_log: defineTable({
    adminId: v.id("users"),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.id("users")),
    changes: v.optional(v.any()),
    ipAddress: v.string(),
    userAgent: v.string(),
    timestamp: v.number(),
  }).index("by_admin", ["adminId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  admin_2fa: defineTable({
    adminId: v.id("users"),
    secret: v.string(),
    backupCodes: v.array(v.string()),
    isEnabled: v.boolean(),
  }).index("by_admin", ["adminId"]),

  ip_whitelist: defineTable({
    adminId: v.id("users"),
    ipAddresses: v.array(v.string()),
    description: v.optional(v.string()),
  }).index("by_admin", ["adminId"]),

  fraud_monitoring: defineTable({
    userId: v.id("users"),
    confidenceScore: v.number(),
    flags: v.array(v.string()),
    status: v.union(v.literal("clear"), v.literal("flagged"), v.literal("blocked")),
    lastChecked: v.number(),
  }).index("by_user", ["userId"]),

  payment_verifications: defineTable({
    reference: v.string(),
    amount: v.number(),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("manual_review")),
    reason: v.optional(v.string()),
    confidenceScore: v.number(),
    verifiedAt: v.number(),
    agentId: v.optional(v.string()),
    service: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  }).index("by_reference", ["reference"])
    .index("by_status", ["status"])
    .index("by_status_and_verifiedAt", ["status", "verifiedAt"]),

  model_status: defineTable({
    modelName: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    lastFailureAt: v.optional(v.number()),
    lastCheckedAt: v.optional(v.number()),
    failureCount: v.number(),
  }).index("by_model", ["modelName"]),

  system_wallets: defineTable({
    type: v.union(v.literal("main"), v.literal("freelancer"), v.literal("referral"), v.literal("tax")),
    balance: v.number(),
    lastUpdated: v.number(),
  }).index("by_type", ["type"]),

  system_config: defineTable({
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  feature_flags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    label: v.string(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"])
    .index("by_enabled", ["enabled"]),

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

  kdp_projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("planning"), v.literal("writing"), v.literal("designing"), v.literal("formatting"), v.literal("completed")),
    assets: v.object({
      manuscriptUrl: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      epubUrl: v.optional(v.string()),
      mobiUrl: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      zipUrl: v.optional(v.string()),
    }),
    metadata: v.object({
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      description: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  kdp_royalties: defineTable({
    userId: v.id("users"),
    bookTitle: v.string(),
    amount: v.number(),
    currency: v.string(),
    date: v.string(), // YYYY-MM
  }).index("by_user", ["userId"]),

  book_projects: defineTable({
    userId: v.id("users"),
    subscriptionTier: v.union(v.literal("Basic"), v.literal("Pro"), v.literal("Enterprise")),
    status: v.union(v.literal("draft"), v.literal("in_progress"), v.literal("review"), v.literal("published"), v.literal("archived")),
    manuscript: v.object({
      title: v.string(),
      subtitle: v.optional(v.string()),
      authorName: v.string(),
      authorBio: v.optional(v.string()),
      description: v.string(),
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      trimSize: v.string(),
      pageCount: v.number(),
      interiorType: v.string(),
      bleedSetting: v.string(),
      coverType: v.string(),
    }),
    coverFiles: v.array(v.object({
      type: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      uploadedAt: v.number(),
    })),
    interiorFiles: v.array(v.object({
      type: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      uploadedAt: v.number(),
    })),
    kdpMetadata: v.object({
      kdpAccountEmail: v.string(),
      publishingRole: v.string(),
      imprintName: v.optional(v.string()),
      isbnOption: v.string(),
      pricingTiers: v.array(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_subscription_tier", ["subscriptionTier"])
    .index("by_status", ["status"]),

  book_royalties: defineTable({
    userId: v.id("users"),
    projectId: v.id("book_projects"),
    csvDataUrl: v.optional(v.string()),
    dashboardData: v.object({
      totalSold: v.number(),
      totalRevenue: v.number(),
      averagePrice: v.number(),
      returns: v.number(),
      penaltyCharges: v.number(),
      netRoyalties: v.number(),
      monthlyTrend: v.array(v.object({
        month: v.string(),
        sales: v.number(),
        revenue: v.number(),
      })),
    }),
    month: v.string(),
    year: v.number(),
  }).index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_month_year", ["month", "year"]),

  social_posts: defineTable({
    agentId: v.string(),
    adminId: v.optional(v.string()),
    platform: v.string(), // "X", "LinkedIn", "Facebook", etc.
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("posted"), v.literal("failed")),
    scheduledFor: v.number(),
    postedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    externalId: v.optional(v.string()),
    anonymous: v.optional(v.boolean()),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_status_and_scheduled", ["status", "scheduledFor"])
    .index("by_admin", ["adminId"]),

  // ═══════════════════════════════════════════════════════════════════
  // AD ENGINE — Built on top of existing platform_connections (no Postiz)
  // ═══════════════════════════════════════════════════════════════════
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
    .index("by_date", ["date"]),

  // ═══════════════════════════════════════════════════════════════════
  // AD AUTOMATION — Enterprise-Grade Campaign Management
  // ═══════════════════════════════════════════════════════════════════

  ad_budget_rules: defineTable({
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    minDailyBudget: v.number(),
    maxDailyBudget: v.number(),
    currentDailyBudget: v.number(),
    priority: v.number(), // 1=highest — budget shifts here first
    autoOptimize: v.boolean(),
    lastOptimizedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_platform", ["platform"]),

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
    .index("by_date", ["date"]),

  // ═══════════════════════════════════════════════════════════════════
  // AD ORCHESTRATOR — Unified automation system tables
  // ═══════════════════════════════════════════════════════════════════

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
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  ad_posting_logs: defineTable({
    contentId: v.id("ad_generated_content"),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_content", ["contentId"]),

  // ═══════════════════════════════════════════════════════════════════
  // KYC VERIFICATION — Mandatory before any client payout
  // ═══════════════════════════════════════════════════════════════════

  client_kyc_submissions: defineTable({
    userId: v.id("users"),
    legalName: v.string(),
    businessName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    countryOfIncorporation: v.optional(v.string()),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    identityDocId: v.optional(v.id("_storage")),
    proofOfAddressId: v.optional(v.id("_storage")),
    certificateOfIncorporationId: v.optional(v.id("_storage")),
    status: v.union(v.literal("not_submitted"), v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT WALLETS — Tracks earnings from AI agent usage
  // ═══════════════════════════════════════════════════════════════════

  client_wallets: defineTable({
    userId: v.id("users"),
    balance: v.number(),
    pendingWithdrawals: v.number(),
    totalEarned: v.number(),
    totalWithdrawn: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),

  client_wallet_transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("credit"), v.literal("debit"), v.literal("withdrawal"), v.literal("refund")),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"]),

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT BANK ACCOUNTS — Verified bank details for payouts
  // ═══════════════════════════════════════════════════════════════════

  client_bank_accounts: defineTable({
    userId: v.id("users"),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isVerified: v.boolean(),
    isDefault: v.boolean(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT PAYOUT REQUESTS — Admin-only processing via Kora Pay
  // ═══════════════════════════════════════════════════════════════════

  client_payout_requests: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("rejected")),
    bankCode: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.string(),
    adminNotes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    koraReference: v.optional(v.string()),
    batchReference: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_status_and_created", ["status", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // BULK PAYOUT BATCHES — Admin-initiated batch disbursements
  // ═══════════════════════════════════════════════════════════════════

  bulk_payout_batches: defineTable({
    batchReference: v.string(),
    totalAmount: v.number(),
    totalPayouts: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    koraResponse: v.optional(v.any()),
    initiatedBy: v.string(),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_reference", ["batchReference"])
    .index("by_status", ["status"]),

  social_platforms: defineTable({
    userId: v.optional(v.id("users")), // Owner of this connection
    platform: v.string(), // "x", "linkedin", "facebook", "instagram", "threads", etc.
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    isConnected: v.boolean(),
    connectedAt: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
    postsCount: v.number(),
    followersCount: v.number(),
    username: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    // Posting control fields
    postingMode: v.optional(v.union(v.literal("auto"), v.literal("manual"), v.literal("paused"))),
    scheduleTime: v.optional(v.string()),
    postingFrequency: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
  }).index("by_platform", ["platform"])
    .index("by_connected", ["isConnected"])
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_platform", ["userId", "platform"]),

  guardian_tests: defineTable({
    testName: v.string(),
    category: v.union(v.literal("agent"), v.literal("payment"), v.literal("security"), v.literal("database"), v.literal("tax"), v.literal("holiday"), v.literal("frontend")),
    status: v.union(v.literal("pass"), v.literal("fail"), v.literal("healing"), v.literal("healed")),
    latency: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    autoFixApplied: v.optional(v.boolean()),
    fixAction: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"]),

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

  update_history: defineTable({
    cycle: v.string(),
    version: v.string(),
    status: v.union(v.literal("applied"), v.literal("failed"), v.literal("rolled_back")),
    snapshot: v.any(),
    timestamp: v.number(),
  }).index("by_cycle", ["cycle"]),

  charity_wallet: defineTable({
    balance: v.number(),
    totalSetAsideLifetime: v.number(),
    totalTransferred: v.number(),
    lastDeductionDate: v.optional(v.number()),
    lastTransferDate: v.optional(v.number()),
    currentMonth: v.string(),
    monthlyEarningsSoFar: v.number(),
    dailyDeductionAmount: v.number(),
    daysInMonth: v.number(),
    isPaused: v.boolean(),
  }),

  charity_transactions: defineTable({
    type: v.union(v.literal("DAILY_DEDUCTION"), v.literal("MONTHLY_TRANSFER")),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthlyEarnings: v.number(),
    dailyDeductionAmount: v.optional(v.number()),
    status: v.union(v.literal("completed"), v.literal("failed")),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // ═══════════════════════════════════════════════════════════════════
  // FREELANCER MARKETPLACE - Escrow & Payment Flow
  // ═══════════════════════════════════════════════════════════════════
  escrow_wallet: defineTable({
    balance: v.number(),
    totalHeld: v.number(),
    totalReleased: v.number(),
    lastUpdated: v.number(),
  }),

  marketplace_transactions: defineTable({
    jobId: v.id("jobs"),
    clientId: v.id("users"),
    freelancerId: v.id("users"),
    amount: v.number(), // total paid by client
    platformFee: v.number(), // 15% goes to main wallet
    freelancerAmount: v.number(), // 85% held in escrow
    status: v.union(v.literal("escrow"), v.literal("ready_for_payout"), v.literal("released"), v.literal("refunded")),
    koraReference: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    koraPayoutReference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_job", ["jobId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 1: AI Chatbot for Sales & Support
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 2: Smart Lead Scoring
  // ═══════════════════════════════════════════════════════════════════
  lead_scores: defineTable({
    userId: v.id("users"),
    score: v.number(), // 0-100
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
    lastCalculated: v.number(),
    isActive: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_score", ["score"]),

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 3: Smart Workflows & Automation Engine
  // ═══════════════════════════════════════════════════════════════════
  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.object({
      type: v.union(v.literal("new_lead"), v.literal("payment"), v.literal("agent_usage"), v.literal("subscription"), v.literal("schedule")),
      config: v.any(), // trigger-specific configuration
    }),
    actions: v.array(v.object({
      type: v.union(v.literal("send_sms"), v.literal("send_email"), v.literal("assign_agent"), v.literal("apply_discount"), v.literal("webhook"), v.literal("notification")),
      config: v.any(), // action-specific configuration
      order: v.number(),
    })),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    triggerCount: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["isActive"])
    .index("by_trigger", ["trigger"]),

  workflow_executions: defineTable({
    workflowId: v.id("workflows"),
    triggerEvent: v.any(),
    executedActions: v.array(v.object({
      actionType: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      executedAt: v.number(),
    })),
    status: v.union(v.literal("success"), v.literal("partial"), v.literal("failed")),
    executedAt: v.number(),
  }).index("by_workflow", ["workflowId"])
    .index("by_executed_at", ["executedAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 4: Leaderboard & Gamification
  // ═══════════════════════════════════════════════════════════════════
  badges: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.union(v.literal("sales"), v.literal("completion"), v.literal("rating"), v.literal("milestone")),
    requirement: v.object({
      type: v.string(),
      threshold: v.number(),
    }),
    isActive: v.boolean(),
  }),

  user_badges: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    awardedAt: v.number(),
    milestone: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_badge", ["badgeId"]),

  leaderboard_entries: defineTable({
    userId: v.id("users"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("all_time")),
    periodStart: v.string(),
    periodEnd: v.string(),
    rank: v.number(),
    score: v.number(),
    metrics: v.object({
      sales: v.number(),
      completions: v.number(),
      rating: v.number(),
      responseTime: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_period", ["period", "periodStart", "periodEnd"])
    .index("by_user", ["userId"])
    .index("by_rank", ["period", "periodStart", "periodEnd", "rank"]),

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 5: 1-Click Communication Hub
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 6: Facebook Lead Ads
  // ═══════════════════════════════════════════════════════════════════
  leads: defineTable({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(), // "facebook", "web", "referral"
    facebookLeadId: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("lost")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    receivedAt: v.number(),
    lastContactedAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .index("by_received", ["receivedAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 7: Custom Report Builder
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 8: Agent Onboarding & Performance
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 9: Geo-Tracking & Territory Management
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE 10: CRM Hygiene & Data Quality
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // CLOUD MEMORY & SELF-HEALING SYSTEM
  // ═══════════════════════════════════════════════════════════════════
  system_backups: defineTable({
    backupType: v.string(), // "schema_config", "auth_config", "social_config", etc.
    data: v.any(),
    description: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("deleted")),
    checksum: v.string(),
  }).index("by_type_and_time", ["backupType", "createdAt"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════
  // SYNTHETIC INTELLIGENCE - Performance Logging
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // OAUTH STATES - Temp storage for OAuth flow
  // ═══════════════════════════════════════════════════════════════════
  oauth_states: defineTable({
    state: v.string(),
    platform: v.string(),
    redirectUri: v.optional(v.string()),
    adminId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    codeVerifier: v.optional(v.string()),
  }).index("by_state", ["state"]),

  // ═══════════════════════════════════════════════════════════════════
  // PLATFORM CONNECTIONS - OAuth-connected social platforms
  // ═══════════════════════════════════════════════════════════════════
  platform_connections: defineTable({
    adminId: v.string(),
    platformId: v.string(),
    platformName: v.string(),
    integrationId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),
    isConnected: v.boolean(),
    autoPostEnabled: v.boolean(),
    connectedAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    scopes: v.optional(v.string()),
    anonymousByDefault: v.optional(v.boolean()),
    followersCount: v.optional(v.number()),
  })
    .index("by_admin", ["adminId"])
    .index("by_admin_platform", ["adminId", "platformId"]),

  // TOKEN REFRESH SYSTEM — Auto-refresh OAuth tokens before expiry
  token_refresh_logs: defineTable({
    platform: v.string(),
    adminId: v.optional(v.string()),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
    oldExpiresAt: v.optional(v.number()),
    newExpiresAt: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),

  referral_codes: defineTable({
    code: v.string(),
    userId: v.string(),
    totalRefs: v.number(),
    totalEarnings: v.number(),
    createdAt: v.number(),
  }).index("by_code", ["code"]).index("by_user", ["userId"]),

  referral_conversions: defineTable({
    referrerId: v.string(),
    referredUserId: v.string(),
    amount: v.number(),
    commission: v.number(),
    status: v.union(v.literal("pending"), v.literal("earned"), v.literal("paid")),
    createdAt: v.number(),
  }).index("by_referrer", ["referrerId"]).index("by_status", ["status"]),

  referral_payouts: defineTable({
    userId: v.string(),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("failed")),
    period: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  social_activities: defineTable({
    type: v.string(),
    userId: v.string(),
    userName: v.string(),
    agentName: v.string(),
    amount: v.optional(v.number()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]).index("by_user", ["userId", "agentName"]),

  active_viewers: defineTable({
    agentId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    lastSeen: v.number(),
  }).index("by_agent", ["agentId", "lastSeen"]).index("by_session", ["sessionId"]),

  agent_reviews: defineTable({
    agentId: v.string(),
    userId: v.string(),
    userName: v.string(),
    rating: v.number(),
    comment: v.string(),
    verified: v.boolean(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: PUSH NOTIFICATIONS, ABANDONED CHECKOUTS, FLASH SALES
  // ═══════════════════════════════════════════════════════════════════

  push_subscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  push_queue: defineTable({
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.string(),
    tag: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

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
  })
    .index("by_active", ["isActive"])
    .index("by_endsAt", ["endsAt"]),

  promo_codes: defineTable({
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    currentUses: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: GAMIFICATION, CROSS-SELL, EXIT-INTENT
  // ═══════════════════════════════════════════════════════════════════

  gamification_profiles: defineTable({
    userId: v.id("users"),
    totalXp: v.number(),
    level: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDate: v.string(),
    totalActions: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_level", ["level"])
    .index("by_xp", ["totalXp"]),

  gamification_log: defineTable({
    userId: v.id("users"),
    action: v.string(),
    points: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_action", ["action"]),

  user_achievements: defineTable({
    userId: v.id("users"),
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    rarity: v.union(
      v.literal("common"),
      v.literal("uncommon"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_achievement", ["achievementId"]),

  popup_analytics: defineTable({
    userId: v.string(),
    popupType: v.string(),
    action: v.union(
      v.literal("shown"),
      v.literal("dismissed"),
      v.literal("converted")
    ),
    createdAt: v.number(),
  })
    .index("by_type", ["popupType"])
    .index("by_action", ["action"]),

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4: SEO ENGINE, TEAM ACCOUNTS, INFLUENCER RECRUITMENT
  // ═══════════════════════════════════════════════════════════════════

  seo_analyses: defineTable({
    url: v.string(),
    score: v.number(),
    issues: v.any(),
    suggestions: v.any(),
    keywords: v.any(),
    contentId: v.optional(v.string()),
    analyzedAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_score", ["score"]),

  content_calendar: defineTable({
    title: v.string(),
    contentType: v.string(),
    platform: v.string(),
    scheduledDate: v.number(),
    keywords: v.array(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("archived")
    ),
    createdAt: v.number(),
  })
    .index("by_date", ["scheduledDate"])
    .index("by_status", ["status"]),

  teams: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
    maxMembers: v.number(),
    currentMembers: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("cancelled")),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  team_members: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("manager"),
      v.literal("member"),
      v.literal("viewer")
    ),
    invitedBy: v.id("users"),
    joinedAt: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  team_invites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: v.string(),
    invitedBy: v.id("users"),
    inviteCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_code", ["inviteCode"]),

  influencers: defineTable({
    name: v.string(),
    platform: v.string(),
    username: v.string(),
    followers: v.number(),
    engagementRate: v.number(),
    niche: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tier: v.string(),
    status: v.union(
      v.literal("prospecting"),
      v.literal("contacted"),
      v.literal("negotiating"),
      v.literal("active"),
      v.literal("inactive")
    ),
    score: v.number(),
    createdAt: v.number(),
  })
    .index("by_tier", ["tier"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_score", ["score"]),

  influencer_campaigns: defineTable({
    name: v.string(),
    influencerId: v.id("influencers"),
    campaignType: v.string(),
    budget: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    deliverables: v.array(v.string()),
    kpis: v.any(),
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    spend: v.number(),
    reach: v.number(),
    conversions: v.number(),
    roi: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_influencer", ["influencerId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 5: CLIENT ANALYTICS, CHATBOT LEADS, TESTIMONIALS
  // ═══════════════════════════════════════════════════════════════════

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

  // Composio auth_config cache — one row per toolkit. Avoids hitting
  // /auth_configs on every OAuth start and lets us pre-warm configs
  // at startup via ensureComposioAuthConfigs (admin-only).
  composio_auth_configs: defineTable({
    toolkit: v.string(),                // "twitter", "linkedin", etc.
    authConfigId: v.string(),           // Composio ac_xxx id
    isManaged: v.boolean(),             // true = Composio managed
    createdAt: v.number(),
    lastVerifiedAt: v.number(),
    lastError: v.optional(v.string()),
  })
    .index("by_toolkit", ["toolkit"]),

  // ═══════════════════════════════════════════════════════════════════
  // COMPOSIO INTEGRATION HUB — Admin control + Client view-only
  // ═══════════════════════════════════════════════════════════════════

  // Per-platform admin settings (enable/disable, mode, schedule)
  composio_settings: defineTable({
    platform: v.string(),                 // "twitter", "linkedin", "global"
    enabled: v.boolean(),
    postingMode: v.union(v.literal("auto"), v.literal("manual"), v.literal("paused")),
    schedule: v.optional(v.string()),     // "09:00,15:00,21:00"
    dailyPostLimit: v.number(),
    postsToday: v.number(),
    lastResetDate: v.string(),            // YYYY-MM-DD
    updatedAt: v.number(),
  })
    .index("by_platform", ["platform"]),

  // Per-agent Composio configuration (Enhanced Toggle System)
  composio_agent_settings: defineTable({
    agentId: v.string(),                  // "A1" - "A15"
    agentName: v.optional(v.string()),
    agentIcon: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    tools: v.optional(v.array(v.string())),
    toolCount: v.optional(v.number()),
    enabledBy: v.optional(v.string()),
    enabledAt: v.optional(v.number()),
    disabledBy: v.optional(v.string()),
    disabledAt: v.optional(v.number()),
    lastConfiguredAt: v.optional(v.number()),
    configVersion: v.optional(v.number()),
    // Legacy fields (kept for backward compat)
    composioEnabled: v.optional(v.boolean()),
    enabledPlatforms: v.optional(v.array(v.string())),
    updatedAt: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_agent_id", ["agentId"])
    .index("by_enabled", ["enabled"]),

  // Action execution logs (feeds admin logs + client activity feed)
  composio_action_logs: defineTable({
    platform: v.string(),
    action: v.string(),                   // "post", "schedule", "sync", "engage"
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("pending")),
    agentId: v.optional(v.string()),
    clientId: v.optional(v.id("users")),
    content: v.optional(v.string()),
    timestamp: v.number(),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_platform", ["platform"])
    .index("by_agent", ["agentId"])
    .index("by_client", ["clientId"])
    .index("by_timestamp", ["timestamp"]),

  // Client notification preferences
  composio_notification_prefs: defineTable({
    userId: v.id("users"),
    emailOnAction: v.boolean(),
    pushOnAction: v.boolean(),
    weeklyReport: v.boolean(),
    agentActivityDigest: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ═══════════════════════════════════════════════════════════════════
  // AUTOMATED FINANCIAL MANAGEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════

  // Subscription renewal configuration (29-day cycle)
  subscription_renewal_config: defineTable({
    serviceName: v.string(), // e.g., "Kora Pay", "AWS SES/SNS", "Resend", "Deepgram", "LiveKit"
    plan: v.string(), // e.g., "monthly", "yearly"
    amountNgn: v.number(), // Amount in Naira
    renewalIntervalDays: v.number(), // 29 days as required
    designatedAccount: v.string(), // 8121161202
    designatedBank: v.string(), // PalmPay
    designatedName: v.string(), // Oladotun Alabi
    autoRenew: v.boolean(),
    lastRenewedAt: v.optional(v.number()),
    nextRenewalAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("expired")),
    koraApiKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_service", ["serviceName"])
    .index("by_next_renewal", ["nextRenewalAt"])
    .index("by_status", ["status"]),

  // Renewal transactions log
  renewal_transactions: defineTable({
    configId: v.id("subscription_renewal_config"),
    serviceName: v.string(),
    amountNgn: v.number(),
    type: v.union(v.literal("auto"), v.literal("manual")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    koraReference: v.optional(v.string()),
    passkeyId: v.optional(v.string()),
    passkeyVerified: v.optional(v.boolean()),
    receiptId: v.optional(v.string()),
    balanceBefore: v.optional(v.number()),
    balanceAfter: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    initiatedBy: v.optional(v.string()), // admin user id
    timestamp: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_config", ["configId"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),

  // Transfer passkeys (6-digit, 10-min expiry)
  transfer_passkeys: defineTable({
    passkey: v.string(), // 6-digit code
    purpose: v.string(), // "subscription_renewal", "charity_transfer", "tax_remittance", "direct_transfer"
    relatedEntityId: v.optional(v.string()), // config id, transaction id, etc.
    amountNgn: v.optional(v.number()),
    designatedAccount: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 10 minutes
    usedAt: v.optional(v.number()),
    isUsed: v.boolean(),
    isExpired: v.boolean(),
    createdBy: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_purpose", ["purpose"])
    .index("by_expires", ["expiresAt"])
    .index("by_used", ["isUsed"]),

  // Tithe transactions (10% of revenue, daily fraction)
  tithe_transactions: defineTable({
    type: v.union(
      v.literal("DAILY_DEDUCTION"),
      v.literal("MONTHLY_TRANSFER"),
      v.literal("MANUAL_TRANSFER"),
      v.literal("AUTO_TRANSFER")
    ),
    amountNgn: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthYear: v.string(), // "2026-06" for grouping
    daysInMonth: v.number(),
    currentDay: v.number(),
    monthlyEarnings: v.number(),
    dailyDeductionAmount: v.number(),
    percentage: v.number(), // 10%
    designatedAccount: v.string(), // 8121161202
    koraReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_month", ["monthYear"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // CAC tax transactions (annual fee ÷ 12 monthly)
  cac_tax_transactions: defineTable({
    type: v.union(
      v.literal("MONTHLY_DEDUCTION"),
      v.literal("ANNUAL_FILING"),
      v.literal("ANNUAL_PAYMENT"),
      v.literal("YEAR_END_REMITTANCE")
    ),
    amountNgn: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthYear: v.string(), // "2026-06"
    taxYear: v.number(), // 2026
    annualCacFee: v.number(), // 100000
    monthlyFraction: v.number(), // 8333.33
    cumulativePaid: v.number(), // total paid this year
    designatedAccount: v.string(), // 8121161202
    koraReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_month", ["monthYear"])
    .index("by_tax_year", ["taxYear"])
    .index("by_type", ["type"]),

  // Usage alerts (80%, 90%, 95%, 100% thresholds)
  usage_alerts: defineTable({
    serviceName: v.string(), // "deepgram", "aws_ses", "aws_sns", "resend", etc.
    serviceDisplayName: v.string(),
    freeTierLimit: v.number(),
    currentUsage: v.number(),
    usagePercentage: v.number(),
    threshold: v.union(v.literal("80"), v.literal("90"), v.literal("95"), v.literal("100")),
    alertSent: v.boolean(),
    alertSentAt: v.optional(v.number()),
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedBy: v.optional(v.string()),
    lastChecked: v.number(),
    resetAt: v.optional(v.number()), // monthly reset
  })
    .index("by_service", ["serviceName"])
    .index("by_threshold", ["threshold"])
    .index("by_alert_sent", ["alertSent"]),

  // Generated receipts (JPG/PDF)
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

  // Kora Pay webhook events log
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

  // ═══════════════════════════════════════════════════════════════════
  // COMPOSIO ENHANCED - Triggers, Webhooks, Observability
  // ═══════════════════════════════════════════════════════════════════

  // Composio Triggers - real-time event subscriptions
  composio_triggers: defineTable({
    triggerId: v.string(),
    toolkit: v.string(),
    triggerName: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    agentId: v.string(),
    connectedAccountId: v.optional(v.string()),
    config: v.optional(v.any()),
    lastFiredAt: v.optional(v.number()),
    fireCount: v.number(),
    webhookUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trigger", ["triggerId"])
    .index("by_toolkit", ["toolkit"])
    .index("by_agent", ["agentId"])
    .index("by_enabled", ["enabled"]),

  // Composio Trigger Events - audit log of fired triggers
  composio_trigger_events: defineTable({
    triggerId: v.string(),
    toolkit: v.string(),
    eventType: v.string(),
    payload: v.any(),
    processed: v.boolean(),
    agentId: v.optional(v.string()),
    receivedAt: v.number(),
  })
    .index("by_trigger", ["triggerId"])
    .index("by_toolkit", ["toolkit"])
    .index("by_received", ["receivedAt"]),

  // Composio Custom Tools - admin-built tools
  composio_custom_tools: defineTable({
    toolName: v.string(),
    toolkit: v.string(),
    description: v.string(),
    inputSchema: v.any(),
    outputSchema: v.optional(v.any()),
    handler: v.string(), // Function name reference
    enabled: v.boolean(),
    createdBy: v.string(),
    usageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool_name", ["toolName"])
    .index("by_toolkit", ["toolkit"])
    .index("by_enabled", ["enabled"]),

  // Composio Webhooks - inbound webhook configurations
  composio_webhooks: defineTable({
    webhookId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    enabled: v.boolean(),
    lastDeliveryAt: v.optional(v.number()),
    deliveryCount: v.number(),
    failureCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_webhook", ["webhookId"])
    .index("by_enabled", ["enabled"]),

  // Composio Sessions - Tool Router session management
  composio_sessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    agentId: v.optional(v.string()),
    toolkits: v.array(v.string()),
    activeTools: v.number(),
    toolCallCount: v.number(),
    startedAt: v.number(),
    lastActivityAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"]),

  // ═══════════════════════════════════════════════════════════════════
  // TRYPOST - Dedicated Social Media Scheduling Engine
  // ═══════════════════════════════════════════════════════════════════

  // TryPost Brand Profile
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

  // TryPost Scheduled Posts (v3 — extended)
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

  // TryPost Media Library
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

  // TryPost Templates
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

  // TryPost Post Comments / Notes (collaboration)
  trypost_post_comments: defineTable({
    postId: v.id("trypost_scheduled_posts"),
    author: v.string(),
    text: v.string(),
    isInternal: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_created", ["createdAt"]),

  // TryPost Workflows (automated campaign templates)
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

  // TryPost Workflow Runs (audit log)
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

  // TryPost Carousels (AI-generated visual content)
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

  // TryPost Analytics
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

  // TryPost Webhook Events
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

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-HEAL & SECURITY SYSTEM
  // ═══════════════════════════════════════════════════════════════════

  // Auto-heal runs - each execution of fix-advanced.ps1
  auto_heal_runs: defineTable({
    runId: v.string(),
    triggeredBy: v.string(), // "manual", "cron", "github-webhook"
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    sections: v.array(
      v.object({
        name: v.string(),
        status: v.union(v.literal("ok"), v.literal("warn"), v.literal("error")),
        durationMs: v.optional(v.number()),
        message: v.optional(v.string()),
        details: v.optional(v.any()),
      })
    ),
    issuesFound: v.number(),
    issuesFixed: v.number(),
    commitSha: v.optional(v.string()),
    convexDeployed: v.boolean(),
    vercelDeployed: v.boolean(),
    hostInfo: v.optional(v.any()),
    summary: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // Auto-heal alerts - critical issues that need attention
  auto_heal_alerts: defineTable({
    runId: v.id("auto_heal_runs"),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    category: v.string(), // "security", "typescript", "dependency", "deploy", "endpoint"
    title: v.string(),
    message: v.string(),
    source: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    autoFixable: v.boolean(),
    autoFixed: v.boolean(),
    dismissed: v.boolean(),
    dismissedBy: v.optional(v.string()),
    dismissedAt: v.optional(v.number()),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_severity", ["severity"])
    .index("by_dismissed", ["dismissed"])
    .index("by_created", ["createdAt"]),

  // Auto-heal fixes - individual fixes applied
  auto_heal_fixes: defineTable({
    runId: v.id("auto_heal_runs"),
    filePath: v.string(),
    fixType: v.string(), // "typescript", "lint", "import", "format", "secret"
    description: v.string(),
    beforeSnippet: v.optional(v.string()),
    afterSnippet: v.optional(v.string()),
    lineNumber: v.optional(v.number()),
    applied: v.boolean(),
    appliedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_type", ["fixType"])
    .index("by_applied", ["applied"]),

  // Auto-heal secrets detected (redacted, for tracking only)
  auto_heal_secrets: defineTable({
    runId: v.id("auto_heal_runs"),
    filePath: v.string(),
    lineNumber: v.number(),
    secretType: v.string(), // "stripe_live", "github_pat", "google_api", "jwt", "termii_live"
    redactedValue: v.string(), // Shows first 4 + last 4 chars only
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    recommendedAction: v.string(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_type", ["secretType"])
    .index("by_resolved", ["resolved"]),

  // Auto-heal endpoint health snapshots
  auto_heal_health_checks: defineTable({
    runId: v.id("auto_heal_runs"),
    endpoint: v.string(),
    url: v.string(),
    method: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down")
    ),
    responseCode: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    error: v.optional(v.string()),
    checkedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_endpoint", ["endpoint"])
    .index("by_status", ["status"])
    .index("by_checked", ["checkedAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // COMPOSIO ENHANCEMENT TOGGLE SYSTEM — AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════════

  composio_enhancement_logs: defineTable({
    action: v.string(), // "enable", "disable", "auto-configure", "enable-all", "disable-all"
    agentId: v.string(),
    agentName: v.string(),
    adminId: v.string(),
    tools: v.array(v.string()),
    toolCount: v.number(),
    previousState: v.boolean(),
    newState: v.boolean(),
    bulkOperation: v.boolean(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_action", ["action"])
    .index("by_admin", ["adminId"])
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════════════════
  // GLOBAL EXPANSION — DUAL CURRENCY, SECURITY, HEALING, FEEDS
  // ═══════════════════════════════════════════════════════════════════

  usd_wallets: defineTable({
    userId: v.string(),
    balance: v.number(),
    sweepEnabled: v.boolean(),
    sweepThreshold: v.number(),
    lastSweepAt: v.optional(v.number()),
    isEncrypted: v.boolean(),
    encryptionKeySalt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  exchange_rates: defineTable({
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
    source: v.string(),
    effectiveDate: v.string(),
    createdAt: v.number(),
  })
    .index("by_currencies", ["fromCurrency", "toCurrency"])
    .index("by_date", ["effectiveDate"]),

  auto_transfer_config: defineTable({
    adminId: v.string(),
    currency: v.string(),
    destinationAccountName: v.string(),
    destinationAccountNumber: v.string(),
    destinationBankCode: v.string(),
    isActivated: v.boolean(),
    activationCode: v.optional(v.string()),
    manualPasteRequired: v.boolean(),
    scheduledFrequency: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_admin_currency", ["adminId", "currency"]),

  security_logs: defineTable({
    type: v.string(),
    ip: v.optional(v.string()),
    userId: v.optional(v.string()),
    path: v.optional(v.string()),
    details: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    resolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_severity", ["severity"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  blocked_ips: defineTable({
    ip: v.string(),
    reason: v.string(),
    blockedAt: v.number(),
    expiresAt: v.optional(v.number()),
    permanent: v.boolean(),
  })
    .index("by_ip", ["ip"])
    .index("by_expires", ["expiresAt"]),

  healing_logs: defineTable({
    errorType: v.string(),
    errorMessage: v.string(),
    fixApplied: v.string(),
    success: v.boolean(),
    affectedArea: v.string(),
    createdAt: v.number(),
  })
    .index("by_error_type", ["errorType"])
    .index("by_created", ["createdAt"]),

  health_reports: defineTable({
    date: v.string(),
    totalUsers: v.number(),
    totalPosts: v.number(),
    totalPayments: v.number(),
    agentsUsed: v.number(),
    errorsFound: v.number(),
    errorsFixed: v.number(),
    platformsConnected: v.number(),
    report: v.string(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"]),

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

  cloud_memory_autonomy: defineTable({
    checkType: v.string(),
    status: v.string(),
    issuesFound: v.string(),
    autoFixesApplied: v.string(),
    healingTimeMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // NIGERIAN TAX COMPLIANCE — Nigeria Tax Act 2025
  // ═══════════════════════════════════════════════════════════════════

  expense_categories: defineTable({
    name: v.string(),
    description: v.string(),
    deductiblePercentage: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"]),

  business_expenses: defineTable({
    category: v.string(),
    description: v.string(),
    amountNgn: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptData: v.optional(v.string()),
    expenseDate: v.number(),
    isDeductible: v.boolean(),
    deductibleAmount: v.number(),
    taxYear: v.number(),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_tax_year", ["taxYear"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  tax_calculations: defineTable({
    taxYear: v.number(),
    totalIncome: v.number(),
    totalDeductibleExpenses: v.number(),
    taxableIncome: v.number(),
    taxFreeThreshold: v.number(),
    effectiveRate: v.number(),
    taxOwed: v.number(),
    citOwed: v.number(),
    turnover: v.number(),
    isSmallBusiness: v.boolean(),
    breakdown: v.any(),
    calculatedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tax_year", ["taxYear"])
    .index("by_created", ["createdAt"]),

  tax_payment_schedule: defineTable({
    taxYear: v.number(),
    quarter: v.string(),
    dueDate: v.string(),
    estimatedAmount: v.number(),
    paidAmount: v.number(),
    status: v.union(v.literal("upcoming"), v.literal("paid"), v.literal("overdue"), v.literal("deferred")),
    paymentRef: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    reminderSent: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tax_year", ["taxYear"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),

  // ═══════════════════════════════════════════════════════════════════
  // ENTERPRISE FEATURES — ADDITIVE LAYER
  // ═══════════════════════════════════════════════════════════════════

  // ─── AGENT MARKETPLACE ───
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
    .index("by_author", ["author"]),

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

  // ─── KNOWLEDGE GRAPH ───
  knowledge_graph_nodes: defineTable({
    nodeId: v.string(),
    nodeType: v.string(),
    label: v.string(),
    description: v.string(),
    metadata: v.any(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_node_id", ["nodeId"])
    .index("by_type", ["nodeType"]),

  knowledge_graph_edges: defineTable({
    edgeId: v.string(),
    sourceNodeId: v.string(),
    targetNodeId: v.string(),
    relationship: v.string(),
    weight: v.number(),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceNodeId"])
    .index("by_target", ["targetNodeId"])
    .index("by_relationship", ["relationship"]),

  knowledge_graph_queries: defineTable({
    queryText: v.string(),
    resultCount: v.number(),
    executionMs: v.number(),
    queriedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_querier", ["queriedBy"]),

  // ─── COMPANION AGENT ───
  companion_agent_sessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    agentId: v.string(),
    personality: v.string(),
    mood: v.string(),
    isActive: v.boolean(),
    startedAt: v.number(),
    lastInteractionAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"]),

  companion_agent_memory: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    memoryType: v.string(),
    content: v.string(),
    importance: v.number(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_importance", ["importance"]),

  companion_agent_conversations: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    sentiment: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  // ─── AGENTIC PAYMENTS ───
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

  // ─── ORCHESTRATION ───
  orchestration_workflows: defineTable({
    workflowId: v.string(),
    name: v.string(),
    description: v.string(),
    steps: v.array(v.any()),
    triggers: v.any(),
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_creator", ["createdBy"]),

  orchestration_workflow_runs: defineTable({
    runId: v.string(),
    workflowId: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("paused")),
    currentStep: v.number(),
    totalSteps: v.number(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // ─── EMOTIONAL AI ───
  emotional_ai_profiles: defineTable({
    userId: v.string(),
    dominantEmotion: v.string(),
    emotionalRange: v.any(),
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  emotional_ai_interactions: defineTable({
    userId: v.string(),
    agentId: v.string(),
    detectedEmotion: v.string(),
    confidence: v.number(),
    responseStrategy: v.string(),
    content: v.string(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_timestamp", ["timestamp"]),

  emotional_ai_memory: defineTable({
    userId: v.string(),
    emotion: v.string(),
    context: v.string(),
    intensity: v.number(),
    triggers: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_emotion", ["emotion"]),

  // ─── ENHANCEMENTS: ANALYTICS, VERSION CONTROL, WEBHOOKS, AUDIT ───
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

  webhook_notifications: defineTable({
    webhookId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    isActive: v.boolean(),
    lastTriggeredAt: v.optional(v.number()),
    failureCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_webhook_id", ["webhookId"])
    .index("by_events", ["events"]),

  enterprise_audit_logs: defineTable({
    eventType: v.string(),
    actor: v.string(),
    action: v.string(),
    target: v.string(),
    details: v.any(),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_type", ["eventType"])
    .index("by_actor", ["actor"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE PORTAL TABLES (completely separate from client portal)
  // ═══════════════════════════════════════════════════════════════

  enterprise_organizations: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    taxId: v.optional(v.string()),
    status: v.union(v.literal("trial"), v.literal("active"), v.literal("suspended"), v.literal("expired")),
    plan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    trialEndsAt: v.optional(v.number()),
    subscriptionEndsAt: v.optional(v.number()),
    spendingLimit: v.optional(v.number()),
    twoFactorSecret: v.optional(v.string()),
    twoFactorEnabled: v.optional(v.boolean()),
    logo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_plan", ["plan"]),

  enterprise_sessions: defineTable({
    orgId: v.id("enterprise_organizations"),
    token: v.string(),
    isCurrent: v.boolean(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_token", ["token"]),

  enterprise_invitations: defineTable({
    orgId: v.id("enterprise_organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member")),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"]),

  enterprise_members: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"]),

  enterprise_capability_usage: defineTable({
    orgId: v.id("enterprise_organizations"),
    capability: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_capability", ["capability"]),

  enterprise_workflows: defineTable({
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("archived")),
    createdBy: v.string(),
    lastRunAt: v.optional(v.number()),
    runCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),

  enterprise_marketplace_installs: defineTable({
    orgId: v.id("enterprise_organizations"),
    templateId: v.string(),
    templateName: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("uninstalled")),
    customConfig: v.optional(v.any()),
    installedAt: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"]),

  enterprise_knowledge_entries: defineTable({
    orgId: v.id("enterprise_organizations"),
    source: v.string(),
    entity: v.string(),
    relationship: v.string(),
    confidence: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_entity", ["entity"]),

  enterprise_companion_sessions: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.string(),
    channel: v.string(),
    status: v.union(v.literal("active"), v.literal("ended")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    guidanceCount: v.number(),
    lastInteraction: v.optional(v.number()),
  })
    .index("by_org", ["orgId"]),

  enterprise_transactions: defineTable({
    orgId: v.id("enterprise_organizations"),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),

  enterprise_emotional_profiles: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.string(),
    personality: v.optional(v.any()),
    memories: v.array(v.any()),
    sentimentHistory: v.array(v.any()),
    retentionScore: v.number(),
    lastInteraction: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE AUTONOMOUS — Self-Healing Log
  // ═══════════════════════════════════════════════════════════════

  enterprise_healing_log: defineTable({
    component: v.string(),
    issue: v.string(),
    status: v.union(v.literal("detected"), v.literal("in_progress"), v.literal("resolved"), v.literal("ignored")),
    timestamp: v.number(),
    healedBy: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE COMPANIES (10 types: S1-S5 small, M1-M5 enterprise)
  // ═══════════════════════════════════════════════════════════════

  enterprise_companies: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    companyType: v.string(),
    typeName: v.string(),
    size: v.union(v.literal("small"), v.literal("enterprise"), v.literal("hyper-scale")),
    employeeRange: v.string(),
    monthlyPrice: v.number(),
    subdomain: v.string(),
    agentsCount: v.number(),
    companyName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("pending")),
    syncStatus: v.union(v.literal("synced"), v.literal("syncing"), v.literal("failed"), v.literal("pending")),
    loginUrl: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_company_id", ["companyId"])
    .index("by_type", ["companyType"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE SUB-ADMINS (role-based access per company)
  // ═══════════════════════════════════════════════════════════════

  enterprise_subadmins: defineTable({
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("viewer")),
    department: v.optional(v.string()),
    permissions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("suspended")),
    lastLogin: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE CLIENTS (end-users under companies)
  // ═══════════════════════════════════════════════════════════════

  enterprise_clients: defineTable({
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    clientType: v.optional(v.string()),
    assignedSubAdmin: v.optional(v.string()),
    totalSpent: v.number(),
    lastActivity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE SECURITY LOG (intruder detection, AES-256 audit)
  // ═══════════════════════════════════════════════════════════════

  enterprise_security_log: defineTable({
    companyId: v.optional(v.string()),
    orgId: v.optional(v.id("enterprise_organizations")),
    eventType: v.union(
      v.literal("login_attempt"),
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("intruder_detected"),
      v.literal("ip_blocked"),
      v.literal("password_change"),
      v.literal("data_encrypted"),
      v.literal("data_decrypted"),
      v.literal("unauthorized_access"),
      v.literal("rate_limit_hit")
    ),
    ip: v.string(),
    email: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    details: v.optional(v.any()),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    blocked: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_event_type", ["eventType"])
    .index("by_ip", ["ip"])
    .index("by_severity", ["severity"])
    .index("by_company", ["companyId"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE SCALING — Auto-Scaling, CDN, Redis, Monitoring
  // ═══════════════════════════════════════════════════════════════

  enterprise_scaling_config: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    configType: v.union(
      v.literal("auto_scaling"),
      v.literal("cdn"),
      v.literal("redis"),
      v.literal("multi_region")
    ),
    settings: v.any(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_type", ["configType"]),

  enterprise_scaling_logs: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    action: v.string(),
    instanceCount: v.optional(v.number()),
    metrics: v.optional(v.any()),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  enterprise_monitoring_metrics: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    metricType: v.union(
      v.literal("cpu"),
      v.literal("memory"),
      v.literal("requests"),
      v.literal("latency"),
      v.literal("errors"),
      v.literal("uptime")
    ),
    value: v.number(),
    unit: v.string(),
    tags: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_type", ["metricType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_company", ["companyId"]),

  enterprise_monitoring_alerts: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    title: v.string(),
    message: v.string(),
    metric: v.optional(v.string()),
    threshold: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("acknowledged"), v.literal("resolved")),
    timestamp: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_severity", ["severity"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE SLA — Agreements & Compliance
  // ═══════════════════════════════════════════════════════════════

  enterprise_sla_agreements: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("enterprise"), v.literal("global")),
    uptimeGuarantee: v.number(),
    creditPercentage: v.number(),
    monthlyPrice: v.number(),
    responseTimeMinutes: v.number(),
    resolutionTimeHours: v.number(),
    effectiveDate: v.number(),
    expiryDate: v.optional(v.number()),
    terms: v.array(v.string()),
    exclusions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("terminated")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_company", ["companyId"])
    .index("by_tier", ["tier"])
    .index("by_status", ["status"]),

  enterprise_sla_incidents: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    slaId: v.id("enterprise_sla_agreements"),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    durationMinutes: v.number(),
    affectedServices: v.array(v.string()),
    status: v.union(v.literal("open"), v.literal("investigating"), v.literal("resolved"), v.literal("closed")),
    rootCause: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_sla", ["slaId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"]),

  enterprise_compliance_docs: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    standard: v.union(v.literal("GDPR"), v.literal("SOC2"), v.literal("ISO27001"), v.literal("HIPAA"), v.literal("PCI_DSS")),
    status: v.union(v.literal("compliant"), v.literal("non_compliant"), v.literal("in_progress"), v.literal("expired")),
    lastAuditDate: v.number(),
    nextAuditDate: v.number(),
    controls: v.any(),
    certifications: v.array(v.string()),
    documents: v.array(v.any()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_standard", ["standard"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE SUPPORT — 24/7 Ticketing System
  // ═══════════════════════════════════════════════════════════════

  enterprise_support_tickets: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    ticketNumber: v.string(),
    subject: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical")),
    category: v.union(v.literal("technical"), v.literal("billing"), v.literal("feature_request"), v.literal("security"), v.literal("compliance"), v.literal("general")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("waiting_customer"), v.literal("resolved"), v.literal("closed")),
    assignedTo: v.optional(v.string()),
    customerEmail: v.string(),
    customerName: v.string(),
    responses: v.array(v.any()),
    attachments: v.optional(v.array(v.any())),
    slaResponseTime: v.number(),
    slaResolutionTime: v.number(),
    firstResponseAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    satisfactionScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_ticket_number", ["ticketNumber"])
    .index("by_created", ["createdAt"]),

  enterprise_support_responses: defineTable({
    ticketId: v.id("enterprise_support_tickets"),
    responderId: v.string(),
    responderName: v.string(),
    responderType: v.union(v.literal("customer"), v.literal("agent"), v.literal("system")),
    message: v.string(),
    attachments: v.optional(v.array(v.any())),
    isInternal: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ticket", ["ticketId"]),

  enterprise_cdn_assets: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    originalPath: v.string(),
    cdnUrls: v.array(v.string()),
    fileSize: v.number(),
    contentType: v.string(),
    edgeLocations: v.array(v.string()),
    hitCount: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_expires", ["expiresAt"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE ORG USERS (admin-created accounts)
  // ═══════════════════════════════════════════════════════════════

  enterprise_org_users: defineTable({
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("org_admin"), v.literal("org_member")),
    status: v.union(v.literal("active"), v.literal("suspended")),
    mustChangePassword: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"]),

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ENTERPRISE HUB — Workflow Templates & Deployments
  // ═══════════════════════════════════════════════════════════════

  admin_workflow_templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    industry: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    requiredAgents: v.array(v.string()),
    isPublished: v.boolean(),
    publishedToOrgs: v.array(v.id("enterprise_organizations")),
    createdBy: v.string(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_published", ["isPublished"])
    .index("by_category", ["category"])
    .index("by_created_by", ["createdBy"]),

  admin_workflow_assignments: defineTable({
    templateId: v.id("admin_workflow_templates"),
    orgId: v.id("enterprise_organizations"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("removed")),
    customConfig: v.optional(v.any()),
    deployedBy: v.string(),
    deployedAt: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),

  admin_workflow_executions: defineTable({
    templateId: v.id("admin_workflow_templates"),
    orgId: v.id("enterprise_organizations"),
    triggeredBy: v.string(),
    triggerType: v.string(),
    inputData: v.optional(v.any()),
    executionLog: v.optional(v.any()),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_template", ["templateId"])
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // MIMO V.2.5 — AUTONOMOUS INTELLIGENCE CORE
  // ═══════════════════════════════════════════════════════════════

  mimo_core_state: defineTable({
    singleton: v.string(), // "mimo_core"
    version: v.string(),   // "2.5"
    status: v.union(v.literal("operational"), v.literal("degraded"), v.literal("emergency"), v.literal("offline")),
    overallHealth: v.number(), // 0-100
    uptime: v.number(),    // ms since last boot
    lastBootAt: v.number(),
    lastHealthCheckAt: v.number(),
    lastSecurityScanAt: v.number(),
    lastDeepDiagnosisAt: v.number(),
    activeAlerts: v.number(),
    resolvedAlerts: v.number(),
    totalDiagnoses: v.number(),
    totalHeals: v.number(),
    totalFixes: v.number(),
    totalBlockades: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),

  mimo_health_logs: defineTable({
    component: v.string(),    // "convex", "vercel", "github", "api", "database", "agents", "payments", "security"
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down"), v.literal("unknown")),
    responseTimeMs: v.optional(v.number()),
    details: v.string(),
    checksRun: v.number(),
    checksPassed: v.number(),
    checksFailed: v.number(),
    issuesFound: v.number(),
    issuesAutoFixed: v.number(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    timestamp: v.number(),
  }).index("by_component", ["component"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_timestamp", ["timestamp"]),

  mimo_security_events: defineTable({
    eventType: v.union(
      v.literal("malware_detected"),
      v.literal("trojan_detected"),
      v.literal("unauthorized_access"),
      v.literal("data_breach"),
      v.literal("injection_attempt"),
      v.literal("suspicious_activity"),
      v.literal("blockade_enforced"),
      v.literal("scan_completed"),
      v.literal("threat_neutralized")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    source: v.string(),       // file path, IP, endpoint
    description: v.string(),
    pattern: v.optional(v.string()), // regex or signature matched
    action: v.union(v.literal("blocked"), v.literal("quarantined"), v.literal("alerted"), v.literal("neutralized"), v.literal("scanned")),
    blocked: v.boolean(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_event_type", ["eventType"])
    .index("by_severity", ["severity"])
    .index("by_blocked", ["blocked"])
    .index("by_timestamp", ["timestamp"]),

  mimo_command_history: defineTable({
    command: v.string(),     // "diagnose", "heal", "force_heal", "verify", "security_scan", "deploy", "force_deploy", "create_agent", etc.
    issuedBy: v.string(),    // "admin", "cron", "auto"
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  }).index("by_command", ["command"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  mimo_deployment_records: defineTable({
    platform: v.union(v.literal("convex"), v.literal("vercel"), v.literal("github"), v.literal("all")),
    type: v.union(v.literal("standard"), v.literal("force")),
    status: v.union(v.literal("pending"), v.literal("deploying"), v.literal("success"), v.literal("failed")),
    initiatedBy: v.string(),
    commitSha: v.optional(v.string()),
    deploymentUrl: v.optional(v.string()),
    logs: v.optional(v.any()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  mimo_agent_registry: defineTable({
    agentId: v.string(),    // "A1"-"A15"
    agentName: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted"), v.literal("error")),
    capabilities: v.array(v.string()),
    config: v.any(),
    healthScore: v.number(), // 0-100
    lastHealthCheckAt: v.number(),
    totalTasks: v.number(),
    successfulTasks: v.number(),
    failedTasks: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent_id", ["agentId"])
    .index("by_status", ["status"]),

  mimo_audit_logs: defineTable({
    action: v.string(),      // "diagnose", "heal", "deploy", "agent.create", etc.
    actor: v.string(),
    target: v.optional(v.string()),
    details: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════════════
  // RAPIDAPI FALLBACK — Backup posting + additional platforms
  // ═══════════════════════════════════════════════════════════════
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

  composio_failure_logs: defineTable({
    platformId: v.string(),
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
    fallbackUsed: v.boolean(),
    fallbackSuccess: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platformId"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // POSTING MODE — Admin controls for Composio vs RapidAPI
  // ═══════════════════════════════════════════════════════════════
  posting_config: defineTable({
    key: v.string(),     // "posting_mode", "auto_post_enabled", etc.
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 1: CREDIT-BASED BILLING SYSTEM
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 2: SOCIAL COMMERCE (DM-to-Sale)
  // ═══════════════════════════════════════════════════════════════
  social_commerce_conversations: defineTable({
    platform: v.string(),
    customerHandle: v.string(),
    conversationData: v.any(),
    buyingIntentScore: v.number(),
    status: v.union(v.literal("open"), v.literal("engaged"), v.literal("converted"), v.literal("closed")),
    leadId: v.optional(v.string()),
    convertedToSale: v.boolean(),
    saleAmount: v.optional(v.number()),
    commissionEarned: v.optional(v.number()),
    createdAt: v.number(),
    convertedAt: v.optional(v.number()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_intent", ["buyingIntentScore"]),

  dm_automation_rules: defineTable({
    triggerKeywords: v.array(v.string()),
    responseTemplate: v.string(),
    productRecommendation: v.optional(v.string()),
    discountCode: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 3: AI AGENT MARKETPLACE
  // ═══════════════════════════════════════════════════════════════
  marketplace_listings: defineTable({
    agentId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    industry: v.optional(v.string()),
    pricingModel: v.union(v.literal("free"), v.literal("one_time"), v.literal("subscription")),
    priceNgN: v.number(),
    subscriptionPriceNgN: v.optional(v.number()),
    revenueSharePercentage: v.number(),
    downloadsCount: v.number(),
    rating: v.number(),
    developerId: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_developer", ["developerId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  marketplace_purchases: defineTable({
    listingId: v.id("marketplace_listings"),
    buyerId: v.string(),
    purchaseType: v.union(v.literal("one_time"), v.literal("subscription")),
    amountPaid: v.number(),
    platformFee: v.number(),
    developerEarnings: v.number(),
    subscriptionEndDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_listing", ["listingId"])
    .index("by_buyer", ["buyerId"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 4: OUTCOME-BASED PRICING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 5: WHITE-LABEL ENTERPRISE PLATFORM
  // ═══════════════════════════════════════════════════════════════
  white_label_customers: defineTable({
    companyName: v.string(),
    customDomain: v.optional(v.string()),
    customLogo: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    customAgents: v.optional(v.any()),
    setupFeePaid: v.number(),
    monthlyFee: v.number(),
    subscriptionEndDate: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_domain", ["customDomain"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 6: AGENT PERFORMANCE ANALYTICS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 7: CONVERSATIONAL COMMERCE ORCHESTRATION
  // ═══════════════════════════════════════════════════════════════
  commerce_conversations: defineTable({
    userId: v.string(),
    platform: v.string(),
    channel: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed")),
    intent: v.string(),
    messages: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 8: AGENT TRAINING & CONSULTING
  // ═══════════════════════════════════════════════════════════════
  consulting_bookings: defineTable({
    clientId: v.string(),
    serviceType: v.string(),
    description: v.string(),
    priceNgN: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    scheduledDate: v.number(),
    completedDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 9: API ACCESS FOR DEVELOPERS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE FEATURE 10: SOCIAL COMMERCE AGENT (Auto-Engagement)
  // ═══════════════════════════════════════════════════════════════
  social_engagement_logs: defineTable({
    platform: v.string(),
    postId: v.string(),
    commentText: v.string(),
    buyingIntent: v.boolean(),
    autoReplied: v.boolean(),
    replyText: v.optional(v.string()),
    converted: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platform"])
    .index("by_intent", ["buyingIntent"])
    .index("by_created", ["createdAt"]),

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

  // ═══════════════════════════════════════════════════════════════
  // AWS OTP + AI FRAUD DETECTION TABLES
  // ═══════════════════════════════════════════════════════════════

  aws_otp_requests: defineTable({
    identifier: v.string(),
    otpHash: v.string(),
    purpose: v.string(),
    isVerified: v.boolean(),
    expiresAt: v.number(),
    verifiedAt: v.optional(v.number()),
    attempts: v.number(),
    deliveryMethod: v.string(),
    awsMessageId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    fraudScore: v.number(),
    riskLevel: v.string(),
    createdAt: v.number(),
  }).index("by_identifier", ["identifier"])
    .index("by_expires", ["expiresAt"])
    .index("by_device", ["deviceFingerprint"])
    .index("by_created", ["createdAt"]),

  aws_fraud_scores: defineTable({
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    fraudScore: v.number(),
    riskLevel: v.string(),
    reason: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_identifier", ["identifier"])
    .index("by_risk", ["riskLevel"])
    .index("by_created", ["createdAt"]),

  aws_trusted_devices: defineTable({
    identifier: v.string(),
    deviceFingerprint: v.string(),
    deviceName: v.optional(v.string()),
    lastUsedAt: v.number(),
    trustedUntil: v.number(),
    createdAt: v.number(),
  }).index("by_fingerprint", ["deviceFingerprint"])
    .index("by_identifier", ["identifier"]),

  aws_rate_limit_events: defineTable({
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
    eventType: v.string(),
    blocked: v.boolean(),
    createdAt: v.number(),
  }).index("by_identifier_ip", ["identifier", "ipAddress"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: CREDIT EXPIRATION SYSTEM
  // ═══════════════════════════════════════════════════════════════
  credit_expiry_config: defineTable({
    enabled: v.boolean(),
    expiryDays: v.number(), // default 30
    warningDays: v.number(), // warn before expiry (default 7)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["enabled"]),

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: ANNUAL PLAN DISCOUNTS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: AGENT-SPECIFIC PREMIUM PRICING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: ENTERPRISE ADD-ONS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: USAGE TIERS & OVERAGE BILLING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: FREEMIUM CONVERSION TRACKING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: REVENUE ANALYTICS DASHBOARD
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // REVENUE GROWTH: SUBSCRIPTION UPGRADE/DOWNGRADE TRACKING
  // ═══════════════════════════════════════════════════════════════
  subscription_changes: defineTable({
    userId: v.string(),
    changeType: v.union(v.literal("upgrade"), v.literal("downgrade"), v.literal("renewal"), v.literal("cancellation")),
    fromPlan: v.string(),
    toPlan: v.string(),
    fromPriceNgn: v.number(),
    toPriceNgn: v.number(),
    proratedAmount: v.number(),
    effectiveDate: v.number(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_change_type", ["changeType"])
    .index("by_created", ["createdAt"]),

  aws_otp_delivery_logs: defineTable({
    otpRequestId: v.id("aws_otp_requests"),
    channel: v.string(),
    success: v.boolean(),
    messageId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_request", ["otpRequestId"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD MANAGEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  password_change_requests: defineTable({
    userId: v.id("users"),
    requestedBy: v.id("users"),
    currentPasswordHash: v.string(),
    newPasswordHash: v.string(),
    reason: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_requested_by", ["requestedBy"]),

  email_notifications: defineTable({
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    type: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  }).index("by_to", ["to"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE ORGANIZATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  enterprise_org_transactions: defineTable({
    orgId: v.id("enterprise_organizations"),
    type: v.union(
      v.literal("subscription_payment"),
      v.literal("agent_usage"),
      v.literal("api_call"),
      v.literal("refund"),
      v.literal("payout"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("reversed")
    ),
    description: v.string(),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  enterprise_org_analytics: defineTable({
    orgId: v.id("enterprise_organizations"),
    date: v.string(), // YYYY-MM-DD
    metric: v.string(),
    value: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_org_date", ["orgId", "date"])
    .index("by_org_metric", ["orgId", "metric"]),

  enterprise_org_diagnostics: defineTable({
    orgId: v.id("enterprise_organizations"),
    checkType: v.string(),
    status: v.union(v.literal("healthy"), v.literal("warning"), v.literal("critical")),
    details: v.any(),
    recommendations: v.array(v.string()),
    performedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_status", ["status"]),

  enterprise_org_healing_logs: defineTable({
    orgId: v.id("enterprise_organizations"),
    mode: v.union(v.literal("auto"), v.literal("manual")),
    fixesApplied: v.number(),
    details: v.any(),
    performedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),

  enterprise_org_payment_configs: defineTable({
    orgId: v.id("enterprise_organizations"),
    gateway: v.union(v.literal("kora"), v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    apiKey: v.string(),
    secretKey: v.string(),
    webhookSecret: v.optional(v.string()),
    payoutSchedule: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    minimumPayout: v.number(),
    platformFeePercentage: v.number(),
    currency: v.string(),
    configuredBy: v.id("users"),
    configuredAt: v.number(),
  }).index("by_org", ["orgId"]),

  // ═══════════════════════════════════════════════════════════════════
  // ENTERPRISE CLIENT PAYMENTS — Payments enterprise collects from customers
  // ═══════════════════════════════════════════════════════════════════
  enterprise_client_payments: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    gateway: v.string(),
    gatewayReference: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_gateway_ref", ["gatewayReference"]),

  // ═══════════════════════════════════════════════════════════════════
  // ENTERPRISE ORG BANK ACCOUNTS — Bank details for enterprise payouts
  // ═══════════════════════════════════════════════════════════════════
  enterprise_org_bank_accounts: defineTable({
    orgId: v.id("enterprise_organizations"),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isDefault: v.boolean(),
    isVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  enterprise_org_subadmins: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.id("enterprise_org_users"),
    role: v.union(
      v.literal("company_admin"),
      v.literal("department_manager"),
      v.literal("team_lead"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("viewer")
    ),
    permissions: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_user", ["userId"]),

  enterprise_org_feature_flags: defineTable({
    orgId: v.id("enterprise_organizations"),
    feature: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
    setBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_feature", ["feature"]),

  // ═══════════════════════════════════════════════════════════════
  // AGENT SUBSCRIPTIONS & PAYMENTS
  // ═══════════════════════════════════════════════════════════════

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

  system_wallet_transactions: defineTable({
    walletType: v.string(),
    type: v.union(v.literal("credit"), v.literal("debit"), v.literal("sweep")),
    amount: v.number(),
    description: v.string(),
    reference: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_wallet", ["walletType"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // LONG-FORM VIDEO PRODUCTION
  // ═══════════════════════════════════════════════════════════════
  video_productions: defineTable({
    userId: v.string(),
    title: v.string(),
    prompt: v.string(),
    genre: v.string(),
    targetDuration: v.number(), // in minutes
    style: v.string(),
    storyData: v.any(),
    scenes: v.array(v.any()),
    status: v.union(
      v.literal("story_developed"),
      v.literal("scenes_generating"),
      v.literal("scenes_complete"),
      v.literal("assembling"),
      v.literal("completed"),
      v.literal("failed")
    ),
    finalVideoUrl: v.optional(v.string()),
    totalDuration: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  video_scenes: defineTable({
    storyId: v.string(),
    sceneIndex: v.number(),
    sceneData: v.any(),
    videoUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("generated"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_story", ["storyId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE BILLING SYSTEM
  // ═══════════════════════════════════════════════════════════════
  enterprise_invoices: defineTable({
    orgId: v.string(),
    planName: v.string(),
    period: v.string(),
    flatFee: v.number(),
    adSpendTotal: v.number(),
    successFee: v.number(),
    total: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled")),
    paidAt: v.optional(v.number()),
    dueAt: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_period", ["period"]),

  // ═══════════════════════════════════════════════════════════════
  // REFERRAL WITHDRAWAL SYSTEM
  // ═══════════════════════════════════════════════════════════════
  referral_withdrawal_requests: defineTable({
    userId: v.string(),
    requestedAmount: v.number(),
    serviceFee: v.number(),
    netAmount: v.number(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("completed")),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    koraReference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════
  // UNIFIED ADVERT ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // PRE-SUBSCRIPTION TRACKING — Track free exchanges before subscribe
  // ═══════════════════════════════════════════════════════════════
  pre_subscription_exchanges: defineTable({
    userId: v.string(),
    agentId: v.string(),
    exchangeCount: v.number(),
    lastExchangeAt: v.number(),
    createdAt: v.number(),
  }).index("by_user_agent", ["userId", "agentId"]),

  // ═══════════════════════════════════════════════════════════════
  // KORA PAY CHECKOUT — Pending Transactions
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // CLIENT 2FA — TOTP (Google Authenticator) Support
  // ═══════════════════════════════════════════════════════════════
  client_2fa: defineTable({
    userId: v.string(),
    secret: v.string(),
    backupCodes: v.array(v.string()),
    isEnabled: v.boolean(),
  }).index("by_user", ["userId"]),

  // ═══════════════════════════════════════════════════════════════
  // CRON JOB TRACKING — Mimo V.2.5 Cron Manager
  // ═══════════════════════════════════════════════════════════════
  cron_jobs: defineTable({
    name: v.string(),
    schedule: v.string(), // cron expression or interval
    scheduleType: v.union(v.literal("cron"), v.literal("interval")),
    functionPath: v.string(), // e.g. "internal.tax.runDailyTaxDeduction"
    isEnabled: v.boolean(),
    category: v.string(), // "financial", "security", "social", "healing", etc.
    description: v.optional(v.string()),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("running"))),
    lastRunDurationMs: v.optional(v.number()),
    totalRuns: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_enabled", ["isEnabled"]),

  cron_executions: defineTable({
    cronJobId: v.id("cron_jobs"),
    cronJobName: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("running")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    triggeredBy: v.union(v.literal("schedule"), v.literal("manual")),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  }).index("by_cron_job", ["cronJobId"])
    .index("by_status", ["status"])
    .index("by_started_at", ["startedAt"]),
});
