import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";

const ENABLED_PLATFORMS = ["linkedin", "facebook", "instagram", "youtube", "reddit", "threads", "telegram", "discord"];

export const autoPostTick = internalAction({
  args: {},
  handler: async (ctx) => {
    const engine = await ctx.runQuery(internal.flyer_engine.getEngineStatusInternal);
    if (!engine || engine.status !== "running") {
      return { skipped: true, reason: "Engine not running" };
    }

    const enabledPlatforms = ENABLED_PLATFORMS.filter(
      (p) => engine.platforms[p as keyof typeof engine.platforms]?.enabled
        && !engine.platforms[p as keyof typeof engine.platforms]?.paused
    );

    if (enabledPlatforms.length === 0) {
      return { skipped: true, reason: "No enabled platforms" };
    }

    const results: Array<{ platform: string; status: string; flyerId?: string; error?: string }> = [];

    for (const platform of enabledPlatforms.slice(0, 3)) {
      try {
        const flyerResult = await ctx.runAction(internal.flyer_engine.generateFlyerInternal, {
          platform,
          forceMode: undefined,
        });

        const postResult = await ctx.runAction(internal.flyer_posting.postToPlatform, {
          flyerId: flyerResult.flyerId,
          platform,
        });

        results.push({
          platform,
          status: postResult.success ? "posted" : "failed",
          flyerId: flyerResult.flyerId,
          error: postResult.error,
        });
      } catch (err) {
        results.push({
          platform,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    await ctx.runMutation(internal.flyer_posting.updateEngineTick, {
      lastTickAt: Date.now(),
    });

    return { posted: results.length, results };
  },
});

export const updateEngineTick = internalMutation({
  args: {
    lastTickAt: v.number(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) return;

    const nextTickAt = args.lastTickAt + engine.postingIntervalHours * 60 * 60 * 1000;
    await ctx.db.patch(engine._id, {
      lastTickAt: args.lastTickAt,
      nextTickAt,
      updatedAt: Date.now(),
    });
  },
});

export const postToPlatform = internalAction({
  args: {
    flyerId: v.id("generated_flyers"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const flyer = await ctx.runQuery(internal.flyer_posting.getFlyerForPost, { flyerId: args.flyerId });
    if (!flyer) return { success: false, error: "Flyer not found" };

    const startTime = Date.now();

    try {
      const postContent = `${flyer.headline}\n\n${flyer.subheadline || ''}\n\n${flyer.cta}\n\n#DutchkemVentures #ProSuiteNG #AI #Automation`;

      const socialResult = await ctx.runAction(internal.flyer_posting.postViaSocialEngine, {
        platform: args.platform,
        content: postContent,
        imageUrl: flyer.imageUrl,
      });

      const duration = Date.now() - startTime;

      if (socialResult.success) {
        await ctx.runMutation(internal.flyer_engine.recordPostingLog, {
          flyerId: args.flyerId,
          platform: args.platform,
          status: "success",
          postUrl: socialResult.postUrl,
          durationMs: duration,
        });

        await ctx.runMutation(internal.flyer_posting.updateFlyerStatus, {
          flyerId: args.flyerId,
          status: "posted",
        });

        return { success: true, postUrl: socialResult.postUrl };
      } else {
        await ctx.runMutation(internal.flyer_engine.recordPostingLog, {
          flyerId: args.flyerId,
          platform: args.platform,
          status: "failed",
          error: socialResult.error,
          durationMs: duration,
        });

        return { success: false, error: socialResult.error };
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      await ctx.runMutation(internal.flyer_engine.recordPostingLog, {
        flyerId: args.flyerId,
        platform: args.platform,
        status: "failed",
        error: errorMsg,
        durationMs: duration,
      });

      return { success: false, error: errorMsg };
    }
  },
});

export const getFlyerForPost = internalQuery({
  args: {
    flyerId: v.id("generated_flyers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.flyerId);
  },
});

export const updateFlyerStatus = internalMutation({
  args: {
    flyerId: v.id("generated_flyers"),
    status: v.union(v.literal("generated"), v.literal("posted"), v.literal("failed"), v.literal("queued")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.flyerId, { status: args.status });
  },
});

export const postViaSocialEngine = internalAction({
  args: {
    platform: v.string(),
    content: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.social.postToPlatform, {
        platform: args.platform,
        content: args.content,
        mediaUrls: [args.imageUrl],
        adminToken: "flyer_engine_internal",
      });

      return {
        success: true,
        postUrl: (result as any)?.postUrl || undefined,
        queueId: undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Social engine posting failed";

      if (errorMsg.includes("not connected") || errorMsg.includes("not configured")) {
        return { success: false, error: `${args.platform}: ${errorMsg}` };
      }

      return { success: false, error: errorMsg };
    }
  },
});

export const manualPost = mutation({
  args: {
    flyerId: v.id("generated_flyers"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const engine = await ctx.db.query("flyer_auto_posting_engine").first();
    if (!engine) throw new Error("Engine not initialized");

    await ctx.db.insert("flyer_posting_queue", {
      flyerId: args.flyerId,
      engineId: engine._id,
      platform: args.platform,
      scheduledFor: Date.now(),
      status: "pending",
      createdAt: Date.now(),
    });

    return { queued: true };
  },
});

export const batchGenerate = action({
  args: {
    count: v.number(),
    platforms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Array<{ platform: string; flyerId: string; mode: string }> = [];

    for (let i = 0; i < Math.min(args.count, 10); i++) {
      for (const platform of args.platforms) {
        try {
          const result = await ctx.runAction(internal.flyer_engine.generateFlyerInternal, {
            platform,
          });

          results.push({
            platform,
            flyerId: result.flyerId,
            mode: result.mode,
          });
        } catch (err) {
          // skip failed generation
        }
      }
    }

    return { generated: results.length, results };
  },
});
