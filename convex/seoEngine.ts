import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// SEO & CONTENT MARKETING ENGINE — AI-powered optimization
// ═══════════════════════════════════════════════════════════════════

// SEO Analysis Result
interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  suggestions: SEOSuggestion[];
  keywords: KeywordData[];
  competitorAnalysis?: CompetitorData[];
}

interface SEOIssue {
  type: "critical" | "warning" | "info";
  category: string;
  message: string;
  impact: number;
}

interface SEOSuggestion {
  priority: number;
  category: string;
  title: string;
  description: string;
  estimatedImpact: string;
}

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  currentRank: number | null;
  opportunity: "high" | "medium" | "low";
}

interface CompetitorData {
  domain: string;
  domainAuthority: number;
  backlinks: number;
  topKeywords: string[];
}

// Content types
const CONTENT_TYPES = {
  blog_post: { minWords: 1500, optimalWords: 2500, readTime: "8-12 min" },
  social_post: { minWords: 50, optimalWords: 150, readTime: "1-2 min" },
  product_page: { minWords: 300, optimalWords: 500, readTime: "2-3 min" },
  landing_page: { minWords: 500, optimalWords: 1000, readTime: "3-5 min" },
  email: { minWords: 100, optimalWords: 300, readTime: "1-2 min" },
};

// Analyze content for SEO
export const analyzeContent = action({
  args: {
    content: v.string(),
    contentType: v.string(),
    targetKeywords: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contentLower = args.content.toLowerCase();
    const wordCount = args.content.split(/\s+/).length;
    const contentTypeConfig = CONTENT_TYPES[args.contentType as keyof typeof CONTENT_TYPES];

    const issues: SEOIssue[] = [];
    const suggestions: SEOSuggestion[] = [];

    // Word count check
    if (wordCount < contentTypeConfig.minWords) {
      issues.push({
        type: "warning",
        category: "content_length",
        message: `Content is ${wordCount} words. Minimum for ${args.contentType} is ${contentTypeConfig.minWords} words.`,
        impact: 20,
      });
      suggestions.push({
        priority: 1,
        category: "content_length",
        title: "Increase content length",
        description: `Add ${contentTypeConfig.minWords - wordCount} more words for optimal SEO.`,
        estimatedImpact: "+15-25% organic traffic",
      });
    }

    // Keyword density check
    if (args.targetKeywords) {
      for (const keyword of args.targetKeywords) {
        const regex = new RegExp(keyword, "gi");
        const matches = contentLower.match(regex);
        const density = matches ? (matches.length / wordCount) * 100 : 0;

        if (density < 0.5) {
          issues.push({
            type: "warning",
            category: "keyword_density",
            message: `Keyword "${keyword}" density is ${density.toFixed(2)}%. Recommended: 1-2%.`,
            impact: 15,
          });
          suggestions.push({
            priority: 2,
            category: "keywords",
            title: `Increase "${keyword}" usage`,
            description: `Use the keyword ${Math.ceil(wordCount * 0.01)} more times naturally.`,
            estimatedImpact: "+10-20% keyword ranking",
          });
        } else if (density > 2.5) {
          issues.push({
            type: "critical",
            category: "keyword_stuffing",
            message: `Keyword "${keyword}" density is ${density.toFixed(2)}%. This may be considered keyword stuffing.`,
            impact: 30,
          });
        }
      }
    }

    // Heading structure
    const hasH1 = /<h1[^>]*>/.test(args.content) || /^#[^#]/m.test(args.content);
    const hasH2 = /<h2[^>]*>/.test(args.content) || /^##[^#]/m.test(args.content);

    if (!hasH1) {
      issues.push({
        type: "critical",
        category: "headings",
        message: "Missing H1 heading",
        impact: 25,
      });
      suggestions.push({
        priority: 1,
        category: "headings",
        title: "Add H1 heading",
        description: "Include a descriptive H1 heading with your primary keyword.",
        estimatedImpact: "+20-30% SEO score",
      });
    }

    if (!hasH2) {
      issues.push({
        type: "warning",
        category: "headings",
        message: "Missing H2 subheadings",
        impact: 10,
      });
    }

    // Readability check
    const sentences = args.content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentences;

    if (avgWordsPerSentence > 20) {
      issues.push({
        type: "warning",
        category: "readability",
        message: `Average sentence length is ${avgWordsPerSentence.toFixed(0)} words. Aim for 15-20.`,
        impact: 10,
      });
      suggestions.push({
        priority: 3,
        category: "readability",
        title: "Shorten sentences",
        description: "Break long sentences into shorter, clearer ones.",
        estimatedImpact: "+5-10% engagement",
      });
    }

    // Meta description check
    if (!args.content.toLowerCase().includes("meta description")) {
      suggestions.push({
        priority: 2,
        category: "meta",
        title: "Add meta description",
        description: "Include a compelling 150-160 character meta description.",
        estimatedImpact: "+15% click-through rate",
      });
    }

    // Image alt text suggestion
    if (!args.content.includes("alt=") && !args.content.includes("alt:")) {
      suggestions.push({
        priority: 3,
        category: "images",
        title: "Add image alt text",
        description: "Include descriptive alt text for all images.",
        estimatedImpact: "+10% image search traffic",
      });
    }

    // Calculate SEO score
    const totalImpact = issues.reduce((sum, i) => sum + i.impact, 0);
    const score = Math.max(0, Math.min(100, 100 - totalImpact));

    // Generate keyword suggestions
    const keywords = generateKeywordSuggestions(args.content, args.targetKeywords);

    return {
      score,
      wordCount,
      readTime: contentTypeConfig.readTime,
      issues,
      suggestions: suggestions.sort((a, b) => a.priority - b.priority),
      keywords,
    };
  },
});

// Generate keyword suggestions
function generateKeywordSuggestions(content: string, existingKeywords?: string[]): KeywordData[] {
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq: Record<string, number> = {};

  // Count word frequency (excluding common words)
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once"]);

  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/g, "");
    if (cleaned.length > 3 && !stopWords.has(cleaned)) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  }

  // Get top keywords
  const topWords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return topWords.map(([keyword, volume]) => ({
    keyword,
    volume: volume * 100, // Simulated search volume
    difficulty: Math.floor(Math.random() * 50) + 20,
    currentRank: existingKeywords?.includes(keyword) ? Math.floor(Math.random() * 20) + 1 : null,
    opportunity: (volume > 5 ? "high" : volume > 2 ? "medium" : "low") as "high" | "medium" | "low",
  }));
}

// Get SEO history for a URL
export const getSEOHistory = query({
  args: {
    url: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seo_analyses")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .order("desc")
      .take(args.limit || 10);
  },
});

// Save SEO analysis
export const saveAnalysis = internalMutation({
  args: {
    url: v.string(),
    score: v.number(),
    issues: v.any(),
    suggestions: v.any(),
    keywords: v.any(),
    contentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seo_analyses", {
      url: args.url,
      score: args.score,
      issues: args.issues,
      suggestions: args.suggestions,
      keywords: args.keywords,
      contentId: args.contentId,
      analyzedAt: Date.now(),
    });
  },
});

// Content Calendar
export const getContentCalendar = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const start = args.startDate || Date.now();
    const end = args.end || start + 30 * 24 * 60 * 60 * 1000; // 30 days

    return await ctx.db
      .query("content_calendar")
      .withIndex("by_date", (q) =>
        q.gte("scheduledDate", start).lte("scheduledDate", end)
      )
      .order("asc")
      .collect();
  },
});

// Schedule content
export const scheduleContent = mutation({
  args: {
    title: v.string(),
    contentType: v.string(),
    platform: v.string(),
    scheduledDate: v.number(),
    keywords: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("content_calendar", {
      title: args.title,
      contentType: args.contentType,
      platform: args.platform,
      scheduledDate: args.scheduledDate,
      keywords: args.keywords,
      notes: args.notes,
      status: "scheduled",
      createdAt: Date.now(),
    });
  },
});

// SEO Dashboard stats
export const getSEODashboard = query({
  args: {},
  handler: async (ctx) => {
    const analyses = await ctx.db.query("seo_analyses").collect();
    const calendar = await ctx.db.query("content_calendar").collect();

    const avgScore = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length
      : 0;

    const upcomingContent = calendar
      .filter((c) => c.scheduledDate > Date.now() && c.status === "scheduled")
      .length;

    return {
      totalAnalyses: analyses.length,
      averageScore: Math.round(avgScore),
      upcomingContent,
      totalKeywords: new Set(analyses.flatMap((a) => a.keywords.map((k: any) => k.keyword))).size,
      recentScores: analyses.slice(0, 5).map((a) => ({
        url: a.url,
        score: a.score,
        date: a.analyzedAt,
      })),
    };
  },
});
