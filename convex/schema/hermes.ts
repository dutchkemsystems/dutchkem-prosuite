import { defineTable } from "convex/server";
import { v } from "convex/values";

export const hermesTables = {
  hermes_tasks: defineTable({
    description: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical")),
    result: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  hermes_healing_logs: defineTable({
    component: v.string(),
    action: v.string(),
    issuesFound: v.number(),
    fixesApplied: v.number(),
    details: v.string(),
    performedBy: v.string(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_component", ["component"]),
  hermes_scheduled_tasks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    command: v.string(),
    schedule: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    active: v.boolean(),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["active"]),
  hermes_platform_gateways: defineTable({
    platformId: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled"), v.literal("available")),
    connected: v.boolean(),
    messageCount: v.number(),
    config: v.optional(v.any()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_platform", ["platformId"])
    .index("by_status", ["status"]),
  hermes_installed_services: defineTable({
    serviceId: v.string(),
    name: v.string(),
    repo: v.string(),
    description: v.string(),
    status: v.union(v.literal("installing"), v.literal("installed"), v.literal("failed"), v.literal("uninstalled")),
    version: v.optional(v.string()),
    error: v.optional(v.string()),
    installedBy: v.string(),
    startedAt: v.number(),
    installedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_service", ["serviceId"])
    .index("by_status", ["status"]),
};
