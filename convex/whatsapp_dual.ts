import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// DUAL WHATSAPP SYSTEM
// Admin (client control) + Enterprise (enterprise control)
// Business Number: +234-9113393525
// ═══════════════════════════════════════════════════════════════════

const BUSINESS_NUMBER = "+2349113393525";
const BUSINESS_NAME = "Dutchkem Ventures";
const WHATSAPP_API_VERSION = "v18.0";

// Master kill switch — when "false", ALL WhatsApp systems are disabled regardless of DB state
// Set WHATSAPP_ENABLED=false in environment to emergency shutdown
function isWhatsAppEnabled(): boolean {
  const envVal = process.env.WHATSAPP_ENABLED;
  if (envVal === undefined) return true; // Default: enabled
  return envVal.toLowerCase() !== "false" && envVal !== "0";
}

// Query to check master kill switch status (for admin panel)
export const getMasterKillSwitchStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const envVal = process.env.WHATSAPP_ENABLED;
    return {
      enabled: isWhatsAppEnabled(),
      source: envVal === undefined ? "default (enabled)" : `environment: ${envVal}`,
      message: isWhatsAppEnabled()
        ? "WhatsApp is enabled"
        : "WhatsApp is DISABLED via WHATSAPP_ENABLED environment variable",
    };
  },
});

// ─── SEED DEFAULT DATA ───

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

// ─── SYSTEM STATUS ───

export const getSystemStatus = query({
  args: { systemType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("whatsapp_system_status")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType))
      .first();

    const subscriptions = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType))
      .collect();

    const activeCount = subscriptions.filter((s) => s.status === "active").length;
    const totalMessages = subscriptions.reduce((sum, s) => sum + s.messagesUsed, 0);

    return {
      status: status || { isEnabled: true, businessNumber: BUSINESS_NUMBER },
      activeClients: activeCount,
      totalSubscriptions: subscriptions.length,
      totalMessages,
      businessNumber: BUSINESS_NUMBER,
      displayName: BUSINESS_NAME,
    };
  },
});

export const toggleSystem = mutation({
  args: {
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db
      .query("whatsapp_system_status")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: args.enabled,
        toggledBy: identity._id,
        toggledAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("whatsapp_system_status", {
        systemType: args.systemType,
        isEnabled: args.enabled,
        businessNumber: BUSINESS_NUMBER,
        displayName: BUSINESS_NAME,
        toggledBy: identity._id,
        toggledAt: Date.now(),
        updatedAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // Count affected subscriptions
    const subs = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType))
      .collect();

    // Log toggle
    await ctx.db.insert("whatsapp_toggle_logs", {
      systemType: args.systemType,
      action: args.enabled ? "enabled" : "disabled",
      performedBy: identity._id,
      affectedClients: subs.length,
      timestamp: Date.now(),
    });

    return { success: true, enabled: args.enabled, affectedClients: subs.length };
  },
});

// ─── PRICING TIERS ───

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

// ─── SUBSCRIPTIONS ───

export const createSubscription = mutation({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    tierId: v.id("whatsapp_pricing_tiers"),
    phoneNumber: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const tier = await ctx.db.get(args.tierId);
    if (!tier) return { success: false, error: "Tier not found" };

    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    const subId = await ctx.db.insert("whatsapp_subscriptions", {
      userId: args.userId,
      systemType: args.systemType,
      tierId: args.tierId,
      status: "active",
      phoneNumber: args.phoneNumber,
      messagesUsed: 0,
      messagesLimit: tier.messagesPerMonth,
      startDate: now,
      endDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, subscriptionId: subId };
  },
});

export const createSubscriptionInternal = internalMutation({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    tierId: v.id("whatsapp_pricing_tiers"),
    phoneNumber: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId);
    if (!tier) return { success: false, error: "Tier not found" };

    const now = Date.now();
    const endDate = now + 30 * 24 * 60 * 60 * 1000;

    const subId = await ctx.db.insert("whatsapp_subscriptions", {
      userId: args.userId,
      systemType: args.systemType,
      tierId: args.tierId,
      status: "active",
      phoneNumber: args.phoneNumber,
      messagesUsed: 0,
      messagesLimit: tier.messagesPerMonth,
      startDate: now,
      endDate,
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, subscriptionId: subId };
  },
});

export const getSubscriptions = query({
  args: {
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    status: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_system", (q) => q.eq("systemType", args.systemType));
    const subs = await q.collect();
    if (args.status) {
      return subs.filter((s) => s.status === args.status);
    }
    return subs;
  },
});

// ─── USAGE TRACKING ───

export const logUsage = internalMutation({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    messageType: v.string(),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    phoneNumber: v.string(),
    agentId: v.optional(v.string()),
    costNgn: v.number(),
    includedInTier: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_usage_logs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const getUsageLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_usage_logs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);
  },
});

// ─── BLACKLIST ───

export const getBlacklist = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_blacklist").collect();
  },
});

export const addToBlacklist = mutation({
  args: {
    phoneNumber: v.string(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db
      .query("whatsapp_blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        complaintCount: existing.complaintCount + 1,
        reason: args.reason,
      });
    } else {
      await ctx.db.insert("whatsapp_blacklist", {
        phoneNumber: args.phoneNumber,
        reason: args.reason,
        complaintCount: 1,
        blockedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const removeFromBlacklist = mutation({
  args: { phoneNumber: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db
      .query("whatsapp_blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

export const isNumberBlocked = query({
  args: { phoneNumber: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("whatsapp_blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    return !!entry;
  },
});

// ─── AD CAMPAIGNS ───

export const getAdCampaigns = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_ad_campaigns").order("desc").take(20);
  },
});

export const createAdCampaign = mutation({
  args: {
    name: v.string(),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
    imageUrl: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const id = await ctx.db.insert("whatsapp_ad_campaigns", {
      name: args.name,
      status: "draft",
      headline: args.headline,
      body: args.body,
      cta: args.cta,
      imageUrl: args.imageUrl,
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, campaignId: id };
  },
});

// ─── REVENUE REPORTING ───

export const getRevenueReport = query({
  args: { period: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const period = args.period || "monthly";
    const now = Date.now();
    const periodMs: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      yearly: 365 * 24 * 60 * 60 * 1000,
    };
    const cutoff = now - (periodMs[period] || periodMs.monthly);

    const logs = await ctx.db
      .query("whatsapp_revenue_logs")
      .order("desc")
      .take(1000);

    const periodLogs = logs.filter((l) => l.timestamp >= cutoff);
    const totalRevenue = periodLogs.reduce((sum, l) => sum + l.amountNgn, 0);

    const byType: Record<string, number> = {};
    for (const log of periodLogs) {
      byType[log.type] = (byType[log.type] || 0) + log.amountNgn;
    }

    // Projection
    const multiplier = period === "daily" ? 365 : period === "weekly" ? 52 : period === "monthly" ? 12 : 1;
    const projectedAnnual = totalRevenue * multiplier;

    return {
      period,
      totalRevenue,
      byType,
      projectedAnnual,
      transactionCount: periodLogs.length,
    };
  },
});

// ─── SEND MESSAGE (wraps existing integration) ───

export const sendWhatsAppMessage = action({
  args: {
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    phoneNumber: v.string(),
    message: v.string(),
    messageType: v.optional(v.union(v.literal("marketing"), v.literal("transactional"), v.literal("auth"), v.literal("support"))),
    agentId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Master kill switch check
    if (!isWhatsAppEnabled()) {
      return { success: false, error: "WhatsApp is disabled via environment variable (WHATSAPP_ENABLED=false)" };
    }

    // Check if system is enabled
    const status = await ctx.runQuery(internal.whatsapp_dual.getSystemStatus, {
      systemType: args.systemType,
    });
    if (!status.status?.isEnabled) {
      return { success: false, error: `WhatsApp ${args.systemType} system is disabled` };
    }

    // Check blacklist
    const blocked = await ctx.runQuery(internal.whatsapp_dual.isNumberBlocked, {
      phoneNumber: args.phoneNumber,
    });
    if (blocked) {
      return { success: false, error: "Number is blacklisted" };
    }

    // Health check: Verify OpenWA server is connected
    const health = await ctx.runQuery(internal.whatsapp_openwa.checkServerHealth, {
      sessionType: args.systemType,
    });
    if (!health.canSendMessages) {
      return {
        success: false,
        error: health.connected
          ? `WhatsApp server stale (last ping ${health.minutesSincePing}min ago)`
          : `WhatsApp ${args.systemType} server not connected. Scan QR code to connect.`,
      };
    }

    // Forward to existing integration
    const result = await ctx.runAction(
      (await import("./_generated/api")).internal.whatsapp_integration.sendWhatsAppMessage as any,
      {
        adminToken: args.adminToken || "",
        phoneNumber: args.phoneNumber,
        message: args.message,
      }
    );

    // Log usage
    const messageType = args.messageType || "transactional";
    const rates: Record<string, number> = { marketing: 10, transactional: 5, auth: 3, support: 2 };
    const cost = rates[messageType] || 5;

    await ctx.runMutation(internal.whatsapp_dual.logUsage, {
      userId: "system",
      systemType: args.systemType,
      messageType,
      direction: "outbound",
      phoneNumber: args.phoneNumber,
      agentId: args.agentId,
      costNgn: cost,
      includedInTier: false,
    });

    // Log revenue
    await ctx.runMutation(internal.whatsapp_dual.logRevenue, {
      source: `whatsapp_${messageType}`,
      amountNgn: cost,
      type: messageType,
      description: `Message to ${args.phoneNumber}`,
    });

    return result;
  },
});

export const logRevenue = internalMutation({
  args: {
    source: v.string(),
    amountNgn: v.number(),
    type: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_revenue_logs", {
      ...args,
      timestamp: Date.now(),
    });
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

// ═══════════════════════════════════════════════════════════════════
// AGENT COMMUNICATION — Agents (A1-A15) → Admin Clients
// ═══════════════════════════════════════════════════════════════════

export const agentSendMessage = action({
  args: {
    agentId: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    messageType: v.optional(v.union(v.literal("marketing"), v.literal("transactional"), v.literal("auth"), v.literal("support"))),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Master kill switch check
    if (!isWhatsAppEnabled()) {
      return { success: false, error: "WhatsApp is disabled via environment variable (WHATSAPP_ENABLED=false)" };
    }

    // Always use admin system for agent communication
    const status = await ctx.runQuery(internal.whatsapp_dual.getSystemStatus, {
      systemType: "admin",
    });
    if (!status.status?.isEnabled) {
      return { success: false, error: "Admin WhatsApp system is disabled" };
    }

    // Check blacklist
    const blocked = await ctx.runQuery(internal.whatsapp_dual.isNumberBlocked, {
      phoneNumber: args.phoneNumber,
    });
    if (blocked) {
      return { success: false, error: "Number is blacklisted" };
    }

    // Health check: Verify OpenWA server is connected
    const health = await ctx.runQuery(internal.whatsapp_openwa.checkServerHealth, {
      sessionType: "admin",
    });
    if (!health.canSendMessages) {
      return {
        success: false,
        error: health.connected
          ? `WhatsApp server stale (last ping ${health.minutesSincePing}min ago)`
          : `WhatsApp admin server not connected. Scan QR code to connect.`,
      };
    }

    // Check if recipient has active subscription
    const subs = await ctx.runQuery(internal.whatsapp_dual.getSubscriptions, {
      systemType: "admin",
    });
    const hasActiveSub = subs.some((s: any) =>
      s.phoneNumber === args.phoneNumber && s.status === "active"
    );

    // Actually queue the message via OpenWA
    const queueId = await ctx.runMutation(internal.whatsapp_openwa.queueMessage, {
      sessionType: "admin",
      to: formatNigerianPhone(args.phoneNumber),
      message: args.message,
    });

    // Log usage
    const messageType = args.messageType || "support";
    const rates: Record<string, number> = { marketing: 10, transactional: 5, auth: 3, support: 2 };
    const cost = rates[messageType] || 2;

    await ctx.runMutation(internal.whatsapp_dual.logUsage, {
      userId: `agent_${args.agentId}`,
      systemType: "admin",
      messageType,
      direction: "outbound",
      phoneNumber: args.phoneNumber,
      agentId: args.agentId,
      costNgn: cost,
      includedInTier: hasActiveSub,
    });

    await ctx.runMutation(internal.whatsapp_dual.logRevenue, {
      source: `agent_${args.agentId}_${messageType}`,
      amountNgn: cost,
      type: messageType,
      description: `Agent ${args.agentId} → ${args.phoneNumber}`,
    });

    return { success: true, queued: true, queueId, agentId: args.agentId, systemType: "admin", cost };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE COMMUNICATION — Enterprise clients only
// ═══════════════════════════════════════════════════════════════════

export const enterpriseSendMessage = action({
  args: {
    enterpriseId: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    messageType: v.optional(v.union(v.literal("marketing"), v.literal("transactional"), v.literal("auth"), v.literal("support"))),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Master kill switch check
    if (!isWhatsAppEnabled()) {
      return { success: false, error: "WhatsApp is disabled via environment variable (WHATSAPP_ENABLED=false)" };
    }

    // Always use enterprise system
    const status = await ctx.runQuery(internal.whatsapp_dual.getSystemStatus, {
      systemType: "enterprise",
    });
    if (!status.status?.isEnabled) {
      return { success: false, error: "Enterprise WhatsApp system is disabled" };
    }

    // Check blacklist
    const blocked = await ctx.runQuery(internal.whatsapp_dual.isNumberBlocked, {
      phoneNumber: args.phoneNumber,
    });
    if (blocked) {
      return { success: false, error: "Number is blacklisted" };
    }

    // Health check: Verify enterprise OpenWA server is connected
    const health = await ctx.runQuery(internal.whatsapp_openwa.checkServerHealth, {
      sessionType: "enterprise",
    });
    if (!health.canSendMessages) {
      return {
        success: false,
        error: health.connected
          ? `WhatsApp server stale (last ping ${health.minutesSincePing}min ago)`
          : `WhatsApp enterprise server not connected. Scan QR code to connect.`,
      };
    }

    // Check enterprise subscription
    const subs = await ctx.runQuery(internal.whatsapp_dual.getSubscriptions, {
      systemType: "enterprise",
    });
    const hasActiveSub = subs.some((s: any) =>
      s.userId === args.enterpriseId && s.status === "active"
    );

    // Actually queue the message via OpenWA
    const queueId = await ctx.runMutation(internal.whatsapp_openwa.queueMessage, {
      sessionType: "enterprise",
      to: formatNigerianPhone(args.phoneNumber),
      message: args.message,
    });

    const messageType = args.messageType || "transactional";
    const rates: Record<string, number> = { marketing: 10, transactional: 5, auth: 3, support: 2 };
    const cost = rates[messageType] || 5;

    await ctx.runMutation(internal.whatsapp_dual.logUsage, {
      userId: args.enterpriseId,
      systemType: "enterprise",
      messageType,
      direction: "outbound",
      phoneNumber: args.phoneNumber,
      costNgn: cost,
      includedInTier: hasActiveSub,
    });

    await ctx.runMutation(internal.whatsapp_dual.logRevenue, {
      source: `enterprise_${messageType}`,
      amountNgn: cost,
      type: messageType,
      description: `Enterprise ${args.enterpriseId} → ${args.phoneNumber}`,
    });

    return { success: true, queued: true, queueId, enterpriseId: args.enterpriseId, systemType: "enterprise", cost };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ISOLATION CHECK — Prevent cross-system access
// ═══════════════════════════════════════════════════════════════════

export const checkIsolation = query({
  args: {
    userId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const systemSubs = subs.filter((s) => s.systemType === args.systemType);
    const otherSystemSubs = subs.filter((s) => s.systemType !== args.systemType);

    return {
      userId: args.userId,
      requestedSystem: args.systemType,
      hasAccessToSystem: systemSubs.length > 0,
      crossSystemAccess: otherSystemSubs.length > 0,
      isolationIntact: otherSystemSubs.length === 0,
      subscriptionCount: systemSubs.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AGENT LIST — Get all agents for communication
// ═══════════════════════════════════════════════════════════════════

export const getAgentList = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = await ctx.db.query("agent_services").collect();
    return agents.map((a) => ({
      id: a.agent_id,
      name: a.name,
      icon: a.icon,
      category: a.category,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND CLIENT WHATSAPP MESSAGE
// ═══════════════════════════════════════════════════════════════════

export const sendClientMessage = action({
  args: {
    userId: v.string(),
    to: v.string(),
    message: v.string(),
    messageType: v.union(
      v.literal("transactional"),
      v.literal("support"),
      v.literal("marketing")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Master kill switch check
    if (!isWhatsAppEnabled()) {
      return { success: false, error: "WhatsApp is disabled via environment variable (WHATSAPP_ENABLED=false)" };
    }

    const cleaned = args.to.replace(/[^0-9]/g, "");
    if (cleaned.length < 10) {
      return { success: false, error: "Invalid phone number" };
    }

    const sub = await ctx.runQuery(internal.whatsapp_dual.getActiveSubscription, {
      userId: args.userId,
    });

    if (!sub) {
      return { success: false, error: "No active WhatsApp subscription" };
    }

    // STRICT ENFORCEMENT: Block if limit reached
    if (sub.messagesUsed >= sub.messagesLimit) {
      return { success: false, error: `Message limit reached (${sub.messagesUsed}/${sub.messagesLimit}). Upgrade your plan.` };
    }

    // Health check: Verify OpenWA server is connected before sending
    const health = await ctx.runQuery(internal.whatsapp_openwa.checkServerHealth, {
      sessionType: sub.systemType,
    });
    if (!health.canSendMessages) {
      return {
        success: false,
        error: health.connected
          ? `WhatsApp server stale (last ping ${health.minutesSincePing}min ago). Reconnecting...`
          : `WhatsApp ${sub.systemType} server not connected. Scan QR code to connect.`,
      };
    }

    // Actually queue the message via OpenWA
    const queueId = await ctx.runMutation(internal.whatsapp_openwa.queueMessage, {
      sessionType: sub.systemType,
      to: formatNigerianPhone(args.to),
      message: args.message,
    });

    const costByType: Record<string, number> = {
      transactional: 5,
      support: 2,
      marketing: 10,
    };

    await ctx.runMutation(internal.whatsapp_dual.logUsage, {
      userId: args.userId,
      systemType: sub.systemType,
      messageType: args.messageType,
      direction: "outbound",
      phoneNumber: cleaned,
      costNgn: costByType[args.messageType] || 5,
      includedInTier: true,
    });

    await ctx.runMutation(internal.whatsapp_dual.incrementUsage, {
      subscriptionId: sub._id,
    });

    return { success: true, messageId: queueId };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND CLIENT WHATSAPP MESSAGE (Action — calls WhatsApp API)
// ═══════════════════════════════════════════════════════════════════

export const getActiveSubscription = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const incrementUsage = internalMutation({
  args: { subscriptionId: v.id("whatsapp_subscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (sub) {
      await ctx.db.patch(args.subscriptionId, {
        messagesUsed: sub.messagesUsed + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

function formatNigerianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}

// ─── CRON: Check Expired Subscriptions ───

export const checkExpiredSubscriptions = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3-day grace period

    // Find active subscriptions past their end date
    const allSubs = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const expired: { id: string; userId: string; systemType: string; endDate: number }[] = [];
    const graceExpiring: { id: string; userId: string; daysLeft: number }[] = [];

    for (const sub of allSubs) {
      if (sub.endDate <= now) {
        // Check if still in grace period
        if (now - sub.endDate <= GRACE_PERIOD_MS) {
          const daysLeft = Math.ceil((GRACE_PERIOD_MS - (now - sub.endDate)) / (24 * 60 * 60 * 1000));
          graceExpiring.push({ id: sub._id, userId: sub.userId, daysLeft });
        } else {
          // Past grace period — mark as expired
          await ctx.db.patch(sub._id, {
            status: "expired",
            updatedAt: now,
          });
          expired.push({
            id: sub._id,
            userId: sub.userId,
            systemType: sub.systemType,
            endDate: sub.endDate,
          });
        }
      } else if (sub.endDate - now <= 7 * 24 * 60 * 60 * 1000) {
        // Expiring within 7 days
        const daysLeft = Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000));
        graceExpiring.push({ id: sub._id, userId: sub.userId, daysLeft });
      }
    }

    return {
      checkedAt: now,
      expired,
      graceExpiring,
      totalExpired: expired.length,
      totalExpiringSoon: graceExpiring.length,
    };
  },
});

export const sendClientWhatsAppMessage = action({
  args: {
    userId: v.string(),
    to: v.string(),
    message: v.string(),
    messageType: v.union(
      v.literal("transactional"),
      v.literal("support"),
      v.literal("marketing")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !accessToken) {
      return { success: false, error: "WhatsApp not configured" };
    }

    // Validate subscription
    const sub = await ctx.runQuery(internal.whatsapp_dual.getActiveSubscription, {
      userId: args.userId,
    });

    if (!sub) {
      return { success: false, error: "No active WhatsApp subscription" };
    }

    if (sub.messagesUsed >= sub.messagesLimit) {
      return { success: false, error: "Message limit reached. Upgrade your plan." };
    }

    const formattedPhone = formatNigerianPhone(args.to);

    try {
      const response = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: args.message },
          }),
        }
      );

      const data = await response.json();

      if (data.messages && data.messages[0]) {
        // Log usage
        await ctx.runMutation(internal.whatsapp_dual.logUsage, {
          userId: args.userId,
          systemType: sub.systemType,
          messageType: args.messageType,
          direction: "outbound",
          phoneNumber: formattedPhone,
          costNgn: 0,
          includedInTier: true,
        });

        await ctx.runMutation(internal.whatsapp_dual.incrementUsage, {
          subscriptionId: sub._id,
        });

        return { success: true, messageId: data.messages[0].id };
      }

      return {
        success: false,
        error: data.error?.message || "Failed to send message",
      };
    } catch (e: any) {
      return { success: false, error: e.message || "WhatsApp API error" };
    }
  },
});
