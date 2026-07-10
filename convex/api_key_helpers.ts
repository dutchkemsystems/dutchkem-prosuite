import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const verifyApiKey = internalQuery({
  args: { apiKey: v.string() },
  returns: v.object({ valid: v.boolean(), userId: v.optional(v.id("users")) }),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("api_keys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();
    if (!keyRecord || keyRecord.status !== "active") {
      return { valid: false };
    }
    return { valid: true, userId: keyRecord.userId };
  },
});
