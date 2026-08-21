import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ai_memoryTables = {
  cloud_memory_autonomy: defineTable({
    checkType: v.string(),
    status: v.string(),
    issuesFound: v.string(),
    autoFixesApplied: v.string(),
    healingTimeMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  knowledge_graph_nodes: defineTable({
    nodeId: v.string(),
    nodeType: v.string(),
    label: v.string(),
    description: v.string(),
    metadata: v.any(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_node_id", ["nodeId"])
    .index("by_type", ["nodeType"]),
  knowledge_graph_edges: defineTable({
    edgeId: v.string(),
    sourceNodeId: v.string(),
    targetNodeId: v.string(),
    relationship: v.string(),
    weight: v.number(),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceNodeId"])
    .index("by_target", ["targetNodeId"])
    .index("by_relationship", ["relationship"]),
  knowledge_graph_queries: defineTable({
    queryText: v.string(),
    resultCount: v.number(),
    executionMs: v.number(),
    queriedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_querier", ["queriedBy"]),
  companion_agent_sessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    agentId: v.string(),
    personality: v.string(),
    mood: v.string(),
    isActive: v.boolean(),
    startedAt: v.number(),
    lastInteractionAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_active", ["isActive"]),
  companion_agent_memory: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    memoryType: v.string(),
    content: v.string(),
    importance: v.number(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_importance", ["importance"]),
  companion_agent_conversations: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    content: v.string(),
    sentiment: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),
  emotional_ai_profiles: defineTable({
    userId: v.string(),
    dominantEmotion: v.string(),
    emotionalRange: v.any(),
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),
  emotional_ai_interactions: defineTable({
    userId: v.string(),
    agentId: v.string(),
    detectedEmotion: v.string(),
    confidence: v.number(),
    responseStrategy: v.string(),
    content: v.string(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_timestamp", ["timestamp"]),
  emotional_ai_memory: defineTable({
    userId: v.string(),
    emotion: v.string(),
    context: v.string(),
    intensity: v.number(),
    triggers: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_emotion", ["emotion"]),
  orchestration_workflows: defineTable({
    workflowId: v.string(),
    name: v.string(),
    description: v.string(),
    steps: v.array(v.any()),
    triggers: v.any(),
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_creator", ["createdBy"]),
  orchestration_workflow_runs: defineTable({
    runId: v.string(),
    workflowId: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("paused")),
    currentStep: v.number(),
    totalSteps: v.number(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"])
    .index("by_run_id", ["runId"]),
  mimo_core_state: defineTable({
    singleton: v.string(), // "mimo_core"
    version: v.string(),   // "2.5"
    status: v.union(v.literal("operational"), v.literal("degraded"), v.literal("emergency"), v.literal("offline")),
    overallHealth: v.number(), // 0-100
    uptime: v.number(),    // ms since last boot
    lastBootAt: v.number(),
    lastHealthCheckAt: v.number(),
    lastSecurityScanAt: v.number(),
    lastDeepDiagnosisAt: v.number(),
    activeAlerts: v.number(),
    resolvedAlerts: v.number(),
    totalDiagnoses: v.number(),
    totalHeals: v.number(),
    totalFixes: v.number(),
    totalBlockades: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),
  mimo_health_logs: defineTable({
    component: v.string(),    // "convex", "vercel", "github", "api", "database", "agents", "payments", "security"
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down"), v.literal("unknown")),
    responseTimeMs: v.optional(v.number()),
    details: v.string(),
    checksRun: v.number(),
    checksPassed: v.number(),
    checksFailed: v.number(),
    issuesFound: v.number(),
    issuesAutoFixed: v.number(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    timestamp: v.number(),
  }).index("by_component", ["component"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_timestamp", ["timestamp"])
    .index("by_component_timestamp", ["component", "timestamp"]),
  mimo_security_events: defineTable({
    eventType: v.union(
      v.literal("malware_detected"),
      v.literal("trojan_detected"),
      v.literal("unauthorized_access"),
      v.literal("data_breach"),
      v.literal("injection_attempt"),
      v.literal("suspicious_activity"),
      v.literal("blockade_enforced"),
      v.literal("scan_completed"),
      v.literal("threat_neutralized"),
      v.literal("manual_block"),
      v.literal("prompt_injection"),
      v.literal("data_exfiltration")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    source: v.string(),       // file path, IP, endpoint
    description: v.string(),
    pattern: v.optional(v.string()), // regex or signature matched
    action: v.union(v.literal("blocked"), v.literal("quarantined"), v.literal("alerted"), v.literal("neutralized"), v.literal("scanned"), v.literal("logged")),
    blocked: v.boolean(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_event_type", ["eventType"])
    .index("by_severity", ["severity"])
    .index("by_blocked", ["blocked"])
    .index("by_timestamp", ["timestamp"]),
  mimo_command_history: defineTable({
    command: v.string(),     // "diagnose", "heal", "force_heal", "verify", "security_scan", "deploy", "force_deploy", "create_agent", etc.
    issuedBy: v.string(),    // "admin", "cron", "auto"
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  }).index("by_command", ["command"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),
  mimo_deployment_records: defineTable({
    platform: v.union(v.literal("convex"), v.literal("vercel"), v.literal("github"), v.literal("all")),
    type: v.union(v.literal("standard"), v.literal("force")),
    status: v.union(v.literal("pending"), v.literal("deploying"), v.literal("success"), v.literal("failed")),
    initiatedBy: v.string(),
    commitSha: v.optional(v.string()),
    deploymentUrl: v.optional(v.string()),
    logs: v.optional(v.any()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),
  mimo_agent_registry: defineTable({
    agentId: v.string(),    // "A1"-"A15"
    agentName: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted"), v.literal("error")),
    capabilities: v.array(v.string()),
    config: v.any(),
    healthScore: v.number(), // 0-100
    lastHealthCheckAt: v.number(),
    totalTasks: v.number(),
    successfulTasks: v.number(),
    failedTasks: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent_id", ["agentId"])
    .index("by_status", ["status"]),
  mimo_audit_logs: defineTable({
    action: v.string(),      // "diagnose", "heal", "deploy", "agent.create", etc.
    actor: v.string(),
    target: v.optional(v.string()),
    details: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),
};
