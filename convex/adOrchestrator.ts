import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// ADVERT ORCHESTRATOR — Unified Automation System
// ═══════════════════════════════════════════════════════════════════
// Connects: Ad Engine + TryPost + Flyer Engine + Composio
// Purpose: Auto-generate and post quality adverts across all platforms
// Scheduling: Follows existing 3x daily posting times (8AM, 12PM, 6PM WAT)
//
// Workflow:
//   1. Generate AI content (headline, description, CTA)
//   2. Generate flyer using flyer engine
//   3. Schedule post via TryPost (Composio backbone)
//   4. Track analytics
//   5. Repeat on schedule

// ─── CONSTANTS ───

const SITE_URL = "https://dutchkem-prosuite-app.vercel.app";
const SITE_NAME = "Dutchkem Ventures ProSuite NG+";

// ─── CONTENT TEMPLATES ───

const AD_TEMPLATES = [
  {
    id: "saas_product",
    name: "SaaS Product Launch",
    headline: "Scale Your Business With AI",
    description: "15 expert AI agents working 24/7 for your business. From academic writing to video production — automate everything.",
    cta: "Get Started Free",
    hashtags: ["#AI", "#SaaS", "#BusinessGrowth", "#Automation", "#Nigeria"],
    targetAudience: "entrepreneurs",
  },
  {
    id: "enterprise_solution",
    name: "Enterprise AI Solution",
    headline: "Enterprise AI Made Simple",
    description: "Join 10,000+ Nigerian businesses already using AI to reduce costs by 60%. Your competitors are already on it.",
    cta: "Book a Demo",
    hashtags: ["#Enterprise", "#AI", "#DigitalTransformation", "#Lagos", "#Nigeria"],
    targetAudience: "enterprise",
  },
  {
    id: "startup_boost",
    name: "Startup Growth Hack",
    headline: "Your 24/7 Digital Workforce",
    description: "AI agents that work while you sleep. No coding required. Start in minutes. Scale without hiring.",
    cta: "Start Your Trial",
    hashtags: ["#Startup", "#AI", "#GrowthHacking", "#TechNigeria", "#LagosStartups"],
    targetAudience: "startups",
  },
  {
    id: "freelancer_tool",
    name: "Freelancer Productivity",
    headline: "Work Smarter, Not Harder",
    description: "Deliver 10x more projects with AI-powered tools. Academic writing, content creation, video production — all automated.",
    cta: "Activate AI Now",
    hashtags: ["#Freelancer", "#Productivity", "#AI", "#RemoteWork", "#Nigeria"],
    targetAudience: "freelancers",
  },
  {
    id: "ecommerce_boost",
    name: "E-Commerce Revenue",
    headline: "Boost Revenue 10x With AI",
    description: "Automate customer support, optimize pricing, and maximize conversions. Watch your sales soar.",
    cta: "See It In Action",
    hashtags: ["#Ecommerce", "#AI", "#Revenue", "#OnlineSales", "#ShopNigeria"],
    targetAudience: "ecommerce",
  },
  {
    id: "academic_writing",
    name: "Academic Writing",
    headline: "Ace Your Next Assignment",
    description: "AI-powered thesis writing, research papers, and citations. APA/MLA formatting included. 100% plagiarism-free.",
    cta: "Start Writing",
    hashtags: ["#AcademicWriting", "#Thesis", "#Research", "#Students", "#Nigeria"],
    targetAudience: "students",
  },
  {
    id: "content_creation",
    name: "Content Creation",
    headline: "Create Viral Content in Minutes",
    description: "SEO-optimized blog posts, social media content, and email campaigns. AI that knows what your audience wants.",
    cta: "Create Now",
    hashtags: ["#ContentCreation", "#SEO", "#SocialMedia", "#Marketing", "#DigitalNigeria"],
    targetAudience: "marketers",
  },
  {
    id: "video_production",
    name: "Video Production",
    headline: "Professional Videos Without a Studio",
    description: "AI-powered video scripts, storyboards, and editing guidance. Create studio-quality content from your laptop.",
    cta: "Start Creating",
    hashtags: ["#VideoProduction", "#ContentCreator", "#YouTube", "#TikTok", "#Nollywood"],
    targetAudience: "creators",
  },
  {
    id: "career_coach",
    name: "Career Advancement",
    headline: "Land Your Dream Job Today",
    description: "Professional resume building, interview prep, and career guidance. AI that knows what recruiters want.",
    cta: "Build Your Resume",
    hashtags: ["#Career", "#JobSearch", "#Resume", "#Interview", "#Nigeria"],
    targetAudience: "jobseekers",
  },
  {
    id: "finance_advisor",
    name: "Financial Planning",
    headline: "Take Control of Your Money",
    description: "AI-powered budget planning, investment advice, and tax optimization. Financial freedom starts here.",
    cta: "Get Financial Advice",
    hashtags: ["#Finance", "#Budget", "#Investment", "#TaxPlanning", "#Naira"],
    targetAudience: "professionals",
  },
  {
    id: "travel_planner",
    name: "Travel Planning",
    headline: "Plan Your Dream Trip in Minutes",
    description: "AI-powered travel itineraries, booking recommendations, and local guides. Explore the world smarter.",
    cta: "Plan Your Trip",
    hashtags: ["#Travel", "#Vacation", "#Explore", "#TravelNigeria", "#Wanderlust"],
    targetAudience: "travelers",
  },
  {
    id: "wellness_coach",
    name: "Wellness & Health",
    headline: "Transform Your Health Today",
    description: "Personalized meal plans, workout routines, and wellness guidance. Your AI health companion.",
    cta: "Start Wellness Journey",
    hashtags: ["#Health", "#Fitness", "#Wellness", "#HealthyLifestyle", "#Nigeria"],
    targetAudience: "health-conscious",
  },
  {
    id: "event_planner",
    name: "Event Planning",
    headline: "Plan Unforgettable Events",
    description: "AI-powered event planning, venue selection, and party coordination. From weddings to corporate events.",
    cta: "Plan Your Event",
    hashtags: ["#EventPlanning", "#Wedding", "#CorporateEvent", "#PartyPlanning", "#Lagos"],
    targetAudience: "event-organizers",
  },
  {
    id: "translation_hub",
    name: "Translation Services",
    headline: "Break Language Barriers",
    description: "Professional document translation, website localization, and multilingual support. 50+ languages.",
    cta: "Translate Now",
    hashtags: ["#Translation", "#Localization", "#Multilingual", "#GlobalBusiness", "#Nigeria"],
    targetAudience: "businesses",
  },
  {
    id: "home_services",
    name: "Home Management",
    headline": "Your Smart Home Assistant",
    description: "Maintenance schedules, cleaning checklists, and home improvement plans. Keep your home perfect.",
    cta: "Manage Your Home",
    hashtags: ["#HomeManagement", "#SmartHome", "#Cleaning", "#HomeImprovement", "#Lagos"],
    targetAudience: "homeowners",
  },
];

const SOCIAL_POST_TEMPLATES = [
  {
    id: "engagement",
    name: "Engagement Post",
    template: "🤔 What if AI could handle your repetitive tasks while you focus on growth?\n\n{headline}.\n\n{description}\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "question",
  },
  {
    id: "testimonial",
    name: "Social Proof",
    template: "🚀 {headline}!\n\n{description}\n\nJoin thousands of businesses already scaling with AI.\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "proof",
  },
  {
    id: "tip",
    name: "Value Tip",
    template: "💡 Pro Tip: {description}\n\nStop struggling. Start winning with AI.\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "educational",
  },
  {
    id: "announcement",
    name: "Feature Announcement",
    template: "🎉 NEW: {headline}!\n\n{description}\n\nTry it free today:\n👉 {SITE_URL}\n\n{hashtags}",
    style: "announcement",
  },
  {
    id: "urgent",
    name: "Urgency/Scarcity",
    template: "⚡ Limited Time: {headline}\n\n{description}\n\nDon't miss out!\n👉 {SITE_URL}\n\n{hashtags}",
    style: "urgent",
  },
  {
    id: "story",
    name: "Storytelling",
    template: "📖 Imagine this:\n\n{description}\n\nThat's exactly what {headline} delivers.\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "story",
  },
  {
    id: "listicle",
    name: "Listicle",
    template: "📋 Why 10,000+ businesses are switching to AI:\n\n✅ {headline}\n✅ Save 60% on costs\n✅ Work 24/7 automatically\n✅ No coding required\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "listicle",
  },
  {
    id: "before_after",
    name: "Before/After",
    template: "🔄 Before AI: Hours of manual work\n🔄 After AI: Minutes of automated brilliance\n\n{headline}\n\n{description}\n\n👉 {SITE_URL}\n\n{hashtags}",
    style: "contrast",
  },
];

const PLATFORM_CONFIGS = [
  { id: "twitter", name: "X (Twitter)", icon: "🐦", maxChars: 280, optimalTimes: [8, 12, 18] },
  { id: "linkedin", name: "LinkedIn", icon: "💼", maxChars: 3000, optimalTimes: [8, 12, 17] },
  { id: "facebook", name: "Facebook", icon: "📘", maxChars: 63206, optimalTimes: [9, 13, 19] },
  { id: "instagram", name: "Instagram", icon: "📸", maxChars: 2200, optimalTimes: [11, 14, 19] },
  { id: "threads", name: "Threads", icon: "🧵", maxChars: 500, optimalTimes: [8, 12, 18] },
  { id: "tiktok", name: "TikTok", icon: "🎵", maxChars: 2200, optimalTimes: [10, 15, 20] },
  { id: "youtube", name: "YouTube", icon: "📺", maxChars: 5000, optimalTimes: [14, 18, 21] },
  { id: "pinterest", name: "Pinterest", icon: "📌", maxChars: 500, optimalTimes: [9, 14, 20] },
  { id: "reddit", name: "Reddit", icon: "🤖", maxChars: 40000, optimalTimes: [8, 12, 18] },
  { id: "bluesky", name: "Bluesky", icon: "🦋", maxChars: 300, optimalTimes: [8, 12, 18] },
  { id: "telegram", name: "Telegram", icon: "✈️", maxChars: 4096, optimalTimes: [9, 13, 19] },
  { id: "discord", name: "Discord", icon: "💬", maxChars: 2000, optimalTimes: [10, 15, 20] },
];

// ─── ORCHESTRATOR STATUS ───

export const getOrchestratorStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const status = await ctx.db.query("ad_orchestrator_status").first();
    if (!status) {
      return {
        enabled: false,
        autoGenerate: false,
        autoPost: false,
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
        platforms: PLATFORM_CONFIGS.map(p => ({ id: p.id, enabled: false })),
      };
    }
    return status;
  },
});

export const toggleOrchestrator = mutation({
  args: {
    enabled: v.boolean(),
    autoGenerate: v.optional(v.boolean()),
    autoPost: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("ad_orchestrator_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        autoGenerate: args.autoGenerate ?? existing.autoGenerate,
        autoPost: args.autoPost ?? existing.autoPost,
        updatedAt: now,
      });
      return { success: true, enabled: args.enabled };
    } else {
      await ctx.db.insert("ad_orchestrator_status", {
        enabled: args.enabled,
        autoGenerate: args.autoGenerate ?? true,
        autoPost: args.autoPost ?? true,
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
        platforms: PLATFORM_CONFIGS.map(p => ({ id: p.id, enabled: true })),
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, enabled: args.enabled };
    }
  },
});

export const togglePlatform = mutation({
  args: {
    platformId: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const status = await ctx.db.query("ad_orchestrator_status").first();
    if (!status) throw new Error("Orchestrator not initialized");

    const platforms = status.platforms.map((p: any) =>
      p.id === args.platformId ? { ...p, enabled: args.enabled } : p
    );

    await ctx.db.patch(status._id, { platforms, updatedAt: Date.now() });
    return { success: true };
  },
});

// ─── CONTENT GENERATION ───

export const generateContent = mutation({
  args: {
    templateId: v.optional(v.string()),
    customHeadline: v.optional(v.string()),
    customDescription: v.optional(v.string()),
    customCta: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const template = args.templateId
      ? AD_TEMPLATES.find(t => t.id === args.templateId)
      : AD_TEMPLATES[Math.floor(Math.random() * AD_TEMPLATES.length)];

    if (!template) throw new Error("Template not found");

    const headline = args.customHeadline || template.headline;
    const description = args.customDescription || template.description;
    const cta = args.customCta || template.cta;

    // Generate social post variations
    const socialPosts = SOCIAL_POST_TEMPLATES.map(t => {
      let content = t.template
        .replace(/{headline}/g, headline)
        .replace(/{description}/g, description)
        .replace(/{cta}/g, cta)
        .replace(/{hashtags}/g, template.hashtags.join(" "))
        .replace(/{SITE_URL}/g, SITE_URL);

      // Truncate for platform limits
      const platformPosts: Record<string, string> = {};
      for (const platform of PLATFORM_CONFIGS) {
        platformPosts[platform.id] = content.length > platform.maxChars
          ? content.slice(0, platform.maxChars - 3) + "..."
          : content;
      }

      return {
        templateId: t.id,
        style: t.style,
        fullContent: content,
        platformPosts,
      };
    });

    const now = Date.now();
    const contentId = await ctx.db.insert("ad_generated_content", {
      headline,
      description,
      cta,
      hashtags: template.hashtags,
      targetAudience: template.targetAudience,
      socialPosts,
      usedCount: 0,
      createdAt: now,
    });

    // Update orchestrator stats
    const status = await ctx.db.query("ad_orchestrator_status").first();
    if (status) {
      await ctx.db.patch(status._id, {
        totalGenerated: status.totalGenerated + 1,
        updatedAt: now,
      });
    }

    return { success: true, contentId, headline, description, cta, socialPosts };
  },
});

export const getGeneratedContent = query({
  args: { limit: v.optional(v.number()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, content: [] };

    const limit = args.limit || 50;
    const content = await ctx.db.query("ad_generated_content")
      .order("desc")
      .take(limit);
    return { authError: false, content };
  },
});

// ─── UNIFIED POSTING ───

export const postAcrossPlatforms = action({
  args: {
    contentId: v.id("ad_generated_content"),
    platforms: v.array(v.string()),
    scheduledFor: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const content = await ctx.runQuery(internal.adOrchestrator.getContentById, { contentId: args.contentId });
    if (!content) throw new Error("Content not found");

    const results: Array<{ platform: string; success: boolean; postId?: string; error?: string }> = [];

    for (const platformId of args.platforms) {
      const platform = PLATFORM_CONFIGS.find(p => p.id === platformId);
      if (!platform) {
        results.push({ platform: platformId, success: false, error: "Unknown platform" });
        continue;
      }

      const postContent = content.socialPosts?.platformPosts?.[platformId] || content.socialPosts?.fullContent || content.headline;

      try {
        // Schedule via TryPost
        const scheduledFor = args.scheduledFor || Date.now();
        const postId = await ctx.runMutation(internal.trypost.schedulePostInternal, {
          content: postContent,
          platforms: [platformId],
          scheduledFor,
          hashtags: content.hashtags,
        });

        results.push({ platform: platformId, success: true, postId });
      } catch (e: any) {
        results.push({ platform: platformId, success: false, error: e.message });
      }
    }

    // Log posting activity
    await ctx.runMutation(internal.adOrchestrator.logPostingActivity, {
      contentId: args.contentId,
      platforms: args.platforms,
      results,
    });

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      total: args.platforms.length,
      successful: successCount,
      failed: args.platforms.length - successCount,
      results,
    };
  },
});

// ─── INTERNAL HELPERS ───

export const getContentById = internalQuery({
  args: { contentId: v.id("ad_generated_content") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

export const logPostingActivity = internalMutation({
  args: {
    contentId: v.id("ad_generated_content"),
    platforms: v.array(v.string()),
    results: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("ad_posting_logs", {
      contentId: args.contentId,
      platforms: args.platforms,
      results: args.results,
      timestamp: now,
    });

    // Update content usage count
    const content = await ctx.db.get(args.contentId);
    if (content) {
      await ctx.db.patch(args.contentId, {
        usedCount: (content.usedCount || 0) + 1,
        lastUsedAt: now,
      });
    }

    // Update orchestrator stats
    const status = await ctx.db.query("ad_orchestrator_status").first();
    if (status) {
      const successCount = args.results.filter((r: any) => r.success).length;
      await ctx.db.patch(status._id, {
        totalPosted: status.totalPosted + successCount,
        lastRun: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

// ─── AUTO-GENERATE & POST (Cron Target) ───

export const runAutoGenerateAndPost = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Check orchestrator status
    const status = await ctx.runQuery(internal.adOrchestrator.getOrchestratorStatusInternal);
    if (!status || !status.enabled || !status.autoGenerate) {
      return { skipped: true, reason: "Orchestrator disabled" };
    }

    // Generate content
    const template = AD_TEMPLATES[Math.floor(Math.random() * AD_TEMPLATES.length)];
    const contentResult = await ctx.runMutation(internal.adOrchestrator.generateContentInternal, {
      headline: template.headline,
      description: template.description,
      cta: template.cta,
      hashtags: template.hashtags,
      targetAudience: template.targetAudience,
    });

    if (!contentResult.success) {
      return { skipped: true, reason: "Content generation failed" };
    }

    // Get enabled platforms
    const enabledPlatforms = status.platforms
      ?.filter((p: any) => p.enabled)
      .map((p: any) => p.id) || [];

    if (enabledPlatforms.length === 0) {
      return { skipped: true, reason: "No platforms enabled" };
    }

    // Post to platforms
    if (status.autoPost) {
      const postResult = await ctx.runAction(internal.adOrchestrator.postAcrossPlatformsInternal, {
        contentId: contentResult.contentId,
        platforms: enabledPlatforms,
      });
      return {
        success: true,
        contentId: contentResult.contentId,
        headline: contentResult.headline,
        postingResult: postResult,
      };
    }

    return {
      success: true,
      contentId: contentResult.contentId,
      headline: contentResult.headline,
      posted: false,
    };
  },
});

export const getOrchestratorStatusInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("ad_orchestrator_status").first();
  },
});

export const generateContentInternal = internalMutation({
  args: {
    headline: v.string(),
    description: v.string(),
    cta: v.string(),
    hashtags: v.array(v.string()),
    targetAudience: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const socialPosts = SOCIAL_POST_TEMPLATES.map(t => {
      let content = t.template
        .replace(/{headline}/g, args.headline)
        .replace(/{description}/g, args.description)
        .replace(/{cta}/g, args.cta)
        .replace(/{hashtags}/g, args.hashtags.join(" "))
        .replace(/{SITE_URL}/g, SITE_URL);

      const platformPosts: Record<string, string> = {};
      for (const platform of PLATFORM_CONFIGS) {
        platformPosts[platform.id] = content.length > platform.maxChars
          ? content.slice(0, platform.maxChars - 3) + "..."
          : content;
      }

      return {
        templateId: t.id,
        style: t.style,
        fullContent: content,
        platformPosts,
      };
    });

    const now = Date.now();
    const contentId = await ctx.db.insert("ad_generated_content", {
      headline: args.headline,
      description: args.description,
      cta: args.cta,
      hashtags: args.hashtags,
      targetAudience: args.targetAudience,
      socialPosts,
      usedCount: 0,
      createdAt: now,
    });

    return { success: true, contentId, headline: args.headline };
  },
});

export const postAcrossPlatformsInternal = internalAction({
  args: {
    contentId: v.id("ad_generated_content"),
    platforms: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const content = await ctx.runQuery(internal.adOrchestrator.getContentById, { contentId: args.contentId });
    if (!content) return { success: false, error: "Content not found" };

    const results: Array<{ platform: string; success: boolean; postId?: string; error?: string }> = [];

    for (const platformId of args.platforms) {
      const postContent = content.socialPosts?.platformPosts?.[platformId] || content.headline;

      try {
        const postId = await ctx.runMutation(internal.trypost.schedulePostInternal, {
          content: postContent,
          platforms: [platformId],
          scheduledFor: Date.now(),
          hashtags: content.hashtags,
        });

        results.push({ platform: platformId, success: true, postId });
      } catch (e: any) {
        results.push({ platform: platformId, success: false, error: e.message });
      }
    }

    await ctx.runMutation(internal.adOrchestrator.logPostingActivity, {
      contentId: args.contentId,
      platforms: args.platforms,
      results,
    });

    const successCount = results.filter(r => r.success).length;
    return { success: successCount > 0, total: args.platforms.length, successful: successCount, results };
  },
});

// ─── ANALYTICS ───

export const getAnalytics = query({
  args: { period: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const now = Date.now();
    const periodMs = args.period === "week" ? 7 * 86400000 : args.period === "month" ? 30 * 86400000 : 86400000;
    const since = now - periodMs;

    const logs = await ctx.db.query("ad_posting_logs")
      .filter(q => q.gte(q.field("timestamp"), since))
      .order("desc")
      .take(100);

    const totalPosts = logs.length;
    const successfulPosts = logs.filter((l: any) => l.results?.some((r: any) => r.success)).length;
    const platformBreakdown: Record<string, { total: number; success: number }> = {};

    for (const log of logs) {
      for (const result of (log.results || [])) {
        if (!platformBreakdown[result.platform]) {
          platformBreakdown[result.platform] = { total: 0, success: 0 };
        }
        platformBreakdown[result.platform].total++;
        if (result.success) platformBreakdown[result.platform].success++;
      }
    }

    return {
      authError: false,
      totalPosts,
      successfulPosts,
      successRate: totalPosts > 0 ? Math.round((successfulPosts / totalPosts) * 100) : 0,
      platformBreakdown,
      period: args.period || "day",
    };
  },
});

// ─── BULK GENERATE ───

export const bulkGenerateContent = mutation({
  args: {
    count: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const count = Math.min(args.count, 10);
    const generated = [];

    for (let i = 0; i < count; i++) {
      const template = AD_TEMPLATES[i % AD_TEMPLATES.length];

      const socialPosts = SOCIAL_POST_TEMPLATES.map(t => {
        let content = t.template
          .replace("{headline}", template.headline)
          .replace("{description}", template.description)
          .replace("{cta}", template.cta)
          .replace("{hashtags}", template.hashtags.join(" "));

        const platformPosts: Record<string, string> = {};
        for (const platform of PLATFORM_CONFIGS) {
          platformPosts[platform.id] = content.length > platform.maxChars
            ? content.slice(0, platform.maxChars - 3) + "..."
            : content;
        }

        return { templateId: t.id, style: t.style, fullContent: content, platformPosts };
      });

      const now = Date.now();
      const contentId = await ctx.db.insert("ad_generated_content", {
        headline: template.headline,
        description: template.description,
        cta: template.cta,
        hashtags: template.hashtags,
        targetAudience: template.targetAudience,
        socialPosts,
        usedCount: 0,
        createdAt: now,
      });

      generated.push({ contentId, headline: template.headline });
    }

    return { success: true, count: generated.length, content: generated };
  },
});
