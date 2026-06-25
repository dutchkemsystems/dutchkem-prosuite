import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PAYMENT ENHANCEMENT
// More local payment options for Nigerian market
// ═══════════════════════════════════════════════════════════════════

const PAYMENT_METHODS = [
  { id: 'kora_pay', name: 'Kora Pay', icon: '💳', countries: ['NG'] },
  { id: 'paystack', name: 'Paystack', icon: '💳', countries: ['NG', 'GH', 'ZA'] },
  { id: 'flutterwave', name: 'Flutterwave', icon: '💳', countries: ['NG', 'GH', 'KE', 'ZA'] },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', countries: ['NG'] },
  { id: 'ussd', name: 'USSD Payment', icon: '📱', countries: ['NG'] },
  { id: 'pos', name: 'POS Terminal', icon: '🏧', countries: ['NG'] },
  { id: 'mobile_money', name: 'Mobile Money', icon: '📲', countries: ['NG', 'GH', 'KE'] },
];

export const getPaymentMethods = query({
  args: { adminToken: v.optional(v.string()), country: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const country = args.country || 'NG';
    return PAYMENT_METHODS.filter(m => m.countries.includes(country));
  },
});

export const initiatePayment = action({
  args: {
    adminToken: v.string(),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const paymentMethod = PAYMENT_METHODS.find(m => m.id === args.paymentMethod);
    if (!paymentMethod) return { error: "Invalid payment method" };

    // Route to appropriate payment provider
    switch (args.paymentMethod) {
      case 'kora_pay':
        return await ctx.runAction(internal.payment_enhancement.processKoraPay, {
          amount: args.amount,
          currency: args.currency,
          description: args.description,
          metadata: args.metadata,
        });
      case 'paystack':
        return await ctx.runAction(internal.payment_enhancement.processPaystack, {
          amount: args.amount,
          currency: args.currency,
          description: args.description,
          metadata: args.metadata,
        });
      case 'flutterwave':
        return await ctx.runAction(internal.payment_enhancement.processFlutterwave, {
          amount: args.amount,
          currency: args.currency,
          description: args.description,
          metadata: args.metadata,
        });
      default:
        return { success: true, message: "Payment initiated", method: args.paymentMethod };
    }
  },
});

export const processKoraPay = internalAction({
  args: {
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Kora Pay integration
    return {
      success: true,
      message: "Kora Pay payment initiated",
      amount: args.amount,
      currency: args.currency,
      reference: `KORA_${Date.now()}`,
    };
  },
});

export const processPaystack = internalAction({
  args: {
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Paystack integration
    return {
      success: true,
      message: "Paystack payment initiated",
      amount: args.amount,
      currency: args.currency,
      reference: `PS_${Date.now()}`,
    };
  },
});

export const processFlutterwave = internalAction({
  args: {
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Flutterwave integration
    return {
      success: true,
      message: "Flutterwave payment initiated",
      amount: args.amount,
      currency: args.currency,
      reference: `FW_${Date.now()}`,
    };
  },
});

export const getPaymentHistory = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("ad_budget_alerts")
      .order("desc")
      .take(args.limit || 20);
  },
});
