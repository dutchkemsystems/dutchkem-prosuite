import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Quick setup: Add test funds and fix beneficiary bank code
 */
export const addTestFunds = mutation({
  args: { amount: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();

    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balance: wallet.balance + args.amount,
        lastUpdated: Date.now(),
      });
      return { success: true, newBalance: wallet.balance + args.amount };
    } else {
      const id = await ctx.db.insert("system_wallets", {
        type: "main",
        balance: args.amount,
        lastUpdated: Date.now(),
      });
      return { success: true, newBalance: args.amount, walletId: id };
    }
  },
});

export const fixBeneficiaryBankCode = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const beneficiaries = await ctx.db.query("beneficiaries").collect();
    let fixed = 0;
    for (const b of beneficiaries) {
      if (b.bankCode === "999999") {
        await ctx.db.patch(b._id, { bankCode: "100004" });
        fixed++;
      }
    }
    return { success: true, fixed, total: beneficiaries.length };
  },
});

export const getWalletBalance = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wallet = await ctx.db.query("system_wallets")
      .withIndex("by_type", q => q.eq("type", "main"))
      .first();
    return { balance: wallet?.balance || 0 };
  },
});
