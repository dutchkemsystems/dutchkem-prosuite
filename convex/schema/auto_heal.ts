import { defineTable } from "convex/server";
import { v } from "convex/values";

export const auto_healTables = {
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
};
