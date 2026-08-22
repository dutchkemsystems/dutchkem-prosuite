import { v } from "convex/values";
import { query, mutation, internalQuery } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PRICING TIERS — CRUD and toggle management
// ═══════════════════════════════════════════════════════════════════

export const getPricingTiers = query({
  args: { clientType: v.optional(v.union(v.literal("individual"), v.literal("enterprise"))) },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Return ALL tiers (active and inactive) so admin can see and toggle them
    const allTiers = await ctx.db.query("whatsapp_pricing_tiers").collect();
    if (args.clientType) {
      return allTiers.filter((t) => t.clientType === args.clientType);
    }
    return allTiers;
  },
});

export const getTierById = internalQuery({
  args: { tierId: v.id("whatsapp_pricing_tiers") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    return tier || null;
  },
});

export const getMessageRates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_message_rates").collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// PRICING TIER TOGGLE — Enable/Disable individual tiers
// ═══════════════════════════════════════════════════════════════════

export const togglePricingTier = mutation({
  args: {
    tierId: v.id("whatsapp_pricing_tiers"),
    isActive: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const tier = await ctx.db.get(args.tierId);
    if (!tier) return { success: false, error: "Tier not found" };

    // Toggle the tier's active status — controls whether new subscriptions can use this tier
    // Existing subscriptions remain unchanged
    await ctx.db.patch(args.tierId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    // Log the toggle
    await ctx.db.insert("whatsapp_toggle_logs", {
      systemType: tier.clientType === "enterprise" ? "enterprise" : "admin",
      action: args.isActive ? "enabled" : "disabled",
      performedBy: identity._id,
      affectedClients: 0,
      timestamp: Date.now(),
    });

    return { 
      success: true, 
      tierName: tier.name, 
      isActive: args.isActive,
      message: args.isActive 
        ? `${tier.name} tier ENABLED — new subscriptions allowed` 
        : `${tier.name} tier DISABLED — new subscriptions blocked, existing ones unaffected`
    };
  },
});

export const getAllPricingTiers = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_pricing_tiers").collect();
  },
});
