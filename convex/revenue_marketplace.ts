import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AI AGENT MARKETPLACE — Revenue Feature 3
// ═══════════════════════════════════════════════════════════════════

// ─── QUERIES ───

export const getListings = query({
  args: {
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    let q = ctx.db.query("marketplace_listings");

    if (args.isActive !== undefined) {
      q = q.withIndex("by_active", (q) => q.eq("isActive", args.isActive!));
    } else {
      q = q.withIndex("by_active", (q) => q.eq("isActive", true));
    }

    if (args.category) {
      const results = await q
        .filter((q) => q.eq(q.field("category"), args.category!))
        .order("desc")
        .take(200);
      return results;
    }

    return await q.order("desc").take(200);
  },
});

export const getListing = query({
  args: { listingId: v.id("marketplace_listings") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("marketplace_listings", args.listingId);
  },
});

export const getListingStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listings = await ctx.db.query("marketplace_listings").take(500);
    const purchases = await ctx.db.query("marketplace_purchases").take(500);

    const totalListings = listings.length;
    const activeListings = listings.filter((l) => l.isActive).length;
    const totalDownloads = listings.reduce((sum, l) => sum + l.downloadsCount, 0);
    const totalRevenue = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
    const ratedListings = listings.filter((l) => l.rating > 0);
    const avgRating =
      ratedListings.length > 0
        ? ratedListings.reduce((sum, l) => sum + l.rating, 0) / ratedListings.length
        : 0;

    const categoryCount: Record<string, number> = {};
    for (const listing of listings) {
      categoryCount[listing.category] = (categoryCount[listing.category] || 0) + 1;
    }
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    return {
      totalListings,
      activeListings,
      totalDownloads,
      totalRevenue,
      avgRating: Math.round(avgRating * 100) / 100,
      topCategories,
    };
  },
});

export const getPurchases = query({
  args: {
    listingId: v.optional(v.id("marketplace_listings")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    if (args.listingId) {
      return await ctx.db
        .query("marketplace_purchases")
        .withIndex("by_listing", (q) => q.eq("listingId", args.listingId!))
        .order("desc")
        .take(200);
    }

    return await ctx.db.query("marketplace_purchases").order("desc").take(200);
  },
});

export const getDeveloperEarnings = query({
  args: {
    developerId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listings = await ctx.db
      .query("marketplace_listings")
      .withIndex("by_developer", (q) => q.eq("developerId", args.developerId))
      .take(500);

    let totalEarnings = 0;
    let totalSales = 0;
    const listingDetails: Array<{
      listingId: string;
      name: string;
      earnings: number;
      sales: number;
    }> = [];

    for (const listing of listings) {
      const purchases = await ctx.db
        .query("marketplace_purchases")
        .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
        .take(500);

      const listingEarnings = purchases.reduce(
        (sum, p) => sum + p.developerEarnings,
        0,
      );
      const listingSales = purchases.length;

      totalEarnings += listingEarnings;
      totalSales += listingSales;

      listingDetails.push({
        listingId: listing._id,
        name: listing.name,
        earnings: listingEarnings,
        sales: listingSales,
      });
    }

    return {
      developerId: args.developerId,
      totalEarnings,
      totalSales,
      totalListings: listings.length,
      listings: listingDetails,
    };
  },
});

// ─── MUTATIONS ───

export const createListing = mutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    industry: v.optional(v.string()),
    pricingModel: v.union(
      v.literal("free"),
      v.literal("one_time"),
      v.literal("subscription"),
    ),
    priceNgN: v.number(),
    subscriptionPriceNgN: v.optional(v.number()),
    revenueSharePercentage: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const now = Date.now();
    const id = await ctx.db.insert("marketplace_listings", {
      agentId: args.agentId,
      name: args.name,
      description: args.description,
      category: args.category,
      industry: args.industry,
      pricingModel: args.pricingModel,
      priceNgN: args.priceNgN,
      subscriptionPriceNgN: args.subscriptionPriceNgN,
      revenueSharePercentage: args.revenueSharePercentage ?? 30,
      downloadsCount: 0,
      rating: 0,
      developerId: args.adminToken ?? "system",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const updateListing = mutation({
  args: {
    listingId: v.id("marketplace_listings"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priceNgN: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listing = await ctx.db.get("marketplace_listings", args.listingId);
    if (!listing) return { error: "Listing not found" };

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.priceNgN !== undefined) patch.priceNgN = args.priceNgN;
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.listingId, patch);
    return { success: true };
  },
});

export const deleteListing = mutation({
  args: {
    listingId: v.id("marketplace_listings"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listing = await ctx.db.get("marketplace_listings", args.listingId);
    if (!listing) return { error: "Listing not found" };

    await ctx.db.patch(args.listingId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const purchaseListing = mutation({
  args: {
    listingId: v.id("marketplace_listings"),
    buyerId: v.string(),
    purchaseType: v.union(v.literal("one_time"), v.literal("subscription")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listing = await ctx.db.get("marketplace_listings", args.listingId);
    if (!listing) return { error: "Listing not found" };
    if (!listing.isActive) return { error: "Listing is not active" };

    const amountPaid =
      args.purchaseType === "subscription"
        ? listing.subscriptionPriceNgN ?? listing.priceNgN
        : listing.priceNgN;

    if (amountPaid < 0) return { error: "Invalid price" };

    const revenueShare = listing.revenueSharePercentage / 100;
    const developerEarnings = Math.round(amountPaid * revenueShare * 100) / 100;
    const platformFee = Math.round((amountPaid - developerEarnings) * 100) / 100;

    const now = Date.now();
    const subscriptionEndDate =
      args.purchaseType === "subscription" ? now + 30 * 24 * 60 * 60 * 1000 : undefined;

    const purchaseId = await ctx.db.insert("marketplace_purchases", {
      listingId: args.listingId,
      buyerId: args.buyerId,
      purchaseType: args.purchaseType,
      amountPaid,
      platformFee,
      developerEarnings,
      subscriptionEndDate,
      createdAt: now,
    });

    await ctx.db.patch(args.listingId, {
      downloadsCount: listing.downloadsCount + 1,
      updatedAt: now,
    });

    const purchase = await ctx.db.get("marketplace_purchases", purchaseId);

    return {
      success: true,
      purchase,
      platformFee,
      developerEarnings,
    };
  },
});

export const rateListing = mutation({
  args: {
    listingId: v.id("marketplace_listings"),
    rating: v.number({ min: 1, max: 5 }),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true };
    }

    const listing = await ctx.db.get("marketplace_listings", args.listingId);
    if (!listing) return { error: "Listing not found" };

    const currentRating = listing.rating;
    const newRating =
      currentRating === 0
        ? args.rating
        : Math.round(((currentRating + args.rating) / 2) * 100) / 100;

    await ctx.db.patch(args.listingId, {
      rating: newRating,
      updatedAt: Date.now(),
    });

    return { success: true, newRating };
  },
});
