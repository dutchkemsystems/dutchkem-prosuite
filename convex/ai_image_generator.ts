import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AI IMAGE & VIDEO GENERATION SYSTEM
// Uses Replicate, HuggingFace, and open-source libraries
// ═══════════════════════════════════════════════════════════════════

const IMAGE_MODELS = {
  sdxl: { id: "stability-ai/sdxl", name: "SDXL", type: "image" },
  dalle: { id: "openai/dall-e-3", name: "DALL-E 3", type: "image" },
  flux: { id: "black-forest-labs/flux-schnell", name: "Flux", type: "image" },
  Ideogram: { id: "ideogram/ideogram-v2", name: "Ideogram", type: "image" },
};

const VIDEO_MODELS = {
  cogvideo: { id: "minimax/video-01-live", name: "CogVideo", type: "video", maxDuration: 6 },
  wan: { id: "wan-ai/wan2.1-t2v-14b", name: "Wan 2.1", type: "video", maxDuration: 5 },
  svi: { id: "stability-ai/stable-video-diffusion", name: "SVI", type: "video", maxDuration: 4 },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE IMAGE WITH REPLICATE
// ═══════════════════════════════════════════════════════════════════

export const generateImage = action({
  args: {
    adminToken: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    numOutputs: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const modelConfig = IMAGE_MODELS[args.model as keyof typeof IMAGE_MODELS] || IMAGE_MODELS.sdxl;
    const width = args.width || 1024;
    const height = args.height || 1024;
    const numOutputs = args.numOutputs || 1;

    try {
      // Call Replicate API
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: modelConfig.id,
          input: {
            prompt: args.prompt,
            width,
            height,
            num_outputs: numOutputs,
            scheduler: "K_EULER",
            num_inference_steps: 50,
            guidance_scale: 7.5,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Replicate API error: ${response.status} ${error}` };
      }

      const prediction = await response.json();

      // Poll for completion
      let result = prediction;
      const maxAttempts = 60;
      let attempts = 0;

      while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` },
        });
        result = await pollResponse.json();
        attempts++;
      }

      if (result.status === "succeeded" && result.output) {
        const images = Array.isArray(result.output) ? result.output : [result.output];

        // Log generation
        await ctx.runMutation(internal.ai_image_generator.logGeneration, {
          type: "image",
          model: modelConfig.name,
          prompt: args.prompt,
          imageUrls: images,
          status: "success",
          timestamp: Date.now(),
        });

        return {
          success: true,
          images,
          model: modelConfig.name,
          predictionId: result.id,
        };
      }

      return { success: false, error: `Generation failed: ${result.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE VIDEO WITH REPLICATE
// ═══════════════════════════════════════════════════════════════════

export const generateVideo = action({
  args: {
    adminToken: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
    duration: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const modelConfig = VIDEO_MODELS[args.model as keyof typeof VIDEO_MODELS] || VIDEO_MODELS.cogvideo;
    const duration = Math.min(args.duration || 4, modelConfig.maxDuration);
    const fps = args.fps || 24;

    try {
      // Call Replicate API
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: modelConfig.id,
          input: {
            prompt: args.prompt,
            num_frames: duration * fps,
            fps,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Replicate API error: ${response.status} ${error}` };
      }

      const prediction = await response.json();

      // Poll for completion (videos take longer)
      let result = prediction;
      const maxAttempts = 120; // 4 minutes max
      let attempts = 0;

      while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` },
        });
        result = await pollResponse.json();
        attempts++;
      }

      if (result.status === "succeeded" && result.output) {
        const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;

        // Log generation
        await ctx.runMutation(internal.ai_image_generator.logGeneration, {
          type: "video",
          model: modelConfig.name,
          prompt: args.prompt,
          videoUrl,
          status: "success",
          timestamp: Date.now(),
        });

        return {
          success: true,
          videoUrl,
          model: modelConfig.name,
          duration,
          fps,
          predictionId: result.id,
        };
      }

      return { success: false, error: `Generation failed: ${result.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE POSTER IMAGE
// ═══════════════════════════════════════════════════════════════════

export const generatePosterImage = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    style: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Create prompt for AI image generation
    const prompt = `Professional promotional poster design: "${args.headline}" with subtitle "${args.subheadline || ""}". 
    Call to action: "${args.cta}". 
    Style: ${args.style || "modern, clean, professional"}.
    Colors: vibrant, eye-catching.
    Resolution: high quality, crisp text.`;

    // Generate image using Replicate
    const imageResult = await ctx.runAction(internal.ai_image_generator.generateImage, {
      adminToken: args.adminToken,
      prompt,
      model: "sdxl",
      width: 1024,
      height: 1024,
    });

    if (!imageResult.success) {
      return { success: false, error: imageResult.error };
    }

    // Save poster data
    const posterId = await ctx.runMutation(internal.ai_image_generator.savePosterData, {
      headline: args.headline,
      subheadline: args.subheadline,
      cta: args.cta,
      url: args.url,
      style: args.style,
      platform: args.platform,
      imageUrl: imageResult.images[0],
      createdBy: session._id,
    });

    return {
      success: true,
      posterId,
      imageUrl: imageResult.images[0],
      model: imageResult.model,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE FLYER IMAGE
// ═══════════════════════════════════════════════════════════════════

export const generateFlyerImage = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    style: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const featuresText = args.features.join(", ");
    const prompt = `Marketing flyer design: "${args.headline}" with features: ${featuresText}.
    Call to action: "${args.cta}".
    Style: ${args.style || "modern, vibrant, eye-catching"}.
    Format: vertical poster, high quality.`;

    const imageResult = await ctx.runAction(internal.ai_image_generator.generateImage, {
      adminToken: args.adminToken,
      prompt,
      model: "sdxl",
      width: 768,
      height: 1344, // Vertical flyer
    });

    if (!imageResult.success) {
      return { success: false, error: imageResult.error };
    }

    const flyerId = await ctx.runMutation(internal.ai_image_generator.saveFlyerData, {
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      style: args.style,
      platform: args.platform,
      imageUrl: imageResult.images[0],
      createdBy: session._id,
    });

    return {
      success: true,
      flyerId,
      imageUrl: imageResult.images[0],
      model: imageResult.model,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE 30-SECOND VIDEO
// ═══════════════════════════════════════════════════════════════════

export const generatePromoVideo = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    duration: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const featuresText = args.features.join(", ");
    const prompt = `30-second promotional video for "${args.headline}".
    Features: ${featuresText}.
    Call to action: "${args.cta}".
    Style: modern, professional, engaging.
    Duration: ${args.duration || 30} seconds.`;

    const videoResult = await ctx.runAction(internal.ai_image_generator.generateVideo, {
      adminToken: args.adminToken,
      prompt,
      model: "cogvideo",
      duration: args.duration || 30,
      fps: 24,
    });

    if (!videoResult.success) {
      return { success: false, error: videoResult.error };
    }

    const videoId = await ctx.runMutation(internal.ai_image_generator.saveVideoData, {
      agentId: args.agentId,
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      videoUrl: videoResult.videoUrl,
      duration: videoResult.duration,
      platform: args.platform,
      createdBy: session._id,
    });

    return {
      success: true,
      videoId,
      videoUrl: videoResult.videoUrl,
      model: videoResult.model,
      duration: videoResult.duration,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// BATCH GENERATE FOR ALL AGENTS
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", tagline: "Expert Research & Writing Assistance", features: ["Research assistance", "Citation generation", "Professional writing"] },
  { id: "A2", name: "Business Pro", tagline: "Strategic Business Planning & Consulting", features: ["Market analysis", "Financial planning", "Growth strategies"] },
  { id: "A3", name: "Content Pro", tagline: "Viral Content Creation & Marketing", features: ["Social media posts", "Article writing", "Marketing materials"] },
  { id: "A4", name: "Career Pro", tagline: "Land Your Dream Job With AI", features: ["Resume optimization", "Interview coaching", "Career strategy"] },
  { id: "A5", name: "Personal Shopper", tagline: "Smart Shopping & Deal Finding", features: ["Price comparison", "Deal alerts", "Smart recommendations"] },
  { id: "A6", name: "Exam Pro", tagline: "Ace Your Exams With AI", features: ["Study guides", "Practice tests", "Learning paths"] },
  { id: "A7", name: "Finance Pro", tagline: "Take Control of Your Finances", features: ["Budgeting", "Tax planning", "Investment advice"] },
  { id: "A8", name: "MediaStudio Pro", tagline: "Professional Video & Media Creation", features: ["Video editing", "Audio production", "Content creation"] },
  { id: "A9", name: "Wellness Pro", tagline: "Your AI Wellness Coach", features: ["Fitness plans", "Nutrition advice", "Mental health"] },
  { id: "A10", name: "Home Services", tagline: "Trusted Home Service Providers", features: ["Home repairs", "Maintenance", "Vetted professionals"] },
  { id: "A11", name: "Language Tutor", tagline: "Learn Any Language With AI", features: ["Personalized lessons", "Practice conversations", "Progress tracking"] },
  { id: "A12", name: "Travel Planner", tagline: "Plan Your Perfect Trip", features: ["Itineraries", "Deals", "Bookings"] },
  { id: "A13", name: "ServiceMart NG", tagline: "Local Services in Nigeria", features: ["Local professionals", "Service marketplace", "Trusted providers"] },
  { id: "A14", name: "Translation Hub", tagline: "Translate Anything Instantly", features: ["100+ languages", "Context-aware", "Professional quality"] },
  { id: "A15", name: "Event Planner", tagline: "Plan Events Effortlessly", features: ["Venue selection", "Catering", "Coordination"] },
];

export const batchGenerateAgentContent = action({
  args: {
    adminToken: v.string(),
    agentIds: v.optional(v.array(v.string())),
    includeImages: v.optional(v.boolean()),
    includeVideos: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agentIds = args.agentIds || AGENTS.map((a) => a.id);
    const results = [];

    for (const agentId of agentIds) {
      const agent = AGENTS.find((a) => a.id === agentId);
      if (!agent) continue;

      try {
        const agentResult: any = { agentId, agentName: agent.name };

        // Generate poster image
        if (args.includeImages !== false) {
          const imageResult = await ctx.runAction(internal.ai_image_generator.generatePosterImage, {
            adminToken: args.adminToken,
            headline: agent.tagline,
            cta: "Start Free Trial",
            url: "https://dutchkem-prosuite-app.vercel.app/auth",
            style: "modern, professional",
          });
          agentResult.image = imageResult;
        }

        // Generate promo video
        if (args.includeVideos) {
          const videoResult = await ctx.runAction(internal.ai_image_generator.generatePromoVideo, {
            adminToken: args.adminToken,
            agentId: agent.id,
            headline: agent.tagline,
            features: agent.features,
            cta: "Start Free Trial",
            url: "https://dutchkem-prosuite-app.vercel.app/auth",
            duration: 30,
          });
          agentResult.video = videoResult;
        }

        results.push(agentResult);
      } catch (err: any) {
        results.push({ agentId, error: err.message });
      }
    }

    return {
      success: true,
      total: agentIds.length,
      generated: results.filter((r) => r.image?.success || r.video?.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SAVE TO DATABASE
// ═══════════════════════════════════════════════════════════════════

export const savePosterData = internalMutation({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    style: v.optional(v.string()),
    platform: v.optional(v.string()),
    imageUrl: v.string(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "poster",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const saveFlyerData = internalMutation({
  args: {
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    style: v.optional(v.string()),
    platform: v.optional(v.string()),
    imageUrl: v.string(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "flyer",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const saveVideoData = internalMutation({
  args: {
    agentId: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    videoUrl: v.string(),
    duration: v.number(),
    platform: v.optional(v.string()),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "video",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const logGeneration = internalMutation({
  args: {
    type: v.string(),
    model: v.string(),
    prompt: v.string(),
    imageUrls: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    status: v.string(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `aigen_${args.type}`,
      status: args.status === "success" ? "healthy" : "error",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: args.status === "success" ? 1 : 0,
      checksFailed: args.status === "success" ? 0 : 1,
      issuesFound: args.status === "success" ? 0 : 1,
      issuesAutoFixed: 0,
      severity: args.status === "success" ? "info" : "warning",
      timestamp: args.timestamp,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getGeneratedImages = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .filter((q) => q.eq(q.field("type"), "poster").or(q.eq(q.field("type"), "flyer")))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getGeneratedVideos = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .filter((q) => q.eq(q.field("type"), "video"))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getGenerationStats = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = await ctx.db
      .query("mimo_health_logs")
      .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
      .collect();

    const imageGen = recentLogs.filter((l) => l.component === "aigen_image");
    const videoGen = recentLogs.filter((l) => l.component === "aigen_video");

    return {
      today: {
        images: imageGen.length,
        videos: videoGen.length,
        imageSuccess: imageGen.filter((l) => l.status === "healthy").length,
        videoSuccess: videoGen.filter((l) => l.status === "healthy").length,
      },
    };
  },
});
