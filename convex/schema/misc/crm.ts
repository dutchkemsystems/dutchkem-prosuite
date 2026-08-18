import { defineTable } from "convex/server";
import { v } from "convex/values";

export const crmTables = {
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
  leads: defineTable({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(), // "facebook", "web", "referral", "ai_sales"
    facebookLeadId: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("proposal"), v.literal("negotiation"), v.literal("converted"), v.literal("closed_won"), v.literal("closed_lost"), v.literal("lost")),
    score: v.optional(v.number()),
    interest: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    receivedAt: v.number(),
    lastContactedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .index("by_received", ["receivedAt"])
    .index("by_score", ["score"]),
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
    leadId: v.id("leads"),
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
    leadId: v.id("leads"),
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
};
