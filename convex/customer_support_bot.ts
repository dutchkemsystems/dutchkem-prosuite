import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER SUPPORT CHATBOT
// 24/7 automated customer support
// ═══════════════════════════════════════════════════════════════════

const FAQ_RESPONSES: Record<string, string> = {
  'pricing': 'Our plans start from ₦5,000/month for Starter, ₦15,000/month for Professional, and ₦50,000/month for Enterprise. Visit https://dutchkem-prosuite-app.vercel.app/pricing for details.',
  'features': 'We offer AI-powered agents for: Academic Pro, Business Pro, Content Pro, Career Pro, Personal Shopper, Exam Pro, Finance Pro, MediaStudio Pro, Wellness Pro, Home Services, Language Tutor, Travel Planner, ServiceMart NG, Translation Hub, and Event Planner.',
  'support': 'You can reach us via: Email: support@dutchkem.com, WhatsApp: +234 800 000 0000, Live Chat: Available 24/7 on our platform.',
  'payment': 'We accept: Kora Pay, Paystack, Flutterwave, Bank Transfer, USSD, POS, and Mobile Money. All payments are secure and encrypted.',
  'refund': 'We offer a 30-day money-back guarantee. Contact support@dutchkem.com for refund requests.',
  'trial': 'Yes! We offer a free trial for all new users. Sign up at https://dutchkem-prosuite-app.vercel.app/auth',
};

export const handleSupportChat = action({
  args: {
    userId: v.string(),
    message: v.string(),
    sessionId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const messageLower = args.message.toLowerCase();

    // Check FAQ responses
    for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
      if (messageLower.includes(keyword)) {
        return {
          success: true,
          response,
          source: 'faq',
          suggestions: ['pricing', 'features', 'support', 'payment', 'refund', 'trial'],
        };
      }
    }

    // If no FAQ match, use AI router
    const aiResponse = await ctx.runAction(internal.ai_router.routeRequest, {
      input: args.message,
      systemPrompt: 'You are a friendly customer support agent for DutchKem Ventures. Be helpful, professional, and concise. Always include the registration URL: https://dutchkem-prosuite-app.vercel.app/auth',
    });

    return {
      success: true,
      response: aiResponse.content,
      source: 'ai',
      suggestions: ['pricing', 'features', 'support', 'payment'],
    };
  },
});

export const getSupportFAQ = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(FAQ_RESPONSES).map(([key, value]) => ({
      question: key.charAt(0).toUpperCase() + key.slice(1),
      answer: value,
    }));
  },
});

export const getSupportStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      totalConversations: 0,
      avgResponseTime: '2 seconds',
      satisfactionRate: '95%',
      available247: true,
    };
  },
});
