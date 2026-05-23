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
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("referralCode", ["referralCode"]),

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
    status: v.union(v.literal("active"), v.literal("canceled"), v.literal("expired"), v.literal("suspended")),
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
  }).index("by_active", ["is_active"]),

  agent_services: defineTable({
    agent_id: v.string(), // e.g., "A1"
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    added_at: v.number(),
    category: v.optional(v.string()),
  }).index("by_agent", ["agent_id"]),

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
    device: v.string(),
    location: v.string(),
    ip: v.string(),
    fingerprint: v.string(),
    lastActive: v.number(),
    isCurrent: v.boolean(),
    isTwoFactorVerified: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_fingerprint", ["fingerprint"]),

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
  }).index("by_reference", ["reference"]),

  model_status: defineTable({
    modelName: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    lastFailureAt: v.optional(v.number()),
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

  social_posts: defineTable({
    agentId: v.string(),
    platform: v.string(), // "X", "LinkedIn", "Facebook", etc.
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("posted"), v.literal("failed")),
    scheduledFor: v.number(),
    postedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    externalId: v.optional(v.string()), // ID from Postiz/etc.
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"]),

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
    snapshot: v.any(), // JSON snapshot of catalog before update
    timestamp: v.number(),
  }).index("by_cycle", ["cycle"]),
});
