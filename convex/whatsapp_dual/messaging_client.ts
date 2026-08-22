import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { isWhatsAppEnabled, WHATSAPP_API_VERSION } from "./seed";
import { formatNigerianPhone } from "./sessions";

// ═══════════════════════════════════════════════════════════════════
// CLIENT/AGENT/ENTERPRISE MESSAGING — Higher-level send functions
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// AGENT COMMUNICATION — Agents (A1-A15) to Admin Clients
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
      description: `Agent ${args.agentId} to ${args.phoneNumber}`,
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
      description: `Enterprise ${args.enterpriseId} to ${args.phoneNumber}`,
    });

    return { success: true, queued: true, queueId, enterpriseId: args.enterpriseId, systemType: "enterprise", cost };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND CLIENT WHATSAPP MESSAGE (via OpenWA)
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
// SEND CLIENT WHATSAPP MESSAGE (via Meta API)
// ═══════════════════════════════════════════════════════════════════

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
