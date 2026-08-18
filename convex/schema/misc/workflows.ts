import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workflowsTables = {
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
  drip_enrollments: defineTable({
    campaignId: v.id("marketing_campaigns"),
    leadId: v.id("leads"),
    currentStep: v.number(),
    totalSteps: v.number(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("failed")),
    nextSendAt: v.number(),
    sentSteps: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_lead", ["leadId"])
    .index("by_status", ["status"])
    .index("by_status_next_send", ["status", "nextSendAt"])
    .index("by_campaign_lead", ["campaignId", "leadId"]),
  admin_workflow_templates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    industry: v.string(),
    nodes: v.any(),
    edges: v.any(),
    requiredAgents: v.array(v.string()),
    isPublished: v.boolean(),
    publishedToOrgs: v.array(v.string()),
    createdBy: v.string(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"])
    .index("by_published", ["isPublished"]),

  admin_workflow_assignments: defineTable({
    templateId: v.id("admin_workflow_templates"),
    orgId: v.string(),
    assignedBy: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_template", ["templateId"])
    .index("by_org", ["orgId"]),

  admin_workflow_executions: defineTable({
    templateId: v.id("admin_workflow_templates"),
    assignmentId: v.id("admin_workflow_assignments"),
    orgId: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()),
  }).index("by_template", ["templateId"])
    .index("by_assignment", ["assignmentId"]),

  // MIMO Core
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
};
