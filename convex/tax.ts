import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

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
    
    await ctx.db.patch(mainWallet._id, { balance: mainWallet.balance - dailyTax, lastUpdated: Date.now() });
    await ctx.db.patch(taxWallet!._id, { balance: taxWallet!.balance + dailyTax, lastUpdated: Date.now() });

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
    await ctx.db.patch(mainWallet._id, { balance: mainWallet.balance + interestEarned, lastUpdated: Date.now() });
    
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
    await ctx.db.patch(taxWallet._id, {
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
        const wallet = await ctx.db.query("tax_wallet").first();
        const recentTransactions = await ctx.db.query("tax_transactions")
            .order("desc")
            .take(10);
        return { wallet, recentTransactions };
    }
});
