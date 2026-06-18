import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decryptWeb, maskAccountName, maskAccountNumber } from "./encryption";

/**
 * SECURE PAYOUT EXECUTION
 */
export const executeSecurePayout = internalAction({
    args: {
        amount: v.number(),
        beneficiaryId: v.optional(v.id("beneficiaries")),
        overrideDetails: v.optional(v.object({
            accountNumberEnc: v.string(),
            accountNameEnc: v.string(),
            bankCode: v.string(),
            bankName: v.string(),
            iv: v.string(),
            tag: v.string(),
        })),
        referencePrefix: v.string()
    },
    returns: v.any(),
    handler: async (ctx, args) => {
        let accountNumberEnc, accountNameEnc, iv, tag, bankName;

        if (args.overrideDetails) {
            accountNumberEnc = args.overrideDetails.accountNumberEnc;
            accountNameEnc = args.overrideDetails.accountNameEnc;
            iv = args.overrideDetails.iv;
            tag = args.overrideDetails.tag;
            bankName = args.overrideDetails.bankName;
        } else if (args.beneficiaryId) {
            const beneficiary = await ctx.runQuery(internal.payouts.getBeneficiaryInternal, { id: args.beneficiaryId });
            if (!beneficiary) throw new Error("Beneficiary not found");
            accountNumberEnc = beneficiary.encryptedAccountNumber;
            accountNameEnc = beneficiary.encryptedAccountName;
            iv = beneficiary.encryptionIv;
            tag = beneficiary.encryptionTag;
            bankName = beneficiary.bankName;
        } else {
            throw new Error("No payout destination provided");
        }

        // 2. Decrypt in memory only
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) throw new Error("Decryption engine offline");

        let accountNumber: string | null = await decryptWeb(
            accountNumberEnc,
            iv,
            tag,
            encryptionKey
        );
        let accountName: string | null = await decryptWeb(
            accountNameEnc,
            iv,
            tag,
            encryptionKey
        );

        try {
            console.log(`[SECURE PAYOUT] Disbursing ₦${args.amount} to ${bankName}`);
            
            // 3. Call Kora Payout API
            const koraReference = `${args.referencePrefix}_${Date.now()}`;
            const koraSecret = process.env.KORA_SECRET_KEY;
            
            if (!koraSecret) {
                throw new Error("KORA_SECRET_KEY not configured");
            }

            const response = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${koraSecret}`,
                },
                body: JSON.stringify({
                    reference: koraReference,
                    destination: {
                        type: "bank_account",
                        amount: args.amount,
                        currency: "NGN",
                        narration: args.narration || "Dutchkem Ventures Sweep",
                        bank_account: { bank: bankCode, account: accountNumber },
                        customer: { name: accountName || "Beneficiary", email: "dutchkemdeveloper@gmail.com" },
                    },
                }),
            });

            const data = await response.json() as any;
            const result = { success: data.status === true, reference: koraReference, koraResponse: data };
            
            if (!result.success) {
                console.error(`[SECURE PAYOUT] Kora disburse failed:`, data.message);
            }
            
            // 4. IMMEDIATELY clear sensitive data
            const logAccountMasked = maskAccountNumber(accountNumber);
            accountNumber = null;
            accountName = null;

            // 5. Log Audit (Masked)
            await ctx.runMutation(internal.payouts.logSecurePayoutResult, {
                amount: args.amount,
                bankName: bankName,
                accountMasked: logAccountMasked,
                reference: koraReference,
                status: "completed",
            });

            // 6. Notify Admin (Mock)
            console.log(`[NOTIFICATION] SMS/Email sent to Admin: Payout of ₦${args.amount} to ${bankName} successful.`);

            return result;

        } catch (error) {
            accountNumber = null;
            accountName = null;
            throw error;
        }
    }
});

/**
 * SECURE DAILY SWEEP LOGIC (Refactored for Env Vars & 2FA)
 */
export const runDailySweep = action({
    args: { retryCount: v.optional(v.number()), forceApproved: v.optional(v.boolean()) },
    returns: v.null(),
    handler: async (ctx, args) => {
        const retryCount = args.retryCount ?? 0;

        // 1. Fetch Config
        const settings = await ctx.runQuery(internal.admin.getSweepSettingsInternal);
        if (!settings.enabled) return null;

        // 2. Calculate Balance
        const stats = await ctx.runQuery(internal.payouts.calculateSweepBalance);
        if (stats.balance < (settings.minimumAmount as number)) return null;

        // 3. Security Check: 2FA for > ₦500,000
        if (stats.balance > 500000 && !args.forceApproved) {
            console.warn(`[SWEEP] Large payout (₦${stats.balance}) requires admin 2FA approval. Payout paused.`);
            // In a real app, this would trigger a 2FA request to the admin via push/SMS
            await ctx.runMutation(internal.admin.logAdminAction, {
                adminEmail: "system@dutchkem.com",
                action: "HIGH_VALUE_SWEEP_PENDING",
                details: `A daily sweep of ₦${stats.balance.toLocaleString()} is waiting for 2FA approval.`,
                ip: "system"
            });
            return null;
        }

        // 4. Determine Destination (Env Vars vs DB)
        let overrideDetails = undefined;
        const envAcc = process.env.DAILY_SWEEP_ACCOUNT_NUMBER_ENCRYPTED;
        const envName = process.env.DAILY_SWEEP_ACCOUNT_NAME_ENCRYPTED;
        const envBank = process.env.DAILY_SWEEP_BANK_CODE;
        const envBankName = process.env.DAILY_SWEEP_BANK_NAME;
        const envIv = process.env.DAILY_SWEEP_IV; // Assuming IV and Tag are also in env or derived
        const envTag = process.env.DAILY_SWEEP_TAG;

        let beneficiaryId = undefined;

        if (envAcc && envName && envBank && envBankName && envIv && envTag) {
            overrideDetails = {
                accountNumberEnc: envAcc,
                accountNameEnc: envName,
                bankCode: envBank,
                bankName: envBankName,
                iv: envIv,
                tag: envTag
            };
        } else {
            const beneficiaries = await ctx.runQuery(api.payouts.getBeneficiaries);
            const target = beneficiaries.find((b: any) => b.isDefault) || beneficiaries[0];
            if (!target) {
                console.error("[SWEEP] No encrypted beneficiary configured.");
                return null;
            }
            beneficiaryId = target._id;
        }

        // 5. Execute Secure Payout
        try {
            await ctx.runAction(internal.payouts.executeSecurePayout, {
                amount: stats.balance,
                beneficiaryId,
                overrideDetails,
                referencePrefix: "DS"
            });

            // Log Success Sweep entry
            await ctx.runMutation(internal.payouts.logSweepSuccess, {
                amount: stats.balance,
                reference: `DS_${Date.now()}`,
                date: new Date().toISOString().split('T')[0]
            });

        } catch (error) {
            console.error(`[SWEEP] Secure payout failed: ${error}`);
            if (retryCount < 2) {
                await ctx.scheduler.runAfter(3600, api.payouts.runDailySweep, {
                    retryCount: retryCount + 1
                });
            }
        }

        return null;
    }
});

export const getBeneficiaryInternal = internalQuery({
    args: { id: v.id("beneficiaries") },
    returns: v.any(),
    handler: async (ctx, args) => {
        return await ctx.db.get("beneficiaries", args.id);
    }
});

export const getBeneficiaries = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        return await ctx.db.query("beneficiaries").order("desc").collect();
    }
});

export const logSecurePayoutResult = internalMutation({
    args: {
        amount: v.number(),
        status: v.string(),
        reference: v.string(),
        bankName: v.string(),
        accountMasked: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.insert("daily_sweeps", {
            sweep_id: `PAY_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: args.amount,
            balance_before: 0,
            balance_after: 0,
            status: args.status as "pending" | "completed" | "failed",
            kora_reference: args.reference,
            timestamp: Date.now(),
            notes: `Payout to ${args.bankName} - ${args.accountMasked}`
        });
        return null;
    }
});

export const calculateSweepBalance = internalQuery({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const wallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).unique();
        return { balance: wallet?.balance ?? 0 };
    }
});

export const logSweepSuccess = internalMutation({
    args: { amount: v.number(), reference: v.string(), date: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.insert("daily_sweeps", {
            sweep_id: `SWP_${Date.now()}`,
            date: args.date,
            amount: args.amount,
            balance_before: args.amount,
            balance_after: 0,
            status: "completed",
            kora_reference: args.reference,
            timestamp: Date.now(),
            notes: "Encrypted Secure Sweep"
        });

        const wallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).unique();
        if (wallet) {
            await ctx.db.patch("system_wallets", wallet._id, { balance: Math.max(0, wallet.balance - args.amount), lastUpdated: Date.now() });
        }
    }
});

/**
 * WEEKLY PAYOUTS (Mocks)
 */
export const runFreelancerPayouts = internalAction({
    args: {},
    returns: v.null(),
handler: async (_ctx) => {
    console.log("[PAYOUT] Weekly freelancer payouts engine active.");
        return null;
    }
});

export const runReferralPayouts = internalAction({
    args: {},
    returns: v.null(),
handler: async (_ctx) => {
    console.log("[PAYOUT] Weekly referral payouts engine active.");
        return null;
    }
});
