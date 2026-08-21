import { v } from "convex/values";
import { action, internalMutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession } from "../auth_helpers";

export const listCarousels = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, carousels: [] };
    const carousels = await ctx.db.query("trypost_carousels").order("desc").take(50);
    return { authError: false, carousels };
  },
});

export const generateCarousel = action({
  args: {
    adminToken: v.string(),
    topic: v.string(),
    platform: v.string(),
    slideCount: v.optional(v.number()),
    aiPrompt: v.optional(v.string()),
    scheduleFor: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.trypost;
    const identity = await ctx.runQuery(internalAny._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) throw new Error("Unauthorized");

    const slides: any[] = [];
    const count = args.slideCount ?? 5;
    for (let i = 0; i < count; i++) {
      slides.push({
        slideNumber: i + 1,
        title: `${args.topic} - Slide ${i + 1}`,
        body: `Generated content for slide ${i + 1} about ${args.topic}.`,
        imagePrompt: `Visual depicting ${args.topic}, slide ${i + 1} of ${count}, modern, professional`,
      });
    }

    const id = await ctx.runMutation(internalAny._insertCarousel, {
      topic: args.topic,
      platform: args.platform,
      slides,
      aiPrompt: args.aiPrompt ?? `Generate ${count}-slide carousel about: ${args.topic}`,
      generatedBy: identity._id,
      status: "ready",
      scheduledFor: args.scheduleFor,
    });

    if (args.scheduleFor) {
      await ctx.runMutation(internalAny._scheduleCarousel, {
        carouselId: id,
        scheduledFor: args.scheduleFor,
        platform: args.platform,
        content: `Carousel: ${args.topic}`,
      });
    }

    return { success: true, id, slideCount: count, slides };
  },
});

export const _insertCarousel = internalMutation({
  args: {
    topic: v.string(),
    platform: v.string(),
    slides: v.array(v.any()),
    aiPrompt: v.string(),
    generatedBy: v.id("admin_users"),
    status: v.string(),
    scheduledFor: v.optional(v.number()),
  },
  returns: v.id("trypost_carousels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("trypost_carousels", {
      topic: args.topic,
      platform: args.platform,
      slides: args.slides,
      aiPrompt: args.aiPrompt,
      generatedBy: args.generatedBy,
      status: args.status as "generating" | "ready" | "published" | "failed",
      scheduledFor: args.scheduledFor,
      createdAt: Date.now(),
    });
  },
});

export const _scheduleCarousel = internalMutation({
  args: {
    carouselId: v.id("trypost_carousels"),
    scheduledFor: v.number(),
    platform: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: [args.platform],
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      aiGenerated: true,
      createdBy: "system",
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.carouselId, { status: "ready" as "generating" | "ready" | "published" | "failed" });
  },
});
