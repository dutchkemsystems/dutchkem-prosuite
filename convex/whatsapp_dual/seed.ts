import { v } from "convex/values";
import { mutation } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const BUSINESS_NUMBER = "+2349113393525";
export const BUSINESS_NAME = "Dutchkem Ventures";
export const WHATSAPP_API_VERSION = "v18.0";

// Master kill switch — when "false", ALL WhatsApp systems are disabled regardless of DB state
// Set WHATSAPP_ENABLED=false in environment to emergency shutdown
export function isWhatsAppEnabled(): boolean {
  const envVal = process.env.WHATSAPP_ENABLED;
  if (envVal === undefined) return true; // Default: enabled
  return envVal.toLowerCase() !== "false" && envVal !== "0";
}

// ═══════════════════════════════════════════════════════════════════
// SEED DEFAULT DATA
// ═══════════════════════════════════════════════════════════════════

export const seedWhatsAppDefaults = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx) => {
    let seeded = 0;

    // Seed system status for both systems
    for (const systemType of ["admin", "enterprise"] as const) {
      const existing = await ctx.db
        .query("whatsapp_system_status")
        .withIndex("by_system", (q) => q.eq("systemType", systemType))
        .first();
      if (!existing) {
        await ctx.db.insert("whatsapp_system_status", {
          systemType,
          isEnabled: true,
          businessNumber: BUSINESS_NUMBER,
          displayName: BUSINESS_NAME,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        });
        seeded++;
      }
    }

    // Seed pricing tiers
    const existingTiers = await ctx.db.query("whatsapp_pricing_tiers").take(10);
    if (existingTiers.length === 0) {
      const tiers = [
        { name: "Free", priceNgn: 0, clientType: "individual" as const, messagesPerMonth: 50, agentLimit: 1, features: ["basic_messaging", "notifications"] },
        { name: "Basic", priceNgn: 5000, clientType: "individual" as const, messagesPerMonth: 500, agentLimit: 3, features: ["templates", "support", "notifications"] },
        { name: "Pro", priceNgn: 15000, clientType: "individual" as const, messagesPerMonth: 2000, agentLimit: 5, features: ["automated", "analytics", "templates", "support"] },
        { name: "Premium", priceNgn: 30000, clientType: "individual" as const, messagesPerMonth: 5000, agentLimit: 10, features: ["priority", "branding", "automated", "analytics"] },
        { name: "Enterprise Starter", priceNgn: 50000, clientType: "enterprise" as const, messagesPerMonth: 5000, agentLimit: 5, features: ["multi_agent", "templates", "support"] },
        { name: "Enterprise Business", priceNgn: 150000, clientType: "enterprise" as const, messagesPerMonth: 20000, agentLimit: 15, features: ["analytics", "multi_agent", "multiple_numbers"] },
        { name: "Enterprise Full", priceNgn: 500000, clientType: "enterprise" as const, messagesPerMonth: 999999, agentLimit: 999, features: ["white_label", "dedicated", "unlimited"] },
      ];
      for (const tier of tiers) {
        await ctx.db.insert("whatsapp_pricing_tiers", {
          ...tier,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        seeded++;
      }
    }

    // Seed message rates
    const existingRates = await ctx.db.query("whatsapp_message_rates").take(5);
    if (existingRates.length === 0) {
      const rates = [
        { messageType: "marketing" as const, rateNgn: 10 },
        { messageType: "transactional" as const, rateNgn: 5 },
        { messageType: "auth" as const, rateNgn: 3 },
        { messageType: "support" as const, rateNgn: 2 },
      ];
      for (const rate of rates) {
        await ctx.db.insert("whatsapp_message_rates", rate);
        seeded++;
      }
    }

    // Seed session state for admin and enterprise
    for (const sessionType of ["admin", "enterprise"] as const) {
      const existingSession = await ctx.db
        .query("whatsapp_sessions")
        .withIndex("by_type", (q) => q.eq("sessionType", sessionType))
        .first();
      if (!existingSession) {
        await ctx.db.insert("whatsapp_sessions", {
          sessionType,
          status: "disconnected",
          updatedAt: Date.now(),
        });
        seeded++;
      }
    }

    return { success: true, seeded };
  },
});
