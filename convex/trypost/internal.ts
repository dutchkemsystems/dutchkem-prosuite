import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession } from "../auth_helpers";

export const _verifyAdmin = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    return await tryGetAdminSession(ctx, adminToken);
  },
});

export const schedulePostInternal = internalMutation({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.number(),
    hashtags: v.optional(v.array(v.string())),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: args.platforms,
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      hashtags: args.hashtags,
      aiGenerated: true,
      createdBy: "orchestrator",
      createdAt: Date.now(),
    });
    return String(id);
  },
});

export const processDuePosts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const internalAny: any = internal.trypost;
    const now = Date.now();
    const duePosts = await ctx.runQuery(internalAny._getDuePosts, { now });
    let published = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        await ctx.runMutation(internalAny._markPublishing, { id: post._id });

        // Use Composio as the API backbone (MCP server approach)
        // TryPost routes through Composio for OAuth and platform connections
        const composioResult = await ctx.runAction(internal.social.postToPlatform, {
          platform: post.platforms?.[0] || 'twitter',
          content: post.content,
          mediaUrls: post.mediaUrls,
        });

        if (composioResult?.success) {
          await ctx.runMutation(internalAny._markPublished, {
            id: post._id,
            publishedAt: now,
            result: composioResult,
          });
          published++;
        } else {
          // Fallback to direct TryPost API if Composio fails
          const apiKey = process.env.TRYPOST_API_KEY;
          const apiUrl = process.env.TRYPOST_API_URL ?? "http://localhost:4000";

          if (apiKey) {
            const response = await fetch(`${apiUrl}/api/posts/publish`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
              },
              body: JSON.stringify({
                content: post.content,
                mediaUrls: post.mediaUrls,
                platforms: post.platforms,
                carouselSlides: post.carouselSlides,
              }),
            });
            if (response.ok) {
              const result = await response.json();
              await ctx.runMutation(internalAny._markPublished, {
                id: post._id,
                publishedAt: now,
                result,
              });
              published++;
            } else {
              await ctx.runMutation(internalAny._markFailed, {
                id: post._id,
                error: `TryPost API ${response.status}`,
              });
              failed++;
            }
          } else {
            // No TryPost configured — mark as "queued" with note for manual publish
            await ctx.runMutation(internalAny._markQueued, {
              id: post._id,
              note: "TryPost API key not configured - queued for manual publish",
            });
          }
        }
      } catch (e: any) {
        await ctx.runMutation(internalAny._markFailed, {
          id: post._id,
          error: e?.message ?? String(e),
        });
        failed++;
      }
    }

    return { success: true, processed: duePosts.length, published, failed };
  },
});

export const _markPublishing = internalMutation({
  args: { id: v.id("trypost_scheduled_posts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "publishing" });
  },
});

export const _markPublished = internalMutation({
  args: {
    id: v.id("trypost_scheduled_posts"),
    publishedAt: v.number(),
    result: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: args.publishedAt,
      publishResults: args.result,
    });
  },
});

export const _markFailed = internalMutation({
  args: { id: v.id("trypost_scheduled_posts"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "failed", errorMessage: args.error });
  },
});

export const _markQueued = internalMutation({
  args: { id: v.id("trypost_scheduled_posts"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Leave in scheduled state but add note
    const post = await ctx.db.get(args.id);
    if (post) {
      await ctx.db.patch(args.id, { errorMessage: args.note });
    }
  },
});
