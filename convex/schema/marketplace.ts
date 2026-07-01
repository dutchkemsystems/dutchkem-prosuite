import { defineTable } from "convex/server";
import { v } from "convex/values";

export const marketplaceTables = {
  marketplace_transactions: defineTable({
    jobId: v.id("jobs"),
    clientId: v.id("users"),
    freelancerId: v.id("users"),
    amount: v.number(), // total paid by client
    platformFee: v.number(), // 15% goes to main wallet
    freelancerAmount: v.number(), // 85% held in escrow
    status: v.union(v.literal("escrow"), v.literal("ready_for_payout"), v.literal("released"), v.literal("refunded")),
    koraReference: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    koraPayoutReference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_job", ["jobId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  marketplace_listings: defineTable({
    agentId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    industry: v.optional(v.string()),
    pricingModel: v.union(v.literal("free"), v.literal("one_time"), v.literal("subscription")),
    priceNgN: v.number(),
    subscriptionPriceNgN: v.optional(v.number()),
    revenueSharePercentage: v.number(),
    downloadsCount: v.number(),
    rating: v.number(),
    developerId: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_developer", ["developerId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),
  marketplace_purchases: defineTable({
    listingId: v.id("marketplace_listings"),
    buyerId: v.string(),
    purchaseType: v.union(v.literal("one_time"), v.literal("subscription")),
    amountPaid: v.number(),
    platformFee: v.number(),
    developerEarnings: v.number(),
    subscriptionEndDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_listing", ["listingId"])
    .index("by_buyer", ["buyerId"]),
};
