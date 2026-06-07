import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, internalQuery } from "./_generated/server";

/**
 * SHARED SUBSCRIPTION VERIFICATION
 * Used by all 15 agent chat modules to verify user has active payment
 * before delivering AI-generated tasks.
 */

/** Check if user has an active subscription (any service) */
export const hasActiveSubscription = query({
  args: { userId: v.optional(v.id("users")) },
  returns: v.object({ active: v.boolean(), plan: v.optional(v.string()), service: v.optional(v.string()), endsAt: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    const userId = args.userId || (await getAuthUserId(ctx));
    if (!userId) return { active: false };

    const now = Date.now();
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(q.eq(q.field("status"), "active"), q.gt(q.field("endsAt"), now)))
      .order("desc")
      .first();

    if (!sub) return { active: false };
    return { active: true, plan: sub.plan, service: sub.service, endsAt: sub.endsAt };
  },
});

/** Internal version for use in actions/mutations (no auth needed) */
export const checkUserSubscription = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({ active: v.boolean(), plan: v.optional(v.string()), service: v.optional(v.string()), endsAt: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(q.eq(q.field("status"), "active"), q.gt(q.field("endsAt"), now)))
      .order("desc")
      .first();

    if (!sub) return { active: false };
    return { active: true, plan: sub.plan, service: sub.service, endsAt: sub.endsAt };
  },
});
