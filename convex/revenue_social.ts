// convex/revenue_social.ts
// Social Commerce (DM-to-Sale) System — Prosuite NG+
// Converts social engagement into revenue via DM automation,
// buying-intent detection, and conversation-to-sale pipelines.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

/** Get all social commerce conversations, optionally filtered by platform/status */
export const getConversations = query({
  args: {
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    let results = await ctx.db.query("social_commerce_conversations").collect();

    if (args.platform) {
      results = results.filter((c) => c.platform === args.platform);
    }
    if (args.status) {
      results = results.filter((c) => c.status === args.status);
    }

    return results;
  },
});

/** Get aggregated conversation stats */
export const getConversationStats = query({
  args: {
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const conversations = await ctx.db.query("social_commerce_conversations").collect();

    const totalConversations = conversations.length;
    const openConversations = conversations.filter((c) => c.status === "open").length;
    const convertedConversations = conversations.filter((c) => c.convertedToSale).length;
    const totalRevenue = conversations.reduce((sum, c) => sum + (c.saleAmount || 0), 0);
    const avgIntentScore =
      totalConversations > 0
        ? conversations.reduce((sum, c) => sum + (c.buyingIntentScore || 0), 0) / totalConversations
        : 0;
    const conversionRate =
      totalConversations > 0 ? (convertedConversations / totalConversations) * 100 : 0;

    return {
      totalConversations,
      openConversations,
      convertedConversations,
      totalRevenue,
      avgIntentScore: Math.round(avgIntentScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  },
});

/** Get all DM automation rules */
export const getDmRules = query({
  args: {
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("dm_automation_rules").collect();
  },
});

/** Get social engagement logs, optionally filtered by platform with limit */
export const getEngagementLogs = query({
  args: {
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const limit = args.limit || 100;
    let results = await ctx.db.query("social_engagement_logs").collect();

    if (args.platform) {
      results = results.filter((log) => log.platform === args.platform);
    }

    return results.slice(0, limit);
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════

/** Create a new social commerce conversation */
export const createConversation = mutation({
  args: {
    platform: v.string(),
    customerHandle: v.string(),
    conversationData: v.any(),
    buyingIntentScore: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.id("social_commerce_conversations"),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("social_commerce_conversations", {
      platform: args.platform,
      customerHandle: args.customerHandle,
      conversationData: args.conversationData,
      buyingIntentScore: args.buyingIntentScore,
      status: "open",
      convertedToSale: false,
      createdAt: now,
    });
  },
});

/** Update an existing conversation — status, sale data, etc. */
export const updateConversation = mutation({
  args: {
    conversationId: v.id("social_commerce_conversations"),
    status: v.optional(v.string()),
    convertedToSale: v.optional(v.boolean()),
    saleAmount: v.optional(v.number()),
    commissionEarned: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.conversationId);
    if (!existing) throw new Error("Conversation not found");

    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.convertedToSale !== undefined) patch.convertedToSale = args.convertedToSale;
    if (args.saleAmount !== undefined) patch.saleAmount = args.saleAmount;
    if (args.commissionEarned !== undefined) patch.commissionEarned = args.commissionEarned;

    await ctx.db.patch(args.conversationId, patch);
    return null;
  },
});

/** Add a DM automation rule */
export const addDmRule = mutation({
  args: {
    triggerKeywords: v.array(v.string()),
    responseTemplate: v.string(),
    productRecommendation: v.optional(v.string()),
    discountCode: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.id("dm_automation_rules"),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("dm_automation_rules", {
      triggerKeywords: args.triggerKeywords,
      responseTemplate: args.responseTemplate,
      productRecommendation: args.productRecommendation,
      discountCode: args.discountCode,
      isActive: true,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Toggle a DM automation rule active/inactive */
export const toggleDmRule = mutation({
  args: {
    ruleId: v.id("dm_automation_rules"),
    isActive: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.ruleId);
    if (!existing) throw new Error("DM rule not found");

    await ctx.db.patch(args.ruleId, {
      isActive: args.isActive,
    });
    return null;
  },
});

/** Delete a DM automation rule */
export const deleteDmRule = mutation({
  args: {
    ruleId: v.id("dm_automation_rules"),
    adminToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.ruleId);
    if (!existing) throw new Error("DM rule not found");

    await ctx.db.delete(args.ruleId);
    return null;
  },
});

/** Log a social engagement event */
export const logEngagement = mutation({
  args: {
    platform: v.string(),
    postId: v.string(),
    commentText: v.string(),
    buyingIntent: v.number(),
    autoReplied: v.boolean(),
    replyText: v.optional(v.string()),
    converted: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.id("social_engagement_logs"),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("social_engagement_logs", {
      platform: args.platform,
      postId: args.postId,
      commentText: args.commentText,
      buyingIntent: args.buyingIntent,
      autoReplied: args.autoReplied,
      replyText: args.replyText,
      converted: args.converted,
      createdAt: Date.now(),
    });
  },
});

/** Convert a conversation to a sale with 10% commission */
export const convertToSale = mutation({
  args: {
    conversationId: v.id("social_commerce_conversations"),
    amount: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.conversationId);
    if (!existing) throw new Error("Conversation not found");

    const commissionEarned = args.amount * 0.10;

    await ctx.db.patch(args.conversationId, {
      status: "converted",
      convertedToSale: true,
      saleAmount: args.amount,
      commissionEarned,
      convertedAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

/** Detect buying intent from a comment using keyword scoring */
export const detectBuyingIntent = action({
  args: {
    commentText: v.string(),
  },
  returns: v.object({
    score: v.number(),
    matchedKeywords: v.array(v.string()),
    isBuyingIntent: v.boolean(),
  }),
  handler: async (_ctx, args) => {
    const buyingKeywords = [
      "how much",
      "price",
      "cost",
      "buy",
      "purchase",
      "order",
      "available",
      "stock",
      "shipping",
      "delivery",
      "link",
      "where to buy",
      "get this",
      "want this",
      "interested",
    ];

    const interestEmojis = ["🔥", "💯", "😍", "❤️", "👍", "🎉", "💰", "✅", "🙌", "🤯"];
    const lowerText = args.commentText.toLowerCase();

    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of buyingKeywords) {
      if (lowerText.includes(keyword)) {
        score += 20;
        matchedKeywords.push(keyword);
      }
    }

    if (args.commentText.includes("?")) {
      score += 10;
    }

    for (const emoji of interestEmojis) {
      if (args.commentText.includes(emoji)) {
        score += 15;
        break;
      }
    }

    const finalScore = Math.min(score, 100);

    return {
      score: finalScore,
      matchedKeywords,
      isBuyingIntent: finalScore >= 40,
    };
  },
});

/** Generate an auto-reply based on intent score */
export const generateAutoReply = action({
  args: {
    commentText: v.string(),
    intentScore: v.number(),
  },
  returns: v.object({
    reply: v.string(),
  }),
  handler: async (_ctx, args) => {
    let reply: string;

    if (args.intentScore >= 70) {
      reply =
        "Great question! You can purchase directly through our link: " +
        "https://prosuite.ng/shop — Use code SOCIAL10 for 10% off your first order! 🎉";
    } else if (args.intentScore >= 40) {
      reply =
        "Thanks for your interest! We'd love to help. " +
        "Check out our products at https://prosuite.ng/shop or send us a DM for personalized recommendations. 😊";
    } else {
      reply =
        "Thank you for engaging with our content! We appreciate your support. " +
        "If you ever want to learn more about what we offer, feel free to reach out. 💙";
    }

    return { reply };
  },
});
