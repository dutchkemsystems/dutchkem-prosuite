import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { encryptWeb } from "./encryption";

/**
 * SEED FINANCIAL INFRASTRUCTURE
 * Configures the first encrypted beneficiary for Dutchkem Ventures
 */
export const seedFinancials = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        console.error("ENCRYPTION_KEY not found in environment. Financial seed aborted.");
        return;
    }

    // 1. Create Oladotun Alabi (OPay) Encrypted Beneficiary
    const accountNumber = "8121161202";
    const accountName = "Oladotun Alabi";
    
    const encAccount = await encryptWeb(accountNumber, encryptionKey);
    const encName = await encryptWeb(accountName, encryptionKey);

    const existing = await ctx.db.query("beneficiaries").first();
    if (existing) {
        console.log("Beneficiary infrastructure already initialized.");
        return;
    }

    await ctx.db.insert("beneficiaries", {
      userId: undefined,
      bankCode: "999999", // OPay
      bankName: "OPay",
      encryptedAccountNumber: encAccount.encrypted,
      encryptedAccountName: encName.encrypted,
      encryptionIv: encAccount.iv,
      encryptionTag: encAccount.tag,
      isDefault: true,
      status: "active",
      updatedAt: Date.now()
    });

    console.log("✅ Encrypted beneficiary 'Oladotun Alabi (OPay)' seeded.");

    // 2. Initialize System Config for Sweeps
    const configs = [
        { key: "DAILY_SWEEP_ENABLED", value: true },
        { key: "DAILY_SWEEP_TIME", value: "23:00" },
        { key: "DAILY_SWEEP_MINIMUM_AMOUNT", value: 1000 },
        { key: "DAILY_SWEEP_TYPE", value: "full" },
        { key: "DAILY_SWEEP_DAYS", value: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] }
    ];

    for (const cfg of configs) {
        const hasCfg = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", cfg.key)).first();
        if (!hasCfg) {
            await ctx.db.insert("system_config", {
                key: cfg.key,
                value: cfg.value,
                updatedAt: Date.now()
            });
        }
    }
    
    console.log("✅ Sweep configuration initialized.");

    // 3. Initialize Tax Wallet
    const existingTax = await ctx.db.query("tax_wallet").first();
    if (!existingTax) {
        await ctx.db.insert("tax_wallet", {
            balance: 0,
            total_deducted_lifetime: 0,
            total_remitted: 0,
            last_deduction_date: Date.now(),
            last_interest_date: Date.now(),
        });
        console.log("✅ Tax wallet initialized.");
    }
  },
});
