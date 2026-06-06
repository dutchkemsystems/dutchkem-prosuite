import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Feature 5: 1-Click Communication Hub

export const sendSms = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check for Termii API key from environment
    const termiiKey = process.env.TERMII_API_KEY;
    
    if (!termiiKey || termiiKey === "your_termii_key") {
      // Demo mode - just log
      await ctx.db.insert("communication_logs", {
        userId: args.userId ?? undefined as any,
        type: "sms",
        direction: "outbound",
        recipient: args.to,
        content: args.message,
        status: "sent",
        createdAt: Date.now(),
      });
      return { success: true, messageId: `demo_${Date.now()}`, error: undefined };
    }

    try {
      const response = await fetch("https://v3.api.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: termiiKey,
          to: args.to,
          from: "N-Alert",
          sms: args.message,
          type: "plain",
          channel: "generic",
        }),
      });

      const data = await response.json();
      
      await ctx.db.insert("communication_logs", {
        userId: args.userId ?? undefined as any,
        type: "sms",
        direction: "outbound",
        recipient: args.to,
        content: args.message,
        status: data.status === "success" ? "sent" : "failed",
        externalId: data.message_id,
        createdAt: Date.now(),
      });

      return { 
        success: data.status === "success", 
        messageId: data.message_id,
        error: data.status !== "success" ? data.message : undefined,
      };
    } catch (error: any) {
      return { success: false, messageId: undefined, error: error.message };
    }
  },
});

export const sendWhatsApp = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // WhatsApp Business API integration would go here
    // For now, log as pending
    await ctx.db.insert("communication_logs", {
      userId: args.userId ?? undefined as any,
      type: "whatsapp",
      direction: "outbound",
      recipient: args.to,
      content: args.message,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, messageId: `wa_${Date.now()}`, error: undefined };
  },
});

export const initiateCall = mutation({
  args: {
    to: v.string(),
    userId: v.optional(v.id("users")),
    adminId: v.optional(v.id("users")),
  },
  returns: v.object({
    success: v.boolean(),
    callId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Twilio integration would go here
    // For now, log as pending
    await ctx.db.insert("communication_logs", {
      userId: args.userId ?? undefined as any,
      adminId: args.adminId ?? undefined as any,
      type: "call",
      direction: "outbound",
      recipient: args.to,
      content: "Outbound call initiated",
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, callId: `call_${Date.now()}`, error: undefined };
  },
});

export const getCommunicationLogs = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("communication_logs"),
    type: v.union(v.literal("call"), v.literal("whatsapp"), v.literal("sms"), v.literal("email")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    recipient: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("failed")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("communication_logs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const getAllCommunicationLogs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("communication_logs"),
    userId: v.optional(v.id("users")),
    type: v.string(),
    direction: v.string(),
    recipient: v.string(),
    content: v.string(),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("communication_logs")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

export const updateLogStatus = mutation({
  args: {
    logId: v.id("communication_logs"),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("delivered"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("communication_logs", args.logId, { status: args.status });
    return null;
  },
});

export const getCommunicationStats = query({
  args: {},
  returns: v.object({
    totalSms: v.number(),
    totalCalls: v.number(),
    totalWhatsApp: v.number(),
    pending: v.number(),
    sent: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, _args) => {
    const logs = await ctx.db.query("communication_logs").collect();
    return {
      totalSms: logs.filter(l => l.type === "sms").length,
      totalCalls: logs.filter(l => l.type === "call").length,
      totalWhatsApp: logs.filter(l => l.type === "whatsapp").length,
      pending: logs.filter(l => l.status === "pending").length,
      sent: logs.filter(l => l.status === "sent" || l.status === "delivered").length,
      failed: logs.filter(l => l.status === "failed").length,
    };
  },
});