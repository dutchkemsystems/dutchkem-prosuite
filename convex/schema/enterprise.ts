import { defineTable } from "convex/server";
import { v } from "convex/values";

export const enterpriseTables = {
  enterprise_audit_logs: defineTable({
    eventType: v.string(),
    actor: v.string(),
    action: v.string(),
    target: v.string(),
    details: v.any(),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_type", ["eventType"])
    .index("by_actor", ["actor"])
    .index("by_created", ["createdAt"]),
  enterprise_organizations: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    taxId: v.optional(v.string()),
    status: v.union(v.literal("trial"), v.literal("active"), v.literal("suspended"), v.literal("expired")),
    plan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    trialEndsAt: v.optional(v.number()),
    subscriptionEndsAt: v.optional(v.number()),
    spendingLimit: v.optional(v.number()),
    twoFactorSecret: v.optional(v.string()),
    twoFactorEnabled: v.optional(v.boolean()),
    logo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_plan", ["plan"]),
  enterprise_sessions: defineTable({
    orgId: v.id("enterprise_organizations"),
    token: v.string(),
    isCurrent: v.boolean(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_token", ["token"]),
  enterprise_invitations: defineTable({
    orgId: v.id("enterprise_organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member")),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"]),
  enterprise_members: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"]),
  enterprise_capability_usage: defineTable({
    orgId: v.id("enterprise_organizations"),
    capability: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_capability", ["capability"]),
  enterprise_workflows: defineTable({
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("archived")),
    createdBy: v.string(),
    lastRunAt: v.optional(v.number()),
    runCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),
  enterprise_marketplace_installs: defineTable({
    orgId: v.id("enterprise_organizations"),
    templateId: v.string(),
    templateName: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("uninstalled")),
    customConfig: v.optional(v.any()),
    installedAt: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"]),
  enterprise_knowledge_entries: defineTable({
    orgId: v.id("enterprise_organizations"),
    source: v.string(),
    entity: v.string(),
    relationship: v.string(),
    confidence: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_entity", ["entity"]),
  enterprise_companion_sessions: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.string(),
    channel: v.string(),
    status: v.union(v.literal("active"), v.literal("ended")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    guidanceCount: v.number(),
    lastInteraction: v.optional(v.number()),
  })
    .index("by_org", ["orgId"]),
  enterprise_transactions: defineTable({
    orgId: v.id("enterprise_organizations"),
    fromAgent: v.string(),
    toAgent: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"]),
  enterprise_emotional_profiles: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.string(),
    personality: v.optional(v.any()),
    memories: v.array(v.any()),
    sentimentHistory: v.array(v.any()),
    retentionScore: v.number(),
    lastInteraction: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"]),
  enterprise_healing_log: defineTable({
    component: v.string(),
    issue: v.string(),
    status: v.union(v.literal("detected"), v.literal("in_progress"), v.literal("resolved"), v.literal("ignored")),
    timestamp: v.number(),
    healedBy: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"]),
  enterprise_companies: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    companyType: v.string(),
    typeName: v.string(),
    size: v.union(v.literal("small"), v.literal("enterprise"), v.literal("hyper-scale")),
    employeeRange: v.string(),
    monthlyPrice: v.number(),
    subdomain: v.string(),
    agentsCount: v.number(),
    companyName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("pending")),
    syncStatus: v.union(v.literal("synced"), v.literal("syncing"), v.literal("failed"), v.literal("pending")),
    loginUrl: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_company_id", ["companyId"])
    .index("by_type", ["companyType"])
    .index("by_status", ["status"]),
  enterprise_subadmins: defineTable({
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("viewer")),
    department: v.optional(v.string()),
    permissions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("suspended")),
    lastLogin: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),
  enterprise_clients: defineTable({
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    clientType: v.optional(v.string()),
    assignedSubAdmin: v.optional(v.string()),
    totalSpent: v.number(),
    lastActivity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),
  enterprise_security_log: defineTable({
    companyId: v.optional(v.string()),
    orgId: v.optional(v.id("enterprise_organizations")),
    eventType: v.union(
      v.literal("login_attempt"),
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("intruder_detected"),
      v.literal("ip_blocked"),
      v.literal("password_change"),
      v.literal("data_encrypted"),
      v.literal("data_decrypted"),
      v.literal("unauthorized_access"),
      v.literal("rate_limit_hit")
    ),
    ip: v.string(),
    email: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    details: v.optional(v.any()),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    blocked: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_event_type", ["eventType"])
    .index("by_ip", ["ip"])
    .index("by_severity", ["severity"])
    .index("by_company", ["companyId"]),
  enterprise_scaling_config: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    configType: v.union(
      v.literal("auto_scaling"),
      v.literal("cdn"),
      v.literal("redis"),
      v.literal("multi_region")
    ),
    settings: v.any(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_type", ["configType"]),
  enterprise_scaling_logs: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    action: v.string(),
    instanceCount: v.optional(v.number()),
    metrics: v.optional(v.any()),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),
  enterprise_monitoring_metrics: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    metricType: v.union(
      v.literal("cpu"),
      v.literal("memory"),
      v.literal("requests"),
      v.literal("latency"),
      v.literal("errors"),
      v.literal("uptime")
    ),
    value: v.number(),
    unit: v.string(),
    tags: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_type", ["metricType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_company", ["companyId"]),
  enterprise_monitoring_alerts: defineTable({
    orgId: v.optional(v.id("enterprise_organizations")),
    companyId: v.optional(v.string()),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    title: v.string(),
    message: v.string(),
    metric: v.optional(v.string()),
    threshold: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("acknowledged"), v.literal("resolved")),
    timestamp: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_severity", ["severity"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),
  enterprise_sla_agreements: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("enterprise"), v.literal("global")),
    uptimeGuarantee: v.number(),
    creditPercentage: v.number(),
    monthlyPrice: v.number(),
    responseTimeMinutes: v.number(),
    resolutionTimeHours: v.number(),
    effectiveDate: v.number(),
    expiryDate: v.optional(v.number()),
    terms: v.array(v.string()),
    exclusions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("terminated")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_company", ["companyId"])
    .index("by_tier", ["tier"])
    .index("by_status", ["status"]),
  enterprise_sla_incidents: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    slaId: v.id("enterprise_sla_agreements"),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    durationMinutes: v.number(),
    affectedServices: v.array(v.string()),
    status: v.union(v.literal("open"), v.literal("investigating"), v.literal("resolved"), v.literal("closed")),
    rootCause: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_sla", ["slaId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"]),
  enterprise_compliance_docs: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    standard: v.union(v.literal("GDPR"), v.literal("SOC2"), v.literal("ISO27001"), v.literal("HIPAA"), v.literal("PCI_DSS")),
    status: v.union(v.literal("compliant"), v.literal("non_compliant"), v.literal("in_progress"), v.literal("expired")),
    lastAuditDate: v.number(),
    nextAuditDate: v.number(),
    controls: v.any(),
    certifications: v.array(v.string()),
    documents: v.array(v.any()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_standard", ["standard"])
    .index("by_status", ["status"]),
  enterprise_support_tickets: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    ticketNumber: v.string(),
    subject: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical")),
    category: v.union(v.literal("technical"), v.literal("billing"), v.literal("feature_request"), v.literal("security"), v.literal("compliance"), v.literal("general")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("waiting_customer"), v.literal("resolved"), v.literal("closed")),
    assignedTo: v.optional(v.string()),
    customerEmail: v.string(),
    customerName: v.string(),
    responses: v.array(v.any()),
    attachments: v.optional(v.array(v.any())),
    slaResponseTime: v.number(),
    slaResolutionTime: v.number(),
    firstResponseAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    satisfactionScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_ticket_number", ["ticketNumber"])
    .index("by_created", ["createdAt"]),
  enterprise_support_responses: defineTable({
    ticketId: v.id("enterprise_support_tickets"),
    responderId: v.string(),
    responderName: v.string(),
    responderType: v.union(v.literal("customer"), v.literal("agent"), v.literal("system")),
    message: v.string(),
    attachments: v.optional(v.array(v.any())),
    isInternal: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ticket", ["ticketId"]),
  enterprise_cdn_assets: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    originalPath: v.string(),
    cdnUrls: v.array(v.string()),
    fileSize: v.number(),
    contentType: v.string(),
    edgeLocations: v.array(v.string()),
    hitCount: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_expires", ["expiresAt"]),
  enterprise_org_users: defineTable({
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("org_admin"), v.literal("org_member")),
    status: v.union(v.literal("active"), v.literal("suspended")),
    mustChangePassword: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"]),
  white_label_customers: defineTable({
    companyName: v.string(),
    customDomain: v.optional(v.string()),
    customLogo: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    customAgents: v.optional(v.any()),
    setupFeePaid: v.number(),
    monthlyFee: v.number(),
    subscriptionEndDate: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_domain", ["customDomain"]),
  enterprise_org_transactions: defineTable({
    orgId: v.id("enterprise_organizations"),
    type: v.union(
      v.literal("subscription_payment"),
      v.literal("agent_usage"),
      v.literal("api_call"),
      v.literal("refund"),
      v.literal("payout"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("reversed")
    ),
    description: v.string(),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  enterprise_org_analytics: defineTable({
    orgId: v.id("enterprise_organizations"),
    date: v.string(), // YYYY-MM-DD
    metric: v.string(),
    value: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_org_date", ["orgId", "date"])
    .index("by_org_metric", ["orgId", "metric"]),
  enterprise_org_diagnostics: defineTable({
    orgId: v.id("enterprise_organizations"),
    checkType: v.string(),
    status: v.union(v.literal("healthy"), v.literal("warning"), v.literal("critical")),
    details: v.any(),
    recommendations: v.array(v.string()),
    performedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_status", ["status"]),
  enterprise_org_healing_logs: defineTable({
    orgId: v.id("enterprise_organizations"),
    mode: v.union(v.literal("auto"), v.literal("manual")),
    fixesApplied: v.number(),
    details: v.any(),
    performedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
  enterprise_org_payment_configs: defineTable({
    orgId: v.id("enterprise_organizations"),
    gateway: v.union(v.literal("kora"), v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    apiKey: v.string(),
    secretKey: v.string(),
    webhookSecret: v.optional(v.string()),
    payoutSchedule: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    minimumPayout: v.number(),
    platformFeePercentage: v.number(),
    currency: v.string(),
    configuredBy: v.id("users"),
    configuredAt: v.number(),
  }).index("by_org", ["orgId"]),
  enterprise_client_payments: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    gateway: v.string(),
    gatewayReference: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_gateway_ref", ["gatewayReference"]),
  enterprise_org_bank_accounts: defineTable({
    orgId: v.id("enterprise_organizations"),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isDefault: v.boolean(),
    isVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"]),
  enterprise_org_subadmins: defineTable({
    orgId: v.id("enterprise_organizations"),
    userId: v.id("enterprise_org_users"),
    role: v.union(
      v.literal("company_admin"),
      v.literal("department_manager"),
      v.literal("team_lead"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("viewer")
    ),
    permissions: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_user", ["userId"]),
  enterprise_org_feature_flags: defineTable({
    orgId: v.id("enterprise_organizations"),
    feature: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
    setBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_feature", ["feature"]),
  enterprise_invoices: defineTable({
    orgId: v.string(),
    planName: v.string(),
    period: v.string(),
    flatFee: v.number(),
    adSpendTotal: v.number(),
    successFee: v.number(),
    total: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled")),
    paidAt: v.optional(v.number()),
    dueAt: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_period", ["period"]),
  enterprise_feature_configs: defineTable({
    orgId: v.string(),
    features: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),
};
