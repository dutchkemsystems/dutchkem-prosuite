import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// NIGERIA TAX ACT 2025 — Updated Marginal Rates
// ═══════════════════════════════════════════════════════════════════
const TAX_FREE_THRESHOLD = 800000; // ₦800,000 tax-free threshold

const TAX_BRACKETS_2025 = [
  { up_to: 800000, rate: 0.00 },    // 0% — tax-free threshold
  { up_to: 3000000, rate: 0.15 },   // 15% on ₦800k – ₦3M
  { up_to: 12000000, rate: 0.18 },  // 18% on ₦3M – ₦12M
  { up_to: 25000000, rate: 0.21 },  // 21% on ₦12M – ₦25M
  { up_to: 50000000, rate: 0.23 },  // 23% on ₦25M – ₦50M
  { up_to: Infinity, rate: 0.25 },  // 25% above ₦50M
];

// Small Business CIT: turnover under ₦100M → 0%
const SMALL_BUSINESS_CIT_THRESHOLD = 100000000;
const CIT_RATE = 0.30; // 30% for large companies

// Legacy brackets kept for backward compat with existing tax_wallet calculations
const TAX_BRACKETS = [
  { up_to: 300000, rate: 0.07 },
  { up_to: 600000, rate: 0.11 },
  { up_to: 1100000, rate: 0.15 },
  { up_to: 1600000, rate: 0.19 },
  { up_to: Infinity, rate: 0.24 }
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
  totalTax += 100000;
  return totalTax;
}

// ═══════════════════════════════════════════════════════════════════
// NIGERIA TAX ACT 2025 — New Progressive Calculator
// ═══════════════════════════════════════════════════════════════════
export function calculateTax2025(taxableIncome: number): { taxOwed: number; effectiveRate: number; breakdown: any[] } {
  if (taxableIncome <= 0) return { taxOwed: 0, effectiveRate: 0, breakdown: [] };
  let remaining = taxableIncome;
  let totalTax = 0;
  const breakdown: any[] = [];
  let previousLimit = 0;

  for (const bracket of TAX_BRACKETS_2025) {
    const bracketSize = bracket.up_to === Infinity ? Infinity : bracket.up_to - previousLimit;
    const taxableInBracket = Math.min(remaining, bracketSize);
    if (taxableInBracket <= 0) break;
    const taxForBracket = taxableInBracket * bracket.rate;
    totalTax += taxForBracket;
    breakdown.push({
      range: bracket.up_to === Infinity ? `₦${(previousLimit / 1000000).toFixed(0)}M+` : `₦${(previousLimit / 1000000).toFixed(0)}M – ₦${(bracket.up_to / 1000000).toFixed(0)}M`,
      rate: `${(bracket.rate * 100).toFixed(0)}%`,
      taxableAmount: taxableInBracket,
      tax: taxForBracket,
    });
    remaining -= taxableInBracket;
    previousLimit = bracket.up_to === Infinity ? previousLimit : bracket.up_to;
  }

  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;
  return { taxOwed: Math.round(totalTax), effectiveRate: Math.round(effectiveRate * 10000) / 100, breakdown };
}

export function calculateCIT(annualTurnover: number): { citOwed: number; isSmallBusiness: boolean; exemptionApplied: boolean } {
  if (annualTurnover < SMALL_BUSINESS_CIT_THRESHOLD) {
    return { citOwed: 0, isSmallBusiness: true, exemptionApplied: true };
  }
  return { citOwed: Math.round(annualTurnover * CIT_RATE), isSmallBusiness: false, exemptionApplied: false };
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
    const all = await ctx.db.query("tax_transactions").take(5000);
    return all.filter((t: any) => t.date >= args.startOfYear && t.date <= args.endOfYear);
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

// ═══════════════════════════════════════════════════════════════════
// NIGERIA TAX ACT 2025 — EXPENSE TRACKING
// ═══════════════════════════════════════════════════════════════════

export const seedExpenseCategories = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("expense_categories").take(1);
    if (existing.length > 0) return 0;
    const categories = [
      { name: "Rent", description: "Office/shop rent payments", deductiblePercentage: 100 },
      { name: "Salaries", description: "Employee wages and benefits", deductiblePercentage: 100 },
      { name: "Marketing", description: "Advertising and promotional costs", deductiblePercentage: 100 },
      { name: "Professional Fees", description: "Legal, accounting, consulting fees", deductiblePercentage: 100 },
      { name: "Utilities", description: "Electricity, water, internet", deductiblePercentage: 100 },
      { name: "Transportation", description: "Logistics and travel costs", deductiblePercentage: 80 },
      { name: "Equipment", description: "Tools, machinery, technology", deductiblePercentage: 100 },
      { name: "Insurance", description: "Business insurance premiums", deductiblePercentage: 100 },
    ];
    for (const cat of categories) {
      await ctx.db.insert("expense_categories", { ...cat, isActive: true, createdAt: Date.now() });
    }
    return categories.length;
  },
});

export const getExpenseCategories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => await ctx.db.query("expense_categories").collect(),
});

export const addBusinessExpense = mutation({
  args: {
    category: v.string(),
    description: v.string(),
    amountNgn: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptData: v.optional(v.string()),
    expenseDate: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cat = await ctx.db.query("expense_categories").withIndex("by_name", (q) => q.eq("name", args.category)).first();
    const deductible = cat?.isActive ?? true;
    const deductiblePct = cat?.deductiblePercentage ?? 100;
    const deductibleAmount = Math.round(args.amountNgn * (deductiblePct / 100));
    const taxYear = new Date(args.expenseDate).getFullYear();
    const id = await ctx.db.insert("business_expenses", {
      category: args.category, description: args.description, amountNgn: args.amountNgn,
      receiptUrl: args.receiptUrl, receiptData: args.receiptData, expenseDate: args.expenseDate,
      isDeductible: deductible, deductibleAmount, taxYear, status: "pending", createdAt: Date.now(),
    });
    return { success: true, expenseId: id, deductibleAmount };
  },
});

export const verifyExpense = mutation({
  args: { adminToken: v.string(), expenseId: v.id("business_expenses"), approved: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.expenseId, {
      status: args.approved ? "verified" : "rejected",
      verifiedBy: (identity as any)?._id ?? "admin",
      verifiedAt: Date.now(),
    });
    return { success: true };
  },
});

export const listBusinessExpenses = query({
  args: { taxYear: v.optional(v.number()), category: v.optional(v.string()), status: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("business_expenses");
    if (args.taxYear) q = q.withIndex("by_tax_year", (q2: any) => q2.eq("taxYear", args.taxYear!));
    const all = await q.order("desc").take(200);
    return all.filter((e: any) => {
      if (args.category && e.category !== args.category) return false;
      if (args.status && e.status !== args.status) return false;
      return true;
    });
  },
});

export const getExpenseSummary = query({
  args: { taxYear: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const year = args.taxYear ?? new Date().getFullYear();
    const expenses = await ctx.db.query("business_expenses").withIndex("by_tax_year", (q) => q.eq("taxYear", year)).take(500);
    const verified = expenses.filter((e: any) => e.status === "verified");
    const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amountNgn, 0);
    const totalDeductible = verified.reduce((sum: number, e: any) => sum + e.deductibleAmount, 0);
    const byCategory: Record<string, number> = {};
    for (const e of verified) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.deductibleAmount;
    return { year, totalExpenses: expenses.length, verifiedCount: verified.length, totalSpent, totalDeductible, byCategory };
  },
});

// ═══════════════════════════════════════════════════════════════════
// NIGERIA TAX ACT 2025 — FULL TAX CALCULATION
// ═══════════════════════════════════════════════════════════════════

export const calculateFullTax2025 = action({
  args: { adminToken: v.string(), annualIncome: v.number(), annualTurnover: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity: any = await ctx.runQuery(internal.tax._validateAdminSession, { adminToken: args.adminToken });
    if (!identity) return { authError: true };

    const expenseSummary: any = await ctx.runQuery(api.tax.getExpenseSummary, { taxYear: new Date().getFullYear() });
    const totalDeductibleExpenses = expenseSummary.totalDeductible ?? 0;
    const taxableIncome = Math.max(0, args.annualIncome - totalDeductibleExpenses);
    const afterThreshold = Math.max(0, taxableIncome - TAX_FREE_THRESHOLD);

    const { taxOwed, effectiveRate, breakdown } = calculateTax2025(afterThreshold);
    const { citOwed, isSmallBusiness, exemptionApplied } = calculateCIT(args.annualTurnover);

    const taxYear = new Date().getFullYear();
    await ctx.runMutation(api.tax._storeTaxCalculation, {
      taxYear, totalIncome: args.annualIncome, totalDeductibleExpenses, taxableIncome: afterThreshold,
      taxFreeThreshold: TAX_FREE_THRESHOLD, effectiveRate, taxOwed, citOwed,
      turnover: args.annualTurnover, isSmallBusiness, breakdown, calculatedBy: "admin-ui",
    });

    return {
      taxYear, totalIncome: args.annualIncome, totalDeductibleExpenses, taxableIncome: afterThreshold,
      taxFreeThreshold: TAX_FREE_THRESHOLD, taxOwed, effectiveRate, citOwed,
      isSmallBusiness, exemptionApplied, breakdown,
      totalTaxLiability: taxOwed + citOwed + 100000,
    };
  },
});

export const _validateAdminSession = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => await tryGetAdminSession(ctx, args.adminToken),
});

export const _storeTaxCalculation = mutation({
  args: {
    taxYear: v.number(), totalIncome: v.number(), totalDeductibleExpenses: v.number(),
    taxableIncome: v.number(), taxFreeThreshold: v.number(), effectiveRate: v.number(),
    taxOwed: v.number(), citOwed: v.number(), turnover: v.number(), isSmallBusiness: v.boolean(),
    breakdown: v.any(), calculatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("tax_calculations", { ...args, createdAt: Date.now() });
  },
});

export const getTaxCalculations = query({
  args: { taxYear: v.optional(v.number()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const year = args.taxYear;
    let q: any = ctx.db.query("tax_calculations");
    if (year) q = q.withIndex("by_tax_year", (q2: any) => q2.eq("taxYear", year!));
    return await q.order("desc").take(args.limit ?? 20);
  },
});

// ═══════════════════════════════════════════════════════════════════
// TAX PAYMENT SCHEDULING & REMINDERS
// ═══════════════════════════════════════════════════════════════════

export const seedTaxPaymentSchedule = internalMutation({
  args: { taxYear: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("tax_payment_schedule").withIndex("by_tax_year", (q) => q.eq("taxYear", args.taxYear)).take(1);
    if (existing.length > 0) return 0;
    const quarters = [
      { quarter: "Q1", dueDate: `${args.taxYear}-03-31` },
      { quarter: "Q2", dueDate: `${args.taxYear}-06-30` },
      { quarter: "Q3", dueDate: `${args.taxYear}-09-30` },
      { quarter: "Q4", dueDate: `${args.taxYear}-12-31` },
    ];
    for (const q of quarters) {
      await ctx.db.insert("tax_payment_schedule", {
        taxYear: args.taxYear, quarter: q.quarter, dueDate: q.dueDate,
        estimatedAmount: 0, paidAmount: 0, status: "upcoming", reminderSent: false, createdAt: Date.now(),
      });
    }
    return 4;
  },
});

export const updatePaymentSchedule = mutation({
  args: { adminToken: v.string(), scheduleId: v.id("tax_payment_schedule"), estimatedAmount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.scheduleId, { estimatedAmount: args.estimatedAmount });
    return { success: true };
  },
});

export const markPaymentPaid = mutation({
  args: { adminToken: v.string(), scheduleId: v.id("tax_payment_schedule"), paidAmount: v.number(), paymentRef: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.scheduleId, {
      paidAmount: args.paidAmount, status: "paid", paymentRef: args.paymentRef, paidAt: Date.now(),
    });
    return { success: true };
  },
});

export const getTaxPaymentSchedule = query({
  args: { taxYear: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const year = args.taxYear ?? new Date().getFullYear();
    return await ctx.db.query("tax_payment_schedule").withIndex("by_tax_year", (q) => q.eq("taxYear", year)).order("asc").take(10);
  },
});

export const getOverduePayments = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db.query("tax_payment_schedule").withIndex("by_status", (q) => q.eq("status", "upcoming")).take(50);
    return all.filter((p: any) => p.dueDate < today);
  },
});

// ═══════════════════════════════════════════════════════════════════
// ANNUAL TAX RETURN GENERATION (FIRS Filing)
// ═══════════════════════════════════════════════════════════════════

export const generateAnnualTaxReturn = action({
  args: { adminToken: v.string(), taxYear: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity: any = await ctx.runQuery(internal.tax._validateAdminSession, { adminToken: args.adminToken });
    if (!identity) return { authError: true };

    const calculations: any[] = await ctx.runQuery(api.tax.getTaxCalculations, { taxYear: args.taxYear, limit: 10 });
    const expenses: any = await ctx.runQuery(api.tax.getExpenseSummary, { taxYear: args.taxYear });
    const payments: any[] = await ctx.runQuery(api.tax.getTaxPaymentSchedule, { taxYear: args.taxYear });

    const totalPaid = payments.filter((p: any) => p.status === "paid").reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const latestCalc = calculations[0];

    const filing = {
      taxYear: args.taxYear,
      tin: "2512403526652",
      rcNumber: "9489855",
      businessName: "Dutchkem Ventures",
      businessType: "Sole Proprietorship",
      totalIncome: latestCalc?.totalIncome ?? 0,
      totalExpenses: expenses.totalDeductible ?? 0,
      taxableIncome: latestCalc?.taxableIncome ?? 0,
      taxFreeThreshold: TAX_FREE_THRESHOLD,
      incomeTaxOwed: latestCalc?.taxOwed ?? 0,
      citOwed: latestCalc?.citOwed ?? 0,
      developmentLevy: 100000,
      totalTaxLiability: (latestCalc?.taxOwed ?? 0) + (latestCalc?.citOwed ?? 0) + 100000,
      totalTaxPaid: totalPaid,
      balanceDue: Math.max(0, ((latestCalc?.taxOwed ?? 0) + (latestCalc?.citOwed ?? 0) + 100000) - totalPaid),
      expenseBreakdown: expenses.byCategory ?? {},
      paymentHistory: payments.map((p: any) => ({ quarter: p.quarter, due: p.dueDate, paid: p.paidAmount, status: p.status })),
      generatedAt: new Date().toISOString(),
    };

    return filing;
  },
});

// ═══════════════════════════════════════════════════════════════════
// TAX COMPLIANCE DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export const getTaxComplianceDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = adminToken ? await tryGetAdminSession(ctx, adminToken) : null;
    if (!identity) return { authError: true };

    const currentYear = new Date().getFullYear();
    const expenses: any = await (async () => {
      const all = await ctx.db.query("business_expenses").withIndex("by_tax_year", (q) => q.eq("taxYear", currentYear)).take(500);
      const verified = all.filter((e: any) => e.status === "verified");
      return {
        total: all.length, verified: verified.length,
        totalSpent: all.reduce((s: number, e: any) => s + e.amountNgn, 0),
        totalDeductible: verified.reduce((s: number, e: any) => s + e.deductibleAmount, 0),
      };
    })();

    const calculations = await ctx.db.query("tax_calculations").withIndex("by_tax_year", (q) => q.eq("taxYear", currentYear)).take(5);
    const payments = await ctx.db.query("tax_payment_schedule").withIndex("by_tax_year", (q) => q.eq("taxYear", currentYear)).take(10);
    const latestCalc = calculations[0];

    const today = new Date().toISOString().slice(0, 10);
    const overdue = payments.filter((p: any) => p.status === "upcoming" && p.dueDate < today);
    const upcoming = payments.filter((p: any) => p.status === "upcoming" && p.dueDate >= today);

    return {
      authError: false, taxYear: currentYear, taxFreeThreshold: TAX_FREE_THRESHOLD,
      latestCalculation: latestCalc ?? null,
      expenses, payments: { total: payments.length, overdue: overdue.length, upcoming: upcoming.length, paid: payments.filter((p: any) => p.status === "paid").length },
      overduePayments: overdue, upcomingPayments: upcoming,
    };
  },
});

export const _checkOverduePayments = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = await ctx.db.query("tax_payment_schedule").withIndex("by_status", (q) => q.eq("status", "upcoming")).take(50);
    let overdueCount = 0;
    for (const payment of upcoming) {
      if (payment.dueDate < today) {
        await ctx.db.patch(payment._id, { status: "overdue" });
        overdueCount++;
      }
    }
    return overdueCount;
  },
});
