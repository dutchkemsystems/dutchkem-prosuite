import { defineTable } from "convex/server";
import { v } from "convex/values";

export const miscTables = {
  client_kyc_submissions: defineTable({
    userId: v.id("users"),
    legalName: v.string(),
    businessName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    countryOfIncorporation: v.optional(v.string()),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    identityDocId: v.optional(v.id("_storage")),
    proofOfAddressId: v.optional(v.id("_storage")),
    certificateOfIncorporationId: v.optional(v.id("_storage")),
    status: v.union(v.literal("not_submitted"), v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),
  client_wallets: defineTable({
    userId: v.id("users"),
    balance: v.number(),
    pendingWithdrawals: v.number(),
    totalEarned: v.number(),
    totalWithdrawn: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
  client_wallet_transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("credit"), v.literal("debit"), v.literal("withdrawal"), v.literal("refund")),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"]),
  client_bank_accounts: defineTable({
    userId: v.id("users"),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isVerified: v.boolean(),
    isDefault: v.boolean(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  client_payout_requests: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("rejected")),
    bankCode: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.string(),
    adminNotes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    koraReference: v.optional(v.string()),
    batchReference: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_status_and_created", ["status", "createdAt"]),
  bulk_payout_batches: defineTable({
    batchReference: v.string(),
    totalAmount: v.number(),
    totalPayouts: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    koraResponse: v.optional(v.any()),
    initiatedBy: v.string(),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_reference", ["batchReference"])
    .index("by_status", ["status"]),
  admin_task_log: defineTable({
    adminId: v.id("users"),
    agentId: v.string(),
    userEmail: v.optional(v.string()),
    serviceId: v.string(),
    prompt: v.string(),
    output: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    timestamp: v.number(),
  }).index("by_admin", ["adminId"]),
  update_history: defineTable({
    cycle: v.string(),
    version: v.string(),
    status: v.union(v.literal("applied"), v.literal("failed"), v.literal("rolled_back")),
    snapshot: v.any(),
    timestamp: v.number(),
  }).index("by_cycle", ["cycle"]),
  escrow_wallet: defineTable({
    balance: v.number(),
    totalHeld: v.number(),
    totalReleased: v.number(),
    lastUpdated: v.number(),
  }),
  support_chats: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.string(),
    agentType: v.union(v.literal("sales"), v.literal("support")),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      timestamp: v.number(),
      confidence: v.optional(v.number()),
    })),
    status: v.union(v.literal("active"), v.literal("escalated"), v.literal("resolved")),
    escalatedTo: v.optional(v.string()),
    escalatedAt: v.optional(v.number()),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  lead_scores: defineTable({
    userId: v.id("users"),
    score: v.number(), // 0-100
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
    lastCalculated: v.number(),
    isActive: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_score", ["score"]),
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
  communication_logs: defineTable({
    userId: v.id("users"),
    adminId: v.optional(v.id("users")),
    type: v.union(v.literal("call"), v.literal("whatsapp"), v.literal("sms"), v.literal("email")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    recipient: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("failed")),
    externalId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  leads: defineTable({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(), // "facebook", "web", "referral"
    facebookLeadId: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("lost")),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    receivedAt: v.number(),
    lastContactedAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .index("by_received", ["receivedAt"]),
  saved_reports: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    metrics: v.array(v.object({
      type: v.union(v.literal("revenue"), v.literal("subscriptions"), v.literal("agent_usage"), v.literal("users"), v.literal("performance")),
      field: v.string(),
      aggregation: v.union(v.literal("sum"), v.literal("avg"), v.literal("count"), v.literal("min"), v.literal("max")),
    })),
    filters: v.optional(v.array(v.object({
      field: v.string(),
      operator: v.string(),
      value: v.any(),
    }))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      recipients: v.array(v.string()),
      enabled: v.boolean(),
    })),
    lastGenerated: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creator", ["createdBy"]),
  client_locations: defineTable({
    userId: v.id("users"),
    ip: v.optional(v.string()),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"])
    .index("by_location", ["country", "region"])
    .index("by_coordinates", ["latitude", "longitude"]),
  territories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    boundaries: v.array(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    color: v.string(),
    assignedAgents: v.array(v.id("users")),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  hygiene_reports: defineTable({
    type: v.union(v.literal("duplicate_email"), v.literal("duplicate_phone"), v.literal("incomplete_profile")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    affectedUsers: v.array(v.id("users")),
    details: v.any(),
    actionTaken: v.optional(v.string()),
    reportDate: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_type", ["type"])
    .index("by_date", ["reportDate"]),
  system_backups: defineTable({
    backupType: v.string(), // "schema_config", "auth_config", "social_config", etc.
    data: v.any(),
    description: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("deleted")),
    checksum: v.string(),
  }).index("by_type_and_time", ["backupType", "createdAt"])
    .index("by_status", ["status"]),
  synthetic_performance_logs: defineTable({
    agentId: v.string(),
    eventType: v.union(
      v.literal("generation"),
      v.literal("error"),
      v.literal("fallback"),
      v.literal("timeout")
    ),
    prompt: v.string(),
    response: v.optional(v.string()),
    model: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_agent", ["agentId", "timestamp"])
    .index("by_event", ["eventType", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
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
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("failed")),
    period: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),
  active_viewers: defineTable({
    agentId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    lastSeen: v.number(),
  }).index("by_agent", ["agentId", "lastSeen"]).index("by_session", ["sessionId"]),
  influencers: defineTable({
    name: v.string(),
    platform: v.string(),
    username: v.string(),
    followers: v.number(),
    engagementRate: v.number(),
    niche: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    tier: v.string(),
    status: v.union(
      v.literal("prospecting"),
      v.literal("contacted"),
      v.literal("negotiating"),
      v.literal("active"),
      v.literal("inactive")
    ),
    score: v.number(),
    createdAt: v.number(),
  })
    .index("by_tier", ["tier"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_score", ["score"]),
  influencer_campaigns: defineTable({
    name: v.string(),
    influencerId: v.id("influencers"),
    campaignType: v.string(),
    budget: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    deliverables: v.array(v.string()),
    kpis: v.any(),
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    spend: v.number(),
    reach: v.number(),
    conversions: v.number(),
    roi: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_influencer", ["influencerId"])
    .index("by_status", ["status"]),
  analytics_events: defineTable({
    userId: v.id("users"),
    event: v.string(),
    properties: v.optional(v.any()),
    page: v.optional(v.string()),
    duration: v.optional(v.number()),
    referrer: v.optional(v.string()),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_event", ["event"])
    .index("by_page", ["page"]),
  chatbot_conversations: defineTable({
    visitorId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended")),
    state: v.string(),
    messages: v.array(v.any()),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    leadData: v.optional(v.any()),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_status", ["status"]),
  testimonials: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    service: v.string(),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    result: v.optional(v.string()),
    industry: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    featured: v.boolean(),
    verified: v.boolean(),
    helpful: v.number(),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_service", ["service"])
    .index("by_featured", ["featured"])
    .index("by_rating", ["rating"]),
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
  generated_receipts: defineTable({
    receiptNumber: v.string(), // DKV-XXXXX-XXXX format
    transactionType: v.string(), // "subscription_renewal", "tithe", "cac", "sweep", "transfer"
    transactionId: v.optional(v.string()), // related transaction id
    amountNgn: v.number(),
    fromAccount: v.string(),
    toAccount: v.string(),
    toBank: v.string(),
    toName: v.string(),
    koraReference: v.optional(v.string()),
    date: v.number(),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptData: v.any(), // Full receipt data for regeneration
    jpgUrl: v.optional(v.string()), // Storage URL for JPG
    pdfUrl: v.optional(v.string()), // Storage URL for PDF
    downloads: v.number(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_receipt_number", ["receiptNumber"])
    .index("by_transaction", ["transactionType", "transactionId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),
  live_feeds: defineTable({
    feedType: v.string(),
    title: v.string(),
    message: v.string(),
    severity: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["feedType"])
    .index("by_created", ["createdAt"]),
  transaction_analytics: defineTable({
    transactionId: v.optional(v.string()),
    amountNgn: v.optional(v.number()),
    amountUsd: v.optional(v.number()),
    exchangeRateUsed: v.optional(v.number()),
    transactionHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"]),
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
    .index("by_timestamp", ["timestamp"]),
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
      v.literal("threat_neutralized")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    source: v.string(),       // file path, IP, endpoint
    description: v.string(),
    pattern: v.optional(v.string()), // regex or signature matched
    action: v.union(v.literal("blocked"), v.literal("quarantined"), v.literal("alerted"), v.literal("neutralized"), v.literal("scanned")),
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
  rapidapi_connections: defineTable({
    platformId: v.string(),
    platformName: v.string(),
    isActive: v.boolean(),
    usageCount: v.number(),
    errorCount: v.number(),
    lastUsed: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_platform", ["platformId"]),
  rapidapi_post_logs: defineTable({
    platformId: v.string(),
    content: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("rate_limited")),
    errorMessage: v.optional(v.string()),
    responseData: v.optional(v.any()),
    fallbackTriggered: v.boolean(),
    createdAt: v.number(),
  }).index("by_platform", ["platformId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  posting_config: defineTable({
    key: v.string(),     // "posting_mode", "auto_post_enabled", etc.
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  user_credits: defineTable({
    userId: v.string(),
    balance: v.number(),
    lifetimePurchased: v.number(),
    lifetimeUsed: v.number(),
    autoRechargeEnabled: v.boolean(),
    autoRechargeThreshold: v.number(),
    autoRechargeAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  credit_purchases: defineTable({
    userId: v.string(),
    amount: v.number(),
    priceNgN: v.number(),
    bonusCredits: v.number(),
    paymentReference: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_reference", ["paymentReference"])
    .index("by_status", ["status"]),
  credit_transactions: defineTable({
    userId: v.string(),
    amount: v.number(),
    transactionType: v.string(),
    description: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["transactionType"]),
  outcome_events: defineTable({
    userId: v.string(),
    outcomeType: v.string(),
    outcomeValue: v.any(),
    amountCharged: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    reference: v.string(),
    createdAt: v.number(),
    settledAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_type", ["outcomeType"])
    .index("by_status", ["status"]),
  outcome_pricing_rules: defineTable({
    outcomeType: v.string(),
    description: v.string(),
    priceNgN: v.number(),
    commissionPercentage: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_type", ["outcomeType"])
    .index("by_active", ["isActive"]),
  agent_performance_metrics: defineTable({
    agentId: v.string(),
    date: v.string(),
    totalQueries: v.number(),
    successfulResolutions: v.number(),
    avgResponseTimeMs: v.number(),
    userSatisfaction: v.number(),
    revenueGenerated: v.number(),
    costSaved: v.number(),
    roiPercentage: v.number(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_agent_date", ["agentId", "date"]),
  commerce_conversations: defineTable({
    userId: v.string(),
    platform: v.string(),
    channel: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed")),
    intent: v.string(),
    messages: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),
  consulting_bookings: defineTable({
    clientId: v.string(),
    serviceType: v.string(),
    description: v.string(),
    priceNgN: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    scheduledDate: v.number(),
    completedDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_client", ["clientId"])
    .index("by_status", ["status"]),
  developer_api_keys: defineTable({
    userId: v.string(),
    apiKey: v.string(),
    apiSecret: v.string(),
    tier: v.union(v.literal("developer"), v.literal("professional"), v.literal("business"), v.literal("enterprise")),
    monthlyCallLimit: v.number(),
    callsUsed: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_key", ["apiKey"])
    .index("by_active", ["isActive"]),
  developer_api_usage_logs: defineTable({
    apiKeyId: v.id("developer_api_keys"),
    endpoint: v.string(),
    method: v.string(),
    responseTimeMs: v.number(),
    statusCode: v.number(),
    createdAt: v.number(),
  }).index("by_key", ["apiKeyId"])
    .index("by_created", ["createdAt"]),
  flyer_design_styles: defineTable({
    name: v.string(),
    description: v.string(),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    bgColor: v.string(),
    textColor: v.string(),
    fontFamily: v.string(),
    layout: v.union(v.literal("modern"), v.literal("bold"), v.literal("minimal"), v.literal("creative"), v.literal("corporate")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),
  flyer_auto_posting_engine: defineTable({
    status: v.union(v.literal("running"), v.literal("stopped")),
    postingIntervalHours: v.number(),
    lastTickAt: v.optional(v.number()),
    nextTickAt: v.optional(v.number()),
    currentModeIndex: v.number(),
    platforms: v.object({
      linkedin: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      facebook: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      instagram: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      youtube: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      reddit: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      threads: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      telegram: v.object({ enabled: v.boolean(), paused: v.boolean() }),
      discord: v.object({ enabled: v.boolean(), paused: v.boolean() }),
    }),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    totalFailed: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  generated_flyers: defineTable({
    engineId: v.id("flyer_auto_posting_engine"),
    styleId: v.optional(v.id("flyer_design_styles")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
    nvidiaModel: v.optional(v.string()),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    status: v.union(v.literal("generated"), v.literal("posted"), v.literal("failed"), v.literal("queued")),
    createdAt: v.number(),
  }).index("by_engine", ["engineId"])
    .index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_created", ["createdAt"]),
  flyer_posting_queue: defineTable({
    flyerId: v.id("generated_flyers"),
    engineId: v.id("flyer_auto_posting_engine"),
    platform: v.string(),
    scheduledFor: v.number(),
    status: v.union(v.literal("pending"), v.literal("posting"), v.literal("posted"), v.literal("failed"), v.literal("cancelled")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_platform", ["platform"]),
  flyer_posting_logs: defineTable({
    flyerId: v.id("generated_flyers"),
    engineId: v.id("flyer_auto_posting_engine"),
    platform: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.number(),
    createdAt: v.number(),
  }).index("by_engine", ["engineId"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  credit_expiry_config: defineTable({
    enabled: v.boolean(),
    expiryDays: v.number(), // default 30
    warningDays: v.number(), // warn before expiry (default 7)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["enabled"]),
  subscription_plans: defineTable({
    planId: v.string(), // "starter", "pro", "enterprise"
    name: v.string(),
    description: v.string(),
    monthlyPriceNgn: v.number(),
    annualPriceNgn: v.number(),
    annualDiscountPercent: v.number(),
    creditsIncluded: v.number(),
    messageLimitMonthly: v.number(), // -1 for unlimited
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_plan_id", ["planId"])
    .index("by_active", ["isActive"]),
  agent_pricing_tiers: defineTable({
    agentId: v.string(), // "A1"-"A15"
    agentName: v.string(),
    tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("enterprise")),
    monthlyPriceNgn: v.number(),
    creditsPerMessage: v.number(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_tier", ["tier"])
    .index("by_active", ["isActive"]),
  enterprise_addons: defineTable({
    addonId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.union(v.literal("api_access"), v.literal("custom_training"), v.literal("white_label"), v.literal("dedicated_support"), v.literal("custom_integration")),
    priceNgn: v.number(),
    billingCycle: v.union(v.literal("one_time"), v.literal("monthly"), v.literal("annual")),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_addon_id", ["addonId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),
  enterprise_addon_subscriptions: defineTable({
    orgId: v.id("enterprise_organizations"),
    addonId: v.string(),
    addonName: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    lastBillingAt: v.number(),
    nextBillingAt: v.optional(v.number()),
    amountPaid: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_addon", ["addonId"])
    .index("by_status", ["status"]),
  user_usage_tracking: defineTable({
    userId: v.string(),
    period: v.string(), // "2026-06"
    agentMessagesUsed: v.number(),
    documentUploadsUsed: v.number(),
    voiceMinutesUsed: v.number(),
    flyerGenerationsUsed: v.number(),
    socialPostsUsed: v.number(),
    researchTasksUsed: v.number(),
    overageCharges: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_period", ["userId", "period"])
    .index("by_period", ["period"]),
  overage_invoices: defineTable({
    userId: v.string(),
    period: v.string(),
    overageType: v.string(), // "agent_messages", "document_uploads", etc.
    quantity: v.number(),
    unitPrice: v.number(),
    totalNgn: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_period", ["period"])
    .index("by_status", ["status"]),
  freemium_conversion_events: defineTable({
    userId: v.string(),
    eventType: v.union(
      v.literal("free_credit_granted"),
      v.literal("free_limit_reached"),
      v.literal("upgrade_prompt_shown"),
      v.literal("upgrade_prompt_clicked"),
      v.literal("conversion_completed"),
      v.literal("trial_started"),
      v.literal("trial_expired")
    ),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_event", ["eventType"])
    .index("by_created", ["createdAt"]),
  revenue_daily_snapshots: defineTable({
    date: v.string(), // "2026-06-19"
    totalRevenueNgn: v.number(),
    subscriptionRevenue: v.number(),
    creditRevenue: v.number(),
    enterpriseRevenue: v.number(),
    marketplaceRevenue: v.number(),
    adRevenue: v.number(),
    addonRevenue: v.number(),
    overageRevenue: v.number(),
    newSubscriptions: v.number(),
    churnedSubscriptions: v.number(),
    activeUsers: v.number(),
    mrr: v.number(), // monthly recurring revenue
    arr: v.number(), // annual recurring revenue
    arpu: v.number(), // average revenue per user
    ltv: v.number(), // customer lifetime value
    conversionRate: v.number(),
    createdAt: v.number(),
  }).index("by_date", ["date"]),
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
  referral_withdrawal_requests: defineTable({
    userId: v.string(),
    requestedAmount: v.number(),
    serviceFee: v.number(),
    netAmount: v.number(),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("completed")),
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
  unified_orchestrator_status: defineTable({
    enabled: v.boolean(),
    autoGenerate: v.boolean(),
    autoPost: v.boolean(),
    platforms: v.array(v.object({
      id: v.string(),
      enabled: v.boolean(),
    })),
    lastRun: v.union(v.null(), v.number()),
    nextRun: v.union(v.null(), v.number()),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  unified_ad_content: defineTable({
    headline: v.string(),
    description: v.string(),
    cta: v.string(),
    platforms: v.array(v.string()),
    usedCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
  unified_scheduled_posts: defineTable({
    content: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed")
    ),
    hashtags: v.optional(v.array(v.string())),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"]),
  unified_posting_logs: defineTable({
    contentId: v.string(),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_content", ["contentId"]),
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
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    category: v.string(),
    productType: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"])
    .index("by_published", ["isPublished"]),
  appointment_slots: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    durationMinutes: v.number(),
    maxBookings: v.number(),
    currentBookings: v.number(),
    location: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_date", ["date"]).index("by_active", ["isActive"]),
  appointment_bookings: defineTable({
    slotId: v.id("appointment_slots"),
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_date", ["date"]).index("by_slot", ["slotId"]),
  sms_campaigns: defineTable({
    name: v.string(),
    message: v.string(),
    messageVariantB: v.optional(v.string()),
    recipients: v.array(v.string()),
    recipientCount: v.number(),
    scheduledTime: v.optional(v.string()),
    status: v.string(),
    isAbTest: v.optional(v.boolean()),
    splitPercentage: v.optional(v.number()),
    sentCount: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
    clickCount: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }),
  email_campaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    recipients: v.array(v.string()),
    recipientCount: v.number(),
    scheduledTime: v.optional(v.string()),
    status: v.string(),
    campaignType: v.optional(v.string()),
    sentCount: v.number(),
    openCount: v.number(),
    clickCount: v.number(),
    bounceCount: v.number(),
    createdAt: v.number(),
  }),
  business_hours: defineTable({
    schedule: v.any(),
    timezone: v.string(),
    closedMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  customers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    totalOrders: v.number(),
    totalSpent: v.number(),
    lastOrderAt: v.number(),
    loyaltyPoints: v.number(),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]).index("by_name", ["name"]),
  orders: defineTable({
    orderNumber: v.string(),
    customerId: v.id("customers"),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    items: v.array(v.object({
      productId: v.optional(v.string()),
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
    })),
    itemCount: v.number(),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.number(),
    total: v.number(),
    currency: v.string(),
    shippingAddress: v.optional(v.string()),
    status: v.string(),
    paymentStatus: v.string(),
    fulfillmentStatus: v.string(),
    notes: v.optional(v.string()),
    timeline: v.array(v.object({
      status: v.string(),
      note: v.string(),
      timestamp: v.number(),
    })),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]).index("by_customer", ["customerId"]).index("by_order_number", ["orderNumber"]),
  telegram_carts: defineTable({
    userId: v.string(),
    items: v.array(v.object({
      productId: v.string(),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  surveys: defineTable({
    name: v.string(),
    type: v.string(),
    questions: v.array(v.any()),
    responseCount: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),
  survey_responses: defineTable({
    surveyId: v.id("surveys"),
    respondentName: v.string(),
    respondentEmail: v.optional(v.string()),
    answers: v.array(v.any()),
    testimonial: v.optional(v.string()),
    rating: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_survey", ["surveyId"]),
  ai_model_status: defineTable({
    modelName: v.string(),
    displayName: v.string(),
    isEnabled: v.boolean(),
    icon: v.string(),
    providerType: v.string(),
    description: v.string(),
    lastToggledAt: v.optional(v.number()),
    toggledBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_model", ["modelName"]),
  ai_model_toggle_logs: defineTable({
    modelName: v.string(),
    action: v.string(),
    enabled: v.boolean(),
    performedBy: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_model", ["modelName"]).index("by_timestamp", ["timestamp"]),
  ai_model_usage: defineTable({
    modelName: v.string(),
    taskType: v.string(),
    input: v.string(),
    agentId: v.optional(v.string()),
    success: v.boolean(),
    responseTimeMs: v.number(),
    errorMessage: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_model", ["modelName"])
    .index("by_timestamp", ["timestamp"])
    .index("by_task", ["taskType"])
    .index("by_success", ["success"])
    .index("by_model_timestamp", ["modelName", "timestamp"]),

  // ═══════════════════════════════════════════════════════════════════
  // MISSING TABLES — Added to fix server errors
  // ═══════════════════════════════════════════════════════════════════

  // Flash Sales & Promo Codes
  flash_sales: defineTable({
    name: v.string(),
    discountPercent: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    applicablePlans: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  promo_codes: defineTable({
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    currentUses: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Team Accounts
  teams: defineTable({
    name: v.string(),
    ownerId: v.string(),
    plan: v.string(),
    maxMembers: v.number(),
    currentMembers: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted")),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  team_members: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("member"), v.literal("viewer")),
    invitedBy: v.string(),
    joinedAt: v.number(),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("removed")),
  }).index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  team_invites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("member"), v.literal("viewer")),
    invitedBy: v.string(),
    inviteCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_code", ["inviteCode"]),

  // USD Wallet
  usd_wallets: defineTable({
    userId: v.string(),
    balance: v.number(),
    sweepEnabled: v.boolean(),
    sweepThreshold: v.number(),
    isEncrypted: v.boolean(),
    lastSweepAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_sweep_enabled", ["sweepEnabled"]),

  exchange_rates: defineTable({
    source: v.string(),
    rateNgnUsd: v.number(),
    fetchedAt: v.number(),
  }).index("by_fetched", ["fetchedAt"]),

  auto_transfer_config: defineTable({
    adminId: v.string(),
    currency: v.string(),
    destinationAccountName: v.string(),
    destinationAccountNumber: v.string(),
    destinationBankCode: v.string(),
    scheduledFrequency: v.string(),
    isActivated: v.boolean(),
    activationCode: v.string(),
    manualPasteRequired: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_admin", ["adminId"]),

  // Admin Workflows
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
  api_cost_logs: defineTable({
    provider: v.string(),
    cost: v.number(),
    tokens: v.optional(v.number()),
    model: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_provider", ["provider"])
    .index("by_timestamp", ["timestamp"]),

  health_logs: defineTable({
    component: v.string(),
    status: v.string(),
    details: v.string(),
    severity: v.string(),
    timestamp: v.number(),
    responseTimeMs: v.optional(v.number()),
  }).index("by_component", ["component"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity", ["severity"]),

  security_events: defineTable({
    eventType: v.string(),
    description: v.string(),
    severity: v.string(),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity", ["severity"]),

  // Misc Single-File Tables
  admin_users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  guardian_tests: defineTable({
    testName: v.string(),
    category: v.string(),
    status: v.string(),
    fixAction: v.optional(v.string()),
    autoFixApplied: v.optional(v.boolean()),
    latency: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_category", ["category"])
    .index("by_status", ["status"]),

  payment_notification_logs: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    amount: v.optional(v.number()),
    channel: v.string(),
    sentAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_sent", ["sentAt"]),

  popup_analytics: defineTable({
    userId: v.string(),
    popupType: v.string(),
    action: v.string(),
    createdAt: v.number(),
  }).index("by_type", ["popupType"])
    .index("by_action", ["action"]),

  seo_analyses: defineTable({
    url: v.string(),
    score: v.number(),
    issues: v.any(),
    suggestions: v.any(),
    keywords: v.any(),
    contentId: v.optional(v.string()),
    analyzedAt: v.number(),
  }).index("by_url", ["url"])
    .index("by_analyzed", ["analyzedAt"]),

  system_wallet_transactions: defineTable({
    walletType: v.string(),
    type: v.string(),
    amount: v.number(),
    description: v.string(),
    reference: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_wallet", ["walletType"])
    .index("by_type", ["type"])
    .index("by_reference", ["reference"]),

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-AGENT ORCHESTRATOR — Support tables
  // ═══════════════════════════════════════════════════════════════════

  support_interactions: defineTable({
    userId: v.string(),
    message: v.string(),
    response: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    confidence: v.string(),
    routed: v.boolean(),
    sentiment: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"]),

  support_escalations: defineTable({
    userId: v.string(),
    interactionId: v.id("support_interactions"),
    agentId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("resolved")),
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_interaction", ["interactionId"]),

  // ═══════════════════════════════════════════════════════════════════
  // AI SALES AGENT
  // ═══════════════════════════════════════════════════════════════════
  sales_leads: defineTable({
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("proposal"), v.literal("negotiation"), v.literal("closed_won"), v.literal("closed_lost")),
    score: v.number(),
    interest: v.string(),
    assignedAgent: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_score", ["score"])
    .index("by_created", ["createdAt"]),

  sales_conversations: defineTable({
    leadId: v.id("sales_leads"),
    messages: v.array(v.object({
      role: v.string(),
      content: v.string(),
      timestamp: v.number(),
    })),
    outcome: v.optional(v.string()),
    conversionValue: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_lead", ["leadId"])
    .index("by_created", ["createdAt"]),

  sales_deals: defineTable({
    leadId: v.id("sales_leads"),
    value: v.number(),
    stage: v.union(v.literal("prospect"), v.literal("qualification"), v.literal("proposal"), v.literal("negotiation"), v.literal("closed_won"), v.literal("closed_lost")),
    probability: v.number(),
    expectedClose: v.optional(v.number()),
    actualClose: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_lead", ["leadId"])
    .index("by_stage", ["stage"])
    .index("by_created", ["createdAt"]),

  // ═══════════════════════════════════════════════════════════════════
  // CREATIVE PIPELINE (Automated 24/7 Generation)
  // ═══════════════════════════════════════════════════════════════════
  creative_pipeline_status: defineTable({
    enabled: v.boolean(),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    totalGenerated: v.number(),
    totalPosted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // ═══════════════════════════════════════════════════════════════════
  // SUPPORT ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════
  support_interactions: defineTable({
    userId: v.string(),
    message: v.string(),
    response: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    confidence: v.string(),
    routed: v.boolean(),
    sentiment: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"]),

  support_escalations: defineTable({
    userId: v.string(),
    interactionId: v.optional(v.id("support_interactions")),
    agentId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("resolved")),
    assignedTo: v.optional(v.string()),
    resolution: v.optional(v.string()),
    responses: v.optional(v.array(v.object({
      text: v.string(),
      timestamp: v.number(),
    }))),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_interaction", ["interactionId"])
    .index("by_agent", ["agentId"]),

  client_tasks: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    packageName: v.string(),
    packageId: v.string(),
    deliverable: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    content: v.optional(v.string()),
    paymentReference: v.string(),
    amount: v.number(),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_payment_ref", ["paymentReference"]),

  // ═══════════════════════════════════════════════════════════════════
  // FREELLMAPI USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════
  freellmapi_usage: defineTable({
    model: v.string(),
    routedVia: v.string(),
    latencyMs: v.number(),
    tokensUsed: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_model", ["model"])
    .index("by_created", ["createdAt"]),
};
