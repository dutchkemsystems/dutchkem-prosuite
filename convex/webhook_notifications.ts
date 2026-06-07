import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

export const createWebhook = mutation({
  args: { adminToken: v.string(), url: v.string(), events: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const webhookId = `wh-${Date.now()}`;
    const chars = "0123456789abcdef";
    let secret = "";
    for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
    await ctx.db.insert("webhook_notifications", {
      webhookId, url: args.url, events: args.events, secret, isActive: true, failureCount: 0, createdAt: Date.now(),
    });
    return { success: true, webhookId, secret };
  },
});

export const toggleWebhook = mutation({
  args: { adminToken: v.string(), webhookId: v.string(), isActive: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const wh = await ctx.db.query("webhook_notifications").withIndex("by_webhook_id", (q) => q.eq("webhookId", args.webhookId)).first();
    if (!wh) return { error: "Not found" };
    await ctx.db.patch(wh._id, { isActive: args.isActive });
    return { success: true };
  },
});

export const deleteWebhook = mutation({
  args: { adminToken: v.string(), webhookId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const wh = await ctx.db.query("webhook_notifications").withIndex("by_webhook_id", (q) => q.eq("webhookId", args.webhookId)).first();
    if (!wh) return { error: "Not found" };
    await ctx.db.delete(wh._id);
    return { success: true };
  },
});

export const listWebhooks = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => await ctx.db.query("webhook_notifications").take(50),
});

export const triggerWebhooks = action({
  args: { event: v.string(), payload: v.any() },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const webhooks: any[] = await ctx.runQuery(api.webhook_notifications._getActiveByEvent, { event: args.event });
    let triggered = 0;
    for (const wh of webhooks) {
      try {
        await fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Secret": wh.secret },
          body: JSON.stringify({ event: args.event, payload: args.payload, timestamp: Date.now() }),
          signal: AbortSignal.timeout(10000),
        });
        triggered++;
      } catch { /* silent */ }
    }
    return triggered;
  },
});

export const _getActiveByEvent = query({
  args: { event: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const all = await ctx.db.query("webhook_notifications").filter((q) => q.eq(q.field("isActive"), true)).take(100);
    return all.filter((wh) => wh.events.includes(args.event));
  },
});
