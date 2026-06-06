import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// TITHE DEDUCTIONS SERVICE
// 10% of revenue ÷ days in month → daily fraction to Tithe Wallet
// Designated account: 8121161202 (PalmPay - Oladotun Alabi)
// ═══════════════════════════════════════════════════════════════════

const DESIGNATED_ACCOUNT = "8121161202";
const TITHE_PERCENTAGE = 10; // 10% as required

function getWATDate(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 60 * 60000);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

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
 * Get yesterday's platform earnings
 */
async function getYesterdayEarnings(ctx: any): Promise<number> {
  const watNow = getWATDate();
  const startOfYesterday = new Date(watNow);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(watNow);
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  const payments = await ctx.db
    .query("payment_verifications")
    .withIndex("by_status_and_verifiedAt", (q: any) =>
      q.eq("status", "approved").gte("verifiedAt", startOfYesterday.getTime())
    )
    .collect();

  const yesterdayPayments = payments.filter((p: any) => p.verifiedAt <= endOfYesterday.getTime());
  const totalRevenue = yesterdayPayments.reduce((acc: number, p: any) => acc + p.amount, 0);
  return totalRevenue;
}

/**
 * Daily tithe deduction (cron-driven)
 * 10% of yesterday's revenue ÷ remaining days in month
 */
export const runDailyTitheDeduction = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const wallet = await getOrCreateTitheWallet(ctx);
    if (!wallet) return null;
    if (wallet.isPaused) return null;

    const watNow = getWATDate();
    const currentDayOfMonth = watNow.getDate();
    const currentMonthStr = formatMonth(watNow);

    // Reset wallet on new month
    if (wallet.currentMonth !== currentMonthStr) {
      const newDaysInMonth = getDaysInMonth(watNow.getFullYear(), watNow.getMonth());
      await ctx.db.patch(wallet._id, {
        currentMonth: currentMonthStr,
        monthlyEarningsSoFar: 0,
        balance: 0,
        dailyDeductionAmount: 0,
        daysInMonth: newDaysInMonth,
      });
    }

    // Get yesterday's earnings
    const yesterdayRevenue = await getYesterdayEarnings(ctx);
    if (yesterdayRevenue <= 0) return null;

    const fresh: any = await ctx.db.get(wallet._id);
    if (!fresh) return null;

    // Calculate tithe: 10% of yesterday's revenue
    const dailyTitheAmount = yesterdayRevenue * (TITHE_PERCENTAGE / 100);
    const newMonthlyEarnings = (fresh.monthlyEarningsSoFar || 0) + yesterdayRevenue;
    const newBalance = (fresh.balance || 0) + dailyTitheAmount;

    // Update wallet
    await ctx.db.patch(fresh._id, {
      balance: newBalance,
      totalSetAsideLifetime: (fresh.totalSetAsideLifetime || 0) + dailyTitheAmount,
      lastDeductionDate: Date.now(),
      monthlyEarningsSoFar: newMonthlyEarnings,
      dailyDeductionAmount: dailyTitheAmount,
    });

    // Log tithe transaction
    await ctx.db.insert("tithe_transactions", {
      type: "DAILY_DEDUCTION",
      amountNgn: dailyTitheAmount,
      balanceBefore: fresh.balance || 0,
      balanceAfter: newBalance,
      date: Date.now(),
      monthYear: currentMonthStr,
      daysInMonth: fresh.daysInMonth || 30,
      currentDay: currentDayOfMonth,
      monthlyEarnings: newMonthlyEarnings,
      dailyDeductionAmount: dailyTitheAmount,
      percentage: TITHE_PERCENTAGE,
      designatedAccount: DESIGNATED_ACCOUNT,
      status: "completed",
      notes: `Daily tithe: ${TITHE_PERCENTAGE}% of ₦${yesterdayRevenue.toFixed(2)} revenue`,
    });

    console.log(
      `[TITHE] Daily deduction: ₦${dailyTitheAmount.toFixed(2)} (${TITHE_PERCENTAGE}% of ₦${yesterdayRevenue.toFixed(2)} revenue)`
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
    const tomorrow = new Date(watNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getMonth() === watNow.getMonth()) {
      return { success: true, message: "Not last day of month" };
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
      },
      thisMonth: {
        totalDeducted: thisMonth.reduce((sum, t) => sum + t.amountNgn, 0),
        daysProcessed: thisMonth.length,
        averageDaily: thisMonth.length > 0 ? thisMonth.reduce((sum, t) => sum + t.amountNgn, 0) / thisMonth.length : 0,
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
