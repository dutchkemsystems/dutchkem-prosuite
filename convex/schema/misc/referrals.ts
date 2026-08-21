import { defineTable } from "convex/server";
import { v } from "convex/values";

export const referralsTables = {
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
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("processed"), v.literal("failed"), v.literal("completed")),
    period: v.string(),
    koraReference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]).index("by_user_status", ["userId", "status"]),
  referral_withdrawal_requests: defineTable({
    userId: v.string(),
    requestedAmount: v.number(),
    serviceFee: v.number(),
    netAmount: v.number(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("processing"), v.literal("completed")),
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
};
