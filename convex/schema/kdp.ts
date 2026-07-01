import { defineTable } from "convex/server";
import { v } from "convex/values";

export const kdpTables = {
  kdp_projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("planning"), v.literal("writing"), v.literal("designing"), v.literal("formatting"), v.literal("completed")),
    assets: v.object({
      manuscriptUrl: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      epubUrl: v.optional(v.string()),
      mobiUrl: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      zipUrl: v.optional(v.string()),
    }),
    metadata: v.object({
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      description: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  kdp_royalties: defineTable({
    userId: v.id("users"),
    bookTitle: v.string(),
    amount: v.number(),
    currency: v.string(),
    date: v.string(), // YYYY-MM
  }).index("by_user", ["userId"]),
  book_projects: defineTable({
    userId: v.id("users"),
    subscriptionTier: v.union(v.literal("Basic"), v.literal("Pro"), v.literal("Enterprise")),
    status: v.union(v.literal("draft"), v.literal("in_progress"), v.literal("review"), v.literal("published"), v.literal("archived")),
    manuscript: v.object({
      title: v.string(),
      subtitle: v.optional(v.string()),
      authorName: v.string(),
      authorBio: v.optional(v.string()),
      description: v.string(),
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      trimSize: v.string(),
      pageCount: v.number(),
      interiorType: v.string(),
      bleedSetting: v.string(),
      coverType: v.string(),
    }),
    coverFiles: v.array(v.object({
      type: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      uploadedAt: v.number(),
    })),
    interiorFiles: v.array(v.object({
      type: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      uploadedAt: v.number(),
    })),
    kdpMetadata: v.object({
      kdpAccountEmail: v.string(),
      publishingRole: v.string(),
      imprintName: v.optional(v.string()),
      isbnOption: v.string(),
      pricingTiers: v.array(v.string()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_subscription_tier", ["subscriptionTier"])
    .index("by_status", ["status"]),
  book_royalties: defineTable({
    userId: v.id("users"),
    projectId: v.id("book_projects"),
    csvDataUrl: v.optional(v.string()),
    dashboardData: v.object({
      totalSold: v.number(),
      totalRevenue: v.number(),
      averagePrice: v.number(),
      returns: v.number(),
      penaltyCharges: v.number(),
      netRoyalties: v.number(),
      monthlyTrend: v.array(v.object({
        month: v.string(),
        sales: v.number(),
        revenue: v.number(),
      })),
    }),
    month: v.string(),
    year: v.number(),
  }).index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_month_year", ["month", "year"]),
};
