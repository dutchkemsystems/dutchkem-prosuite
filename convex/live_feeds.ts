import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const createFeed = action({
  args: { feedType: v.string(), title: v.string(), message: v.string(), severity: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    await ctx.runMutation(internal.live_feeds._insertFeed, args);
    return { success: true };
  },
});

export const _insertFeed = internalMutation({
  args: { feedType: v.string(), title: v.string(), message: v.string(), severity: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("live_feeds", { ...args, isRead: false, createdAt: Date.now() });
  },
});

export const getRecentFeeds = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { limit }) => {
    const n = limit ?? 50;
    return await ctx.db.query("live_feeds").order("desc").take(n);
  },
});

export const getUnreadFeeds = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const feeds = await ctx.db.query("live_feeds").order("desc").take(100);
    return feeds.filter((f) => !f.isRead);
  },
});

export const markFeedRead = mutation({
  args: { feedId: v.id("live_feeds") },
  returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.patch(args.feedId, { isRead: true }); },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const feeds = await ctx.db.query("live_feeds").order("desc").take(200);
    let count = 0;
    for (const f of feeds) {
      if (!f.isRead) { await ctx.db.patch(f._id, { isRead: true }); count++; }
    }
    return count;
  },
});

export const getUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const feeds = await ctx.db.query("live_feeds").take(100);
    return feeds.filter((f) => !f.isRead).length;
  },
});

export const broadcastFeed = internalAction({
  args: { feedType: v.string(), title: v.string(), message: v.string(), severity: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    await ctx.runMutation(internal.live_feeds._insertFeed, args);
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: "admin", text: `🔔 ${args.title}\n${args.message}` }),
        });
      }
    } catch { /* silent */ }
    return { success: true };
  },
});
