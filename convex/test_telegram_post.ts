import { v } from "convex/values";
import { action, internalQuery, internalAction } from "./_generated/server";
import { tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// TEST TELEGRAM POST WITH COMPLIANCE CHECK
// ═══════════════════════════════════════════════════════════════════

export const testTelegramPost = action({
  args: {
    adminToken: v.string(),
    content: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Step 1: Check compliance
    const complianceResult = await ctx.runAction(internal.ad_compliance_enhanced.checkComplianceRealtime, {
      adminToken: args.adminToken,
      adCopy: args.content,
      platform: "telegram",
      autoFix: true,
    });

    if (!complianceResult.passed) {
      return {
        success: false,
        step: "compliance_check",
        error: "Ad failed compliance check",
        violations: complianceResult.violations,
        score: complianceResult.score,
      };
    }

    // Step 2: Get Telegram connection
    const connection = await ctx.runQuery(internal.test_telegram_post.getTelegramConnection, {});
    if (!connection) {
      return { success: false, step: "connection", error: "Telegram not connected" };
    }

    // Step 3: Post to Telegram
    const postResult = await ctx.runAction(internal.test_telegram_post.postToTelegram, {
      botToken: connection.accessToken,
      chatId: connection.platformUserId,
      content: complianceResult.fixedText || args.content,
    });

    return {
      success: postResult.success,
      step: "posted",
      compliance: {
        score: complianceResult.score,
        passed: complianceResult.passed,
        violations: complianceResult.violations,
      },
      post: postResult,
    };
  },
});

// Internal functions
export const getTelegramConnection = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .filter((q: any) => q.eq(q.field("platformId"), "telegram"))
      .first();
  },
});

export const postToTelegram = internalAction({
  args: {
    botToken: v.string(),
    chatId: v.string(),
    content: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${args.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            text: args.content,
            parse_mode: "Markdown",
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        return {
          success: true,
          messageId: result.result.message_id,
          chatId: args.chatId,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          error: result.description || "Failed to send message",
          errorCode: result.error_code,
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});
