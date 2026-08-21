import { v } from "convex/values";
import { query } from "../_generated/server";

export const AGENT_MAP: Record<string, { name: string; icon: string; domain: string; tags: string[]; priority: number }> = {
  A1: { name: "Academic Pro", icon: "🎓", domain: "Thesis, research, academic writing, citations", tags: ["thesis", "research", "paper", "citation", "academic", "university", "JAMB", "WAEC", "NECO", "school", "exam", "study", "dissertation"], priority: 1 },
  A2: { name: "Business Pro", icon: "💼", domain: "Business plans, strategy, finance, entrepreneurship", tags: ["business", "plan", "strategy", "finance", "entrepreneur", "startup", "SME", "investor", "profit", "revenue", "company", "enterprise"], priority: 2 },
  A3: { name: "Content Pro", icon: "✍️", domain: "Content creation, social media, marketing, copywriting", tags: ["content", "blog", "article", "social media", "marketing", "copywriting", "post", "tweet", "caption"], priority: 3 },
  A4: { name: "Career Pro", icon: "📄", domain: "CV writing, interview prep, job search, career advice", tags: ["cv", "resume", "interview", "job", "career", "hiring", "recruitment", "cover letter"], priority: 4 },
  A5: { name: "Personal Shopper", icon: "🛍️", domain: "Shopping advice, deals, product recommendations", tags: ["shop", "buy", "deal", "product", "price", "compare", "recommend", "store"], priority: 5 },
  A6: { name: "Exam Pro", icon: "📝", domain: "Exam preparation, practice tests, study strategies", tags: ["exam", "test", "prep", "practice", "study guide", "quiz", "assessment"], priority: 6 },
  A7: { name: "Finance Pro", icon: "💰", domain: "Budgeting, investing, savings, financial planning", tags: ["budget", "invest", "save", "money", "financial", "tax", "accounting", "loan"], priority: 2 },
  A8: { name: "MediaStudio Pro", icon: "🎬", domain: "Video production, animation, editing, dubbing", tags: ["video", "animation", "edit", "dub", "media", "production", "film", "audio"], priority: 7 },
  A9: { name: "Health Pro", icon: "🏥", domain: "Wellness, fitness, nutrition, mental health", tags: ["health", "wellness", "fitness", "diet", "nutrition", "mental health", "therapy"], priority: 3 },
  A10: { name: "Home Services Pro", icon: "🧹", domain: "Cleaning, organization, home maintenance", tags: ["clean", "home", "maintenance", "repair", "organize", "plumber", "electrician"], priority: 8 },
  A11: { name: "Language Tutor", icon: "🗣️", domain: "Language learning, translation, pronunciation", tags: ["language", "learn", "translate", "pronunciation", "grammar", "vocabulary"], priority: 5 },
  A12: { name: "Travel Planner", icon: "✈️", domain: "Travel planning, itineraries, destinations", tags: ["travel", "trip", "hotel", "flight", "itinerary", "destination", "vacation"], priority: 6 },
  A13: { name: "ServiceMart NG", icon: "🚀", domain: "JAMB, WAEC, NECO, CV, interview, career guidance", tags: ["jamb", "waec", "neco", "nigeria", "service", "marketplace", "freelancer"], priority: 4 },
  A14: { name: "Translation Hub", icon: "📝", domain: "Translation, transcription, subtitling, localization", tags: ["translate", "transcribe", "subtitle", "localize", "language pair", "document"], priority: 5 },
  A15: { name: "Event Planner", icon: "🎉", domain: "Event planning, weddings, birthdays, corporate events", tags: ["event", "wedding", "birthday", "party", "corporate event", "venue", "catering"], priority: 7 },
};

export const AGENT_LIST = Object.entries(AGENT_MAP)
  .map(([id, a]) => `- ${id}: ${a.name} — ${a.domain}`)
  .join("\n");

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent tags and metadata
// ═══════════════════════════════════════════════════════════════════
export const getAgentMetadata = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.entries(AGENT_MAP).map(([id, agent]) => ({
      id,
      name: agent.name,
      icon: agent.icon,
      domain: agent.domain,
      tags: agent.tags,
      priority: agent.priority,
    }));
  },
});
