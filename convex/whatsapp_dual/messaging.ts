import { v } from "convex/values";
import { query, action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { isWhatsAppEnabled, WHATSAPP_API_VERSION } from "./seed";
import { formatNigerianPhone } from "./sessions";

// ═══════════════════════════════════════════════════════════════════
// MESSAGING — Usage logging, revenue, and base send function
// ═══════════════════════════════════════════════════════════════════

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
  handler: async (ctx, args): Promise<any> => {
    // Master kill switch check
    if (!isWhatsAppEnabled()) {
      return { success: false, error: "WhatsApp is disabled via environment variable (WHATSAPP_ENABLED=false)" };
    }

    // Check if system is enabled
    const status: any = await ctx.runQuery(internal.whatsapp_dual.getSystemStatus, {
      systemType: args.systemType,
    });
    if (!status.status?.isEnabled) {
      return { success: false, error: `WhatsApp ${args.systemType} system is disabled` };
    }

    // Check blacklist
    const blocked: any = await ctx.runQuery(internal.whatsapp_dual.isNumberBlocked, {
      phoneNumber: args.phoneNumber,
    });
    if (blocked) {
      return { success: false, error: "Number is blacklisted" };
    }

    // Health check: Verify OpenWA server is connected
    const health: any = await ctx.runQuery(internal.whatsapp_openwa.checkServerHealth, {
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
    const result: any = await ctx.runAction(
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
