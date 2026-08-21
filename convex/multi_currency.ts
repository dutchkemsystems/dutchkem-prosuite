import { v } from "convex/values";
import { action, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// MULTI-CURRENCY SUPPORT
// USD, GBP, EUR in addition to NGN
// ═══════════════════════════════════════════════════════════════════

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
type Currency = typeof SUPPORTED_CURRENCIES[number];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

// ─── GET EXCHANGE RATES ───
export const getExchangeRates = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    try {
      // Fetch from a free exchange rate API
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/NGN");
      const data = await response.json();

      if (data.rates) {
        return {
          success: true,
          base: "NGN",
          rates: {
            NGN: 1,
            USD: data.rates.USD || 0.00065,
            GBP: data.rates.GBP || 0.00051,
            EUR: data.rates.EUR || 0.00060,
          },
          lastUpdated: Date.now(),
        };
      }

      // Fallback rates
      return {
        success: true,
        base: "NGN",
        rates: {
          NGN: 1,
          USD: 0.00065,
          GBP: 0.00051,
          EUR: 0.00060,
        },
        lastUpdated: Date.now(),
        fallback: true,
      };
    } catch (e) {
      // Return hardcoded rates as fallback
      return {
        success: true,
        base: "NGN",
        rates: {
          NGN: 1,
          USD: 0.00065,
          GBP: 0.00051,
          EUR: 0.00060,
        },
        lastUpdated: Date.now(),
        fallback: true,
      };
    }
  },
});

// ─── CONVERT AMOUNT ───
export const convertAmount = action({
  args: {
    amount: v.number(),
    from: v.string(),
    to: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    originalAmount: v.number(),
    convertedAmount: v.number(),
    from: v.string(),
    to: v.string(),
    rate: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!SUPPORTED_CURRENCIES.includes(args.from as Currency) || !SUPPORTED_CURRENCIES.includes(args.to as Currency)) {
      return {
        success: false,
        originalAmount: args.amount,
        convertedAmount: 0,
        from: args.from,
        to: args.to,
        rate: 0,
        error: "Unsupported currency",
      };
    }

    if (args.from === args.to) {
      return {
        success: true,
        originalAmount: args.amount,
        convertedAmount: args.amount,
        from: args.from,
        to: args.to,
        rate: 1,
      };
    }

    const ratesData = await ctx.runAction(internal.multi_currency.getExchangeRates, {});
    if (!ratesData.success) {
      return {
        success: false,
        originalAmount: args.amount,
        convertedAmount: 0,
        from: args.from,
        to: args.to,
        rate: 0,
        error: "Failed to fetch exchange rates",
      };
    }

    // Convert: amount * (target_rate / source_rate)
    const sourceRate = ratesData.rates[args.from as Currency] || 1;
    const targetRate = ratesData.rates[args.to as Currency] || 1;
    const rate = targetRate / sourceRate;
    const convertedAmount = Math.round(args.amount * rate * 100) / 100;

    return {
      success: true,
      originalAmount: args.amount,
      convertedAmount,
      from: args.from,
      to: args.to,
      rate,
    };
  },
});

// ─── GET CURRENCY INFO ───
export const getCurrencyInfo = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return {
      supported: SUPPORTED_CURRENCIES,
      symbols: CURRENCY_SYMBOLS,
      default: "NGN",
    };
  },
});

// ─── INITIATE MULTI-CURRENCY PAYMENT ───
export const initiateMultiCurrencyPayment = action({
  args: {
    userId: v.string(),
    packageId: v.string(),
    email: v.string(),
    currency: v.string(),
    adminToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    // Verify admin session
    const session = await ctx.runQuery(internal.auth_helpers.validateAdminSession, {
      adminToken: args.adminToken,
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get package details in NGN
    const packages: Record<string, number> = {
      starter: 1000,
      basic: 5000,
      standard: 8000,
      pro: 15000,
      premium: 35000,
      enterprise: 100000,
    };

    const amountNgn = packages[args.packageId];
    if (!amountNgn) {
      return { success: false, error: "Invalid package" };
    }

    // Convert to target currency if not NGN
    let finalAmount = amountNgn;
    let finalCurrency = "NGN";

    if (args.currency !== "NGN") {
      const conversion = await ctx.runAction(internal.multi_currency.convertAmount, {
        amount: amountNgn,
        from: "NGN",
        to: args.currency,
      });

      if (conversion.success) {
        finalAmount = conversion.convertedAmount;
        finalCurrency = args.currency;
      }
    }

    const reference = `CREDIT-${args.userId.slice(-8)}-${Date.now()}`;

    try {
      // Kora Pay supports multiple currencies
      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency: finalCurrency,
          reference,
          customer: { email: args.email },
          metadata: {
            userId: args.userId,
            type: "credit_purchase",
            packageId: args.packageId,
            originalAmountNgn: amountNgn,
            convertedAmount: finalAmount,
            targetCurrency: finalCurrency,
          },
        }),
      });

      const data = await response.json();
      if (data.status && data.data?.checkout_url) {
        // Store the pending transaction with currency info
        await ctx.runMutation(internal.multi_currency.storeMultiCurrencyTransaction, {
          userId: args.userId,
          type: "credit_purchase",
          reference,
          amount: finalAmount,
          amountNgn,
          currency: finalCurrency,
          packageId: args.packageId,
          credits: amountNgn, // Credits are always based on NGN amount
          email: args.email,
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
          amount: finalAmount,
          currency: finalCurrency,
        };
      }

      return { success: false, error: data.message || "Payment initialization failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Payment system error" };
    }
  },
});

// ─── STORE MULTI-CURRENCY TRANSACTION ───
export const storeMultiCurrencyTransaction = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    reference: v.string(),
    amount: v.number(),
    amountNgn: v.number(),
    currency: v.string(),
    packageId: v.string(),
    credits: v.number(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("kora_pending_transactions", {
      userId: args.userId,
      type: args.type,
      reference: args.reference,
      amount: args.amount,
      packageId: args.packageId,
      credits: args.credits,
      email: args.email,
      currency: args.currency,
      amountNgn: args.amountNgn,
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
  },
});

// ─── GET USER CURRENCY PREFERENCE ───
export const getUserCurrencyPreference = query({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      return { currency: "NGN" };
    }
    return { currency: (user as any).currency || "NGN" };
  },
});

// ─── SET USER CURRENCY PREFERENCE ───
export const setUserCurrencyPreference = mutation({
  args: {
    userId: v.string(),
    currency: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (SUPPORTED_CURRENCIES.includes(args.currency as Currency)) {
      await ctx.db.patch(args.userId as any, {
        currency: args.currency,
      });
    }
    return null;
  },
});

// ─── FORMAT AMOUNT WITH CURRENCY ───
export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  return `${symbol}${amount.toLocaleString()}`;
}

// ─── GET PRICING IN ALL CURRENCIES ───
export const getPricingTable = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const packages = [
      { id: "starter", credits: 1000, priceNgn: 1000 },
      { id: "basic", credits: 5000, priceNgn: 5000 },
      { id: "standard", credits: 8000, priceNgn: 8000 },
      { id: "pro", credits: 15000, priceNgn: 15000 },
      { id: "premium", credits: 35000, priceNgn: 35000 },
      { id: "enterprise", credits: 100000, priceNgn: 100000 },
    ];

    // Approximate rates for static display
    const rates = {
      NGN: 1,
      USD: 0.00065,
      GBP: 0.00051,
      EUR: 0.00060,
    };

    return packages.map((pkg) => ({
      id: pkg.id,
      credits: pkg.credits,
      prices: {
        NGN: pkg.priceNgn,
        USD: Math.round(pkg.priceNgn * rates.USD * 100) / 100,
        GBP: Math.round(pkg.priceNgn * rates.GBP * 100) / 100,
        EUR: Math.round(pkg.priceNgn * rates.EUR * 100) / 100,
      },
    }));
  },
});
