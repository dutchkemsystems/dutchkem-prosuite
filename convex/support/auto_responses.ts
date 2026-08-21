import { v } from "convex/values";
import { query } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AUTO-RESPONSE TEMPLATES — Pre-built for common questions
// ═══════════════════════════════════════════════════════════════════
export const AUTO_RESPONSE_TEMPLATES: Array<{
  id: string;
  patterns: string[];
  response: string;
  agentId: string;
  category: string;
}> = [
  // Pricing Questions
  {
    id: "pricing_general",
    patterns: ["how much", "price", "pricing", "cost", "how much does it cost", "what is the price"],
    response: "Great question! 😊 Our services are competitively priced for the Nigerian market. Here's a quick overview:\n\n📝 Academic Writing: From ₦5,000\n💼 Business Plans: From ₦10,000\n✍️ Content Creation: From ₦3,000\n💰 Financial Planning: From ₦4,000\n\nWould you like me to connect you with a specialist who can give you a detailed quote? Just let me know what service you're interested in!",
    agentId: "GENERAL",
    category: "pricing",
  },
  {
    id: "pricing_business",
    patterns: ["business plan price", "business plan cost", "how much for business plan", "business plan pricing"],
    response: "Our Business Plans are comprehensive and investor-ready! 📊\n\n✅ One-Page Business Plan: ₦10,000\n✅ Full Business Plan (20+ pages): ₦50,000\n✅ Financial Model (3-year projections): ₦40,000\n✅ Pitch Deck (10-12 slides): ₦30,000\n✅ Startup Bundle (All 3): ₦95,000\n\nAll plans include market research, SWOT analysis, and 2 revisions. Want me to connect you with our Business Pro agent for a detailed consultation?",
    agentId: "A2",
    category: "pricing",
  },
  // Hours & Availability
  {
    id: "hours",
    patterns: ["what time", "when are you open", "business hours", "working hours", "what time do you open", "what time do you close"],
    response: "We're available Monday - Saturday, 8:00 AM - 10:00 PM WAT (Nigeria time). 🕐\n\nYou can chat with us anytime — our AI agents respond instantly! For urgent matters, our team monitors escalations during business hours.\n\nIs there anything specific I can help you with right now?",
    agentId: "GENERAL",
    category: "hours",
  },
  // Location & Contact
  {
    id: "location",
    patterns: ["where are you", "location", "address", "where is your office", "contact", "phone number", "email"],
    response: "We're based in Lagos, Nigeria! 📍\n\n🏢 Address: 26, Opeki Road, Ipaja, Ayobo, Lagos\n📞 Phone: (+234)-911-339-3525\n📧 Email: support@dutchkemventures.com\n🌐 Web: dutchkemprosuite.com\n\nWe serve clients across Nigeria and beyond. How can I help you today?",
    agentId: "GENERAL",
    category: "contact",
  },
  // Greetings
  {
    id: "greeting",
    patterns: ["hello", "hi", "good morning", "good afternoon", "good evening", "hey", "how are you"],
    response: "Hello! 👋 Welcome to Dutchkem Ventures Prosuite NG+!\n\nI'm here to help you with anything you need — from business planning to academic writing, content creation to financial advice.\n\nWhat can I help you with today? 😊",
    agentId: "GENERAL",
    category: "greeting",
  },
  // Thank You
  {
    id: "thank_you",
    patterns: ["thank you", "thanks", "thank", "appreciate", "grateful"],
    response: "You're very welcome! 🙏 It's my pleasure to help.\n\nIf you have any other questions or need assistance with anything else, I'm always here. Don't hesitate to reach out!\n\nHave a wonderful day! 😊",
    agentId: "GENERAL",
    category: "thanks",
  },
  // Goodbye
  {
    id: "goodbye",
    patterns: ["bye", "goodbye", "see you", "talk later", "have a good day", "take care"],
    response: "Goodbye! 👋 It was great chatting with you. Remember, I'm here whenever you need help with anything — business, academics, content, or anything else.\n\nHave a fantastic day! 🌟",
    agentId: "GENERAL",
    category: "goodbye",
  },
  // Subscription/Package
  {
    id: "subscription_info",
    patterns: ["subscription", "subscribe", "package", "plan", "membership", "premium", "pro plan"],
    response: "We have flexible subscription plans to fit your needs! 💎\n\n📋 Weekly Plans: Starting from ₦2,000/week\n📅 Monthly Plans: Starting from ₦7,000/month\n📆 Quarterly Plans: Starting from ₦18,000\n🎉 Yearly Plans: Best value — save up to 40%!\n\nEach plan includes:\n✅ Access to AI agents\n✅ Priority support\n✅ Regular updates\n✅ Free revisions\n\nWould you like me to help you choose the right plan for your needs?",
    agentId: "GENERAL",
    category: "subscription",
  },
  // Complaint Handling
  {
    id: "complaint",
    patterns: ["complaint", "not working", "broken", "issue", "problem", "error", "bug"],
    response: "I'm sorry to hear you're experiencing an issue. 😔 I want to make sure we resolve this for you right away.\n\nCould you please tell me:\n1. What specifically isn't working?\n2. When did you first notice the issue?\n3. What were you trying to do?\n\nI'll do my best to help, and if needed, I can escalate this to our technical team for immediate attention.",
    agentId: "GENERAL",
    category: "support",
  },
  // Cancellation
  {
    id: "cancellation",
    patterns: ["cancel", "unsubscribe", "stop", "end subscription", "refund"],
    response: "I understand you'd like to discuss your subscription. Let me help you with that.\n\nTo cancel or make changes to your subscription:\n1. Go to your Dashboard → Subscription Manager\n2. You can pause, downgrade, or cancel anytime\n3. Refund requests are processed within 48 hours\n\nIs there anything specific about your subscription I can help with? Sometimes a simple adjustment is all you need! 😊",
    agentId: "GENERAL",
    category: "subscription",
  },
];

// Match message against auto-response templates
export function matchAutoResponse(message: string): { template: typeof AUTO_RESPONSE_TEMPLATES[0] | null; confidence: string } {
  const lower = message.toLowerCase();

  for (const template of AUTO_RESPONSE_TEMPLATES) {
    const matchCount = template.patterns.filter((p) => lower.includes(p)).length;
    if (matchCount >= 1) {
      const confidence = matchCount >= 2 ? "high" : "medium";
      return { template, confidence };
    }
  }

  return { template: null, confidence: "none" };
}

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get auto-response templates
// ═══════════════════════════════════════════════════════════════════
export const getAutoResponseTemplates = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return AUTO_RESPONSE_TEMPLATES.map((t) => ({
      id: t.id,
      patterns: t.patterns,
      response: t.response.substring(0, 100) + "...",
      agentId: t.agentId,
      category: t.category,
    }));
  },
});
