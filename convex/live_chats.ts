import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * LIVE CHATS - Real-time chat support
 */

/**
 * Get active chats
 */
export const getActiveChats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const chats = await ctx.db.query("support_chats")
      .filter(q => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    return chats.map(chat => ({
      id: chat._id,
      sessionId: chat.sessionId,
      agentType: chat.agentType,
      user_id: chat.userId,
      user_name: chat.userId ? "User" : "Anonymous",
      last_message: chat.messages[chat.messages.length - 1]?.content || "",
      last_message_time: chat.lastMessageAt,
      unread_count: chat.messages.filter(m => m.role === "user").length,
      status: chat.status,
      created_at: chat.createdAt,
    }));
  },
});

/**
 * Get chat history
 */
export const getChatHistory = query({
  args: { chatId: v.id("support_chats") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return [];

    return chat.messages.map(msg => ({
      id: `${msg.timestamp}_${msg.role}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      confidence: msg.confidence,
    }));
  },
});

/**
 * Send reply from admin
 */
export const sendReply = mutation({
  args: {
    chatId: v.id("support_chats"),
    message: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");

    const newMessage = {
      role: "assistant" as const,
      content: args.message,
      timestamp: Date.now(),
    };

    await ctx.db.patch(args.chatId, {
      messages: [...chat.messages, newMessage],
      lastMessageAt: Date.now(),
    });

    return { success: true, message: "Reply sent" };
  },
});

/**
 * Resolve chat
 */
export const resolveChat = mutation({
  args: { chatId: v.id("support_chats") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      status: "resolved",
    });

    return { success: true, message: "Chat resolved" };
  },
});

/**
 * Assign chat to agent
 */
export const assignToAgent = mutation({
  args: {
    chatId: v.id("support_chats"),
    agentId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      escalatedTo: args.agentId,
      escalatedAt: Date.now(),
    });

    return { success: true, message: `Chat assigned to ${args.agentId}` };
  },
});

/**
 * Get chat statistics
 */
export const getChatStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const chats = await ctx.db.query("support_chats").collect();
    
    const active = chats.filter(c => c.status === "active").length;
    const escalated = chats.filter(c => c.status === "escalated").length;
    const resolved = chats.filter(c => c.status === "resolved").length;
    const total = chats.length;

    return {
      active,
      escalated,
      resolved,
      total,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  },
});
