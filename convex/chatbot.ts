import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    // In production, this would call the AI agent with the conversation history
    let responseText: string;
    let confidence: number;
    
    if (chat.agentType === "sales") {
      // Simple keyword-based routing for sales
      const lowerContent = args.content.toLowerCase();
      if (lowerContent.includes("price") || lowerContent.includes("cost") || lowerContent.includes("plan")) {
        responseText = "We offer flexible plans starting from ₦2,000/week. Our Standard plan includes access to all AI agents, while the KDP plan is tailored for authors. Would you like me to walk you through the options?";
        confidence = 90;
      } else if (lowerContent.includes("agent") || lowerContent.includes("service")) {
        responseText = "We have 15+ specialized AI agents including Academic Writer, Business Consultant, Career Coach, Content Writer, and more. Each is trained for specific tasks. What kind of help are you looking for?";
        confidence = 88;
      } else if (lowerContent.includes("help") || lowerContent.includes("what")) {
        responseText = "I'm here to help you find the right AI solution! We offer writing, consulting, coaching, and many other professional services powered by AI. What's your main need?";
        confidence = 85;
      } else {
        responseText = "Thanks for your interest! I'd be happy to help you find the right solution. Could you tell me more about what you're looking for?";
        confidence = 75;
      }
    } else {
      const lowerContent = args.content.toLowerCase();
      if (lowerContent.includes("refund") || lowerContent.includes("money back")) {
        responseText = "We offer a 14-day refund policy for all subscriptions. If you're not satisfied, I can help you initiate a refund request. Would you like to proceed?";
        confidence = 92;
      } else if (lowerContent.includes("error") || lowerContent.includes("issue") || lowerContent.includes("problem")) {
        responseText = "I'm sorry you're experiencing an issue. Could you describe the problem in more detail? I'll do my best to help resolve it or escalate to our technical team if needed.";
        confidence = 85;
      } else if (lowerContent.includes("cancel")) {
        responseText = "I can help you cancel your subscription. Just to let you know, you'll retain access until the end of your current billing period. Would you like me to proceed?";
        confidence = 88;
      } else {
        responseText = "Hello! I'm here to help with any support issues you're experiencing. Let me know what you need assistance with.";
        confidence = 80;
      }
    }
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
      response: responseText,
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