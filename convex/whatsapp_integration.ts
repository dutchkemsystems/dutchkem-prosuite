import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// WHATSAPP INTEGRATION
// Complete WhatsApp Business API integration for Nigerian market
// ═══════════════════════════════════════════════════════════════════

const WHATSAPP_API_VERSION = 'v18.0';

// ═══════════════════════════════════════════════════════════════════
// SEND TEXT MESSAGE
// ═══════════════════════════════════════════════════════════════════

export const sendWhatsAppMessage = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
    mediaUrl: v.optional(v.string()),
    templateName: v.optional(v.string()),
    templateParams: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const formattedPhone = formatNigerianPhone(args.phoneNumber);
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !accessToken) {
      return { success: false, error: "WhatsApp not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to environment." };
    }

    try {
      let messageBody: any;

      if (args.templateName && args.templateParams) {
        // Template message
        messageBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: args.templateName,
            language: { code: 'en' },
            components: [{
              type: 'body',
              parameters: args.templateParams.map(param => ({ type: 'text', text: param })),
            }],
          },
        };
      } else if (args.mediaUrl) {
        // Media message
        messageBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'image',
          image: { link: args.mediaUrl },
          caption: args.message,
        };
      } else {
        // Text message
        messageBody = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: args.message },
        };
      }

      const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      });

      const result = await response.json();

      if (result.messages) {
        // Log successful message
        await ctx.runMutation(internal.whatsapp_integration.logMessage, {
          phoneNumber: formattedPhone,
          messageType: args.templateName ? 'template' : args.mediaUrl ? 'media' : 'text',
          status: 'sent',
          messageId: result.messages[0].id,
        });

        return { success: true, messageId: result.messages[0].id, phoneNumber: formattedPhone };
      }
      return { success: false, error: result.error?.message || 'Failed to send message' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND BULK MESSAGES
// ═══════════════════════════════════════════════════════════════════

export const sendWhatsAppBulk = action({
  args: {
    adminToken: v.string(),
    phoneNumbers: v.array(v.string()),
    message: v.string(),
    mediaUrl: v.optional(v.string()),
    templateName: v.optional(v.string()),
    templateParams: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const phone of args.phoneNumbers) {
      const result = await ctx.runAction(internal.whatsapp_integration.sendWhatsAppMessage, {
        adminToken: args.adminToken,
        phoneNumber: phone,
        message: args.message,
        mediaUrl: args.mediaUrl,
        templateName: args.templateName,
        templateParams: args.templateParams,
      });
      results.push({ phone, ...result });
    }

    return {
      success: true,
      total: args.phoneNumbers.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND WELCOME MESSAGE
// ═══════════════════════════════════════════════════════════════════

export const sendWelcomeMessage = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    userName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const message = `🎉 Welcome to DutchKem Prosuite!

Hi ${args.userName}, welcome to our AI-powered platform!

You now have access to:
✅ 15 AI Agents
✅ Video Production
✅ Automated Marketing
✅ And much more!

Get started: https://dutchkem-prosuite-app.vercel.app/auth

Need help? Reply to this message!`;

    return await ctx.runAction(internal.whatsapp_integration.sendWhatsAppMessage, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND PAYMENT CONFIRMATION
// ═══════════════════════════════════════════════════════════════════

export const sendPaymentConfirmation = action({
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

    const message = `💳 Payment Confirmed!

Hi ${args.userName},

Amount: ₦${args.amount.toLocaleString()}
Plan: ${args.plan}
Reference: ${args.reference}
Date: ${new Date().toLocaleDateString('en-NG')}

Thank you for your payment!

Your subscription is now active. Access your dashboard:
https://dutchkem-prosuite-app.vercel.app/dashboard`;

    return await ctx.runAction(internal.whatsapp_integration.sendWhatsAppMessage, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND SERVICE UPDATE
// ═══════════════════════════════════════════════════════════════════

export const sendServiceUpdate = action({
  args: {
    adminToken: v.string(),
    phoneNumbers: v.array(v.string()),
    title: v.string(),
    description: v.string(),
    features: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const featuresList = args.features.map(f => `✅ ${f}`).join('\n');
    const message = `📢 ${args.title}

${args.description}

New features:
${featuresList}

Log in to try it now:
https://dutchkem-prosuite-app.vercel.app/auth`;

    return await ctx.runAction(internal.whatsapp_integration.sendWhatsAppBulk, {
      adminToken: args.adminToken,
      phoneNumbers: args.phoneNumbers,
      message,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND APPOINTMENT REMINDER
// ═══════════════════════════════════════════════════════════════════

export const sendAppointmentReminder = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    userName: v.string(),
    appointmentType: v.string(),
    dateTime: v.string(),
    location: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const locationText = args.location ? `\n📍 Location: ${args.location}` : '';
    const message = `📅 Appointment Reminder

Hi ${args.userName},

You have an upcoming appointment:

Type: ${args.appointmentType}
Date: ${args.dateTime}${locationText}

Please be on time. If you need to reschedule, contact us.

Dashboard: https://dutchkem-prosuite-app.vercel.app/dashboard`;

    return await ctx.runAction(internal.whatsapp_integration.sendWhatsAppMessage, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND ORDER UPDATE
// ═══════════════════════════════════════════════════════════════════

export const sendOrderUpdate = action({
  args: {
    adminToken: v.string(),
    phoneNumber: v.string(),
    orderId: v.string(),
    status: v.string(),
    estimatedDelivery: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const deliveryText = args.estimatedDelivery ? `\n📦 Estimated Delivery: ${args.estimatedDelivery}` : '';
    const message = `📦 Order Update

Order ID: ${args.orderId}
Status: ${args.status}${deliveryText}

Track your order:
https://dutchkem-prosuite-app.vercel.app/dashboard`;

    return await ctx.runAction(internal.whatsapp_integration.sendWhatsAppMessage, {
      adminToken: args.adminToken,
      phoneNumber: args.phoneNumber,
      message,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function formatNigerianPhone(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (formatted.startsWith('234')) {
    formatted = '+' + formatted;
  } else if (formatted.startsWith('0')) {
    formatted = '+234' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+234' + formatted;
  }
  return formatted;
}

// ═══════════════════════════════════════════════════════════════════
// LOG MESSAGES
// ═══════════════════════════════════════════════════════════════════

export const logMessage = internalMutation({
  args: {
    phoneNumber: v.string(),
    messageType: v.string(),
    status: v.string(),
    messageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "whatsapp",
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

export const getWhatsAppStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      configured: !!process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Not configured',
      status: process.env.WHATSAPP_ACCESS_TOKEN ? 'Ready' : 'Needs configuration',
      features: [
        'Text Messages',
        'Media Messages',
        'Template Messages',
        'Bulk Messaging',
        'Welcome Messages',
        'Payment Confirmations',
        'Service Updates',
        'Appointment Reminders',
        'Order Updates',
      ],
    };
  },
});

export const getWhatsAppLogs = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("mimo_health_logs")
      .filter((q) => q.eq(q.field("component"), "whatsapp"))
      .order("desc")
      .take(args.limit || 20);
  },
});
