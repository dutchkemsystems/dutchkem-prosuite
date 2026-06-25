import { v } from "convex/values";
import { action, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AGENT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════
const AGENT_CONFIGS: Record<string, {
  name: string;
  icon: string;
  field: string;
  specialty: string;
  primaryModel: string;
  fallbackModel: string;
}> = {
  A1: { name: "Academic Pro", icon: "🎓", field: "Academics", specialty: "academic writing, thesis, research, methodology, citations", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A2: { name: "Business Pro", icon: "💼", field: "Business", specialty: "business planning, strategy, finance, entrepreneurship", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A3: { name: "Content Pro", icon: "✍️", field: "Content", specialty: "content creation, social media, marketing, copywriting", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A4: { name: "Career Pro", icon: "📄", field: "Career", specialty: "CV writing, interview prep, job search, career advice", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A5: { name: "Personal Shopper", icon: "🛍️", field: "Shopping", specialty: "shopping advice, deals, product recommendations", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
  A6: { name: "Exam Pro", icon: "📝", field: "Education", specialty: "exam preparation, practice tests, study strategies", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A7: { name: "Finance Pro", icon: "💰", field: "Finance", specialty: "budgeting, investing, savings, financial planning", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A8: { name: "MediaStudio Pro", icon: "🎬", field: "Media", specialty: "video production, animation, editing, dubbing", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
  A9: { name: "Health Pro", icon: "🏥", field: "Health", specialty: "wellness, fitness, nutrition, mental health", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A10: { name: "Home Services Pro", icon: "🧹", field: "Home", specialty: "cleaning, organization, home maintenance", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
  A11: { name: "Language Tutor", icon: "🗣️", field: "Language", specialty: "language learning, translation, pronunciation", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A12: { name: "Travel Planner", icon: "✈️", field: "Travel", specialty: "travel planning, itineraries, destinations", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
  A13: { name: "ServiceMart NG", icon: "🚀", field: "Education/Career", specialty: "JAMB, WAEC, NECO, CV, interview, career guidance", primaryModel: "meta/llama-3.3-70b-instruct", fallbackModel: "meta/llama-3.1-70b-instruct" },
  A14: { name: "Translation Hub", icon: "📝", field: "Translation", specialty: "translation, transcription, subtitling, localization", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
  A15: { name: "Event Planner", icon: "🎉", field: "Events", specialty: "event planning, weddings, birthdays, corporate events", primaryModel: "meta/llama-3.1-70b-instruct", fallbackModel: "meta/llama-3-8b-instruct" },
};

// ═══════════════════════════════════════════════════════════════════
// AGENT SERVICES, BUNDLES, SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════
const AGENT_SERVICES: Record<string, string> = {
  A1: `✅ Thesis/Dissertation (₦15,000 - ₦150,000)\n✅ Research Paper (₦10,000 - ₦50,000)\n✅ Literature Review (₦8,000 - ₦30,000)\n✅ Methodology (₦7,000 - ₦25,000)\n✅ Data Analysis (SPSS/Python/R) (₦10,000 - ₦40,000)\n✅ Proofreading/Editing (₦5,000 - ₦20,000)\n✅ Journal Article (₦20,000 - ₦60,000)`,
  A2: `✅ Business Plan (₦50,000)\n✅ Feasibility Study (₦35,000)\n✅ Financial Model (₦40,000)\n✅ Pitch Deck (₦30,000)\n✅ Market Research (₦25,000)\n✅ SWOT Analysis (₦10,000)\n✅ Go-to-Market Plan (₦20,000)`,
  A3: `✅ Blog Post (₦5,000)\n✅ Social Media Captions (₦3,000)\n✅ Email Newsletter (₦4,000)\n✅ Sales Copy (₦7,000)\n✅ Brand Story (₦6,000)\n✅ Press Release (₦10,000)\n✅ Content Calendar (₦8,000)`,
  A4: `✅ Professional CV (₦12,000)\n✅ Fresh Graduate CV (₦8,000)\n✅ Cover Letter (₦5,000)\n✅ LinkedIn Optimization (₦8,000)\n✅ Interview Coaching (₦10,000)\n✅ Job Search Strategy (₦7,000)`,
  A5: `✅ Price Comparison (unlimited)\n✅ Best Deal Finder (unlimited)\n✅ Product Recommendations (200/month)\n✅ Gift Idea Generator (100/month)\n✅ Budget Shopping Lists (50/month)`,
  A6: `✅ PMP Prep (₦20,000)\n✅ AWS Certification (₦18,000)\n✅ GRE Prep (₦15,000)\n✅ GMAT Prep (₦18,000)\n✅ CCNA/Networking (₦20,000)\n✅ CompTIA Security+ (₦18,000)`,
  A7: `✅ Personal Budget (₦5,000)\n✅ Debt Repayment Plan (₦7,000)\n✅ Investment Plan (₦10,000)\n✅ Savings Challenge (₦4,000)\n✅ Emergency Fund Plan (₦5,000)\n✅ Retirement Planning (₦12,000)`,
  A8: `✅ 2D Animation (₦25,000 - ₦100,000/min)\n✅ 3D Animation (₦50,000 - ₦200,000/min)\n✅ Video Editing (₦15,000 - ₦250,000)\n✅ Transcription (₦300-500/min)\n✅ Voice Cloning (₦50,000 - ₦300,000)`,
  A9: `✅ Meal Plan (₦5,000)\n✅ Workout Plan (₦5,000)\n✅ Weight Loss Plan (₦7,000)\n✅ Sleep Optimization (₦4,000)\n✅ Stress Management (₦5,000)\n✅ Wellness Check (₦5,000)`,
  A10: `✅ Cleaning Schedules (daily/weekly/monthly)\n✅ Decluttering Guides (room-by-room)\n✅ Maintenance Reminders (20/month)\n✅ Home Organization Plans (4/month)\n✅ Deep Cleaning Checklists (seasonal)`,
  A11: `✅ Translation (500 words) — ₦2,000\n✅ Conversation Practice (30 min) — ₦5,000\n✅ Vocabulary Builder (50 words) — ₦3,000\n✅ Pronunciation Guide (audio) — ₦4,000\n✅ Grammar Lessons (5 lessons) — ₦6,000`,
  A12: `✅ Itinerary Planning (8 trips/month)\n✅ Budget Breakdown (detailed)\n✅ Accommodation Finder (20 options)\n✅ Restaurant Suggestions (40 places)\n✅ Activity Recommendations (40 activities)`,
  A13: `✅ JAMB Prep (₦3,000)\n✅ WAEC Prep (₦2,500)\n✅ NECO Prep (₦2,500)\n✅ CV + Cover Letter (₦12,000)\n✅ Interview Coaching (₦15,000)\n✅ IELTS Prep (₦25,000)`,
  A14: `✅ Text Translation (500 words) — ₦500\n✅ Document Translation (per page) — ₦2,000\n✅ Audio Transcription (per hour) — ₦1,500\n✅ Video Subtitling (10 min) — ₦1,500\n✅ Certified Translation — ₦10,000 - ₦50,000`,
  A15: `✅ Event Checklist (full timeline)\n✅ Budget Planning (tracking)\n✅ Venue Suggestions (20 options)\n✅ Catering Ideas (40 menus)\n✅ Decoration Themes (20 themes)\n✅ Guest List Manager (tracking)`,
};

const AGENT_BUNDLES: Record<string, string> = {
  A1: `🎯 Undergraduate: Thesis + Lit Review + Formatting = ₦25,000\n🎯 Masters: Thesis + Methodology + Data Analysis + Editing = ₦55,000\n🎯 PhD: Dissertation + Systematic Review + Journal Article = ₦200,000`,
  A2: `🎯 Startup: Business Plan + Financial Model + Pitch Deck = ₦95,000\n🎯 Growth: Market Research + Go-to-Market + Pricing = ₦50,000`,
  A3: `🎯 Starter: Blog + Social + Newsletter = ₦10,000\n🎯 Growth: 4 Blogs + Calendar + Weekly Social = ₦25,000`,
  A4: `🎯 Job Seeker: CV + Cover Letter + LinkedIn = ₦22,000\n🎯 Career Starter: CV + LinkedIn + Interview = ₦28,000`,
  A6: `🎯 Lite: 100 Qs + Study guide = ₦12,000\n🎯 Full: All Qs + Cheat sheets + Strategy = ₦30,000`,
  A7: `🎯 Starter: Budget + Savings + Health Check = ₦12,000\n🎯 Investor: Investment + Retirement + Goal = ₦27,000`,
  A9: `🎯 Starter: Meal + Workout + Water = ₦11,000\n🎯 Transformation: Weight Loss + Challenge + Tracker = ₦15,000`,
  A11: `🎯 Starter: Translation + Phrasebook + Vocabulary = ₦8,000\n🎯 Conversation: Practice + Pronunciation + Mistakes = ₦10,000`,
  A13: `🎯 Exam Prep: JAMB + WAEC + NECO = ₦7,500\n🎯 Career Starter: CV + LinkedIn + Interview = ₦15,000`,
};

const AGENT_SUBSCRIPTIONS: Record<string, string> = {
  A1: `📅 Weekly: ₦2,000/week\n📅 Monthly: ₦7,000/month ⭐ Most Popular\n📅 Quarterly: ₦35,000\n📅 Yearly: ₦120,000`,
  A2: `📅 Monthly: ₦12,000/month ⭐ Most Popular\n📅 Quarterly: ₦40,000\n📅 Yearly: ₦140,000`,
  A3: `📅 Weekly: ₦3,500/week\n📅 Monthly: ₦12,000/month ⭐ Most Popular\n📅 Quarterly: ₦30,000\n📅 Yearly: ₦100,000`,
  A4: `📅 Weekly: ₦2,000/week\n📅 Monthly: ₦7,000/month ⭐ Most Popular\n📅 Quarterly: ₦28,000\n📅 Yearly: ₦90,000`,
  A5: `📅 Weekly: ₦2,000/week\n📅 Monthly: ₦7,000/month ⭐ Most Popular\n📅 Yearly: ₦70,000`,
  A6: `📅 Monthly: ₦10,000/month\n📅 Yearly: ₦80,000`,
  A7: `📅 Monthly: ₦8,000/month\n📅 Yearly: ₦70,000`,
  A8: `📅 Monthly: ₦20,000/month\n📅 Quarterly: ₦55,000\n📅 Yearly: ₦200,000`,
  A9: `📅 Monthly: ₦7,000/month\n📅 Yearly: ₦60,000`,
  A10: `📅 Monthly: ₦10,000/month\n📅 Quarterly: ₦25,000\n📅 Yearly: ₦90,000`,
  A11: `📅 Monthly: ₦8,000/month\n📅 Yearly: ₦80,000`,
  A12: `📅 Monthly: ₦9,000/month\n📅 Quarterly: ₦25,000\n📅 Yearly: ₦90,000`,
  A13: `📅 Quarterly: ₦18,000\n📅 Yearly: ₦60,000`,
  A14: `📅 Monthly: ₦15,000\n📅 Yearly: ₦150,000`,
  A15: `📅 Monthly: ₦12,000\n📅 Quarterly: ₦35,000\n📅 Yearly: ₦130,000`,
};

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════
function buildSystemPrompt(agentId: string): string {
  const config = AGENT_CONFIGS[agentId];
  const services = AGENT_SERVICES[agentId] || "Various services available.";
  const bundles = AGENT_BUNDLES[agentId] || "Various bundles available.";
  const subscriptions = AGENT_SUBSCRIPTIONS[agentId] || "Various subscription plans available.";

  return `You are ${config.name} ${config.icon}, a friendly, knowledgeable customer support representative for Dutchkem Ventures Prosuite NG+.

## YOUR ROLE
- You are an expert in ${config.field} with deep knowledge of ${config.specialty}
- You help clients understand how ${config.name} can solve their problems
- You answer questions honestly and transparently
- You build trust through expertise and empathy
- You NEVER pressure clients to subscribe

## YOUR PERSONALITY
- Warm, approachable, and professional
- Patient and understanding
- Uses emojis appropriately (😊, 🙏, 💪, 🎉)
- Speaks in a human, conversational tone
- Uses Nigerian cultural references where appropriate

## YOUR KNOWLEDGE
You know ALL the services, pricing, bundles, and subscriptions for ${config.name}:

SERVICES:
${services}

BUNDLES:
${bundles}

SUBSCRIPTIONS:
${subscriptions}

## YOUR BEHAVIOR
1. Always greet warmly and introduce yourself
2. Ask clarifying questions to understand the client's needs
3. Provide helpful, actionable advice
4. Share relevant examples from your experience
5. Offer free value before suggesting subscription
6. Be honest about what you can and cannot do
7. Never make false promises

## YOUR RESPONSE GUIDELINES
- Keep responses conversational and natural
- Use short paragraphs for readability
- Use emojis sparingly but effectively
- Ask at least one follow-up question per response
- If the client seems interested, gently mention subscription options
- Always end with a warm, inviting tone

Remember: You are here to help, not to sell. Build trust first, and the subscription will follow naturally.`;
}

// ═══════════════════════════════════════════════════════════════════
// NVIDIA API CALLER
// ═══════════════════════════════════════════════════════════════════
async function callNVIDIA(
  model: string,
  systemPrompt: string,
  userMessage: string,
  context: string = ""
): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA API key not configured");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: "assistant", content: `Previous conversation:\n${context}` });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all agent configs
// ═══════════════════════════════════════════════════════════════════
export const getAgentConfigs = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.entries(AGENT_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      icon: config.icon,
      field: config.field,
      specialty: config.specialty,
      model: config.primaryModel,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent support info
// ═══════════════════════════════════════════════════════════════════
export const getAgentSupportInfo = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const config = AGENT_CONFIGS[args.agentId];
    if (!config) return { error: "Agent not found" };

    return {
      agentId: args.agentId,
      name: config.name,
      icon: config.icon,
      field: config.field,
      specialty: config.specialty,
      model: config.primaryModel,
      services: AGENT_SERVICES[args.agentId] || "Various services available.",
      bundles: AGENT_BUNDLES[args.agentId] || "Various bundles available.",
      subscriptions: AGENT_SUBSCRIPTIONS[args.agentId] || "Various subscription plans available.",
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Generate support response
// ═══════════════════════════════════════════════════════════════════
export const generateSupportResponse = action({
  args: {
    agentId: v.string(),
    message: v.string(),
    conversationHistory: v.optional(v.array(v.object({
      role: v.string(),
      content: v.string(),
    }))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const config = AGENT_CONFIGS[args.agentId];
    if (!config) {
      return { success: false, error: "Agent not found" };
    }

    const systemPrompt = buildSystemPrompt(args.agentId);

    // Build conversation context
    const context = args.conversationHistory
      ? args.conversationHistory.slice(-5).map((m) => `${m.role}: ${m.content}`).join("\n")
      : "";

    // Try primary model first
    try {
      const response = await callNVIDIA(config.primaryModel, systemPrompt, args.message, context);
      return {
        success: true,
        message: response,
        modelUsed: config.primaryModel,
        agentId: args.agentId,
        agentName: config.name,
        timestamp: new Date().toISOString(),
      };
    } catch (primaryError: any) {
      console.error(`Primary model failed for ${args.agentId}:`, primaryError.message);

      // Try fallback model
      try {
        const fallbackResponse = await callNVIDIA(config.fallbackModel, systemPrompt, args.message, context);
        return {
          success: true,
          message: fallbackResponse,
          modelUsed: config.fallbackModel,
          agentId: args.agentId,
          agentName: config.name,
          timestamp: new Date().toISOString(),
          fallback: true,
        };
      } catch (fallbackError: any) {
        console.error(`Fallback model failed for ${args.agentId}:`, fallbackError.message);
        return {
          success: false,
          error: "All models unavailable. Please try again later.",
          agentId: args.agentId,
        };
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Get support status
// ═══════════════════════════════════════════════════════════════════
export const getSupportStatus = action({
  args: {},
  returns: v.any(),
  handler: async () => {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    return {
      status: apiKey ? "online" : "offline",
      models: {
        primary: "meta/llama-3.3-70b-instruct",
        fallback: "meta/llama-3.1-70b-instruct",
        emergency: "meta/llama-3-8b-instruct",
      },
      agents: Object.entries(AGENT_CONFIGS).map(([id, config]) => ({
        id,
        name: config.name,
        field: config.field,
        model: config.primaryModel,
      })),
      totalAgents: Object.keys(AGENT_CONFIGS).length,
    };
  },
});
