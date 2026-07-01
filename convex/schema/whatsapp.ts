import { defineTable } from "convex/server";
import { v } from "convex/values";

export const whatsappTables = {
  whatsapp_system_status: defineTable({
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    isEnabled: v.boolean(),
    businessNumber: v.string(),
    displayName: v.string(),
    toggledBy: v.optional(v.string()),
    toggledAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_system", ["systemType"]),
  whatsapp_pricing_tiers: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    priceNgn: v.number(),
    clientType: v.union(v.literal("individual"), v.literal("enterprise")),
    messagesPerMonth: v.number(),
    agentLimit: v.number(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client_type", ["clientType"])
    .index("by_active", ["isActive"]),
  whatsapp_message_rates: defineTable({
    messageType: v.union(v.literal("marketing"), v.literal("transactional"), v.literal("auth"), v.literal("support")),
    rateNgn: v.number(),
  }).index("by_type", ["messageType"]),
  whatsapp_subscriptions: defineTable({
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    tierId: v.id("whatsapp_pricing_tiers"),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("canceled"), v.literal("expired")),
    phoneNumber: v.string(),
    messagesUsed: v.number(),
    messagesLimit: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    autoRenew: v.boolean(),
    koraMandateId: v.optional(v.string()),
    lastBillingAt: v.optional(v.number()),
    nextBillingAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_system", ["systemType"])
    .index("by_status", ["status"]),
  whatsapp_usage_logs: defineTable({
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    messageType: v.string(),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    phoneNumber: v.string(),
    agentId: v.optional(v.string()),
    costNgn: v.number(),
    includedInTier: v.boolean(),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_system", ["systemType"])
    .index("by_timestamp", ["timestamp"]),
  whatsapp_toggle_logs: defineTable({
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    action: v.union(v.literal("enabled"), v.literal("disabled"), v.literal("session_start"), v.literal("session_stop")),
    performedBy: v.string(),
    affectedClients: v.number(),
    timestamp: v.number(),
  }).index("by_system", ["systemType"])
    .index("by_timestamp", ["timestamp"]),
  whatsapp_blacklist: defineTable({
    phoneNumber: v.string(),
    reason: v.string(),
    complaintCount: v.number(),
    blockedAt: v.number(),
  }).index("by_phone", ["phoneNumber"]),
  whatsapp_ad_campaigns: defineTable({
    name: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("completed")),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
    imageUrl: v.optional(v.string()),
    targetCount: v.number(),
    sentCount: v.number(),
    failedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),
  whatsapp_ad_logs: defineTable({
    campaignId: v.id("whatsapp_ad_campaigns"),
    phoneNumber: v.string(),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("failed"), v.literal("blocked")),
    error: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_timestamp", ["timestamp"]),
  whatsapp_revenue_logs: defineTable({
    source: v.string(),
    amountNgn: v.number(),
    type: v.string(),
    description: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_type", ["type"])
    .index("by_timestamp", ["timestamp"]),
  whatsapp_sessions: defineTable({
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("starting"), v.literal("stopping")),
    qr: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    disconnectedAt: v.optional(v.number()),
    lastPingAt: v.optional(v.number()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_type", ["sessionType"]),
};
