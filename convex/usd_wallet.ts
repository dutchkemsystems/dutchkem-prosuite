import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

const FALLBACK_RATE = 1550.00;

export const createUsdWallet = mutation({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (existing) return { success: false, error: "Wallet already exists" };
    const id = await ctx.db.insert("usd_wallets", {
      userId: args.userId, balance: 0, sweepEnabled: false, sweepThreshold: 100,
      isEncrypted: false, createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { success: true, walletId: id };
  },
});

export const creditUsdWallet = mutation({
  args: { userId: v.string(), amount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { success: false, error: "Amount must be positive" };
    const wallet = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!wallet) return { success: false, error: "Wallet not found" };
    await ctx.db.patch(wallet._id, { balance: wallet.balance + args.amount, updatedAt: Date.now() });
    return { success: true, newBalance: wallet.balance + args.amount };
  },
});

export const debitUsdWallet = mutation({
  args: { userId: v.string(), amount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { success: false, error: "Amount must be positive" };
    const wallet = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!wallet) return { success: false, error: "Wallet not found" };
    if (wallet.balance < args.amount) return { success: false, error: "Insufficient balance" };
    await ctx.db.patch(wallet._id, { balance: wallet.balance - args.amount, updatedAt: Date.now() });
    return { success: true, newBalance: wallet.balance - args.amount };
  },
});

export const enableUsdSweep = mutation({
  args: { userId: v.string(), enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!wallet) return { success: false, error: "Wallet not found" };
    await ctx.db.patch(wallet._id, { sweepEnabled: args.enabled, updatedAt: Date.now() });
    return { success: true };
  },
});

export const setUsdSweepThreshold = mutation({
  args: { userId: v.string(), threshold: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (!wallet) return { success: false, error: "Wallet not found" };
    await ctx.db.patch(wallet._id, { sweepThreshold: args.threshold, updatedAt: Date.now() });
    return { success: true };
  },
});

export const fetchCBNExchangeRate = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    let rate = FALLBACK_RATE;
    let source = "fallback";
    try {
      const res = await fetch("https://api.cbn.gov.ng/rates", { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data: any = await res.json();
        if (data?.data?.[0]?.rate) {
          rate = parseFloat(data.data[0].rate);
          source = "cbn";
        }
      }
    } catch {
      // Use fallback
    }
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    await ctx.runMutation(internal.usd_wallet._upsertExchangeRate, {
      fromCurrency: "USD", toCurrency: "NGN", rate, source, effectiveDate: dateStr,
    });
    return { rate, source, date: dateStr };
  },
});

export const _upsertExchangeRate = internalMutation({
  args: { fromCurrency: v.string(), toCurrency: v.string(), rate: v.number(), source: v.string(), effectiveDate: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("exchange_rates")
      .withIndex("by_currencies", (q) => q.eq("fromCurrency", args.fromCurrency).eq("toCurrency", args.toCurrency))
      .order("desc").first();
    if (existing && existing.effectiveDate === args.effectiveDate) {
      await ctx.db.patch(existing._id, { rate: args.rate, source: args.source });
    } else {
      await ctx.db.insert("exchange_rates", { ...args, createdAt: Date.now() });
    }
  },
});

export const convertNgnToUsd = action({
  args: { amountNgn: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const rateData: any = await ctx.runAction(internal.usd_wallet.fetchCBNExchangeRate, {});
    const usdAmount = args.amountNgn / (rateData.rate ?? FALLBACK_RATE);
    return { amountNgn: args.amountNgn, amountUsd: Math.round(usdAmount * 100) / 100, rate: rateData.rate, source: rateData.source };
  },
});

export const convertUsdToNgn = action({
  args: { amountUsd: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const rateData: any = await ctx.runAction(internal.usd_wallet.fetchCBNExchangeRate, {});
    const ngnAmount = args.amountUsd * (rateData.rate ?? FALLBACK_RATE);
    return { amountUsd: args.amountUsd, amountNgn: Math.round(ngnAmount * 100) / 100, rate: rateData.rate, source: rateData.source };
  },
});

export const runUsdAutoSweep = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const wallets: any[] = await ctx.runQuery(internal.usd_wallet._getSweepableWallets);
    let swept = 0;
    for (const wallet of wallets) {
      if (wallet.balance >= wallet.sweepThreshold) {
        await ctx.runMutation(internal.usd_wallet._recordSweep, { walletId: wallet._id, amount: wallet.balance });
        swept++;
      }
    }
    return { swept, total: wallets.length };
  },
});

export const _getSweepableWallets = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("usd_wallets").filter((q) => q.eq(q.field("sweepEnabled"), true)).collect();
  },
});

export const _recordSweep = internalMutation({
  args: { walletId: v.id("usd_wallets"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletId, { lastSweepAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("transaction_analytics", { amountUsd: args.amount, createdAt: Date.now() });
  },
});

export const setupAutoSendToAdmin = mutation({
  args: { adminId: v.string(), currency: v.string(), destinationAccountName: v.string(), destinationAccountNumber: v.string(), destinationBankCode: v.string(), scheduledFrequency: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const activationCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const id = await ctx.db.insert("auto_transfer_config", {
      ...args, isActivated: false, activationCode, manualPasteRequired: true, createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { success: true, configId: id, activationCode };
  },
});

export const activateAutoSend = mutation({
  args: { configId: v.id("auto_transfer_config"), code: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    if (!config) return { success: false, error: "Config not found" };
    if (config.activationCode !== args.code) return { success: false, error: "Invalid activation code" };
    await ctx.db.patch(args.configId, { isActivated: true, updatedAt: Date.now() });
    return { success: true };
  },
});

export const executeAutoSendToAdmin = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    return { success: true, message: "Auto-send executed (placeholder for actual payment API)" };
  },
});

export const getUsdWallet = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  },
});

export const getUsdBalance = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    const wallet = await ctx.db.query("usd_wallets").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return { balance: wallet?.balance ?? 0 };
  },
});

export const getExchangeRates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const rates = await ctx.db.query("exchange_rates").order("desc").take(10);
    return { rates };
  },
});

export const getTransactionAnalytics = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, analytics: [] };
    const analytics = await ctx.db.query("transaction_analytics").order("desc").take(100);
    return { authError: false, analytics };
  },
});
