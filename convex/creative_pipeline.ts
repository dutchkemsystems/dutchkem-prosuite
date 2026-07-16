import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED CREATIVE PIPELINE - 24/7 Generation & Posting
// ═══════════════════════════════════════════════════════════════════
// Generates flyers, posters, and videos automatically
// Posts to social media platforms on schedule
// Follows existing 3x daily posting times (8AM, 12PM, 6PM WAT)

// ─── CONTENT TEMPLATES ───

const FLYER_TEMPLATES = [
  {
    id: "saas_product",
    headline: "Scale Your Business With AI",
    features: ["15 expert AI agents", "24/7 automation", "No coding required"],
    cta: "Get Started Free",
    style: "modern",
  },
  {
    id: "enterprise_solution",
    headline: "Enterprise AI Made Simple",
    features: ["Join 10,000+ businesses", "Reduce costs by 60%", "Digital transformation"],
    cta: "Book a Demo",
    style: "corporate",
  },
  {
    id: "startup_boost",
    headline: "Your 24/7 Digital Workforce",
    features: ["AI agents that work while you sleep", "Scale without hiring", "Start in minutes"],
    cta: "Start Your Trial",
    style: "vibrant",
  },
  {
    id: "freelancer_tool",
    headline: "Work Smarter, Not Harder",
    features: ["Deliver 10x more projects", "AI-powered tools", "All automated"],
    cta: "Activate AI Now",
    style: "modern",
  },
  {
    id: "ecommerce_boost",
    headline: "Boost Revenue 10x With AI",
    features: ["Automate customer support", "Optimize pricing", "Maximize conversions"],
    cta: "See It In Action",
    style: "vibrant",
  },
  {
    id: "academic_writing",
    headline: "Ace Your Next Assignment",
    features: ["AI-powered thesis writing", "APA/MLA formatting", "100% plagiarism-free"],
    cta: "Start Writing",
    style: "minimal",
  },
  {
    id: "content_creation",
    headline: "Create Viral Content in Minutes",
    features: ["SEO-optimized blog posts", "Social media content", "Email campaigns"],
    cta: "Create Now",
    style: "vibrant",
  },
  {
    id: "video_production",
    headline: "Professional Videos Without a Studio",
    features: ["AI-powered video scripts", "Storyboards", "Editing guidance"],
    cta: "Start Creating",
    style: "modern",
  },
  {
    id: "nigerian_business",
    headline: "Built for Nigeria, Powered by AI",
    features: ["Kora Pay integration", "WhatsApp support", "Naira pricing"],
    cta: "Join Now",
    style: "vibrant",
  },
  {
    id: "finance_pro",
    headline: "Take Control of Your Finances",
    features: ["AI budgeting tools", "Investment planning", "Debt management"],
    cta: "Start Saving",
    style: "corporate",
  },
  {
    id: "career_boost",
    headline: "Land Your Dream Job",
    features: ["AI-powered CV writing", "Interview coaching", "LinkedIn optimization"],
    cta: "Upgrade Your Career",
    style: "modern",
  },
  {
    id: "exam_prep",
    headline: "Pass Any Exam With AI",
    features: ["JAMB, WAEC, NECO prep", "Practice tests", "Study plans"],
    cta: "Start Studying",
    style: "minimal",
  },
];

const POSTER_TEMPLATES = [
  {
    id: "product_launch",
    headline: "Introducing Dutchkem ProSuite NG+",
    subheadline: "15 AI Agents Working 24/7 For Your Business",
    cta: "Try Free Today",
    style: "modern",
  },
  {
    id: "webinar",
    headline: "Free AI Workshop",
    subheadline: "Learn How to Automate Your Business in 60 Minutes",
    cta: "Register Now",
    style: "corporate",
  },
  {
    id: "flash_sale",
    headline: "Limited Time Offer",
    subheadline: "50% Off All AI Agent Subscriptions",
    cta: "Claim Your Discount",
    style: "vibrant",
  },
  {
    id: "success_story",
    headline: "Join 10,000+ Happy Customers",
    subheadline: "See How AI Transformed Their Businesses",
    cta: "Read Success Stories",
    style: "minimal",
  },
  {
    id: "nigerian_market",
    headline: "AI Made for Nigeria",
    subheadline: "Kora Pay, WhatsApp, Naira Pricing — All Built In",
    cta: "Start Free",
    style: "vibrant",
  },
  {
    id: "agent_showcase",
    headline: "Meet Your 15 AI Agents",
    subheadline: "Academic, Business, Content, Finance & More",
    cta: "Explore Agents",
    style: "modern",
  },
];

const VIDEO_TEMPLATES = [
  {
    id: "product_demo",
    headline: "See Dutchkem ProSuite in Action",
    features: ["15 AI agents", "Real-time automation", "Instant results"],
    cta: "Watch Demo",
    style: "professional",
  },
  {
    id: "testimonial",
    headline: "What Our Customers Say",
    features: ["Real results", "Happy customers", "Proven success"],
    cta: "Join Them",
    style: "engaging",
  },
  {
    id: "feature_highlight",
    headline: "Meet Your New AI Workforce",
    features: ["Academic writing", "Business planning", "Content creation"],
    cta: "Start Free Trial",
    style: "dynamic",
  },
];

// ─── INTERNAL: Enable Pipeline (for system use) ───

export const enablePipelineInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("creative_pipeline_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creative_pipeline_status", {
        enabled: true,
        lastRun: now,
        nextRun: now + 4 * 60 * 60 * 1000,
        totalGenerated: 0,
        totalPosted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ─── CREATIVE PIPELINE STATUS ───

export const getPipelineStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const status = await ctx.db.query("creative_pipeline_status").first();
    if (!status) {
      return {
        enabled: false,
        lastRun: null,
        nextRun: null,
        totalGenerated: 0,
        totalPosted: 0,
      };
    }
    return status;
  },
});

// ─── TOGGLE PIPELINE ───

export const togglePipeline = mutation({
  args: {
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("creative_pipeline_status").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creative_pipeline_status", {
        enabled: args.enabled,
        lastRun: now,
        nextRun: now + 4 * 60 * 60 * 1000,
        totalGenerated: 0,
        totalPosted: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, enabled: args.enabled };
  },
});

// ─── GENERATE FLYER ───

export const generateFlyer = action({
  args: {
    templateId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = args.templateId
      ? FLYER_TEMPLATES.find(t => t.id === args.templateId)
      : FLYER_TEMPLATES[Math.floor(Math.random() * FLYER_TEMPLATES.length)];

    if (!template) return { error: "Template not found" };

    const result = await ctx.runAction(internal.ai_image_generator.generateFlyerImage, {
      adminToken: args.adminToken,
      headline: template.headline,
      features: template.features,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      style: template.style,
    });

    return result;
  },
});

// ─── GENERATE POSTER ───

export const generatePoster = action({
  args: {
    templateId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = args.templateId
      ? POSTER_TEMPLATES.find(t => t.id === args.templateId)
      : POSTER_TEMPLATES[Math.floor(Math.random() * POSTER_TEMPLATES.length)];

    if (!template) return { error: "Template not found" };

    const result = await ctx.runAction(internal.ai_image_generator.generatePosterImage, {
      adminToken: args.adminToken,
      headline: template.headline,
      subheadline: template.subheadline,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      style: template.style,
    });

    return result;
  },
});

// ─── GENERATE VIDEO ───

export const generateVideo = action({
  args: {
    templateId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = args.templateId
      ? VIDEO_TEMPLATES.find(t => t.id === args.templateId)
      : VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)];

    if (!template) return { error: "Template not found" };

    const result = await ctx.runAction(internal.ai_image_generator.generatePromoVideo, {
      adminToken: args.adminToken,
      agentId: "A3", // Content Pro agent
      headline: template.headline,
      features: template.features,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      duration: 5,
    });

    return result;
  },
});

// ─── AUTOMATED PIPELINE TICK (Called by Cron) ───

export const pipelineTick = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const status = await ctx.runQuery(internal.creative_pipeline.getPipelineStatusInternal);
    if (!status || !status.enabled) {
      return { skipped: true, reason: "Pipeline disabled" };
    }

    const now = Date.now();
    const results: Array<{ type: string; success: boolean; id?: string; error?: string }> = [];

    // Generate 1 flyer (using NoAuth version)
    try {
      const flyerResult = await ctx.runAction(internal.creative_pipeline.generateFlyerInternalNoAuth, {});
      if (flyerResult.success) {
        results.push({ type: "flyer", success: true, id: flyerResult.flyerId });
      } else {
        results.push({ type: "flyer", success: false, error: flyerResult.error });
      }
    } catch (err: any) {
      results.push({ type: "flyer", success: false, error: err.message });
    }

    // Generate 1 poster (using NoAuth version)
    try {
      const posterResult = await ctx.runAction(internal.creative_pipeline.generatePosterInternalNoAuth, {});
      if (posterResult.success) {
        results.push({ type: "poster", success: true, id: posterResult.posterId });
      } else {
        results.push({ type: "poster", success: false, error: posterResult.error });
      }
    } catch (err: any) {
      results.push({ type: "poster", success: false, error: err.message });
    }

    // Generate 1 video every other tick (using NoAuth version)
    if (Math.random() < 0.5) {
      try {
        const videoResult = await ctx.runAction(internal.creative_pipeline.generateVideoInternalNoAuth, {});
        if (videoResult.success) {
          results.push({ type: "video", success: true, id: videoResult.videoId });
        } else {
          results.push({ type: "video", success: false, error: videoResult.error });
        }
      } catch (err: any) {
        results.push({ type: "video", success: false, error: err.message });
      }
    }

    // Update pipeline status
    const successCount = results.filter(r => r.success).length;
    await ctx.runMutation(internal.creative_pipeline.updatePipelineStatus, {
      lastRun: now,
      generated: successCount,
    });

    return {
      success: true,
      timestamp: now,
      generated: successCount,
      results,
    };
  },
});

// ─── INTERNAL HELPERS ───

export const getPipelineStatusInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("creative_pipeline_status").first();
  },
});

// ─── INTERNAL: NoAuth Generation Functions ───

// FREE IMAGE GENERATION: Pollinations.ai (no API key required)
async function generateWithPollinations(prompt: string, width: number, height: number): Promise<string | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
    const response = await fetch(url, { redirect: "follow" });
    if (response.ok) {
      return response.url;
    }
  } catch (e: any) {
    console.error("[CREATIVE] Pollinations.ai failed:", e?.message || e);
  }
  return null;
}

// FREE VIDEO GENERATION: HuggingFace Inference API (free tier)
async function generateVideoWithHuggingFace(prompt: string): Promise<string | null> {
  const hfKey = process.env.VITE_HUGGINGFACE_API_TOKEN;
  if (!hfKey) return null;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 1000) {
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:video/mp4;base64,${base64}`;
      }
    }
  } catch (e: any) {
    console.error("[CREATIVE] HuggingFace video failed:", e?.message || e);
  }
  return null;
}

export const generateFlyerInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = FLYER_TEMPLATES[Math.floor(Math.random() * FLYER_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Marketing flyer design for "${template.headline}".
    Features: ${template.features.join(", ")}.
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, vibrant, eye-catching.
    Format: vertical flyer, high quality, print-ready.
    Include website URL: https://dutchkem-prosuite-app.vercel.app`;

    // Try Replicate first
    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "ideogram-ai/ideogram-v3-turbo",
            input: {
              prompt,
              width: 768,
              height: 1344,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 60;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const images = Array.isArray(result.output) ? result.output : [result.output];
            const flyerId = await ctx.runMutation(internal.creative_pipeline.saveFlyerInternal, {
              headline: template.headline,
              features: template.features,
              cta: template.cta,
              imageUrl: images[0],
            });
            return { success: true, flyerId, imageUrl: images[0], model: "Ideogram v3 Turbo" };
          }
        }
      } catch {
        // Replicate failed, falling back to Pollinations.ai
      }
    }

    // Fallback to FREE Pollinations.ai
    const pollinationsUrl = await generateWithPollinations(prompt, 768, 1344);
    if (pollinationsUrl) {
      const flyerId = await ctx.runMutation(internal.creative_pipeline.saveFlyerInternal, {
        headline: template.headline,
        features: template.features,
        cta: template.cta,
        imageUrl: pollinationsUrl,
      });
      return { success: true, flyerId, imageUrl: pollinationsUrl, model: "Pollinations.ai (Free)" };
    }

    return { success: false, error: "All generation methods failed" };
  },
});

export const generatePosterInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = POSTER_TEMPLATES[Math.floor(Math.random() * POSTER_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Professional marketing poster design for "${template.headline}".
    Subtitle: "${template.subheadline}".
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, clean, professional.
    Colors: vibrant, eye-catching.
    Layout: clean typography, strong visual hierarchy.
    Include website URL: https://dutchkem-prosuite-app.vercel.app`;

    // Try Replicate first
    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "ideogram-ai/ideogram-v3-turbo",
            input: {
              prompt,
              width: 1024,
              height: 1024,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 60;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const images = Array.isArray(result.output) ? result.output : [result.output];
            const posterId = await ctx.runMutation(internal.creative_pipeline.savePosterInternal, {
              headline: template.headline,
              subheadline: template.subheadline,
              cta: template.cta,
              imageUrl: images[0],
            });
            return { success: true, posterId, imageUrl: images[0], model: "Ideogram v3 Turbo" };
          }
        }
      } catch {
        // Replicate failed, falling back to Pollinations.ai
      }
    }

    // Fallback to FREE Pollinations.ai
    const pollinationsUrl = await generateWithPollinations(prompt, 1024, 1024);
    if (pollinationsUrl) {
      const posterId = await ctx.runMutation(internal.creative_pipeline.savePosterInternal, {
        headline: template.headline,
        subheadline: template.subheadline,
        cta: template.cta,
        imageUrl: pollinationsUrl,
      });
      return { success: true, posterId, imageUrl: pollinationsUrl, model: "Pollinations.ai (Free)" };
    }

    return { success: false, error: "All generation methods failed" };
  },
});

export const generateVideoInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Promotional video for "${template.headline}".
    Features: ${template.features.join(", ")}.
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, professional, engaging.
    Duration: 5 seconds.
    Include text overlays with key messages.`;

    // Try Replicate first
    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "wan-video/wan-2.5-t2v-fast",
            input: {
              prompt,
              num_frames: 120,
              fps: 24,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 120;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 3000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            const videoId = await ctx.runMutation(internal.creative_pipeline.saveVideoInternal, {
              headline: template.headline,
              features: template.features,
              cta: template.cta,
              videoUrl,
            });
            return { success: true, videoId, videoUrl, model: "Wan 2.5 T2V Fast", duration: 5 };
          }
        }
      } catch {
        // Replicate failed, falling back to HuggingFace
      }
    }

    // Fallback to FREE HuggingFace
    const hfVideoUrl = await generateVideoWithHuggingFace(prompt);
    if (hfVideoUrl) {
      const videoId = await ctx.runMutation(internal.creative_pipeline.saveVideoInternal, {
        headline: template.headline,
        features: template.features,
        cta: template.cta,
        videoUrl: hfVideoUrl,
      });
      return { success: true, videoId, videoUrl: hfVideoUrl, model: "HuggingFace (Free)", duration: 5 };
    }

    return { success: false, error: "All generation methods failed" };
  },
});

// ─── INTERNAL: Save Helpers ───

export const saveFlyerInternal = internalMutation({
  args: {
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    imageUrl: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "flyer",
      headline: args.headline,
      description: args.features.join(". "),
      cta: args.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      imageUrl: args.imageUrl,
      hashtags: ["#AI", "#Business", "#Automation", "#Nigeria"],
      socialPosts: [],
      targetAudience: "entrepreneurs",
      usedCount: 0,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const savePosterInternal = internalMutation({
  args: {
    headline: v.string(),
    subheadline: v.string(),
    cta: v.string(),
    imageUrl: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "poster",
      headline: args.headline,
      description: args.subheadline,
      cta: args.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      imageUrl: args.imageUrl,
      hashtags: ["#AI", "#Marketing", "#Promo", "#Nigeria"],
      socialPosts: [],
      targetAudience: "businesses",
      usedCount: 0,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const saveVideoInternal = internalMutation({
  args: {
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    videoUrl: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "video",
      headline: args.headline,
      description: args.features.join(". "),
      cta: args.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      videoUrl: args.videoUrl,
      hashtags: ["#Video", "#Content", "#AI", "#Marketing"],
      socialPosts: [],
      targetAudience: "creators",
      usedCount: 0,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const generateFlyerInternal = internalAction({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const template = FLYER_TEMPLATES[Math.floor(Math.random() * FLYER_TEMPLATES.length)];
    return await ctx.runAction(internal.ai_image_generator.generateFlyerImage, {
      adminToken: args.adminToken,
      headline: template.headline,
      features: template.features,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      style: template.style,
    });
  },
});

export const generatePosterInternal = internalAction({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const template = POSTER_TEMPLATES[Math.floor(Math.random() * POSTER_TEMPLATES.length)];
    return await ctx.runAction(internal.ai_image_generator.generatePosterImage, {
      adminToken: args.adminToken,
      headline: template.headline,
      subheadline: template.subheadline,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      style: template.style,
    });
  },
});

export const generateVideoInternal = internalAction({
  args: {
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const template = VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)];
    return await ctx.runAction(internal.ai_image_generator.generatePromoVideo, {
      adminToken: args.adminToken,
      agentId: "A3",
      headline: template.headline,
      features: template.features,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      duration: 5,
    });
  },
});

export const updatePipelineStatus = internalMutation({
  args: {
    lastRun: v.number(),
    generated: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("creative_pipeline_status").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastRun: args.lastRun,
        nextRun: args.lastRun + 4 * 60 * 60 * 1000, // Next run in 4 hours
        totalGenerated: existing.totalGenerated + args.generated,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── BATCH GENERATE FOR ALL AGENTS ───

export const batchGenerateForAllAgents = action({
  args: {
    adminToken: v.string(),
    includeImages: v.optional(v.boolean()),
    includeVideos: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results: Array<{ type: string; success: boolean; id?: string; error?: string }> = [];

    // Generate flyers for all templates
    if (args.includeImages !== false) {
      for (const template of FLYER_TEMPLATES) {
        try {
          const result = await ctx.runAction(internal.ai_image_generator.generateFlyerImage, {
            adminToken: args.adminToken,
            headline: template.headline,
            features: template.features,
            cta: template.cta,
            url: "https://dutchkem-prosuite-app.vercel.app",
            style: template.style,
          });
          if (result.success) {
            results.push({ type: `flyer_${template.id}`, success: true, id: result.flyerId });
          } else {
            results.push({ type: `flyer_${template.id}`, success: false, error: result.error });
          }
        } catch (err: any) {
          results.push({ type: `flyer_${template.id}`, success: false, error: err.message });
        }
      }
    }

    // Generate posters for all templates
    if (args.includeImages !== false) {
      for (const template of POSTER_TEMPLATES) {
        try {
          const result = await ctx.runAction(internal.ai_image_generator.generatePosterImage, {
            adminToken: args.adminToken,
            headline: template.headline,
            subheadline: template.subheadline,
            cta: template.cta,
            url: "https://dutchkem-prosuite-app.vercel.app",
            style: template.style,
          });
          if (result.success) {
            results.push({ type: `poster_${template.id}`, success: true, id: result.posterId });
          } else {
            results.push({ type: `poster_${template.id}`, success: false, error: result.error });
          }
        } catch (err: any) {
          results.push({ type: `poster_${template.id}`, success: false, error: err.message });
        }
      }
    }

    // Generate videos for all templates
    if (args.includeVideos) {
      for (const template of VIDEO_TEMPLATES) {
        try {
          const result = await ctx.runAction(internal.ai_image_generator.generatePromoVideo, {
            adminToken: args.adminToken,
            agentId: "A3",
            headline: template.headline,
            features: template.features,
            cta: template.cta,
            url: "https://dutchkem-prosuite-app.vercel.app",
            duration: 5,
          });
          if (result.success) {
            results.push({ type: `video_${template.id}`, success: true, id: result.videoId });
          } else {
            results.push({ type: `video_${template.id}`, success: false, error: result.error });
          }
        } catch (err: any) {
          results.push({ type: `video_${template.id}`, success: false, error: err.message });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: true,
      total: results.length,
      generated: successCount,
      results,
    };
  },
});

// ─── GET GENERATED CONTENT ───

export const getGeneratedFlyers = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .withIndex("by_type", (q) => q.eq("type", "flyer"))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getGeneratedPosters = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .withIndex("by_type", (q) => q.eq("type", "poster"))
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
      .withIndex("by_type", (q) => q.eq("type", "video"))
      .order("desc")
      .take(args.limit || 20);
  },
});
