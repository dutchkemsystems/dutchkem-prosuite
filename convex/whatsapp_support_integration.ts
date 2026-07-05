import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const routeWhatsAppToSupport = mutation({
  args: {
    from: v.string(),
    message: v.string(),
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
  },
  returns: v.object({
    routed: v.boolean(),
    interactionId: v.optional(v.string()),
    response: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Log the inbound WhatsApp message as a support interaction
    const interactionId = await ctx.db.insert("support_interactions", {
      userId: args.from,
      message: args.message,
      response: "",
      agentId: "whatsapp",
      agentName: "WhatsApp Support",
      confidence: "high",
      routed: false,
      sessionId: `whatsapp_${args.sessionType}_${Date.now()}`,
      createdAt: now,
    });
    
    // Check if there's an existing conversation thread
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", "whatsapp"))
      .order("desc")
      .take(5);
    
    const existingThread = recentInteractions.find(
      (i) => i.userId === args.from && i.createdAt > now - 24 * 60 * 60 * 1000
    );
    
    // Create escalation if this is a new conversation or follow-up
    if (!existingThread) {
      await ctx.db.insert("support_escalations", {
        userId: args.from,
        interactionId: interactionId,
        status: "pending",
        reason: `WhatsApp support request from ${args.from}`,
        agentId: "whatsapp",
        createdAt: now,
      });
    }
    
    return {
      routed: true,
      interactionId: interactionId,
    };
  },
});

export const getWhatsAppSupportMessages = query({
  args: {
    from: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", "whatsapp"));
    
    if (args.from) {
      q = q.filter((filter) => filter.eq(filter.field("userId"), args.from));
    }
    
    return await q
      .order("desc")
      .take(args.limit || 50);
  },
});

export const sendWhatsAppSupportReply = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    interactionId: v.id("support_interactions"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Update the interaction with the response
    await ctx.db.patch(args.interactionId, {
      response: args.message,
    });
    
    // Queue the outbound message via OpenWA
    await ctx.db.insert("whatsapp_message_queue", {
      sessionType: "admin",
      to: args.to,
      messageType: "text",
      content: args.message,
      status: "pending",
      retryCount: 0,
      createdAt: now,
    });
    
    return { success: true, queued: true };
  },
});
