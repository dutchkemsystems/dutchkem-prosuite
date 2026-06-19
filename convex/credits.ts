import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) return 0;

    const wallet = await ctx.db
      .query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!wallet) return 0;

    return wallet.balance;
  },
});

export const getCreditPackages = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      credits: v.number(),
      price: v.number(),
      label: v.string(),
    })
  ),
  handler: async () => {
    return [
      { id: "p1", credits: 100, price: 1000, label: "Best for light usage" },
      { id: "p2", credits: 500, price: 4500, label: "Save 10%" },
      { id: "p3", credits: 1000, price: 8000, label: "Most Popular! Save 20%" },
      { id: "p4", credits: 5000, price: 35000, label: "Save 30%" },
      { id: "p5", credits: 10000, price: 60000, label: "Save 40%" },
    ];
  },
});

export const addCredits = mutation({
  args: {
    amount: v.number(),
    reference: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newBalance: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) throw new Error("User not found");

    const now = Date.now();

    const wallet = await ctx.db
      .query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (wallet) {
      const newBalance = wallet.balance + args.amount;
      await ctx.db.patch(wallet._id, {
        balance: newBalance,
        totalEarned: wallet.totalEarned + args.amount,
        lastUpdated: now,
      });
      await ctx.db.insert("client_wallet_transactions", {
        userId: user._id,
        type: "credit",
        amount: args.amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: "Credits purchased",
        reference: args.reference,
        createdAt: now,
      });
      return { success: true, newBalance };
    } else {
      await ctx.db.insert("client_wallets", {
        userId: user._id,
        balance: args.amount,
        pendingWithdrawals: 0,
        totalEarned: args.amount,
        totalWithdrawn: 0,
        lastUpdated: now,
      });
      await ctx.db.insert("client_wallet_transactions", {
        userId: user._id,
        type: "credit",
        amount: args.amount,
        balanceBefore: 0,
        balanceAfter: args.amount,
        description: "Credits purchased",
        reference: args.reference,
        createdAt: now,
      });
      return { success: true, newBalance: args.amount };
    }
  },
});

export const getTransactions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("client_wallet_transactions"),
      _creationTime: v.number(),
      userId: v.id("users"),
      type: v.union(
        v.literal("credit"),
        v.literal("debit"),
        v.literal("withdrawal"),
        v.literal("refund")
      ),
      amount: v.number(),
      balanceBefore: v.number(),
      balanceAfter: v.number(),
      description: v.string(),
      reference: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) return [];

    return await ctx.db
      .query("client_wallet_transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});
