import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { DESIGNATED_ACCOUNT, getWATDate, formatMonth } from "./finance_helpers";

// ═══════════════════════════════════════════════════════════════════
// CAC ANNUAL RETURNS DEDUCTION SERVICE
// Annual fee ÷ 12 → monthly fraction to Tax Wallet
// ═══════════════════════════════════════════════════════════════════

const ANNUAL_CAC_FEE = 100000; // ₦100,000 per year
const MONTHLY_CAC_FRACTION = ANNUAL_CAC_FEE / 12; // ₦8,333.33 per month

/**
 * Monthly CAC deduction (1st of each month)
 * Moves monthly fraction from Main Wallet to Tax Wallet
 */
export const runMonthlyCacDeduction = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const watNow = getWATDate();

    // Only run on the 1st of the month
    if (watNow.getDate() !== 1) return null;

    const taxYear = watNow.getFullYear();
    const monthYear = formatMonth(watNow);

    // Check if already deducted this month
    const existing = await ctx.db
      .query("cac_tax_transactions")
      .withIndex("by_month", (q) => q.eq("monthYear", monthYear))
      .filter((q) => q.eq(q.field("type"), "MONTHLY_DEDUCTION"))
      .first();

    if (existing) {
      console.log(`[CAC] Already deducted for ${monthYear}`);
      return null;
    }

    // Get wallets
    const mainWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "main"))
      .first();
    const taxWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "tax"))
      .first();

    if (!mainWallet || !taxWallet) {
      console.error("[CAC] Main or Tax wallet not found");
      return null;
    }

    if (mainWallet.balance < MONTHLY_CAC_FRACTION) {
      console.warn(`[CAC] Insufficient balance: ₦${mainWallet.balance} < ₦${MONTHLY_CAC_FRACTION}`);
      // Log failed attempt
      await ctx.db.insert("cac_tax_transactions", {
        type: "MONTHLY_DEDUCTION",
        amountNgn: 0,
        balanceBefore: mainWallet.balance,
        balanceAfter: mainWallet.balance,
        date: Date.now(),
        monthYear,
        taxYear,
        annualCacFee: ANNUAL_CAC_FEE,
        monthlyFraction: MONTHLY_CAC_FRACTION,
        cumulativePaid: 0,
        designatedAccount: DESIGNATED_ACCOUNT,
        status: "failed",
        notes: `Insufficient balance: ₦${mainWallet.balance}`,
      });
      return null;
    }

    // Calculate cumulative paid this year
    const yearTx = await ctx.db
      .query("cac_tax_transactions")
      .withIndex("by_tax_year", (q) => q.eq("taxYear", taxYear))
      .filter((q) => q.eq(q.field("type"), "MONTHLY_DEDUCTION"))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const cumulativePaid = yearTx.reduce((sum, t) => sum + t.amountNgn, 0) + MONTHLY_CAC_FRACTION;

    // Deduct from main, add to tax
    await ctx.db.patch("system_wallets", mainWallet._id, {
      balance: mainWallet.balance - MONTHLY_CAC_FRACTION,
      lastUpdated: Date.now(),
    });
    await ctx.db.patch("system_wallets", taxWallet._id, {
      balance: taxWallet.balance + MONTHLY_CAC_FRACTION,
      lastUpdated: Date.now(),
    });

    // Log transaction
    await ctx.db.insert("cac_tax_transactions", {
      type: "MONTHLY_DEDUCTION",
      amountNgn: MONTHLY_CAC_FRACTION,
      balanceBefore: mainWallet.balance,
      balanceAfter: mainWallet.balance - MONTHLY_CAC_FRACTION,
      date: Date.now(),
      monthYear,
      taxYear,
      annualCacFee: ANNUAL_CAC_FEE,
      monthlyFraction: MONTHLY_CAC_FRACTION,
      cumulativePaid,
      designatedAccount: DESIGNATED_ACCOUNT,
      status: "completed",
      notes: `Monthly CAC fraction: ₦${MONTHLY_CAC_FRACTION.toFixed(2)} (${ANNUAL_CAC_FEE}/12)`,
    });

    console.log(`[CAC] Monthly deduction: ₦${MONTHLY_CAC_FRACTION.toFixed(2)} for ${monthYear}`);
    return null;
  },
});

/**
 * Annual CAC filing + year-end remittance to designated account
 */
export const runAnnualCacFiling = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const now = getWATDate();
    const taxYear = now.getFullYear();

    // Only run on Dec 31
    if (now.getMonth() !== 11 || now.getDate() !== 31) {
      return { success: true, message: "Not year-end" };
    }

    // Get all CAC transactions for this year
    const yearTx: Array<any> = await ctx.runQuery(internal.cac_deductions.getCacTransactionsForYear, {
      taxYear,
    });

    const totalDeducted = yearTx
      .filter((t) => t.type === "MONTHLY_DEDUCTION" && t.status === "completed")
      .reduce((sum, t) => sum + t.amountNgn, 0);

    // Get tax wallet balance
    const taxBalance: number = await ctx.runQuery(internal.cac_deductions.getTaxWalletBalance);

    // File annual return
    await ctx.runMutation(internal.cac_deductions.createAnnualFiling, {
      taxYear,
      annualFee: ANNUAL_CAC_FEE,
      totalDeducted,
      cumulativeMonth: 12,
    });

    // Remit total to designated account
    const remittanceAmount = Math.min(taxBalance, ANNUAL_CAC_FEE);
    if (remittanceAmount > 0) {
      const koraSecret = process.env.KORA_SECRET_KEY;
      if (!koraSecret) {
        return { success: false, error: "KORA_SECRET_KEY not configured" };
      }

      const reference = `CAC_${taxYear}_${Date.now()}`;
      try {
        const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${koraSecret}`,
          },
          body: JSON.stringify({
            reference,
            destination: {
              type: "bank_account",
              amount: remittanceAmount,
              currency: "NGN",
              narration: `CAC Annual Filing - ${taxYear}`,
              bank_account: {
                bank: "999999", // PalmPay
                account: DESIGNATED_ACCOUNT,
              },
              customer: {
                name: "Oladotun Alabi",
                email: "dutchkemdeveloper@gmail.com",
              },
            },
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.status) {
          return { success: false, error: data.message || "Kora remittance failed" };
        }

        // Deduct from tax wallet
        await ctx.runMutation(internal.cac_deductions.deductTaxForCac, {
          amount: remittanceAmount,
          reference,
          taxYear,
        });

        console.log(`[CAC] Annual filing: ₦${remittanceAmount} remitted to ${DESIGNATED_ACCOUNT}`);
        return { success: true, amount: remittanceAmount, reference };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    return { success: true, message: "Filing complete, no remittance" };
  },
});

/**
 * Manual CAC remittance (admin-initiated, requires passkey)
 */
export const performManualCacRemittance = mutation({
  args: {
    passkeyId: v.string(),
    passkey: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Verify passkey
    const passkeyRecord: any = await ctx.db
      .query("transfer_passkeys")
      .filter((q) => q.eq(q.field("_id"), args.passkeyId as any))
      .first();

    if (!passkeyRecord) return { success: false, error: "Passkey not found" };
    if (passkeyRecord.isUsed) return { success: false, error: "Passkey already used" };
    if (passkeyRecord.isExpired || Date.now() > passkeyRecord.expiresAt) {
      await ctx.db.patch(passkeyRecord._id, { isExpired: true });
      return { success: false, error: "Passkey expired" };
    }
    if (passkeyRecord.passkey !== args.passkey) {
      return { success: false, error: "Invalid passkey" };
    }

    await ctx.db.patch(passkeyRecord._id, { isUsed: true, usedAt: Date.now() });

    const taxWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "tax"))
      .first();
    if (!taxWallet || taxWallet.balance <= 0) {
      return { success: false, error: "No tax wallet balance" };
    }

    const amount = args.amount || Math.min(taxWallet.balance, ANNUAL_CAC_FEE);
    if (amount > taxWallet.balance) {
      return { success: false, error: "Amount exceeds tax wallet balance" };
    }

    return { success: true, amount, designatedAccount: DESIGNATED_ACCOUNT };
  },
});

/**
 * Get CAC transactions for a tax year
 */
export const getCacTransactionsForYear = internalQuery({
  args: { taxYear: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cac_tax_transactions")
      .withIndex("by_tax_year", (q) => q.eq("taxYear", args.taxYear))
      .collect();
  },
});

/**
 * Get tax wallet balance
 */
export const getTaxWalletBalance = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const wallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "tax"))
      .first();
    return wallet?.balance || 0;
  },
});

/**
 * Create annual filing record
 */
export const createAnnualFiling = internalMutation({
  args: {
    taxYear: v.number(),
    annualFee: v.number(),
    totalDeducted: v.number(),
    cumulativeMonth: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("cac_tax_transactions", {
      type: "ANNUAL_FILING",
      amountNgn: args.totalDeducted,
      balanceBefore: 0,
      balanceAfter: 0,
      date: Date.now(),
      monthYear: `${args.taxYear}-12`,
      taxYear: args.taxYear,
      annualCacFee: args.annualFee,
      monthlyFraction: args.annualFee / 12,
      cumulativePaid: args.totalDeducted,
      designatedAccount: DESIGNATED_ACCOUNT,
      status: "completed",
      notes: `Annual CAC filing for ${args.taxYear}: ₦${args.totalDeducted.toFixed(2)} (${args.cumulativeMonth} months × ₦${(args.annualFee / 12).toFixed(2)})`,
    });
    return null;
  },
});

/**
 * Deduct tax wallet for CAC remittance
 */
export const deductTaxForCac = internalMutation({
  args: {
    amount: v.number(),
    reference: v.string(),
    taxYear: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "tax"))
      .first();
    if (wallet) {
      await ctx.db.patch("system_wallets", wallet._id, {
        balance: Math.max(0, wallet.balance - args.amount),
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.insert("cac_tax_transactions", {
      type: "ANNUAL_PAYMENT",
      amountNgn: args.amount,
      balanceBefore: wallet?.balance || 0,
      balanceAfter: Math.max(0, (wallet?.balance || 0) - args.amount),
      date: Date.now(),
      monthYear: `${args.taxYear}-12`,
      taxYear: args.taxYear,
      annualCacFee: ANNUAL_CAC_FEE,
      monthlyFraction: MONTHLY_CAC_FRACTION,
      cumulativePaid: ANNUAL_CAC_FEE,
      designatedAccount: DESIGNATED_ACCOUNT,
      koraReference: args.reference,
      status: "completed",
      notes: `Annual CAC payment: ₦${args.amount} remitted to ${DESIGNATED_ACCOUNT}. Ref: ${args.reference}`,
    });
    return null;
  },
});

/**
 * Get CAC history
 */
export const getCacHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("cac_tax_transactions")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get CAC statistics
 */
export const getCacStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allTx = await ctx.db.query("cac_tax_transactions").collect();
    const now = getWATDate();
    const taxYear = now.getFullYear();

    const yearTx = allTx.filter((t) => t.taxYear === taxYear);
    const thisYearDeductions = yearTx.filter(
      (t) => t.type === "MONTHLY_DEDUCTION" && t.status === "completed"
    );
    const thisYearTotal = thisYearDeductions.reduce((sum, t) => sum + t.amountNgn, 0);

    const taxWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "tax"))
      .first();

    return {
      currentYear: taxYear,
      annualFee: ANNUAL_CAC_FEE,
      monthlyFraction: MONTHLY_CAC_FRACTION,
      totalDeductedThisYear: thisYearTotal,
      monthsDeducted: thisYearDeductions.length,
      remainingForYear: Math.max(0, ANNUAL_CAC_FEE - thisYearTotal),
      taxWalletBalance: taxWallet?.balance || 0,
      lastDeduction: thisYearDeductions.sort((a, b) => b.date - a.date)[0] || null,
      settings: {
        annualCacFee: ANNUAL_CAC_FEE,
        monthlyFraction: MONTHLY_CAC_FRACTION,
        designatedAccount: DESIGNATED_ACCOUNT,
        bank: "PalmPay",
        name: "Oladotun Alabi",
      },
    };
  },
});
