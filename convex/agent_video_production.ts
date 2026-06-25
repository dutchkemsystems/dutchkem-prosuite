import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// INFINITE AGENT VIDEO PRODUCTION SYSTEM
// Creates 30-second videos for each agent with quality rotation
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "📚", color: "#3b82f6", tagline: "Expert research & writing assistance", capabilities: ["research", "writing", "analysis"] },
  { id: "A2", name: "Business Pro", icon: "💼", color: "#8b5cf6", tagline: "Strategic business planning & consulting", capabilities: ["strategy", "planning", "consulting"] },
  { id: "A3", name: "Content Pro", icon: "📝", color: "#ec4899", tagline: "Viral content creation & marketing", capabilities: ["content", "social", "marketing"] },
  { id: "A4", name: "Career Pro", icon: "🎯", color: "#f59e0b", tagline: "Land your dream job with AI", capabilities: ["resume", "career", "coaching"] },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", color: "#10b981", tagline: "Smart shopping & deal finding", capabilities: ["shopping", "deals", "comparison"] },
  { id: "A6", name: "Exam Pro", icon: "📚", color: "#6366f1", tagline: "Ace your exams with AI", capabilities: ["exam", "study", "test_prep"] },
  { id: "A7", name: "Finance Pro", icon: "💰", color: "#059669", tagline: "Take control of your finances", capabilities: ["finance", "budgeting", "taxes"] },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", color: "#dc2626", tagline: "Professional video & media creation", capabilities: ["video", "audio", "media"] },
  { id: "A9", name: "Wellness Pro", icon: "🏃", color: "#14b8a6", tagline: "Your AI wellness coach", capabilities: ["health", "fitness", "wellness"] },
  { id: "A10", name: "Home Services", icon: "🏠", color: "#78716c", tagline: "Trusted home service providers", capabilities: ["home", "repair", "maintenance"] },
  { id: "A11", name: "Language Tutor", icon: "🗣️", color: "#0ea5e9", tagline: "Learn any language with AI", capabilities: ["language", "learning", "tutoring"] },
  { id: "A12", name: "Travel Planner", icon: "✈️", color: "#8b5cf6", tagline: "Plan your perfect trip", capabilities: ["travel", "booking", "itinerary"] },
  { id: "A13", name: "ServiceMart NG", icon: "🔧", color: "#f97316", tagline: "Local services in Nigeria", capabilities: ["services", "marketplace", "local"] },
  { id: "A14", name: "Translation Hub", icon: "🌍", color: "#06b6d4", tagline: "Translate anything instantly", capabilities: ["translation", "localization", "interpretation"] },
  { id: "A15", name: "Event Planner", icon: "🎉", color: "#a855f7", tagline: "Plan events effortlessly", capabilities: ["events", "planning", "coordination"] },
];

const VIDEO_SCRIPTS: Record<string, { hook: string; body: string; cta: string; duration: number }> = {
  A1: { hook: "Need help with research or writing?", body: "Academic Pro is your AI research assistant. Expert analysis, citations, and professional writing - available 24/7.", cta: "Start researching today", duration: 30 },
  A2: { hook: "Grow your business with AI", body: "Business Pro provides market analysis, financial planning, and growth strategies tailored to your goals.", cta: "Scale your business", duration: 30 },
  A3: { hook: "Create viral content effortlessly", body: "Content Pro generates social media posts, articles, and marketing materials that engage your audience.", cta: "Go viral now", duration: 30 },
  A4: { hook: "Land your dream job", body: "Career Pro offers resume optimization, interview coaching, and career strategy - all powered by AI.", cta: "Advance your career", duration: 30 },
  A5: { hook: "Find the best deals", body: "Personal Shopper provides AI-powered price comparison, deal alerts, and smart shopping recommendations.", cta: "Shop smarter", duration: 30 },
  A6: { hook: "Ace your exams", body: "Exam Pro offers AI-generated study guides, practice tests, and personalized learning paths.", cta: "Study smarter", duration: 30 },
  A7: { hook: "Take control of your finances", body: "Finance Pro offers budgeting, tax planning, and investment advice powered by AI.", cta: "Master your money", duration: 30 },
  A8: { hook: "Create professional videos", body: "MediaStudio Pro handles video editing, audio production, and content creation.", cta: "Create like a pro", duration: 30 },
  A9: { hook: "Your AI wellness coach", body: "Personalized fitness plans, nutrition advice, and mental health support - available anytime.", cta: "Start your journey", duration: 30 },
  A10: { hook: "Find trusted home service providers", body: "Home Services connects you with vetted professionals for repairs and maintenance.", cta: "Find help now", duration: 30 },
  A11: { hook: "Learn any language with AI", body: "Personalized lessons, practice conversations, and progress tracking.", cta: "Start learning", duration: 30 },
  A12: { hook: "Plan your perfect trip", body: "Personalized itineraries, deals, and booking assistance.", cta: "Travel smarter", duration: 30 },
  A13: { hook: "Discover local services in Nigeria", body: "ServiceMart connects you with trusted professionals for any need.", cta: "Find services", duration: 30 },
  A14: { hook: "Translate anything instantly", body: "Accurate, context-aware translations for 100+ languages.", cta: "Translate now", duration: 30 },
  A15: { hook: "Plan events effortlessly", body: "Venue selection, catering, and coordination with AI precision.", cta: "Plan your event", duration: 30 },
};

const QUALITY_LEVELS = {
  hd: { resolution: "1080p", fps: 30, quality: 1.0, label: "HD" },
  sd: { resolution: "720p", fps: 24, quality: 0.7, label: "SD" },
  draft: { resolution: "480p", fps: 15, quality: 0.5, label: "Draft" },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE VIDEO FOR AGENT
// ═══════════════════════════════════════════════════════════════════

export const generateAgentVideo = action({
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

    const script = VIDEO_SCRIPTS[args.agentId];
    if (!script) return { error: "No script for this agent" };

    const quality = QUALITY_LEVELS[args.quality as keyof typeof QUALITY_LEVELS] || QUALITY_LEVELS.hd;

    // Create video production
    const videoData = {
      title: `${agent.name} - ${agent.tagline}`,
      prompt: `${script.hook} ${script.body} ${script.cta}`,
      genre: "promotional",
      targetDuration: 0.5, // 30 seconds
      style: "modern",
      quality: quality.label,
    };

    const result = await ctx.runAction(internal.video_production.produceFullVideo, {
      ...videoData,
      adminToken: args.adminToken,
    });

    // Log the production
    await ctx.runMutation(internal.agent_video_production.logVideoProduction, {
      agentId: args.agentId,
      agentName: agent.name,
      quality: quality.label,
      platform: args.platform || "all",
      videoUrl: result.videoUrl,
      status: result.success ? "completed" : "failed",
      timestamp: Date.now(),
    });

    return {
      success: result.success,
      agent: agent.name,
      script,
      quality: quality.label,
      videoUrl: result.videoUrl,
      error: result.error,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE POSTER FOR AGENT
// ═══════════════════════════════════════════════════════════════════

export const generateAgentPoster = action({
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

    const script = VIDEO_SCRIPTS[args.agentId];
    const posterData = {
      title: agent.name,
      headline: agent.tagline,
      body: script.body,
      cta: "Start Free Trial",
      colorScheme: agent.color,
      icon: agent.icon,
    };

    // Create poster using docx library
    const result = await ctx.runAction(internal.agent_video_production.createPoster, {
      ...posterData,
      adminToken: args.adminToken,
    });

    return {
      success: true,
      agent: agent.name,
      poster: posterData,
      fileUrl: result.fileUrl,
    };
  },
});

export const createPoster = internalAction({
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
    // Poster data would be used by the frontend file generator
    return {
      success: true,
      posterData: {
        title: args.title,
        headline: args.headline,
        body: args.body,
        cta: args.cta,
        colorScheme: args.colorScheme,
        icon: args.icon,
      },
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// BATCH PRODUCTION
// ═══════════════════════════════════════════════════════════════════

export const batchGenerateAgentVideos = action({
  args: {
    adminToken: v.string(),
    agentIds: v.optional(v.array(v.string())),
    quality: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agentIds = args.agentIds || AGENTS.map(a => a.id);
    const results = [];

    for (const agentId of agentIds) {
      try {
        const result = await ctx.runAction(internal.agent_video_production.generateAgentVideo, {
          adminToken: args.adminToken,
          agentId,
          quality: args.quality,
          platform: args.platform,
        });
        results.push({ agentId, ...result });
      } catch (err: any) {
        results.push({ agentId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      total: agentIds.length,
      successCount,
      failedCount: agentIds.length - successCount,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════════

export const getScheduleForAgent = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return null;

    // Get posting schedule based on time of day
    const now = new Date();
    const hour = now.getHours();
    
    let quality: string;
    if (hour >= 8 && hour < 12) quality = "hd";
    else if (hour >= 12 && hour < 18) quality = "sd";
    else if (hour >= 18 && hour < 22) quality = "hd";
    else quality = "draft";

    return {
      agent,
      currentQuality: quality,
      schedule: {
        morning: { time: "8-10am", quality: "hd" },
        afternoon: { time: "12-2pm", quality: "sd" },
        evening: { time: "6-8pm", quality: "hd" },
        night: { time: "10pm-12am", quality: "draft" },
      },
    };
  },
});

export const getAllAgentSchedules = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = new Date();
    const hour = now.getHours();
    
    let currentQuality: string;
    if (hour >= 8 && hour < 12) currentQuality = "hd";
    else if (hour >= 12 && hour < 18) currentQuality = "sd";
    else if (hour >= 18 && hour < 22) currentQuality = "hd";
    else currentQuality = "draft";

    return AGENTS.map(agent => ({
      ...agent,
      currentQuality,
      schedule: {
        morning: { time: "8-10am", quality: "hd" },
        afternoon: { time: "12-2pm", quality: "sd" },
        evening: { time: "6-8pm", quality: "hd" },
        night: { time: "10pm-12am", quality: "draft" },
      },
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════

export const logVideoProduction = internalMutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    quality: v.string(),
    platform: v.string(),
    videoUrl: v.optional(v.string()),
    status: v.string(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `video_${args.agentId}`,
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

export const getAgentVideoStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentVideos = await ctx.db.query("mimo_health_logs")
      .filter((q) => 
        q.gte(q.field("timestamp"), oneDayAgo).and(
          q.gt(q.field("component"), "video_").and(q.lt(q.field("component"), "video_z"))
        )
      )
      .collect();

    return {
      totalVideos: recentVideos.length,
      completed: recentVideos.filter(v => v.status === "healthy").length,
      failed: recentVideos.filter(v => v.status !== "healthy").length,
      agents: AGENTS.map(agent => ({
        ...agent,
        videosToday: recentVideos.filter(v => v.component === `video_${agent.id}`).length,
      })),
    };
  },
});

export const getAgentScripts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return AGENTS.map(agent => ({
      ...agent,
      script: VIDEO_SCRIPTS[agent.id],
    }));
  },
});
