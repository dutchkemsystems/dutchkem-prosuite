import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMessages = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("communication_logs"),
      role: v.union(v.literal("admin"), v.literal("client")),
      content: v.string(),
      timestamp: v.number(),
      read: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("communication_logs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return logs.map((log) => ({
      _id: log._id,
      role: log.direction === "inbound" ? ("client" as const) : ("admin" as const),
      content: log.content,
      timestamp: log.createdAt,
      read: log.status === "sent" || log.status === "delivered",
    }));
  },
});

export const sendMessage = mutation({
  args: {
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("communication_logs", {
      userId,
      type: "email",
      direction: "inbound",
      recipient: "support@dutchkem.com",
      content: args.content,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      title: "New Support Message",
      message: `A client has sent a support message: ${args.content.substring(0, 100)}${args.content.length > 100 ? "..." : ""}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
    });

    return null;
  },
});
