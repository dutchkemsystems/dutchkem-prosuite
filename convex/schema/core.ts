import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coreTables = {
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
};
