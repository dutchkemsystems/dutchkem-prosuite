import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Feature 1: AI Chatbot for Sales & Support

export const createChatSession = mutation({
  args: {
    userId: v.optional(v.id("users")),
    agentType: v.union(v.literal("sales"), v.literal("support")),
  },
  returns: v.object({
    sessionId: v.string(),
    chatId: v.id("support_chats"),
  }),
  handler: async (ctx, args) => {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const chatId = await ctx.db.insert("support_chats", {
      userId: args.userId,
      sessionId,
      agentType: args.agentType,
      messages: [{
        role: "system",
        content: args.agentType === "sales" 
          ? "You are A2 Business Pro, a sales AI assistant for Dutchkem Ventures. Help users find the right AI agent service for their needs. Be helpful, concise, and professional. If confidence is below 70%, escalate to human support."
          : "You are A13 Support Agent, a customer support AI for Dutchkem Ventures. Help users with their existing services and issues. Be helpful and empathetic. If confidence is below 70%, escalate to human support.",
        timestamp: Date.now(),
      }],
      status: "active",
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });
    return { sessionId, chatId };
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id("support_chats"),
    content: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    response: v.string(),
    confidence: v.number(),
    shouldEscalate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");

    // Add user message
    const userMessage = {
      role: "user" as const,
      content: args.content,
      timestamp: Date.now(),
    };

    // Get AI response based on agent type
    // For now, generate a simple response. In production, this would call the NVIDIA agents.
    const responseText = chat.agentType === "sales"
      ? `Thanks for your interest in our services! I'd be happy to help you find the right solution. Could you tell me more about what you're looking for?`
      : `Hello! I'm here to help with any support issues you're experiencing. Let me know what you need assistance with.`;
    
    const confidence = 85;
    const shouldEscalate = confidence < 70;

    // Add assistant response
    const assistantMessage = {
      role: "assistant" as const,
      content: responseText,
      timestamp: Date.now(),
      confidence,
    };

    // Update chat
    const updates: any = {
      messages: [...chat.messages, userMessage, assistantMessage],
      lastMessageAt: Date.now(),
    };

    if (shouldEscalate && chat.status !== "escalated") {
      updates.status = "escalated";
      updates.escalatedAt = Date.now();
      updates.escalatedTo = "human_support";
    }

    await ctx.db.patch(args.chatId, updates);

    // Log to audit if escalated
    if (shouldEscalate && chat.status !== "escalated") {
      await ctx.db.insert("audit_logs", {
        userId: args.userId,
        action: "CHAT_ESCALATED",
        details: `Chat ${chat.sessionId} escalated to human. Confidence: ${confidence}`,
        ip: "system",
        userAgent: "ai_system",
        createdAt: Date.now(),
      });
    }

    return {
      response: response.message,
      confidence,
      shouldEscalate,
    };
  },
});

export const getChatHistory = query({
  args: { chatId: v.id("support_chats") },
  returns: v.object({
    chat: v.object({
      _id: v.id("support_chats"),
      sessionId: v.string(),
      agentType: v.string(),
      status: v.string(),
      messages: v.array(v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
        confidence: v.optional(v.number()),
      })),
    }),
  }),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");
    return { chat };
  },
});

export const getUserChats = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("support_chats"),
    sessionId: v.string(),
    agentType: v.string(),
    status: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("support_chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

export const resolveChat = mutation({
  args: { chatId: v.id("support_chats") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { status: "resolved" });
    return null;
  },
});

export const getActiveChats = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("support_chats"),
    sessionId: v.string(),
    agentType: v.string(),
    status: v.string(),
    lastMessageAt: v.number(),
  })),
  handler: async (ctx, _args) => {
    return await ctx.db
      .query("support_chats")
      .withIndex("by_status", (q) => q.eq("status", "escalated"))
      .order("desc")
      .take(50);
  },
});