import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getFullHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      type: v.string(),
      title: v.string(),
      description: v.string(),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
      date: v.number(),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const [subs, projects, txns] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50),
      ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50),
      ctx.db
        .query("client_wallet_transactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50),
    ]);

    const items = [
      ...subs.map((s) => ({
        _id: String(s._id),
        type: "subscription" as const,
        title: `${s.plan} Plan`,
        description: `Subscription ${s.status}`,
        status: s.status,
        date: s.endsAt,
      })),
      ...projects.map((p) => ({
        _id: String(p._id),
        type: "project" as const,
        title: p.name,
        description: `Agent: ${p.agentId} — ${p.status}`,
        status: p.status,
        date: p.createdAt,
      })),
      ...txns.map((t) => ({
        _id: String(t._id),
        type: "payment" as const,
        title: t.description,
        description: `${t.type}: ₦${t.amount}`,
        amount: t.amount,
        date: t.createdAt,
      })),
    ];

    items.sort((a, b) => b.date - a.date);
    return items.slice(0, 100);
  },
});
