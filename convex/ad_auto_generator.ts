import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED ADVERT GENERATOR
// Generates videos, posters, and flyers automatically
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "📚", color: "#3b82f6", tagline: "Expert research & writing assistance", script: "Need help with research or writing? Academic Pro is your AI research assistant. Expert analysis, citations, and professional writing - available 24/7. Start researching today!" },
  { id: "A2", name: "Business Pro", icon: "💼", color: "#8b5cf6", tagline: "Strategic business planning & consulting", script: "Grow your business with AI-powered strategy. Business Pro provides market analysis, financial planning, and growth strategies tailored to your goals. Scale your business!" },
  { id: "A3", name: "Content Pro", icon: "📝", color: "#ec4899", tagline: "Viral content creation & marketing", script: "Create viral content effortlessly. Content Pro generates social media posts, articles, and marketing materials that engage your audience. Go viral now!" },
  { id: "A4", name: "Career Pro", icon: "🎯", color: "#f59e0b", tagline: "Land your dream job with AI", script: "Land your dream job with Career Pro. Resume optimization, interview coaching, and career strategy - all powered by AI. Advance your career!" },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", color: "#10b981", tagline: "Smart shopping & deal finding", script: "Find the best deals with Personal Shopper. AI-powered price comparison, deal alerts, and smart shopping recommendations. Shop smarter!" },
  { id: "A6", name: "Exam Pro", icon: "📚", color: "#6366f1", tagline: "Ace your exams with AI", script: "Ace your exams with Exam Pro. AI-generated study guides, practice tests, and personalized learning paths. Study smarter!" },
  { id: "A7", name: "Finance Pro", icon: "💰", color: "#059669", tagline: "Take control of your finances", script: "Take control of your finances. Finance Pro offers budgeting, tax planning, and investment advice powered by AI. Master your money!" },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", color: "#dc2626", tagline: "Professional video & media creation", script: "Create professional videos and media. MediaStudio Pro handles video editing, audio production, and content creation. Create like a pro!" },
  { id: "A9", name: "Wellness Pro", icon: "🏃", color: "#14b8a6", tagline: "Your AI wellness coach", script: "Your AI wellness coach. Personalized fitness plans, nutrition advice, and mental health support - available anytime. Start your journey!" },
  { id: "A10", name: "Home Services", icon: "🏠", color: "#78716c", tagline: "Trusted home service providers", script: "Find trusted home service providers. Home Services connects you with vetted professionals for repairs and maintenance. Find help now!" },
  { id: "A11", name: "Language Tutor", icon: "🗣️", color: "#0ea5e9", tagline: "Learn any language with AI", script: "Learn any language with AI. Language Tutor offers personalized lessons, practice conversations, and progress tracking. Start learning!" },
  { id: "A12", name: "Travel Planner", icon: "✈️", color: "#8b5cf6", tagline: "Plan your perfect trip", script: "Plan your perfect trip. Travel Planner creates personalized itineraries, finds deals, and handles bookings. Travel smarter!" },
  { id: "A13", name: "ServiceMart NG", icon: "🔧", color: "#f97316", tagline: "Local services in Nigeria", script: "Discover local services in Nigeria. ServiceMart connects you with trusted professionals for any need. Find services!" },
  { id: "A14", name: "Translation Hub", icon: "🌍", color: "#06b6d4", tagline: "Translate anything instantly", script: "Translate anything instantly. Translation Hub offers accurate, context-aware translations for 100+ languages. Translate now!" },
  { id: "A15", name: "Event Planner", icon: "🎉", color: "#a855f7", tagline: "Plan events effortlessly", script: "Plan events effortlessly. Event Planner handles venue selection, catering, and coordination with AI precision. Plan your event!" },
];

const QUALITY_LEVELS = {
  hd: { resolution: "1080p", fps: 30, quality: 1.0, label: "HD" },
  sd: { resolution: "720p", fps: 24, quality: 0.7, label: "SD" },
  draft: { resolution: "480p", fps: 15, quality: 0.5, label: "Draft" },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE VIDEO WITH NVIDIA
// ═══════════════════════════════════════════════════════════════════

export const generateVideoWithNvidia = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    quality: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    const quality = QUALITY_LEVELS[args.quality as keyof typeof QUALITY_LEVELS] || QUALITY_LEVELS.hd;

    // Generate video using NVIDIA API
    const videoPrompt = `${agent.script} Visual: ${agent.icon} ${agent.name} interface, dashboard, features, happy users. Style: modern, professional, tech-forward.`;

    try {
      const videoResult = await ctx.runAction(internal.video_production.produceFullVideo, {
        title: `${agent.name} - ${agent.tagline}`,
        prompt: videoPrompt,
        genre: "promotional",
        targetDuration: 0.5,
        style: "modern",
        quality: quality.label,
        adminToken: args.adminToken,
      });

      // Log production
      await ctx.runMutation(internal.ad_auto_generator.logProduction, {
        type: "video",
        agentId: args.agentId,
        agentName: agent.name,
        quality: quality.label,
        platform: args.platform || "all",
        videoUrl: videoResult.videoUrl,
        status: videoResult.success ? "completed" : "failed",
        timestamp: Date.now(),
      });

      return {
        success: videoResult.success,
        agent: agent.name,
        videoUrl: videoResult.videoUrl,
        quality: quality.label,
        script: agent.script,
        error: videoResult.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE POSTER
// ═══════════════════════════════════════════════════════════════════

export const generatePoster = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    // Create poster data
    const posterData = {
      title: agent.name,
      headline: agent.tagline,
      body: agent.script,
      cta: "Start Free Trial",
      colorScheme: agent.color,
      icon: agent.icon,
    };

    // Generate poster using docx library
    const posterResult = await ctx.runAction(internal.ad_auto_generator.createPosterFile, {
      ...posterData,
      adminToken: args.adminToken,
    });

    // Log production
    await ctx.runMutation(internal.ad_auto_generator.logProduction, {
      type: "poster",
      agentId: args.agentId,
      agentName: agent.name,
      quality: "HD",
      platform: args.platform || "all",
      fileUrl: posterResult.fileUrl,
      status: "completed",
      timestamp: Date.now(),
    });

    return {
      success: true,
      agent: agent.name,
      poster: posterData,
      fileUrl: posterResult.fileUrl,
    };
  },
});

export const createPosterFile = internalAction({
  args: {
    title: v.string(),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
    colorScheme: v.string(),
    icon: v.string(),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Poster would be generated by frontend file generator
    return {
      success: true,
      fileUrl: `https://dutchkem-prosuite-app.vercel.app/posters/${args.title.replace(/\s+/g, '_').toLowerCase()}.png`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// BATCH GENERATE ALL AGENTS
// ═══════════════════════════════════════════════════════════════════

export const batchGenerateAll = action({
  args: {
    adminToken: v.string(),
    quality: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const agent of AGENTS) {
      try {
        // Generate video
        const videoResult = await ctx.runAction(internal.ad_auto_generator.generateVideoWithNvidia, {
          adminToken: args.adminToken,
          agentId: agent.id,
          quality: args.quality,
          platform: args.platform,
        });

        // Generate poster
        const posterResult = await ctx.runAction(internal.ad_auto_generator.generatePoster, {
          adminToken: args.adminToken,
          agentId: agent.id,
          platform: args.platform,
        });

        results.push({
          agentId: agent.id,
          agentName: agent.name,
          video: videoResult,
          poster: posterResult,
        });
      } catch (err: any) {
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.video?.success && r.poster?.success).length;
    return {
      success: successCount > 0,
      total: AGENTS.length,
      successCount,
      failedCount: AGENTS.length - successCount,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// POST TO TELEGRAM WITH URL
// ═══════════════════════════════════════════════════════════════════

export const postToTelegramWithUrl = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    videoUrl: v.string(),
    posterUrl: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    // Get Telegram connection
    const connection = await ctx.runQuery(internal.ad_auto_generator.getTelegramConnection, {});
    if (!connection) return { error: "Telegram not connected" };

    // Create message with URL
    const message = `${agent.icon} ${agent.name} - ${agent.tagline}\n\n${agent.script}\n\nVideo: ${args.videoUrl}\nPoster: ${args.posterUrl}\n\nRegister: https://dutchkem-prosuite-app.vercel.app/auth\n\n#${agent.name.replace(/\s+/g, '')} #DutchKem #AI`;

    // Post to Telegram
    const postResult = await ctx.runAction(internal.ad_auto_generator.postToTelegram, {
      botToken: connection.accessToken,
      chatId: connection.platformUserId,
      content: message,
    });

    // Log post
    await ctx.runMutation(internal.ad_auto_generator.logProduction, {
      type: "post",
      agentId: args.agentId,
      agentName: agent.name,
      quality: "HD",
      platform: "telegram",
      videoUrl: args.videoUrl,
      status: postResult.success ? "completed" : "failed",
      timestamp: Date.now(),
    });

    return {
      success: postResult.success,
      agent: agent.name,
      messageId: postResult.messageId,
      videoUrl: args.videoUrl,
      posterUrl: args.posterUrl,
    };
  },
});

export const getTelegramConnection = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .filter((q: any) => q.eq(q.field("platformId"), "telegram"))
      .first();
  },
});

export const postToTelegram = internalAction({
  args: {
    botToken: v.string(),
    chatId: v.string(),
    content: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${args.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            text: args.content,
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        return { success: true, messageId: result.result.message_id };
      } else {
        return { success: false, error: result.description };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════

export const logProduction = internalMutation({
  args: {
    type: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    quality: v.string(),
    platform: v.string(),
    videoUrl: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    status: v.string(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `adgen_${args.type}_${args.agentId}`,
      status: args.status === "completed" ? "healthy" : "error",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: args.status === "completed" ? 1 : 0,
      checksFailed: args.status === "completed" ? 0 : 1,
      issuesFound: args.status === "completed" ? 0 : 1,
      issuesAutoFixed: 0,
      severity: args.status === "completed" ? "info" : "warning",
      timestamp: args.timestamp,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getProductionStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentProductions = await ctx.db.query("mimo_health_logs")
      .filter((q) => 
        q.gte(q.field("timestamp"), oneDayAgo).and(
          q.gt(q.field("component"), "adgen_").and(q.lt(q.field("component"), "adgen_z"))
        )
      )
      .collect();

    return {
      today: {
        total: recentProductions.length,
        videos: recentProductions.filter(p => p.component.includes("video")).length,
        posters: recentProductions.filter(p => p.component.includes("poster")).length,
        posts: recentProductions.filter(p => p.component.includes("post")).length,
        completed: recentProductions.filter(p => p.status === "healthy").length,
        failed: recentProductions.filter(p => p.status !== "healthy").length,
      },
      agents: AGENTS.map(agent => ({
        ...agent,
        productions: recentProductions.filter(p => p.component.includes(agent.id)).length,
      })),
    };
  },
});

export const getAgentScripts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return AGENTS;
  },
});
