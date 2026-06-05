import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// FLASH SALES & URGENCY TRIGGERS — Time-limited offers, promo codes
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// FLASH SALES
// ═══════════════════════════════════════════════════════════════════

// Create a flash sale (admin only)
export const createFlashSale = mutation({
  args: {
    name: v.string(),
    discountPercent: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    maxUses: v.optional(v.number()),
    applicablePlans: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.discountPercent < 1 || args.discountPercent > 90) {
      throw new Error("Discount must be between 1% and 90%");
    }
    if (args.endsAt <= args.startsAt) {
      throw new Error("End time must be after start time");
    }

    return await ctx.db.insert("flash_sales", {
      name: args.name,
      discountPercent: args.discountPercent,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      maxUses: args.maxUses,
      currentUses: 0,
      applicablePlans: args.applicablePlans,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Get active flash sales
export const getActiveFlashSales = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("flash_sales")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()
      .then((sales) =>
        sales.filter(
          (s) => s.startsAt <= now && s.endsAt > now
        )
      );
  },
});

// Get all flash sales (admin)
export const getAllFlashSales = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("flash_sales").order("desc").collect();
  },
});

// Use a flash sale (increment counter)
export const useFlashSale = internalMutation({
  args: { saleId: v.id("flash_sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Flash sale not found");

    if (sale.maxUses && sale.currentUses >= sale.maxUses) {
      throw new Error("Flash sale usage limit reached");
    }

    await ctx.db.patch(args.saleId, {
      currentUses: sale.currentUses + 1,
    });
  },
});

// Deactivate a flash sale
export const deactivateFlashSale = mutation({
  args: { saleId: v.id("flash_sales") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.saleId, { isActive: false });
  },
});

// Auto-expire flash sales (cron target)
export const expireFlashSales = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const active = await ctx.db
      .query("flash_sales")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let expired = 0;
    for (const sale of active) {
      if (sale.endsAt <= now) {
        await ctx.db.patch(sale._id, { isActive: false });
        expired++;
      }
    }

    return { expired };
  },
});

// ═══════════════════════════════════════════════════════════════════
// PROMO CODES
// ═══════════════════════════════════════════════════════════════════

// Create a promo code (admin only)
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    discountPercent: v.number(),
    maxUses: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.discountPercent < 1 || args.discountPercent > 90) {
      throw new Error("Discount must be between 1% and 90%");
    }

    // Check for duplicate code
    const existing = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existing) throw new Error("Promo code already exists");

    return await ctx.db.insert("promo_codes", {
      code: args.code.toUpperCase(),
      discountPercent: args.discountPercent,
      maxUses: args.maxUses,
      currentUses: 0,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Validate a promo code
export const validatePromoCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!promo) return { valid: false, error: "Invalid promo code" };
    if (!promo.isActive) return { valid: false, error: "Promo code is inactive" };
    if (promo.expiresAt < Date.now()) return { valid: false, error: "Promo code has expired" };
    if (promo.currentUses >= promo.maxUses) return { valid: false, error: "Promo code usage limit reached" };

    return {
      valid: true,
      discountPercent: promo.discountPercent,
      promoId: promo._id,
    };
  },
});

// Apply a promo code (increment counter)
export const applyPromoCode = internalMutation({
  args: { promoId: v.id("promo_codes") },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoId);
    if (!promo) throw new Error("Promo code not found");

    if (promo.currentUses >= promo.maxUses) {
      throw new Error("Promo code usage limit reached");
    }

    await ctx.db.patch(args.promoId, {
      currentUses: promo.currentUses + 1,
    });
  },
});

// Get all promo codes (admin)
export const getAllPromoCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("promo_codes").order("desc").collect();
  },
});

// Deactivate a promo code
export const deactivatePromoCode = mutation({
  args: { promoId: v.id("promo_codes") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.promoId, { isActive: false });
  },
});

// ═══════════════════════════════════════════════════════════════════
// URGENCY & SOCIAL PROOF
// ═══════════════════════════════════════════════════════════════════

// Get real-time urgency stats
export const getUrgencyStats = query({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Count recent purchases for this plan
    const recentCheckouts = await ctx.db
      .query("checkout_sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    const recentPurchases = recentCheckouts.filter(
      (s) => s.planId === args.planId && now - (s.completedAt || s.createdAt) < oneHour
    );

    // Count active viewers (from social proof)
    const activeViewers = await ctx.db
      .query("active_viewers")
      .withIndex("by_agent", (q) => q.eq("agentId", args.planId))
      .collect();

    const freshViewers = activeViewers.filter(
      (v) => now - v.lastSeen < 60 * 1000
    );

    return {
      recentPurchases: recentPurchases.length,
      activeViewers: freshViewers.length,
      lowStock: recentPurchases.length > 8, // "Low stock" if >8 purchased in last hour
      trending: recentPurchases.length > 3, // "Trending" if >3 purchased in last hour
    };
  },
});

// Get flash sale countdown data
export const getFlashSaleCountdown = query({
  args: { saleId: v.id("flash_sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) return null;

    const now = Date.now();
    const remaining = sale.endsAt - now;

    if (remaining <= 0 || !sale.isActive) {
      return { ended: true, remaining: 0 };
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return {
      ended: false,
      remaining,
      hours,
      minutes,
      seconds,
      discountPercent: sale.discountPercent,
      name: sale.name,
      remainingUses: sale.maxUses ? sale.maxUses - sale.currentUses : null,
    };
  },
});
