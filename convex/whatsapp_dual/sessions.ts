import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PHONE NUMBER HELPERS
// ═══════════════════════════════════════════════════════════════════

export function formatNigerianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}

// ═══════════════════════════════════════════════════════════════════
// BLACKLIST — Phone number blocking
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// AD CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// REVENUE REPORTING
// ═══════════════════════════════════════════════════════════════════

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
