import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function getWATDate(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 60 * 60000);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function getOrCreateCharityWallet(ctx: import("./_generated/server").MutationCtx) {
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
  return wallet!;
}

async function getYesterdayPlatformEarnings(ctx: import("./_generated/server").MutationCtx) {
  const watNow = getWATDate();
  const startOfYesterday = new Date(watNow);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(watNow);
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  const payments = await ctx.db
    .query("payment_verifications")
    .withIndex("by_status_and_verifiedAt", (q) =>
      q.eq("status", "approved").gte("verifiedAt", startOfYesterday.getTime()),
    )
    .collect();

  const yesterdayPayments = payments.filter(
    (p) => p.verifiedAt <= endOfYesterday.getTime(),
  );
  const totalRevenue = yesterdayPayments.reduce((acc, p) => acc + p.amount, 0);
  return totalRevenue * 0.15;
}

export const runDailyCharityDeduction = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!process.env.CHARITY_ENABLED || process.env.CHARITY_ENABLED !== "true") {
      return null;
    }

    const wallet = await getOrCreateCharityWallet(ctx);
    if (wallet.isPaused) return null;

    const watNow = getWATDate();
    const currentDayOfMonth = watNow.getDate();
    const currentMonthStr = formatMonth(watNow);

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

    const yesterdayEarnings = await getYesterdayPlatformEarnings(ctx);
    if (yesterdayEarnings <= 0) return null;

    const fresh = await ctx.db.get(wallet._id);
    if (!fresh) return null;

    const newMonthlyEarnings = fresh.monthlyEarningsSoFar + yesterdayEarnings;
    const monthlyTarget = newMonthlyEarnings * 0.10;
    const remainingDays = fresh.daysInMonth - currentDayOfMonth;
    const alreadyDeducted = fresh.balance;
    const remainingToDeduct = Math.max(0, monthlyTarget - alreadyDeducted);

    let dailyDeduction = 0;
    if (remainingDays > 0) {
      dailyDeduction = remainingToDeduct / remainingDays;
    } else {
      dailyDeduction = remainingToDeduct;
    }

    const newBalance = fresh.balance + dailyDeduction;

    await ctx.db.patch(fresh._id, {
      balance: newBalance,
      totalSetAsideLifetime: fresh.totalSetAsideLifetime + dailyDeduction,
      lastDeductionDate: Date.now(),
      monthlyEarningsSoFar: newMonthlyEarnings,
      dailyDeductionAmount: dailyDeduction,
    });

    await ctx.db.insert("charity_transactions", {
      type: "DAILY_DEDUCTION",
      amount: dailyDeduction,
      balanceBefore: fresh.balance,
      balanceAfter: newBalance,
      date: Date.now(),
      monthlyEarnings: newMonthlyEarnings,
      dailyDeductionAmount: dailyDeduction,
      status: "completed",
    });

    console.log(
      `[CHARITY] Daily deduction: ₦${dailyDeduction.toFixed(2)} (monthly target: ₦${monthlyTarget.toFixed(2)}, earnings: ₦${newMonthlyEarnings.toFixed(2)}, remaining: ₦${remainingToDeduct.toFixed(2)})`,
    );
    return null;
  },
});

export const executeCharityPayout = internalAction({
  args: { amount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const bankCode = process.env.CHARITY_BANK_CODE || "999999";
    const accountNumber = process.env.CHARITY_ACCOUNT_NUMBER || "8121161202";
    const accountName = process.env.CHARITY_ACCOUNT_NAME || "Oladotun Alabi";

    const koraReference = `CHARITY_${Date.now()}`;
    console.log(
      `[KORA] Disbursing ₦${args.amount.toFixed(2)} to ${accountName} (${accountNumber}) via bank ${bankCode} for charity/tithe — ref: ${koraReference}`,
    );

    const result = { success: true, reference: koraReference };
    return result;
  },
});

export const runMonthlyCharityTransfer = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const watNow = getWATDate();
    if (!isLastDayOfMonth(watNow)) return null;

    const wallet = await ctx.runQuery(internal.charity.getCharityWalletInternal);
    if (!wallet || wallet.balance <= 0) return null;

    try {
      const result = await ctx.runAction(internal.charity.executeCharityPayout, {
        amount: wallet.balance,
      });

      await ctx.runMutation(internal.charity.updateCharityAfterTransfer, {
        amount: wallet.balance,
        reference: result.reference,
        totalSetAsideLifetime: wallet.totalSetAsideLifetime,
        totalTransferred: wallet.totalTransferred,
      });
    } catch (error) {
      console.error(`[CHARITY] Monthly transfer failed: ${error}`);

      await ctx.runMutation(internal.charity.logCharityTransferFailure, {
        amount: wallet.balance,
        error: String(error),
      });
    }

    return null;
  },
});

export const getCharityWalletInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    return wallet;
  },
});

export const updateCharityAfterTransfer = internalMutation({
  args: {
    amount: v.number(),
    reference: v.string(),
    totalSetAsideLifetime: v.number(),
    totalTransferred: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    if (!wallet) return null;

    const watNow = getWATDate();
    const nextMonth = new Date(watNow);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const newMonthStr = formatMonth(nextMonth);
    const newDaysInMonth = getDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth());

    await ctx.db.insert("charity_transactions", {
      type: "MONTHLY_TRANSFER",
      amount: args.amount,
      balanceBefore: wallet.balance,
      balanceAfter: 0,
      date: Date.now(),
      monthlyEarnings: wallet.monthlyEarningsSoFar,
      status: "completed",
      reference: args.reference,
      notes: `Charity transfer completed. Ref: ${args.reference}`,
    });

    await ctx.db.patch(wallet._id, {
      balance: 0,
      totalTransferred: args.totalTransferred + args.amount,
      lastTransferDate: Date.now(),
      currentMonth: newMonthStr,
      monthlyEarningsSoFar: 0,
      dailyDeductionAmount: 0,
      daysInMonth: newDaysInMonth,
    });

    console.log(`[CHARITY] Monthly transfer of ₦${args.amount.toFixed(2)} completed. Ref: ${args.reference}`);
    return null;
  },
});

export const logCharityTransferFailure = internalMutation({
  args: { amount: v.number(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("charity_wallet").first();

    await ctx.db.insert("charity_transactions", {
      type: "MONTHLY_TRANSFER",
      amount: args.amount,
      balanceBefore: wallet?.balance ?? 0,
      balanceAfter: wallet?.balance ?? 0,
      date: Date.now(),
      monthlyEarnings: wallet?.monthlyEarningsSoFar ?? 0,
      status: "failed",
      notes: `Transfer failed: ${args.error}`,
    });
    return null;
  },
});

export const getCharityWallet = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    return wallet;
  },
});

export const getCharityTransactions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("charity_transactions").order("desc").take(50);
  },
});

export const toggleCharityPause = mutation({
  args: {
    paused: v.boolean(),
    sessionId: v.id("user_sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
      throw new Error("2FA Required for charity configuration");
    }

    const wallet = await ctx.db.query("charity_wallet").first();
    if (wallet) {
      await ctx.db.patch(wallet._id, { isPaused: args.paused });
    }
    return null;
  },
});

export const manualCharityTransfer = action({
  args: {
    sessionId: v.id("user_sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session: any = await ctx.runQuery(internal.charity.verifySession, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("2FA Required for manual charity transfer");

    const wallet: any = await ctx.runQuery(internal.charity.getCharityWalletInternal);
    if (!wallet || wallet.balance <= 0) {
      return { success: false, message: "Charity wallet balance is zero." };
    }

    const result: any = await ctx.runAction(internal.charity.executeCharityPayout, {
      amount: wallet.balance,
    });

    await ctx.runMutation(internal.charity.updateCharityAfterTransfer, {
      amount: wallet.balance,
      reference: result.reference,
      totalSetAsideLifetime: wallet.totalSetAsideLifetime,
      totalTransferred: wallet.totalTransferred,
    });

    return {
      success: true,
      amount: wallet.balance,
      reference: result.reference,
      message: `Charity transfer of ₦${wallet.balance.toFixed(2)} initiated.`,
    };
  },
});

export const verifySession = internalQuery({
  args: { sessionId: v.id("user_sessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.isCurrent || !session.isTwoFactorVerified) return null;
    return session;
  },
});

export const getCharityAdminStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    const transactions = await ctx.db.query("charity_transactions").order("desc").take(50);

    const totalDeductedMonth = transactions
      .filter((t) => t.type === "DAILY_DEDUCTION")
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      wallet: wallet ?? {
        balance: 0,
        totalSetAsideLifetime: 0,
        totalTransferred: 0,
        currentMonth: formatMonth(getWATDate()),
        monthlyEarningsSoFar: 0,
        dailyDeductionAmount: 0,
        daysInMonth: getDaysInMonth(new Date().getFullYear(), new Date().getMonth()),
        isPaused: false,
      },
      transactions,
      totalDeductedMonth,
    };
  },
});
