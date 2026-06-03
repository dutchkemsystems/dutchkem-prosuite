import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// CHATBOT LEAD CAPTURE — Automated lead qualification & routing
// ═══════════════════════════════════════════════════════════════════

// Chatbot conversation states
const CONVERSATION_STATES = {
  greeting: {
    message: "Hello! Welcome to Dutchkem Ventures. How can I help you today?",
    options: ["Services", "Pricing", "Support", "Speak to Human"],
  },
  services: {
    message: "We offer AI-powered services across 15 specialized agents. What are you interested in?",
    options: ["Academic Writing", "Business Consulting", "Content Creation", "Video Production", "Other"],
  },
  pricing: {
    message: "Our plans start from ₦2,000/week. Would you like to see our pricing options?",
    options: ["View Plans", "Compare Plans", "Custom Quote"],
  },
  qualification: {
    message: "Great! To help you better, could you tell me about your needs?",
    fields: ["budget", "timeline", "requirements"],
  },
  routing: {
    message: "Let me connect you with the right person. What's your name and email?",
    fields: ["name", "email", "phone"],
  },
  closing: {
    message: "Thank you! Our team will reach out within 24 hours. Is there anything else I can help with?",
    options: ["No, that's all", "Yes, I have more questions"],
  },
};

// Start a chatbot conversation
export const startConversation = mutation({
  args: {
    visitorId: v.string(),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if conversation already exists
    const existing = await ctx.db
      .query("chatbot_conversations")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (existing && existing.status === "active") {
      return existing._id;
    }

    return await ctx.db.insert("chatbot_conversations", {
      visitorId: args.visitorId,
      status: "active",
      state: "greeting",
      messages: [
        {
          role: "bot",
          content: CONVERSATION_STATES.greeting.message,
          timestamp: Date.now(),
        },
      ],
      page: args.page,
      referrer: args.referrer,
      createdAt: Date.now(),
    });
  },
});

// Send a message in conversation
export const sendMessage = mutation({
  args: {
    conversationId: v.id("chatbot_conversations"),
    message: v.string(),
    selectedOption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Add user message
    const userMessage = {
      role: "user" as const,
      content: args.message,
      timestamp: Date.now(),
    };

    // Generate bot response based on current state
    const botResponse = generateResponse(
      conversation.state,
      args.message,
      args.selectedOption
    );

    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, userMessage, botResponse.message],
      state: botResponse.nextState,
      ...(botResponse.leadData ? { leadData: botResponse.leadData } : {}),
    });

    // If conversation is closing, create lead
    if (botResponse.nextState === "closing" && conversation.leadData) {
      await ctx.db.insert("leads", {
        visitorId: conversation.visitorId,
        name: conversation.leadData.name || "Unknown",
        email: conversation.leadData.email || "",
        phone: conversation.leadData.phone,
        source: "chatbot",
        page: conversation.page,
        referrer: conversation.referrer,
        qualification: conversation.leadData,
        status: "new",
        score: calculateLeadScore(conversation.leadData),
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Generate bot response based on state
function generateResponse(
  currentState: string,
  userMessage: string,
  selectedOption?: string
): { message: any; nextState: string; leadData?: any } {
  const messageLower = userMessage.toLowerCase();
  const option = selectedOption || userMessage;

  switch (currentState) {
    case "greeting":
      if (option === "Services" || messageLower.includes("service")) {
        return {
          message: {
            role: "bot",
            content: CONVERSATION_STATES.services.message,
            timestamp: Date.now(),
            options: CONVERSATION_STATES.services.options,
          },
          nextState: "services",
        };
      }
      if (option === "Pricing" || messageLower.includes("price")) {
        return {
          message: {
            role: "bot",
            content: CONVERSATION_STATES.pricing.message,
            timestamp: Date.now(),
            options: CONVERSATION_STATES.pricing.options,
          },
          nextState: "pricing",
        };
      }
      if (option === "Support" || messageLower.includes("help")) {
        return {
          message: {
            role: "bot",
            content: "I'd be happy to help! What do you need assistance with?",
            timestamp: Date.now(),
          },
          nextState: "qualification",
        };
      }
      if (option === "Speak to Human" || messageLower.includes("human")) {
        return {
          message: {
            role: "bot",
            content: CONVERSATION_STATES.routing.message,
            timestamp: Date.now(),
          },
          nextState: "routing",
        };
      }
      return {
        message: {
          role: "bot",
          content: "I can help you with services, pricing, or connect you with our team. What would you prefer?",
          timestamp: Date.now(),
          options: CONVERSATION_STATES.greeting.options,
        },
        nextState: "greeting",
      };

    case "services":
      return {
        message: {
          role: "bot",
          content: `Great choice! Our ${option} service is powered by AI experts. To get you the right help, let me ask a few questions.`,
          timestamp: Date.now(),
        },
        nextState: "qualification",
        leadData: { interest: option },
      };

    case "pricing":
      return {
        message: {
          role: "bot",
          content: "Would you like me to connect you with our sales team for a custom quote?",
          timestamp: Date.now(),
          options: ["Yes, connect me", "No, I'll explore more"],
        },
        nextState: "routing",
      };

    case "qualification":
      return {
        message: {
          role: "bot",
          content: "Thanks for sharing! To connect you with the right person, I'll need your contact details.",
          timestamp: Date.now(),
        },
        nextState: "routing",
      };

    case "routing":
      // Extract contact info from message
      const emailMatch = messageLower.match(
        /[\w.-]+@[\w.-]+\.\w+/
      );
      const phoneMatch = messageLower.match(
        /[\d\s-+()]{10,}/
      );

      return {
        message: {
          role: "bot",
          content: CONVERSATION_STATES.closing.message,
          timestamp: Date.now(),
          options: CONVERSATION_STATES.closing.options,
        },
        nextState: "closing",
        leadData: {
          email: emailMatch?.[0],
          phone: phoneMatch?.[0],
          name: userMessage.split(" ")[0],
        },
      };

    case "closing":
      if (option === "No, that's all" || messageLower.includes("no")) {
        return {
          message: {
            role: "bot",
            content: "Thank you for chatting with us! Have a great day! 👋",
            timestamp: Date.now(),
          },
          nextState: "ended",
        };
      }
      return {
        message: {
          role: "bot",
          content: "Sure! What else would you like to know?",
          timestamp: Date.now(),
        },
        nextState: "qualification",
      };

    default:
      return {
        message: {
          role: "bot",
          content: "Thank you for your message. Our team will get back to you soon!",
          timestamp: Date.now(),
        },
        nextState: "ended",
      };
  }
}

// Calculate lead score based on qualification data
function calculateLeadScore(leadData: any): number {
  let score = 50; // Base score

  if (leadData.budget) {
    if (leadData.budget.includes("500k") || leadData.budget.includes("1m")) score += 20;
    else if (leadData.budget.includes("100k")) score += 15;
    else if (leadData.budget.includes("50k")) score += 10;
  }

  if (leadData.timeline) {
    if (leadData.timeline.includes("urgent") || leadData.timeline.includes("asap")) score += 15;
    else if (leadData.timeline.includes("month")) score += 10;
  }

  if (leadData.interest) {
    if (["Business Consulting", "Video Production"].includes(leadData.interest)) score += 10;
  }

  return Math.min(100, score);
}

// Get all conversations (admin)
export const getConversations = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("chatbot_conversations");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status!));
    }

    return await query.order("desc").take(args.limit || 20);
  },
});

// Get conversation details
export const getConversationDetails = query({
  args: { conversationId: v.id("chatbot_conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// Get chatbot stats
export const getChatbotStats = query({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("chatbot_conversations").collect();
    const leads = await ctx.db.query("leads").collect();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const todayConversations = conversations.filter(
      (c) => now - c.createdAt < oneDay
    ).length;

    const weekConversations = conversations.filter(
      (c) => now - c.createdAt < oneWeek
    ).length;

    const conversionRate =
      conversations.length > 0
        ? Math.round(
            (leads.filter((l) => l.source === "chatbot").length /
              conversations.length) *
              100
          )
        : 0;

    return {
      totalConversations: conversations.length,
      todayConversations,
      weekConversations,
      totalLeads: leads.length,
      chatbotLeads: leads.filter((l) => l.source === "chatbot").length,
      conversionRate,
      activeConversations: conversations.filter((c) => c.status === "active")
        .length,
    };
  },
});

// Get available options for current state
export const getStateOptions = query({
  args: { state: v.string() },
  handler: async (_, args) => {
    const stateConfig =
      CONVERSATION_STATES[args.state as keyof typeof CONVERSATION_STATES];
    return stateConfig?.options || [];
  },
});
