import { v } from "convex/values";
import { action, internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSessionInAction } from "../auth_helpers";
import { FLYER_TEMPLATES, POSTER_TEMPLATES, VIDEO_TEMPLATES } from "./templates";

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
      agentId: "A3",
      headline: template.headline,
      features: template.features,
      cta: template.cta,
      url: "https://dutchkem-prosuite-app.vercel.app",
      duration: 5,
    });

    return result;
  },
});

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
