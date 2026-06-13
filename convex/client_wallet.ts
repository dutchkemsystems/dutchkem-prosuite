import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const getMyWallet = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!wallet) {
      return { balance: 0, pendingWithdrawals: 0, totalEarned: 0, totalWithdrawn: 0 };
    }
    return wallet;
  },
});

export const creditWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { error: "Amount must be positive" };

    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    if (wallet) {
      const newBalance = wallet.balance + args.amount;
      await ctx.db.patch(wallet._id, {
        balance: newBalance,
        totalEarned: wallet.totalEarned + args.amount,
        lastUpdated: now,
      });
      await ctx.db.insert("client_wallet_transactions", {
        userId: args.userId,
        type: "credit",
        amount: args.amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: args.description,
        reference: args.reference,
        createdAt: now,
      });
      return { success: true, newBalance };
    } else {
      const newId = await ctx.db.insert("client_wallets", {
        userId: args.userId,
        balance: args.amount,
        pendingWithdrawals: 0,
        totalEarned: args.amount,
        totalWithdrawn: 0,
        lastUpdated: now,
      });
      await ctx.db.insert("client_wallet_transactions", {
        userId: args.userId,
        type: "credit",
        amount: args.amount,
        balanceBefore: 0,
        balanceAfter: args.amount,
        description: args.description,
        reference: args.reference,
        createdAt: now,
      });
      return { success: true, newBalance: args.amount, walletId: newId };
    }
  },
});

export const debitWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { error: "Amount must be positive" };

    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!wallet || wallet.balance < args.amount) return { error: "Insufficient balance" };

    const now = Date.now();
    const newBalance = wallet.balance - args.amount;
    await ctx.db.patch(wallet._id, { balance: newBalance, lastUpdated: now });
    await ctx.db.insert("client_wallet_transactions", {
      userId: args.userId,
      type: "debit",
      amount: args.amount,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      description: args.description,
      reference: args.reference,
      createdAt: now,
    });
    return { success: true, newBalance };
  },
});

export const getMyTransactions = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("client_wallet_transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const adminCreditWallet = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    if (args.amount <= 0) return { error: "Amount must be positive" };

    const wallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    if (wallet) {
      const newBalance = wallet.balance + args.amount;
      await ctx.db.patch(wallet._id, { balance: newBalance, totalEarned: wallet.totalEarned + args.amount, lastUpdated: now });
      await ctx.db.insert("client_wallet_transactions", {
        userId: args.userId, type: "credit", amount: args.amount,
        balanceBefore: wallet.balance, balanceAfter: newBalance,
        description: `[Admin] ${args.description}`, createdAt: now,
      });
    } else {
      await ctx.db.insert("client_wallets", {
        userId: args.userId, balance: args.amount, pendingWithdrawals: 0,
        totalEarned: args.amount, totalWithdrawn: 0, lastUpdated: now,
      });
    }
    return { success: true };
  },
});
