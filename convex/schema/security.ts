import { defineTable } from "convex/server";
import { v } from "convex/values";

export const securityTables = {
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
  aws_otp_delivery_logs: defineTable({
    otpRequestId: v.id("aws_otp_requests"),
    channel: v.string(),
    success: v.boolean(),
    messageId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_request", ["otpRequestId"])
    .index("by_created", ["createdAt"]),
  client_2fa: defineTable({
    userId: v.string(),
    secret: v.string(),
    backupCodes: v.array(v.string()),
    isEnabled: v.boolean(),
  }).index("by_user", ["userId"]),
};
