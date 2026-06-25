import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// SMS NOTIFICATIONS
// Send SMS via Termii API (popular in Nigeria)
// ═══════════════════════════════════════════════════════════════════

const NALERT_API_URL = "https://api.nalert.com/v1/sms";
const TERMII_API_URL = "https://api.termii.com/api/sms";

// ═══════════════════════════════════════════════════════════════════
// SEND SMS
// ═══════════════════════════════════════════════════════════════════

export const sendSMS = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    channel: v.optional(v.string()), // "dnd", "generic", "whatsapp"
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || "Dutchkem";

    if (!apiKey) {
      return { success: false, error: "Termii API key not configured" };
    }

    // Format phone number
    const formattedPhone = formatNigerianPhone(args.phoneNumber);

    try {
      // Use Termii API with DND channel (as configured)
      const response = await fetch(`${TERMII_API_URL}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          to: formattedPhone,
          from: senderId,
          sms: args.message,
          type: "plain",
          channel: args.channel || "dnd", // DND channel as configured
        }),
      });

      const result = await response.json();

      if (result.code === "200" || result.status === "success") {
        await ctx.runMutation(internal.sms_notifications.logSMS, {
          phoneNumber: formattedPhone,
          message: args.message,
          status: "sent",
          messageId: result.message_id || "unknown",
          provider: "termii",
          channel: args.channel || "dnd",
        });
        return { success: true, messageId: result.message_id, phoneNumber: formattedPhone };
      }
      return { success: false, error: result.message || "Failed to send SMS" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND BULK SMS
// ═══════════════════════════════════════════════════════════════════

export const sendBulkSMS = action({
  args: {
    adminToken: v.string(),
    phoneNumbers: v.array(v.string()),
    message: v.string(),
    channel: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const phone of args.phoneNumbers) {
      const result = await ctx.runAction(internal.sms_notifications.sendSMS, {
        adminToken: args.adminToken,
        phoneNumber: phone,
        message: args.message,
        channel: args.channel,
      });
      results.push({ phone, ...result });
    }

    return {
      success: true,
      total: args.phoneNumbers.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND WELCOME SMS
// ═══════════════════════════════════════════════════════════════════

export const sendWelcomeSMS = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    userName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const message = `Hi ${args.userName}! Welcome to DutchKem Prosuite. Access your dashboard: https://dutchkem-prosuite-app.vercel.app/auth`;

    return await ctx.runAction(internal.sms_notifications.sendSMS, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
      channel: "generic",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND PAYMENT CONFIRMATION SMS
// ═══════════════════════════════════════════════════════════════════

export const sendPaymentSMS = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    userName: v.string(),
    amount: v.number(),
    plan: v.string(),
    reference: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const message = `Hi ${args.userName}! Payment confirmed: ₦${args.amount.toLocaleString()} for ${args.plan}. Ref: ${args.reference}. Dashboard: https://dutchkem-prosuite-app.vercel.app/dashboard`;

    return await ctx.runAction(internal.sms_notifications.sendSMS, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
      channel: "generic",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND APPOINTMENT REMINDER SMS
// ═══════════════════════════════════════════════════════════════════

export const sendAppointmentSMS = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    userName: v.string(),
    appointmentType: v.string(),
    dateTime: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const message = `Hi ${args.userName}! Reminder: ${args.appointmentType} on ${args.dateTime}. Dashboard: https://dutchkem-prosuite-app.vercel.app/dashboard`;

    return await ctx.runAction(internal.sms_notifications.sendSMS, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
      channel: "generic",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function formatNigerianPhone(phone: string): string {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("234")) {
    formatted = "+" + formatted;
  } else if (formatted.startsWith("0")) {
    formatted = "+234" + formatted.substring(1);
  } else if (!formatted.startsWith("+")) {
    formatted = "+234" + formatted;
  }
  return formatted;
}

// ═══════════════════════════════════════════════════════════════════
// LOG SMS
// ═══════════════════════════════════════════════════════════════════

export const logSMS = internalMutation({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
    status: v.string(),
    messageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "sms",
      status: "healthy",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: 1,
      checksFailed: 0,
      issuesFound: 0,
      issuesAutoFixed: 0,
      severity: "info",
      timestamp: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getSMSStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      configured: !!process.env.TERMII_API_KEY,
      senderId: process.env.TERMII_SENDER_ID || "Dutchkem",
      status: process.env.TERMII_API_KEY ? "Ready" : "Needs configuration",
      provider: "Termii",
      features: ["Text Messages", "Bulk SMS", "Welcome Messages", "Payment Alerts", "Appointment Reminders"],
    };
  },
});

export const getSMSLogs = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("mimo_health_logs")
      .filter((q) => q.eq(q.field("component"), "sms"))
      .order("desc")
      .take(args.limit || 20);
  },
});
