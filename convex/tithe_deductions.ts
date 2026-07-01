import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { DESIGNATED_ACCOUNT, getWATDate, formatMonth, getDaysInMonth } from "./finance_helpers";

// ═══════════════════════════════════════════════════════════════════
// TITHE DEDUCTIONS SERVICE
// 10% of revenue ÷ days in month → daily fraction to Tithe Wallet
// ═══════════════════════════════════════════════════════════════════

const TITHE_PERCENTAGE = 10; // 10% as required

/**
 * Get or create the tithe wallet
 */
async function getOrCreateTitheWallet(ctx: any) {
  let wallet = await ctx.db.query("charity_wallet").first();
  if (!wallet) {
    const now = getWATDate();
    const monthStr = formatMonth(now);
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const id = await ctx.db.insert("charity_wallet", {
      balance: 0,
      totalSetAsideLifetime: 0,
      totalTransferred: 0,
      currentMonth: monthStr,
      monthlyEarningsSoFar: 0,
      dailyDeductionAmount: 0,
      daysInMonth,
      isPaused: false,
    });
    wallet = await ctx.db.get(id);
  }
  return wallet;
}

/**
 * Get previous month's total revenue from payment_verifications
 */
async function getPreviousMonthRevenue(ctx: any, monthStr: string): Promise<number> {
  const [year, month] = monthStr.split('-').map(Number);
  const startOfMonth = new Date(year, month - 1, 1).getTime();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const payments = await ctx.db
    .query("payment_verifications")
    .withIndex("by_status_and_verifiedAt", (q: any) =>
      q.eq("status", "approved").gte("verifiedAt", startOfMonth)
    )
    .collect();

  const monthPayments = payments.filter(
    (p: any) => p.verifiedAt <= endOfMonth
  );

  return monthPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
}

/**
 * Daily tithe deduction (cron-driven)
 * 
 * New logic: 10% of LAST MONTH's total revenue ÷ days in CURRENT month
 * Each day, the daily fraction accumulates in the wallet.
 * At month end, the full balance is transferred.
 */
export const runDailyTitheDeduction = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const wallet = await getOrCreateTitheWallet(ctx);
    if (!wallet) return null;
    if (wallet.isPaused) return null;

    const watNow = getWATDate();
    const currentMonthStr = formatMonth(watNow);
    const daysInMonth = getDaysInMonth(watNow.getFullYear(), watNow.getMonth());
    const currentDayOfMonth = watNow.getDate();

    // Reset wallet on new month
    if (wallet.currentMonth !== currentMonthStr) {
      // Calculate 10% of previous month's total revenue
      const prevMonth = new Date(watNow);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = formatMonth(prevMonth);
      
      const prevMonthRevenue = await getPreviousMonthRevenue(ctx, prevMonthStr);
      const monthlyTitheTarget = prevMonthRevenue * (TITHE_PERCENTAGE / 100);
      const dailyFraction = monthlyTitheTarget / daysInMonth;

      await ctx.db.patch(wallet._id, {
        currentMonth: currentMonthStr,
        monthlyEarningsSoFar: 0,
        balance: 0,
        dailyDeductionAmount: dailyFraction,
        daysInMonth: daysInMonth,
        monthlyTitheTarget: monthlyTitheTarget,
        previousMonthRevenue: prevMonthRevenue,
      });

      // Log the monthly target
      await ctx.db.insert("tithe_transactions", {
        type: "MONTHLY_TARGET_SET",
        amountNgn: monthlyTitheTarget,
        balanceBefore: 0,
        balanceAfter: 0,
        date: Date.now(),
        monthYear: currentMonthStr,
        daysInMonth: daysInMonth,
        currentDay: currentDayOfMonth,
        monthlyEarnings: prevMonthRevenue,
        dailyDeductionAmount: dailyFraction,
        percentage: TITHE_PERCENTAGE,
        designatedAccount: DESIGNATED_ACCOUNT,
        status: "completed",
        notes: `Monthly target: ${TITHE_PERCENTAGE}% of ₦${prevMonthRevenue.toFixed(2)} = ₦${monthlyTitheTarget.toFixed(2)}, daily: ₦${dailyFraction.toFixed(2)}`,
      });
    }

    // Get fresh wallet
    const fresh: any = await ctx.db.get(wallet._id);
    if (!fresh) return null;

    // Use the stored daily fraction (set at month start)
    const dailyFraction = fresh.dailyDeductionAmount || 0;
    if (dailyFraction <= 0) return null;

    const newBalance = (fresh.balance || 0) + dailyFraction;
    const newMonthlyEarnings = (fresh.monthlyEarningsSoFar || 0) + dailyFraction;

    // Update wallet
    await ctx.db.patch(fresh._id, {
      balance: newBalance,
      totalSetAsideLifetime: (fresh.totalSetAsideLifetime || 0) + dailyFraction,
      lastDeductionDate: Date.now(),
      monthlyEarningsSoFar: newMonthlyEarnings,
    });

    // Log tithe transaction
    await ctx.db.insert("tithe_transactions", {
      type: "DAILY_DEDUCTION",
      amountNgn: dailyFraction,
      balanceBefore: fresh.balance || 0,
      balanceAfter: newBalance,
      date: Date.now(),
      monthYear: currentMonthStr,
      daysInMonth: fresh.daysInMonth || daysInMonth,
      currentDay: currentDayOfMonth,
      monthlyEarnings: fresh.monthlyTitheTarget || 0,
      dailyDeductionAmount: dailyFraction,
      percentage: TITHE_PERCENTAGE,
      designatedAccount: DESIGNATED_ACCOUNT,
      status: "completed",
      notes: `Day ${currentDayOfMonth}/${fresh.daysInMonth}: ₦${dailyFraction.toFixed(2)} accumulated (target: ₦${(fresh.monthlyTitheTarget || 0).toFixed(2)})`,
    });

    console.log(
      `[TITHE] Day ${currentDayOfMonth}/${fresh.daysInMonth}: ₦${dailyFraction.toFixed(2)} accumulated. Wallet: ₦${newBalance.toFixed(2)}`
    );
    return null;
  },
});

/**
 * Monthly tithe transfer to designated account
 */
export const runMonthlyTitheTransfer = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const watNow = getWATDate();
    const lastDayOfMonth = getDaysInMonth(watNow.getFullYear(), watNow.getMonth());
    
    // Only transfer on the last day of the month
    if (watNow.getDate() !== lastDayOfMonth) {
      return { success: true, message: `Not last day of month. Today is day ${watNow.getDate()}, month ends on day ${lastDayOfMonth}.` };
    }

    const wallet: any = await ctx.runQuery(internal.tithe_deductions.getTitheWalletInternal);
    if (!wallet || wallet.balance <= 0) {
      return { success: true, message: "No tithe balance to transfer" };
    }

    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) {
      return { success: false, error: "KORA_SECRET_KEY not configured" };
    }

    const reference = `TITHE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
            amount: wallet.balance,
            currency: "NGN",
            narration: `Monthly tithe transfer - ${formatMonth(watNow)}`,
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
        return { success: false, error: data.message || "Kora transfer failed" };
      }

      // Update wallet and log transaction
      await ctx.runMutation(internal.tithe_deductions.completeMonthlyTransfer, {
        amount: wallet.balance,
        reference,
        monthYear: formatMonth(watNow),
      });

      console.log(`[TITHE] Monthly transfer: ₦${wallet.balance.toFixed(2)} → ${DESIGNATED_ACCOUNT}`);
      return { success: true, amount: wallet.balance, reference };
    } catch (error: any) {
      console.error(`[TITHE] Monthly transfer failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Complete monthly tithe transfer (internal)
 */
export const completeMonthlyTransfer = internalMutation({
  args: {
    amount: v.number(),
    reference: v.string(),
    monthYear: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    if (!wallet) return null;

    const nextMonth = new Date(getWATDate());
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const newDaysInMonth = getDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth());

    await ctx.db.insert("tithe_transactions", {
      type: "MONTHLY_TRANSFER",
      amountNgn: args.amount,
      balanceBefore: wallet.balance,
      balanceAfter: 0,
      date: Date.now(),
      monthYear: args.monthYear,
      daysInMonth: wallet.daysInMonth,
      currentDay: getWATDate().getDate(),
      monthlyEarnings: wallet.monthlyEarningsSoFar,
      dailyDeductionAmount: 0,
      percentage: TITHE_PERCENTAGE,
      designatedAccount: DESIGNATED_ACCOUNT,
      koraReference: args.reference,
      status: "completed",
      notes: `Monthly tithe transfer to ${DESIGNATED_ACCOUNT}. Ref: ${args.reference}`,
    });

    await ctx.db.patch("charity_wallet", wallet._id, {
      balance: 0,
      totalTransferred: wallet.totalTransferred + args.amount,
      lastTransferDate: Date.now(),
      currentMonth: formatMonth(nextMonth),
      monthlyEarningsSoFar: 0,
      dailyDeductionAmount: 0,
      daysInMonth: newDaysInMonth,
    });
    return null;
  },
});

/**
 * Manual tithe transfer (admin-initiated, requires passkey)
 */
export const performManualTitheTransfer = mutation({
  args: {
    passkeyId: v.string(),
    passkey: v.string(),
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

    const wallet = await ctx.db.query("charity_wallet").first();
    if (!wallet || wallet.balance <= 0) {
      return { success: false, error: "No tithe balance to transfer" };
    }

    return { success: true, amount: wallet.balance, designatedAccount: DESIGNATED_ACCOUNT };
  },
});

/**
 * Internal query to get tithe wallet
 */
export const getTitheWalletInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("charity_wallet").first();
  },
});

/**
 * Get tithe history
 */
export const getTitheHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("tithe_transactions")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get tithe statistics
 */
export const getTitheStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    const allTx = await ctx.db.query("tithe_transactions").collect();

    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonth = allTx.filter(
      (t) => t.date >= monthStart.getTime() && t.type === "DAILY_DEDUCTION"
    );
    const transferred = allTx.filter((t) => t.type === "MONTHLY_TRANSFER");

    return {
      wallet: wallet || {
        balance: 0,
        totalSetAsideLifetime: 0,
        totalTransferred: 0,
        currentMonth: formatMonth(getWATDate()),
        monthlyEarningsSoFar: 0,
        dailyDeductionAmount: 0,
        daysInMonth: getDaysInMonth(new Date().getFullYear(), new Date().getMonth()),
        isPaused: false,
        monthlyTitheTarget: 0,
        previousMonthRevenue: 0,
      },
      thisMonth: {
        totalDeducted: thisMonth.reduce((sum, t) => sum + t.amountNgn, 0),
        daysProcessed: thisMonth.length,
        averageDaily: thisMonth.length > 0 ? thisMonth.reduce((sum, t) => sum + t.amountNgn, 0) / thisMonth.length : 0,
        monthlyTarget: wallet?.monthlyTitheTarget || 0,
        dailyFraction: wallet?.dailyDeductionAmount || 0,
        daysRemaining: (wallet?.daysInMonth || 30) - new Date().getDate(),
      },
      allTime: {
        totalDeducted: allTx
          .filter((t) => t.type === "DAILY_DEDUCTION")
          .reduce((sum, t) => sum + t.amountNgn, 0),
        totalTransferred: transferred.reduce((sum, t) => sum + t.amountNgn, 0),
        transferCount: transferred.length,
      },
      settings: {
        percentage: TITHE_PERCENTAGE,
        designatedAccount: DESIGNATED_ACCOUNT,
        bank: "PalmPay",
        name: "Oladotun Alabi",
      },
    };
  },
});
