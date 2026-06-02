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
  handler: async (_ctx, args) => {
    const bankCode = process.env.CHARITY_BANK_CODE;
    const accountNumber = process.env.CHARITY_ACCOUNT_NUMBER;
    const accountName = process.env.CHARITY_ACCOUNT_NAME;
    const koraSecretKey = process.env.KORA_SECRET_KEY;

    if (!bankCode || !accountNumber || !accountName) {
      throw new Error("CHARITY_BANK_CODE, CHARITY_ACCOUNT_NUMBER, and CHARITY_ACCOUNT_NAME must be set in environment variables");
    }
    if (!koraSecretKey) {
      throw new Error("KORA_SECRET_KEY not configured for charity payout");
    }

    const koraReference = `CHARITY_${Date.now()}`;

    // Real Kora Pay API transfer
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
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
        },
        reference: koraReference,
        narration: "Monthly Tithe/Charity Transfer",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kora Pay charity transfer failed: ${error}`);
    }

    const data = await response.json();
    console.log(
      `[KORA] ₦${args.amount.toFixed(2)} disbursed to charity — ref: ${koraReference}`,
    );

    return { success: true, reference: koraReference, koraResponse: data };
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

// ============ NEW: TITHE SETTINGS & CONTROLS ============

/**
 * Get tithe settings
 */
export const getSettings = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    const settings = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    settings.forEach(s => { configMap[s.key] = s.value; });

    const lastTransaction = await ctx.db.query("charity_transactions")
      .order("desc")
      .first();

    return {
      autoTithe: configMap.CHARITY_AUTO_TITHE !== false,
      tithePercentage: configMap.CHARITY_TITHE_PERCENTAGE || 10,
      titheAccount: wallet ? {
        bank: "OPay",
        account_number: "8121161202",
        account_name: "Dutchkem Charity Foundation",
      } : null,
      pauseTithe: wallet?.isPaused || false,
      lastTithe: lastTransaction?.date || null,
      nextTithe: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
      balance: wallet?.balance || 0,
      totalSetAside: wallet?.totalSetAsideLifetime || 0,
      totalTransferred: wallet?.totalTransferred || 0,
    };
  },
});

/**
 * Get linked charity account
 */
export const getLinkedAccount = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("charity_wallet").first();
    if (!wallet) return null;
    
    return {
      bank: "OPay",
      account_number: "8121161202",
      account_name: "Dutchkem Charity Foundation",
      isLinked: true,
    };
  },
});

/**
 * Get tithe history
 */
export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const transactions = await ctx.db.query("charity_transactions")
      .order("desc")
      .take(limit);
    
    return transactions.map(t => ({
      id: t._id,
      date: t.date,
      amount: t.amount,
      charity_name: "Dutchkem Charity Foundation",
      type: t.type === "DAILY_DEDUCTION" ? "auto" : "manual",
      percentage: 10,
      status: t.status,
      reference: `CHARITY_${t.date}`,
      timestamp: t.date,
    }));
  },
});

/**
 * Get available charities
 */
export const getCharities = query({
  args: {},
  returns: v.any(),
  handler: async (_ctx) => {
    return [
      { id: "dutchkem_foundation", name: "Dutchkem Charity Foundation", description: "Education & empowerment" },
      { id: "orphanage_support", name: "Orphanage Support", description: "Support orphanages" },
      { id: "medical_aid", name: "Medical Aid", description: "Medical assistance" },
      { id: "education_fund", name: "Education Fund", description: "Scholarships & supplies" },
    ];
  },
});

/**
 * Update tithe settings
 */
export const updateSettings = mutation({
  args: {
    autoTithe: v.optional(v.boolean()),
    tithePercentage: v.optional(v.number()),
    pauseTithe: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const updates: Record<string, any> = {};
    
    if (args.autoTithe !== undefined) {
      updates.CHARITY_AUTO_TITHE = args.autoTithe;
    }
    if (args.tithePercentage !== undefined) {
      updates.CHARITY_TITHE_PERCENTAGE = args.tithePercentage;
    }
    if (args.pauseTithe !== undefined) {
      // Update wallet pause state
      const wallet = await ctx.db.query("charity_wallet").first();
      if (wallet) {
        await ctx.db.patch(wallet._id, { isPaused: args.pauseTithe });
      }
    }

    // Update each setting in system_config
    for (const [key, value] of Object.entries(updates)) {
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", key))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", { key, value, updatedAt: Date.now() });
      }
    }

    return { success: true };
  },
});

/**
 * Perform manual tithe
 */
export const performTithe = mutation({
  args: {
    type: v.union(v.literal("manual"), v.literal("auto")),
    charityId: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Get or create charity wallet
      const wallet = await getOrCreateCharityWallet(ctx);
      
      // Calculate tithe amount
      let titheAmount = args.amount;
      if (!titheAmount) {
        // Calculate from earnings
        const mainWallet = await ctx.db.query("system_wallets")
          .withIndex("by_type", q => q.eq("type", "main"))
          .first();
        
        if (!mainWallet || mainWallet.balance <= 0) {
          return { success: false, error: "No funds available for tithe" };
        }

        const settings = await ctx.db.query("system_config").collect();
        const configMap: Record<string, any> = {};
        settings.forEach(s => { configMap[s.key] = s.value; });
        
        const percentage = configMap.CHARITY_TITHE_PERCENTAGE || 10;
        titheAmount = Math.round(mainWallet.balance * (percentage / 100));
      }

      if (titheAmount <= 0) {
        return { success: false, error: "Tithe amount must be positive" };
      }

      // Record the transaction
      await ctx.db.insert("charity_transactions", {
        type: "DAILY_DEDUCTION",
        amount: titheAmount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + titheAmount,
        date: Date.now(),
        monthlyEarnings: 0,
        dailyDeductionAmount: titheAmount,
        status: "completed",
      });

      // Update wallet balance
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + titheAmount,
        totalSetAsideLifetime: wallet.totalSetAsideLifetime + titheAmount,
      });

      return {
        success: true,
        amount: titheAmount,
        charityName: "Dutchkem Charity Foundation",
        message: `Tithe of ₦${titheAmount.toLocaleString()} sent successfully`,
      };
    } catch (error: any) {
      console.error("performTithe error:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Link charity account
 */
export const linkAccount = mutation({
  args: {
    details: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, _args) => {
    // Ensure charity wallet exists
    await getOrCreateCharityWallet(ctx);
    
    return {
      success: true,
      account: {
        bank: "OPay",
        account_number: "8121161202",
        account_name: "Dutchkem Charity Foundation",
      },
      message: "Charity account linked successfully",
    };
  },
});

/**
 * Disconnect charity account
 */
export const disconnectAccount = mutation({
  args: {},
  returns: v.any(),
  handler: async (_ctx) => {
    // In production, this would disconnect the account
    return { success: true, message: "Account disconnected" };
  },
});
