import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update Telegram connection with the correct channel ID
 * Run: npx convex run update_telegram_channel:update
 */
export const update = mutation({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db
      .query("platform_connections")
      .filter((q) => q.eq(q.field("platformId"), "telegram"))
      .first();

    if (!conn) {
      return { success: false, message: "No telegram connection found" };
    }

    await ctx.db.patch(conn._id, {
      platformUserId: "-1004382430452",
      platformUsername: "@DutchkemProsuite",
      isConnected: true,
      autoPostEnabled: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Updated Telegram channel to @DutchkemProsuite (ID: -1004382430452)",
    };
  },
});
