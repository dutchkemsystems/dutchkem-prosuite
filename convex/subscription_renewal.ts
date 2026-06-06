import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// SUBSCRIPTION RENEWAL SERVICE
// 29-day auto-sweep to 8121161202 (PalmPay - Oladotun Alabi)
// ═══════════════════════════════════════════════════════════════════

const DESIGNATED_ACCOUNT = "8121161202";
const DESIGNATED_BANK = "PalmPay";
const DESIGNATED_NAME = "Oladotun Alabi";

/**
 * Get all subscription renewal configurations
 */
export const getAllConfigs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("subscription_renewal_config").collect();
  },
});

/**
 * Get active subscription renewals needing action
 */
export const getConfigsNeedingRenewal = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("subscription_renewal_config")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lte(q.field("nextRenewalAt"), now))
      .collect();
  },
});

/**
 * Create a new subscription renewal configuration
 */
export const createConfig = mutation({
  args: {
    serviceName: v.string(),
    plan: v.string(),
    amountNgn: v.number(),
    renewalIntervalDays: v.optional(v.number()),
    autoRenew: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const intervalDays = args.renewalIntervalDays || 29;
    const now = Date.now();
    const nextRenewal = now + intervalDays * 24 * 60 * 60 * 1000;

    const id = await ctx.db.insert("subscription_renewal_config", {
      serviceName: args.serviceName,
      plan: args.plan,
      amountNgn: args.amountNgn,
      renewalIntervalDays: intervalDays,
      designatedAccount: DESIGNATED_ACCOUNT,
      designatedBank: DESIGNATED_BANK,
      designatedName: DESIGNATED_NAME,
      autoRenew: args.autoRenew !== false,
      lastRenewedAt: undefined,
      nextRenewalAt: nextRenewal,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id, nextRenewalAt: nextRenewal };
  },
});

/**
 * Update subscription renewal configuration
 */
export const updateConfig = mutation({
  args: {
    configId: v.id("subscription_renewal_config"),
    amountNgn: v.optional(v.number()),
    renewalIntervalDays: v.optional(v.number()),
    autoRenew: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("expired"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.amountNgn !== undefined) updates.amountNgn = args.amountNgn;
    if (args.renewalIntervalDays !== undefined) updates.renewalIntervalDays = args.renewalIntervalDays;
    if (args.autoRenew !== undefined) updates.autoRenew = args.autoRenew;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch("subscription_renewal_config", args.configId, updates);
    return { success: true };
  },
});

/**
 * Seed default subscription configs (Kora Pay, Termii, etc.)
 */
export const seedDefaultConfigs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("subscription_renewal_config").first();
    if (existing) return null;

    const now = Date.now();
    const in29Days = now + 29 * 24 * 60 * 60 * 1000;

    const defaults = [
      { serviceName: "Kora Pay", plan: "monthly", amountNgn: 50000 },
      { serviceName: "Termii", plan: "monthly", amountNgn: 30000 },
      { serviceName: "Resend", plan: "monthly", amountNgn: 15000 },
      { serviceName: "Deepgram", plan: "monthly", amountNgn: 25000 },
      { serviceName: "LiveKit", plan: "monthly", amountNgn: 20000 },
      { serviceName: "NVIDIA NIM", plan: "monthly", amountNgn: 40000 },
    ];

    for (const cfg of defaults) {
      await ctx.db.insert("subscription_renewal_config", {
        serviceName: cfg.serviceName,
        plan: cfg.plan,
        amountNgn: cfg.amountNgn,
        renewalIntervalDays: 29,
        designatedAccount: DESIGNATED_ACCOUNT,
        designatedBank: DESIGNATED_BANK,
        designatedName: DESIGNATED_NAME,
        autoRenew: true,
        nextRenewalAt: in29Days,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`[RENEWAL] Seeded ${defaults.length} default subscription configs`);
    return null;
  },
});

/**
 * Public version of seedDefaultConfigs (callable from admin panel)
 */
export const seedDefaultConfigsPublic = mutation({
  args: {},
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx) => {
    const existing = await ctx.db.query("subscription_renewal_config").first();
    if (existing) return { success: false, message: "Configs already exist" };

    const now = Date.now();
    const in29Days = now + 29 * 24 * 60 * 60 * 1000;

    const defaults = [
      { serviceName: "Kora Pay", plan: "monthly", amountNgn: 50000 },
      { serviceName: "Termii", plan: "monthly", amountNgn: 30000 },
      { serviceName: "Resend", plan: "monthly", amountNgn: 15000 },
      { serviceName: "Deepgram", plan: "monthly", amountNgn: 25000 },
      { serviceName: "LiveKit", plan: "monthly", amountNgn: 20000 },
      { serviceName: "NVIDIA NIM", plan: "monthly", amountNgn: 40000 },
    ];

    let count = 0;
    for (const d of defaults) {
      await ctx.db.insert("subscription_renewal_config", {
        serviceName: d.serviceName,
        plan: d.plan,
        amountNgn: d.amountNgn,
        renewalIntervalDays: 29,
        status: "active",
        autoRenew: true,
        nextRenewalAt: in29Days,
        designatedAccount: DESIGNATED_ACCOUNT,
        designatedBank: DESIGNATED_BANK,
        designatedName: DESIGNATED_NAME,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { success: true, message: `Seeded ${count} default subscription configs` };
  },
});

/**
 * Process all subscription renewals that are due (runs every hour)
 */
export const processAutoRenewals = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const now = Date.now();
    const dueConfigs = await ctx.runQuery(internal.subscription_renewal.getConfigsNeedingRenewal, { now });

    if (dueConfigs.length === 0) {
      return { success: true, processed: 0, message: "No renewals due" };
    }

    const results = [];
    for (const config of dueConfigs) {
      if (!config.autoRenew) {
        results.push({ configId: config._id, status: "skipped", reason: "autoRenew disabled" });
        continue;
      }

      try {
        const txId = await ctx.runMutation(internal.subscription_renewal.createRenewalTransaction, {
          configId: config._id,
          serviceName: config.serviceName,
          amountNgn: config.amountNgn,
          type: "auto",
        });

        // Execute the renewal via Kora Pay
        const transferResult = await ctx.runAction(internal.subscription_renewal.executeRenewalTransfer, {
          configId: config._id,
          amountNgn: config.amountNgn,
          serviceName: config.serviceName,
        });

        if (transferResult.success) {
          await ctx.runMutation(internal.subscription_renewal.completeRenewalTransaction, {
            transactionId: txId,
            koraReference: transferResult.reference,
            status: "completed",
          });

          // Update next renewal date
          await ctx.runMutation(internal.subscription_renewal.updateNextRenewal, {
            configId: config._id,
          });

          results.push({ configId: config._id, status: "completed", reference: transferResult.reference });
        } else {
          await ctx.runMutation(internal.subscription_renewal.completeRenewalTransaction, {
            transactionId: txId,
            status: "failed",
            errorMessage: transferResult.error || "Unknown error",
          });

          results.push({ configId: config._id, status: "failed", error: transferResult.error });
        }
      } catch (error: any) {
        results.push({ configId: config._id, status: "error", error: error.message });
      }
    }

    return { success: true, processed: results.length, results };
  },
});

/**
 * Manual renewal initiated by admin (requires passkey)
 */
export const initiateManualRenewal = mutation({
  args: {
    configId: v.id("subscription_renewal_config"),
    passkeyId: v.string(),
    passkey: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Verify passkey
    const passkeyRecord = await ctx.db
      .query("transfer_passkeys")
      .filter((q) => q.eq(q.field("_id"), args.passkeyId as any))
      .first();

    if (!passkeyRecord) {
      return { success: false, error: "Passkey not found" };
    }

    if (passkeyRecord.isUsed) {
      return { success: false, error: "Passkey already used" };
    }

    if (passkeyRecord.isExpired || Date.now() > passkeyRecord.expiresAt) {
      await ctx.db.patch("transfer_passkeys", passkeyRecord._id, { isExpired: true });
      return { success: false, error: "Passkey expired" };
    }

    if (passkeyRecord.passkey !== args.passkey) {
      return { success: false, error: "Invalid passkey" };
    }

    // Mark passkey as used
    await ctx.db.patch("transfer_passkeys", passkeyRecord._id, { isUsed: true, usedAt: Date.now() });

    // Get config
    const config = await ctx.db.get("subscription_renewal_config", args.configId);
    if (!config) return { success: false, error: "Config not found" };

    // Create transaction
    const txId = await ctx.db.insert("renewal_transactions", {
      configId: args.configId,
      serviceName: config.serviceName,
      amountNgn: config.amountNgn,
      type: "manual",
      status: "pending",
      passkeyId: args.passkeyId,
      passkeyVerified: true,
      timestamp: Date.now(),
    });

    return { success: true, transactionId: txId, amount: config.amountNgn };
  },
});

/**
 * Execute renewal transfer via Kora Pay
 */
export const executeRenewalTransfer = internalAction({
  args: {
    configId: v.id("subscription_renewal_config"),
    amountNgn: v.number(),
    serviceName: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, args): Promise<any> => {
    const koraSecret = process.env.KORA_SECRET_KEY;
    if (!koraSecret) {
      return { success: false, error: "KORA_SECRET_KEY not configured" };
    }

    const reference = `RENEVAL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
            amount: args.amountNgn,
            currency: "NGN",
            narration: `Subscription renewal: ${args.serviceName}`,
            bank_account: {
              bank: "999999", // PalmPay code
              account: DESIGNATED_ACCOUNT,
            },
            customer: {
              name: DESIGNATED_NAME,
              email: "dutchkemdeveloper@gmail.com",
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return { success: false, error: data.message || `Kora API error: ${response.status}` };
      }

      console.log(`[RENEWAL] ${args.serviceName}: ₦${args.amountNgn} → ${DESIGNATED_ACCOUNT} ref=${reference}`);
      return { success: true, reference, koraResponse: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

/**
 * Create a renewal transaction record
 */
export const createRenewalTransaction = internalMutation({
  args: {
    configId: v.id("subscription_renewal_config"),
    serviceName: v.string(),
    amountNgn: v.number(),
    type: v.union(v.literal("auto"), v.literal("manual")),
  },
  returns: v.id("renewal_transactions"),
  handler: async (ctx, args) => {
    const mainWallet = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "main"))
      .first();

    return await ctx.db.insert("renewal_transactions", {
      configId: args.configId,
      serviceName: args.serviceName,
      amountNgn: args.amountNgn,
      type: args.type,
      status: "pending",
      balanceBefore: mainWallet?.balance,
      timestamp: Date.now(),
    });
  },
});

/**
 * Complete a renewal transaction
 */
export const completeRenewalTransaction = internalMutation({
  args: {
    transactionId: v.id("renewal_transactions"),
    koraReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("renewal_transactions", args.transactionId, {
      koraReference: args.koraReference,
      status: args.status,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });

    if (args.status === "completed") {
      // Deduct from main wallet
      const mainWallet = await ctx.db
        .query("system_wallets")
        .withIndex("by_type", (q) => q.eq("type", "main"))
        .first();
      if (mainWallet) {
        const tx = await ctx.db.get("renewal_transactions", args.transactionId);
        const amount = tx?.amountNgn || 0;
        await ctx.db.patch("system_wallets", mainWallet._id, {
          balance: Math.max(0, mainWallet.balance - amount),
          lastUpdated: Date.now(),
        });
        await ctx.db.patch("renewal_transactions", args.transactionId, {
          balanceAfter: Math.max(0, mainWallet.balance - amount),
        });
      }
    }
    return null;
  },
});

/**
 * Update next renewal date after successful renewal
 */
export const updateNextRenewal = internalMutation({
  args: { configId: v.id("subscription_renewal_config") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.db.get("subscription_renewal_config", args.configId);
    if (!config) return null;

    const now = Date.now();
    const nextRenewal = now + config.renewalIntervalDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch("subscription_renewal_config", args.configId, {
      lastRenewedAt: now,
      nextRenewalAt: nextRenewal,
      updatedAt: now,
    });
    return null;
  },
});

/**
 * Get renewal transactions history
 */
export const getRenewalHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("renewal_transactions")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get renewal statistics
 */
export const getRenewalStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const configs = await ctx.db.query("subscription_renewal_config").collect();
    const transactions = await ctx.db.query("renewal_transactions").collect();

    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentTx = transactions.filter((t) => t.timestamp >= monthAgo);
    const completed = recentTx.filter((t) => t.status === "completed");
    const failed = recentTx.filter((t) => t.status === "failed");
    const totalSpent = completed.reduce((sum, t) => sum + t.amountNgn, 0);

    const dueNow = configs.filter(
      (c) => c.status === "active" && c.nextRenewalAt && c.nextRenewalAt <= now
    );

    return {
      totalConfigs: configs.length,
      activeConfigs: configs.filter((c) => c.status === "active").length,
      pausedConfigs: configs.filter((c) => c.status === "paused").length,
      dueNow: dueNow.length,
      upcomingRenewals: configs
        .filter((c) => c.status === "active" && c.nextRenewalAt)
        .sort((a, b) => (a.nextRenewalAt || 0) - (b.nextRenewalAt || 0))
        .slice(0, 5)
        .map((c) => ({
          service: c.serviceName,
          amount: c.amountNgn,
          nextRenewal: c.nextRenewalAt,
          daysUntil: Math.ceil(((c.nextRenewalAt || 0) - now) / (24 * 60 * 60 * 1000)),
        })),
      last30Days: {
        totalTransactions: recentTx.length,
        completed: completed.length,
        failed: failed.length,
        totalSpent,
        successRate: recentTx.length > 0 ? (completed.length / recentTx.length) * 100 : 0,
      },
      designatedAccount: {
        account: DESIGNATED_ACCOUNT,
        bank: DESIGNATED_BANK,
        name: DESIGNATED_NAME,
      },
    };
  },
});
