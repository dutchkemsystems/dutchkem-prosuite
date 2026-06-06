import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

const TAX_BRACKETS = [
  { up_to: 300000, rate: 0.07 },   // 7% on first ₦300k
  { up_to: 600000, rate: 0.11 },   // 11% on next ₦300k
  { up_to: 1100000, rate: 0.15 },  // 15% on next ₦500k
  { up_to: 1600000, rate: 0.19 },  // 19% on next ₦500k
  { up_to: Infinity, rate: 0.24 }  // 24% above ₦1.6M
];

function calculateAnnualTax(annualEarnings: number) {
  let remaining = annualEarnings;
  let totalTax = 0;
  let previousLimit = 0;
  
  for (const bracket of TAX_BRACKETS) {
    const taxableInBracket = Math.min(remaining, bracket.up_to - previousLimit);
    if (taxableInBracket <= 0) break;
    totalTax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousLimit = bracket.up_to;
  }
  
  // Add Development Levy (₦100,000 per annum)
  totalTax += 100000;
  
  return totalTax;
}

/**
 * DAILY TAX DEDUCTION
 */
export const runDailyTaxDeduction = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // 1. Get today's earnings (Main Wallet)
    const mainWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).first();
    if (!mainWallet || mainWallet.balance <= 0) return null;

    // Daily earnings is the delta since last deduction, but let's just use 20% of current balance for simplicity 
    // or calculate based on today's approved payments platform fees.
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const payments = await ctx.db.query("payment_verifications")
        .withIndex("by_status_and_verifiedAt", (q) => q.eq("status", "approved").gte("verifiedAt", startOfDay))
        .collect();
    
    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const platformFees = totalRevenue * 0.15; // Your earnings
    
    if (platformFees <= 0) return null;

    // 2. Calculate daily tax based on projected annual earnings
    const projectedAnnual = platformFees * 365;
    const annualTax = calculateAnnualTax(projectedAnnual);
    const dailyTax = annualTax / 365;

    // 3. Move from Main Wallet to Tax Wallet
    const taxWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "tax")).first();
    if (!taxWallet) throw new Error("Tax wallet not found");

    await ctx.db.patch("system_wallets", mainWallet._id, { balance: mainWallet.balance - dailyTax, lastUpdated: Date.now() });
    await ctx.db.patch("system_wallets", taxWallet._id, { balance: taxWallet.balance + dailyTax, lastUpdated: Date.now() });

    // 4. Log Transaction
    await ctx.db.insert("tax_transactions", {
        type: "DAILY_DEDUCTION",
        amount: dailyTax,
        from_wallet: "MAIN_WALLET",
        to_wallet: "TAX_WALLET",
        date: Date.now(),
        earnings_period_start: startOfDay,
        earnings_period_end: Date.now(),
        earnings_amount: platformFees,
        tax_rate_applied: (dailyTax / platformFees) * 100,
        reference: `PIT_D_${Date.now()}`,
        notes: "Automated daily PIT deduction (Sole Proprietorship)"
    });

    console.log(`✅ Daily tax deduction: ₦${dailyTax.toFixed(2)} moved to tax wallet.`);
    return null;
  }
});

/**
 * DAILY INTEREST ACCRUAL
 */
export const runDailyInterestAccrual = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const taxWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "tax")).first();
    const mainWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).first();
    
    if (!taxWallet || !mainWallet || taxWallet.balance <= 0) return null;

    const INTEREST_RATE_DAILY = 0.05 / 365; // 5% per annum
    const interestEarned = taxWallet.balance * INTEREST_RATE_DAILY;

    // 1. Interest is paid to MAIN WALLET
    await ctx.db.patch("system_wallets", mainWallet._id, { balance: mainWallet.balance + interestEarned, lastUpdated: Date.now() });
    
    // 2. Log Interest Earning
    await ctx.db.insert("interest_earnings", {
        date: Date.now(),
        tax_wallet_balance_before: taxWallet.balance,
        interest_rate_daily: INTEREST_RATE_DAILY,
        interest_earned: interestEarned,
        paid_to_wallet: "MAIN_WALLET",
        status: "PAID",
    });

    // 3. Update wallet timestamp
    await ctx.db.patch("system_wallets", taxWallet._id, {
        lastUpdated: Date.now(),
    });

    console.log(`✅ Interest accrued: ₦${interestEarned.toFixed(2)} credited to Main Wallet.`);
    return null;
  }
});

/**
 * GET TAX WALLET STATUS
 */
export const getTaxStatus = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const wallet = await ctx.db.query("system_wallets")
            .withIndex("by_type", q => q.eq("type", "tax"))
            .unique();
        const recentTransactions = await ctx.db.query("tax_transactions")
            .order("desc")
            .take(10);
        return { wallet, recentTransactions };
    }
});

/**
 * ANNUAL TAX FILING + YEAR-END REMITTANCE
 * Runs Dec 31 - calculates total annual tax, files it, remits to PalmPay
 */
export const runAnnualTaxFiling = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const now = new Date();
    const taxYear = now.getFullYear();

    // 1. Get all tax transactions for this year
    const startOfYear = new Date(taxYear, 0, 1).getTime();
    const endOfYear = new Date(taxYear, 11, 31, 23, 59, 59).getTime();

    const allTransactions = await ctx.runQuery(internal.tax.getAnnualTransactions, {
      startOfYear,
      endOfYear,
    });

    const totalDeducted = allTransactions
      .filter((t: any) => t.type === "DAILY_DEDUCTION")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalInterest = allTransactions
      .filter((t: any) => t.type === "INTEREST_ACCRUAL")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // 2. Get current tax wallet balance
    const taxWallet = await ctx.runQuery(internal.tax.getTaxWalletBalance);

    // 3. Calculate CAC annual filing fee (₦100,000 development levy already in tax calc)
    // CAC Annual Return Filing Fee: ~₦50,000
    const cacFilingFee = 50000;

    // 4. Calculate total tax owed (PIT + Development Levy + CAC Filing)
    const annualEarnings = allTransactions
      .filter((t: any) => t.type === "DAILY_DEDUCTION")
      .reduce((sum: number, t: any) => sum + (t.earnings_amount || 0), 0);

    const pitTax = calculateAnnualTax(annualEarnings);
    const totalOwed = pitTax + cacFilingFee;

    // 5. Create annual filing record
    await ctx.runMutation(internal.tax.createAnnualFiling, {
      taxYear,
      totalEarnings: annualEarnings,
      totalTaxOwed: totalOwed,
      totalTaxPaid: totalDeducted,
      balanceDue: Math.max(0, totalOwed - totalDeducted),
      developmentLevy: 100000,
      vatCollected: 0,
      cacFilingFee,
    });

    // 6. Remit to PalmPay account 8121161202 (Oladotun Alabi)
    const remittanceAmount = Math.min(taxWallet, totalOwed);
    if (remittanceAmount > 0) {
      try {
        const result = await ctx.runAction(internal.tax.executeTaxRemittance, {
          amount: remittanceAmount,
          accountNumber: "8121161202",
          bankCode: "999999", // PalmPay
          accountName: "Oladotun Alabi",
          reference: `TAX_FILING_${taxYear}_${Date.now()}`,
        });

        // Update filing status
        await ctx.runMutation(internal.tax.updateFilingStatus, {
          taxYear,
          status: "PAID",
          paymentDate: Date.now(),
        });

        // Deduct from tax wallet
        await ctx.runMutation(internal.tax.deductFromTaxWallet, {
          amount: remittanceAmount,
        });

        console.log(`[TAX] Annual filing: ₦${remittanceAmount.toFixed(2)} remitted to PalmPay 8121161202`);
        return { success: true, amount: remittanceAmount, reference: result.reference };
      } catch (error: any) {
        console.error(`[TAX] Remittance failed: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    return { success: true, message: "Filing complete, no remittance needed" };
  },
});

/**
 * Execute tax remittance via Kora Pay API
 */
export const executeTaxRemittance = internalAction({
  args: {
    amount: v.number(),
    accountNumber: v.string(),
    bankCode: v.string(),
    accountName: v.string(),
    reference: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, args): Promise<any> => {
    const koraSecretKey = process.env.KORA_SECRET_KEY;
    if (!koraSecretKey) throw new Error("KORA_SECRET_KEY not configured");

    const response = await fetch("https://api.korapay.com/v1/transfers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${koraSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: args.amount,
        currency: "NGN",
        beneficiary: {
          name: args.accountName,
          account_number: args.accountNumber,
          bank_code: args.bankCode,
        },
        reference: args.reference,
        narration: "Annual Tax Filing Remittance",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kora Pay transfer failed: ${error}`);
    }

    const data = await response.json();
    return { success: true, reference: args.reference, koraResponse: data };
  },
});

/**
 * Get annual tax transactions (internal query)
 */
export const getAnnualTransactions = internalQuery({
  args: { startOfYear: v.number(), endOfYear: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("tax_transactions")
      .filter(q => q.gte(q.field("date"), args.startOfYear))
      .filter(q => q.lte(q.field("date"), args.endOfYear))
      .collect();
  },
});

/**
 * Get tax wallet balance (internal query)
 */
export const getTaxWalletBalance = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "tax"))
      .first();
    return wallet?.balance || 0;
  },
});

/**
 * Create annual tax filing record
 */
export const createAnnualFiling = internalMutation({
  args: {
    taxYear: v.number(),
    totalEarnings: v.number(),
    totalTaxOwed: v.number(),
    totalTaxPaid: v.number(),
    balanceDue: v.number(),
    developmentLevy: v.number(),
    vatCollected: v.number(),
    cacFilingFee: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("annual_tax_filing", {
      tax_year: args.taxYear,
      total_earnings: args.totalEarnings,
      total_tax_owed: args.totalTaxOwed,
      total_tax_paid_via_deductions: args.totalTaxPaid,
      balance_due: args.balanceDue,
      development_levy: args.developmentLevy,
      vat_collected: args.vatCollected,
      filing_date: Date.now(),
      status: "PENDING",
    });
    return null;
  },
});

/**
 * Update annual filing status
 */
export const updateFilingStatus = internalMutation({
  args: {
    taxYear: v.number(),
    status: v.union(v.literal("FILED"), v.literal("PAID"), v.literal("PENDING")),
    paymentDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const filing = await ctx.db.query("annual_tax_filing")
      .withIndex("by_year", q => q.eq("tax_year", args.taxYear))
      .first();
    if (filing) {
      await ctx.db.patch("annual_tax_filing", filing._id, {
        status: args.status,
        payment_date: args.paymentDate,
      });
    }
    return null;
  },
});

/**
 * Deduct from tax wallet (internal mutation)
 */
export const deductFromTaxWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "tax"))
      .first();
    if (wallet) {
      await ctx.db.patch("system_wallets", wallet._id, {
        balance: Math.max(0, wallet.balance - args.amount),
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});
