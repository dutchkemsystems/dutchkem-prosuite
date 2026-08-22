import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";
import { BUSINESS_NUMBER, BUSINESS_NAME } from "./seed";

// ═══════════════════════════════════════════════════════════════════
// SYSTEM STATUS — Queries and mutations for system toggle/control
// ═══════════════════════════════════════════════════════════════════

export const getMasterKillSwitchStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const envVal = process.env.WHATSAPP_ENABLED;
    const enabled = envVal === undefined || (envVal.toLowerCase() !== "false" && envVal !== "0");
    return {
      enabled,
      source: envVal === undefined ? "default (enabled)" : `environment: ${envVal}`,
      message: enabled
        ? "WhatsApp is enabled"
        : "WhatsApp is DISABLED via WHATSAPP_ENABLED environment variable",
    };
  },
});

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
