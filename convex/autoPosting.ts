// convex/autoPosting.ts
// Auto-posting triggers — fires social posts on key business events
// Additive: integrates with existing flows without modifying them

import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE CONFIG — what to post for each trigger
// ═══════════════════════════════════════════════════════════════════
const TRIGGER_TEMPLATES: Record<string, { template: string; platforms: string[] }> = {
  registration: {
    template: "🎉 Welcome {userName} to Dutchkem Pro Suite! They've just unlocked AI-powered agents for business, finance, content, and more. #NewUser #AI",
    platforms: ["x", "linkedin", "facebook"],
  },
  project_completed: {
    template: "✅ New success story: {userName} just completed a project with the {agentName} agent. Output delivered, client happy. #Success #AIAgents",
    platforms: ["x", "linkedin"],
  },
  referral_milestone: {
    template: "🏆 {userName} just hit a referral milestone with Dutchkem Pro Suite! Earn rewards for sharing the AI revolution. #ReferralWin",
    platforms: ["x", "facebook"],
  },
  weekly_report: {
    template: "📊 Dutchkem Pro Suite Weekly: {activeUsers} active users, {postsCreated} projects completed, {revenue} revenue generated. The AI economy is here. #WeeklyUpdate",
    platforms: ["x", "linkedin", "facebook"],
  },
  flash_sale: {
    template: "🔥 FLASH SALE LIVE: {saleName} — limited time only. Don't miss out on premium AI agents at unbeatable prices. #FlashSale #LimitedTime",
    platforms: ["x", "linkedin", "facebook", "instagram", "tiktok"],
  },
  payment_completed: {
    template: "💳 New subscription: {userName} just upgraded to {planName}. Welcome to the next level of AI productivity. #NewSubscriber",
    platforms: ["x", "linkedin"],
  },
};

// ═══════════════════════════════════════════════════════════════════
// INTERNAL: Build a post from a trigger
// ═══════════════════════════════════════════════════════════════════
function buildPost(trigger: string, vars: Record<string, string>): { content: string; platforms: string[] } | null {
  const tpl = TRIGGER_TEMPLATES[trigger];
  if (!tpl) return null;
  let content = tpl.template;
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`{${key}}`, "g"), val);
  }
  return { content, platforms: tpl.platforms };
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERY: Get all connected platforms
// ═══════════════════════════════════════════════════════════════════
export const getConnectedPlatforms = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections").collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATION: Save the post to social_posts log
// ═══════════════════════════════════════════════════════════════════
export const logAutoPost = internalMutation({
  args: {
    platform: v.string(),
    content: v.string(),
    trigger: v.string(),
    success: v.boolean(),
    postId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      agentId: `auto:${args.trigger}`,
      platform: args.platform,
      content: args.content,
      status: args.success ? "posted" : "failed",
      scheduledFor: Date.now(),
      postedAt: args.success ? Date.now() : undefined,
      externalId: args.postId,
      error: args.success ? undefined : args.error,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Fire an auto-post for a trigger event
// ═══════════════════════════════════════════════════════════════════
export const fireAutoPost = internalAction({
  args: {
    trigger: v.string(),
    vars: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args): Promise<{ fired: number; results: any[] }> => {
    const post = buildPost(args.trigger, args.vars);
    if (!post) return { fired: 0, results: [{ error: `Unknown trigger: ${args.trigger}` }] };

    const connections = await ctx.runQuery(internal.autoPosting.getConnectedPlatforms);
    const results: any[] = [];
    let fired = 0;

    for (const conn of connections) {
      if (!conn.isConnected || !conn.accessToken) continue;
      if (!post.platforms.includes(conn.platformId)) continue;

      try {
        const result: any = await ctx.runAction(internal.autoPosting.postToOnePlatform, {
          platform: conn.platformId,
          accessToken: conn.accessToken,
          content: post.content,
        });

        await ctx.runMutation(internal.autoPosting.logAutoPost, {
          platform: conn.platformId,
          content: post.content,
          trigger: args.trigger,
          success: result.success,
          postId: result.postId,
          error: result.error,
        });

        results.push({ platform: conn.platformId, success: result.success, postId: result.postId });
        if (result.success) fired++;
      } catch (err: any) {
        await ctx.runMutation(internal.autoPosting.logAutoPost, {
          platform: conn.platformId,
          content: post.content,
          trigger: args.trigger,
          success: false,
          error: err?.message || String(err),
        });
        results.push({ platform: conn.platformId, success: false, error: err?.message });
      }
    }

    return { fired, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Post to a single platform (reuses existing platform API code)
// ═══════════════════════════════════════════════════════════════════
export const postToOnePlatform = internalAction({
  args: {
    platform: v.string(),
    accessToken: v.string(),
    content: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; postId?: string; error?: string }> => {
    try {
      const { platform, accessToken, content } = args;
      let res: Response;
      let data: any;

      switch (platform) {
        case "x":
          res = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text: content }),
          });
          data = await res.json();
          return res.ok
            ? { success: true, postId: data.data?.id }
            : { success: false, error: data.detail || data.title || "X post failed" };
        case "linkedin":
          res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              author: "urn:li:person:me",
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: content },
                  shareMediaCategory: "NONE",
                },
              },
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            }),
          });
          return res.ok ? { success: true, postId: "linkedin_post" } : { success: false, error: "LinkedIn post failed" };
        case "facebook":
          res = await fetch(`https://graph.facebook.com/v19.0/me/feed?message=${encodeURIComponent(content)}&access_token=${accessToken}`, { method: "POST" });
          data = await res.json();
          return res.ok ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Facebook post failed" };
        case "reddit":
          res = await fetch("https://oauth.reddit.com/api/submit", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ sr: "self", kind: "self", title: content.substring(0, 100), text: content }).toString(),
          });
          return res.ok ? { success: true, postId: "reddit_post" } : { success: false, error: "Reddit post failed" };
        case "discord":
          res = await fetch("https://discord.com/api/v10/channels/@me/messages", {
            method: "POST",
            headers: { Authorization: `Bot ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          return res.ok ? { success: true, postId: "discord_msg" } : { success: false, error: "Discord post failed" };
        case "telegram":
          // For Telegram, the accessToken IS the bot token
          res = await fetch(`https://api.telegram.org/bot${accessToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: "@dutchkemprosuite", text: content }),
          });
          data = await res.json();
          return data.ok ? { success: true, postId: String(data.result?.message_id) } : { success: false, error: data.description || "Telegram post failed" };
        default:
          return { success: false, error: `Direct posting not implemented for ${platform}` };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC: Trigger from app code (e.g. on user signup, payment, etc.)
// ═══════════════════════════════════════════════════════════════════
export const triggerAutoPost = action({
  args: {
    trigger: v.string(),
    vars: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args): Promise<{ fired: number; results: any[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.runAction(internal.autoPosting.fireAutoPost, {
      trigger: args.trigger,
      vars: args.vars,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: List all available triggers
// ═══════════════════════════════════════════════════════════════════
export const getAvailableTriggers = internalQuery({
  args: {},
  handler: async (): Promise<{ id: string; platforms: string[]; templatePreview: string }[]> => {
    return Object.entries(TRIGGER_TEMPLATES).map(([id, t]) => ({
      id,
      platforms: t.platforms,
      templatePreview: t.template,
    }));
  },
});
