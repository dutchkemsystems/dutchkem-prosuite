import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notificationsTables = {
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
    .index("by_events", ["events"])
    .index("by_active", ["isActive"]),
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
};
