import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const HEADLINES = [
  "Scale Your Business With AI",
  "Automate. Grow. Dominate.",
  "The Future of Work is Here",
  "AI Agents That Work For You",
  "Enterprise AI Made Simple",
  "Boost Revenue 10x With AI",
  "Your 24/7 Digital Workforce",
  "Intelligent Automation Hub",
  "AI-Powered Growth Engine",
  "Next-Gen Business Solutions",
  "Transform Operations Today",
  "Smart Agents, Smarter Business",
  "AI That Delivers Results",
  "Unlock Your Potential With AI",
  "Revolutionize Your Workflow",
];

const SUBHEADLINES = [
  "Powered by Dutchkem Ventures ProSuite NG+",
  "Join 10,000+ businesses already scaling",
  "No coding required. Start in minutes.",
  "Enterprise-grade AI for every business",
  "Trusted by industry leaders worldwide",
  "24/7 autonomous agent support",
  "Reduce costs by 60% with AI automation",
  "From startup to enterprise — we scale with you",
  "The all-in-one AI business platform",
  "Real results, real fast",
];

const CTAS = [
  "Get Started Free",
  "Start Your Trial",
  "Book a Demo",
  "Join Now",
  "Learn More",
  "Sign Up Today",
  "Activate AI Now",
  "Claim Your Spot",
  "Start Scaling",
  "See It In Action",
];

const BG_PROMPTS = [
  "Abstract futuristic technology background with glowing nodes and connections, dark blue and cyan",
  "Modern corporate office with holographic AI interface overlay, purple and gold tones",
  "Digital matrix pattern with flowing data streams, green and black cyber aesthetic",
  "Minimalist gradient background with geometric shapes, warm sunset colors",
  "Neural network visualization with floating particles, deep space purple theme",
  "Clean business workspace with AI robot assistant, bright professional lighting",
  "Abstract flowing waves of light, blue and teal color scheme, high tech feel",
  "Futuristic city skyline with AI overlay, neon accents on dark background",
];

function cycleMode(currentIndex: number): "full_ai" | "ai_bg_svg_text" | "svg_only" {
  const modes: Array<"full_ai" | "ai_bg_svg_text" | "svg_only"> = ["full_ai", "ai_bg_svg_text", "svg_only"];
  return modes[currentIndex % 3];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const getEngineStatus = query({
  args: {},
  handler: async (ctx) => {
    const engines = await ctx.db.query("flyer_auto_posting_engine").collect();
    return engines[0] || null;
  },
});

export const initEngine = mutation({
  args: {
    postingIntervalHours: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("flyer_auto_posting_engine").first();
    if (existing) return existing._id;

    return await ctx.db.insert("flyer_auto_posting_engine", {
      status: "stopped",
      postingIntervalHours: args.postingIntervalHours,
      currentModeIndex: 0,
      platforms: {
        linkedin: { enabled: true, paused: false },
        facebook: { enabled: true, paused: false },
        instagram: { enabled: true, paused: false },
        youtube: { enabled: true, paused: false },
        reddit: { enabled: true, paused: false },
        threads: { enabled: true, paused: false },
        telegram: { enabled: true, paused: false },
        discord: { enabled: true, paused: false },
      },
      totalGenerated: 0,
      totalPosted: 0,
      totalFailed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const startEngine = mutation({
  args: {},
  handler: async (ctx) => {
    let engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) {
      const engineId = await ctx.db.insert("flyer_auto_posting_engine", {
        status: "running",
        postingIntervalHours: 4,
        currentModeIndex: 0,
        platforms: {
          linkedin: { enabled: true, paused: false },
          facebook: { enabled: true, paused: false },
          instagram: { enabled: true, paused: false },
          youtube: { enabled: true, paused: false },
          reddit: { enabled: true, paused: false },
          threads: { enabled: true, paused: false },
          telegram: { enabled: true, paused: false },
          discord: { enabled: true, paused: false },
        },
        totalGenerated: 0,
        totalPosted: 0,
        totalFailed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return engineId;
    }

    await ctx.db.patch(engine._id, {
      status: "running",
      updatedAt: Date.now(),
    });
    return engine._id;
  },
});

export const stopEngine = mutation({
  args: {},
  handler: async (ctx) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) return;

    await ctx.db.patch(engine._id, {
      status: "stopped",
      updatedAt: Date.now(),
    });
  },
});

export const togglePlatform = mutation({
  args: {
    platform: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    const platforms = { ...engine.platforms };
    const platKey = args.platform as keyof typeof platforms;
    if (!platforms[platKey]) throw new Error(`Unknown platform: ${args.platform}`);

    platforms[platKey] = { ...platforms[platKey], enabled: args.enabled };
    await ctx.db.patch(engine._id, { platforms, updatedAt: Date.now() });
  },
});

export const pausePlatform = mutation({
  args: {
    platform: v.string(),
    paused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    const platforms = { ...engine.platforms };
    const platKey = args.platform as keyof typeof platforms;
    if (!platforms[platKey]) throw new Error(`Unknown platform: ${args.platform}`);

    platforms[platKey] = { ...platforms[platKey], paused: args.paused };
    await ctx.db.patch(engine._id, { platforms, updatedAt: Date.now() });
  },
});

export const disconnectPlatform = mutation({
  args: {
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    const platforms = { ...engine.platforms };
    const platKey = args.platform as keyof typeof platforms;
    if (!platforms[platKey]) throw new Error(`Unknown platform: ${args.platform}`);

    platforms[platKey] = { enabled: false, paused: false };
    await ctx.db.patch(engine._id, { platforms, updatedAt: Date.now() });
  },
});

export const generateFlyer = action({
  args: {
    headline: v.optional(v.string()),
    subheadline: v.optional(v.string()),
    cta: v.optional(v.string()),
    platform: v.string(),
    styleId: v.optional(v.id("flyer_design_styles")),
    forceMode: v.optional(v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only"))),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.runQuery(internal.flyer_engine.getEngineStatusInternal);
    const currentMode = args.forceMode || cycleMode(engine?.currentModeIndex || 0);

    const headline = args.headline || pickRandom(HEADLINES);
    const subheadline = args.subheadline || pickRandom(SUBHEADLINES);
    const cta = args.cta || pickRandom(CTAS);

    let imageUrl: string;

    try {
      if (currentMode === "full_ai") {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateFullAiFlyer, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      } else if (currentMode === "ai_bg_svg_text") {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateAiBackgroundWithSvgOverlay, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      } else {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateFlyerSvgOnly, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      }
    } catch (err) {
      // Fallback to SVG-only if AI generation fails
      console.log("AI generation failed, falling back to SVG:", err);
      imageUrl = await ctx.runAction(internal.flyer_templates.generateFlyerSvgOnly, {
        headline,
        subheadline,
        cta,
        platform: args.platform,
      });
    }

    const flyerId = await ctx.runMutation(internal.flyer_engine.saveGeneratedFlyer, {
      engineId: engine?._id,
      generationMode: currentMode,
      headline,
      subheadline,
      cta,
      platform: args.platform,
      imageUrl,
    });

    if (engine) {
      await ctx.runMutation(internal.flyer_engine.incrementEngineCounters, {
        engineId: engine._id,
        modeIndex: engine.currentModeIndex,
      });
    }

    return { flyerId, mode: currentMode, headline, subheadline, cta };
  },
});

export const generateFlyerInternal = internalAction({
  args: {
    headline: v.optional(v.string()),
    subheadline: v.optional(v.string()),
    cta: v.optional(v.string()),
    platform: v.string(),
    forceMode: v.optional(v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only"))),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.runQuery(internal.flyer_engine.getEngineStatusInternal);
    const currentMode = args.forceMode || cycleMode(engine?.currentModeIndex || 0);

    const headline = args.headline || pickRandom(HEADLINES);
    const subheadline = args.subheadline || pickRandom(SUBHEADLINES);
    const cta = args.cta || pickRandom(CTAS);

    let imageUrl: string;

    try {
      if (currentMode === "full_ai") {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateFullAiFlyer, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      } else if (currentMode === "ai_bg_svg_text") {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateAiBackgroundWithSvgOverlay, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      } else {
        imageUrl = await ctx.runAction(internal.flyer_templates.generateFlyerSvgOnly, {
          headline,
          subheadline,
          cta,
          platform: args.platform,
        });
      }
    } catch (err) {
      // Fallback to SVG-only if AI generation fails
      imageUrl = await ctx.runAction(internal.flyer_templates.generateFlyerSvgOnly, {
        headline,
        subheadline,
        cta,
        platform: args.platform,
      });
    }

    const flyerId = await ctx.runMutation(internal.flyer_engine.saveGeneratedFlyer, {
      engineId: engine?._id,
      generationMode: currentMode,
      headline,
      subheadline,
      cta,
      platform: args.platform,
      imageUrl,
    });

    if (engine) {
      await ctx.runMutation(internal.flyer_engine.incrementEngineCounters, {
        engineId: engine._id,
        modeIndex: engine.currentModeIndex,
      });
    }

    return { flyerId, mode: currentMode, headline, subheadline, cta };
  },
});

export const saveGeneratedFlyer = internalMutation({
  args: {
    engineId: v.optional(v.id("flyer_auto_posting_engine")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generated_flyers", {
      engineId: args.engineId || (await ctx.db.query("flyer_auto_posting_engine").first())!._id,
      generationMode: args.generationMode,
      headline: args.headline,
      subheadline: args.subheadline,
      cta: args.cta,
      platform: args.platform,
      imageUrl: args.imageUrl,
      width: 500,
      height: 700,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const incrementEngineCounters = internalMutation({
  args: {
    engineId: v.id("flyer_auto_posting_engine"),
    modeIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.get(args.engineId);
    if (!engine) return;

    await ctx.db.patch(args.engineId, {
      totalGenerated: engine.totalGenerated + 1,
      currentModeIndex: args.modeIndex + 1,
      updatedAt: Date.now(),
    });
  },
});

export const getEngineStatusInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("flyer_auto_posting_engine").first();
  },
});

export const listGeneratedFlyers = query({
  args: {
    limit: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("generated_flyers").withIndex("by_created");
    if (args.platform) {
      q = ctx.db.query("generated_flyers").withIndex("by_platform", (q) => q.eq("platform", args.platform!));
    }
    return await q.order("desc").take(args.limit || 20);
  },
});

export const getFlyerStats = query({
  args: {},
  handler: async (ctx) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    const flyers = await ctx.db.query("generated_flyers").collect();
    const logs = await ctx.db.query("flyer_posting_logs").collect();

    const byPlatform: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    for (const f of flyers) {
      byPlatform[f.platform] = (byPlatform[f.platform] || 0) + 1;
      byMode[f.generationMode] = (byMode[f.generationMode] || 0) + 1;
    }

    return {
      engine,
      totalFlyers: flyers.length,
      byPlatform,
      byMode,
      recentLogs: logs.slice(-20),
    };
  },
});

export const addToQueue = mutation({
  args: {
    flyerId: v.id("generated_flyers"),
    platform: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    return await ctx.db.insert("flyer_posting_queue", {
      flyerId: args.flyerId,
      engineId: engine._id,
      platform: args.platform,
      scheduledFor: args.scheduledFor,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const getQueueItems = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("posting"), v.literal("posted"), v.literal("failed"), v.literal("cancelled"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("flyer_posting_queue").withIndex("by_status");
    if (args.status) {
      q = q.eq("status", args.status);
    }
    return await q.order("asc").take(args.limit || 50);
  },
});

export const getPostingLogs = query({
  args: {
    limit: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("flyer_posting_logs").withIndex("by_created");
    if (args.platform) {
      q = ctx.db.query("flyer_posting_logs").withIndex("by_platform", (q) => q.eq("platform", args.platform!));
    }
    return await q.order("desc").take(args.limit || 30);
  },
});

export const updateQueueStatus = mutation({
  args: {
    queueId: v.id("flyer_posting_queue"),
    status: v.union(v.literal("pending"), v.literal("posting"), v.literal("posted"), v.literal("failed"), v.literal("cancelled")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueId, { status: args.status, error: args.error });
  },
});

export const recordPostingLog = mutation({
  args: {
    flyerId: v.id("generated_flyers"),
    platform: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    await ctx.db.insert("flyer_posting_logs", {
      flyerId: args.flyerId,
      engineId: engine._id,
      platform: args.platform,
      status: args.status,
      postUrl: args.postUrl,
      error: args.error,
      durationMs: args.durationMs,
      createdAt: Date.now(),
    });

    const patch: Record<string, number> = {};
    if (args.status === "success") {
      patch.totalPosted = engine.totalPosted + 1;
    } else {
      patch.totalFailed = engine.totalFailed + 1;
    }
    await ctx.db.patch(engine._id, { ...patch, updatedAt: Date.now() });
  },
});
