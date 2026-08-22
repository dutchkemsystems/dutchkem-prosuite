import { v } from "convex/values";
import { action, internalAction, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "../auth_helpers";
import { FLYER_TEMPLATES, POSTER_TEMPLATES, VIDEO_TEMPLATES } from "./templates";

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