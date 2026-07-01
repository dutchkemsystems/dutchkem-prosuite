import { defineTable } from "convex/server";
import { v } from "convex/values";

export const composioTables = {
  composio_auth_configs: defineTable({
    toolkit: v.string(),                // "twitter", "linkedin", etc.
    authConfigId: v.string(),           // Composio ac_xxx id
    isManaged: v.boolean(),             // true = Composio managed
    createdAt: v.number(),
    lastVerifiedAt: v.number(),
    lastError: v.optional(v.string()),
  })
    .index("by_toolkit", ["toolkit"]),
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
  composio_notification_prefs: defineTable({
    userId: v.id("users"),
    emailOnAction: v.boolean(),
    pushOnAction: v.boolean(),
    weeklyReport: v.boolean(),
    agentActivityDigest: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
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
  composio_failure_logs: defineTable({
    platformId: v.string(),
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
    fallbackUsed: v.boolean(),
    fallbackSuccess: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platformId"])
    .index("by_created", ["createdAt"]),
};
