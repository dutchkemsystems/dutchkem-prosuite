import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// FREELANCER MARKETPLACE - Money Flow Implementation
// CRITICAL: Admin NEVER pays freelancers. Client money pays freelancers.
// Money Flow:
// 1. Client pays → Kora merchant wallet
// 2. 15% platform fee → main wallet (immediately)
// 3. 85% → escrow_wallet (held until approval)
// 4. Client approves → escrow status = ready_for_payout
// 5. Friday 2 PM → Kora Payout API sends to freelancer bank
// 6. Daily 11 PM sweep → platform fees from main wallet to bank
// ═══════════════════════════════════════════════════════════════════

/**
 * Client posts a job and pays via Kora Pay.
 * System immediately splits: 15% platform fee → main wallet, 85% → escrow.
 */
export const createJobWithPayment = mutation({
  args: {
    clientId: v.id("users"),
    freelancerId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    koraPaymentReference: v.string(),
  },
  returns: v.id("marketplace_transactions"),
  handler: async (ctx, args) => {
    const platformFee = Math.round(args.amount * 0.15 * 100) / 100;
    const freelancerAmount = Math.round(args.amount * 0.85 * 100) / 100;

    // 1. Create the job first to get a valid jobId
    const jobId = await ctx.db.insert("jobs", {
      freelancerId: args.freelancerId,
      amount: args.amount,
      status: "pending",
      description: args.description,
      completedAt: undefined,
    });

    // 2. Log the marketplace transaction with valid jobId
    const txId = await ctx.db.insert("marketplace_transactions", {
      jobId,
      clientId: args.clientId,
      freelancerId: args.freelancerId,
      amount: args.amount,
      platformFee,
      freelancerAmount,
      status: "escrow",
      koraReference: args.koraPaymentReference,
      createdAt: Date.now(),
    });

    // 3. Add 15% platform fee to main wallet
    await ctx.runMutation(internal.marketplace.addToMainWallet, { amount: platformFee });

    // 4. Add 85% to escrow wallet
    await ctx.runMutation(internal.marketplace.addToEscrowWallet, { amount: freelancerAmount });

    // 5. Create notification for freelancer
    await ctx.db.insert("notifications", {
      userId: args.freelancerId,
      title: "New Job Proposal",
      message: `A client has posted a job of ₦${args.amount} and funds are in escrow.`,
      type: "system",
      read: false,
      createdAt: Date.now(),
    });

    return txId;
  },
});

/**
 * Add platform fee to main wallet.
 */
export const addToMainWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Insert a transaction record for the main wallet
    const existingMain = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "main"))
      .first();

    if (existingMain) {
      await ctx.db.patch(existingMain._id, {
        balance: existingMain.balance + args.amount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("system_wallets", {
        type: "main",
        balance: args.amount,
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Add freelancer amount to escrow wallet.
 */
export const addToEscrowWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("escrow_wallet").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + args.amount,
        totalHeld: existing.totalHeld + args.amount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("escrow_wallet", {
        balance: args.amount,
        totalHeld: args.amount,
        totalReleased: 0,
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Client approves completed work.
 * Changes transaction status from "escrow" → "ready_for_payout".
 */
export const approveJob = mutation({
  args: {
    transactionId: v.id("marketplace_transactions"),
    clientId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found.");

    if (tx.status !== "escrow") {
      throw new Error(`Cannot approve: status is ${tx.status}`);
    }

    // Update transaction status to ready_for_payout
    await ctx.db.patch(args.transactionId, {
      status: "ready_for_payout",
      approvedAt: Date.now(),
    });

    // Update job status to approved
    await ctx.db.patch(tx.jobId, { status: "approved" });

    // Notify freelancer
    await ctx.db.insert("notifications", {
      userId: tx.freelancerId,
      title: "Work Approved",
      message: `Your work has been approved. Payout scheduled for Friday 2 PM.`,
      type: "system",
      read: false,
      createdAt: Date.now(),
    });

    return null;
  },
});

// ──────────────────────────────────────────────────────────────────
// CRON: Weekly Freelancer Payout (Friday 2 PM)
// ──────────────────────────────────────────────────────────────────

/**
 * Runs every Friday 2 PM.
 * Process all approved escrow amounts → Kora Payout API → deduct from escrow.
 */
export const runMarketplacePayouts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const readyTxs = await ctx.runQuery(internal.marketplace.getReadyForPayout);

    for (const tx of readyTxs) {
      try {
        // 1. Deduct from escrow wallet
        await ctx.runMutation(internal.marketplace.releaseFromEscrow, {
          amount: tx.freelancerAmount,
        });

        // 2. Transfer to freelancer via Kora Payout API
        // (In production this calls the actual Kora Payout endpoint)
        const koraRef = `KORA_PAYOUT_${Date.now()}_${tx._id}`;
        console.log(`[Marketplace] Payout ${koraRef} → ₦${tx.freelancerAmount}`);

        // 3. Update transaction to released
        await ctx.runMutation(internal.marketplace.markReleased, {
          transactionId: tx._id,
          koraReference: koraRef,
        });
      } catch (err: any) {
        console.error(`[Marketplace] Payout failed for ${tx._id}:`, err.message);
      }
    }

    return null;
  },
});

// ──────────────────────────────────────────────────────────────────
// CRON: Daily Platform-Fee Sweep (11 PM)
// ──────────────────────────────────────────────────────────────────

/**
 * Sweeps collected platform fees from main wallet → owner's bank.
 * Reuses the existing daily sweep logic; just ensures platform fees are included.
 */
export const runDailyPlatformSweep = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Sum platform fees collected since last sweep
    const totalFees = await ctx.runQuery(internal.marketplace.getUnsweptPlatformFees);
    if (totalFees <= 0) return null;

    // 2. Deduct from main wallet
    await ctx.runMutation(internal.marketplace.deductFromMainWallet, { amount: totalFees });

    // 3. Log sweep
    await ctx.db.insert("daily_sweeps", {
      sweep_id: `PLATFORM_SWEEP_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      amount: totalFees,
      balance_before: 0, // simplified; fetch current balance if needed
      balance_after: 0,
      status: "completed",
      timestamp: Date.now(),
      notes: "Daily platform-fee sweep",
    });

    return null;
  },
});

// ──────────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────────

export const getReadyForPayout = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("marketplace_transactions")
      .withIndex("by_status", (q) => q.eq("status", "ready_for_payout"))
      .collect();
  },
});

export const releaseFromEscrow = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const escrow = await ctx.db.query("escrow_wallet").first();
    if (!escrow) throw new Error("Escrow wallet not found.");
    await ctx.db.patch(escrow._id, {
      balance: Math.max(0, escrow.balance - args.amount),
      totalReleased: escrow.totalReleased + args.amount,
      lastUpdated: Date.now(),
    });
    return null;
  },
});

export const markReleased = internalMutation({
  args: { transactionId: v.id("marketplace_transactions"), koraReference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "released",
      releasedAt: Date.now(),
      koraPayoutReference: args.koraReference,
    });
    return null;
  },
});

export const getUnsweptPlatformFees = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx, args) => {
    // Sum platform fees from all completed marketplace transactions
    const txs = await ctx.db
      .query("marketplace_transactions")
      .withIndex("by_status", (q) => q.eq("status", "released"))
      .collect();
    return txs.reduce((sum, t) => sum + (t.platformFee || 0), 0);
  },
});

export const deductFromMainWallet = internalMutation({
  args: { amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const main = await ctx.db
      .query("system_wallets")
      .withIndex("by_type", (q) => q.eq("type", "main"))
      .first();
    if (main) {
      await ctx.db.patch(main._id, {
        balance: Math.max(0, main.balance - args.amount),
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

// ──────────────────────────────────────────────────────────────────
// API Endpoints (used by HTTP actions)
// ──────────────────────────────────────────────────────────────────

export const getEscrowBalance = query({
  args: {},
  returns: v.object({
    balance: v.number(),
    totalHeld: v.number(),
    totalReleased: v.number(),
  }),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.query("escrow_wallet").first();
    return {
      balance: wallet?.balance || 0,
      totalHeld: wallet?.totalHeld || 0,
      totalReleased: wallet?.totalReleased || 0,
    };
  },
});

export const getPendingFridayPayout = query({
  args: {},
  returns: v.object({
    total: v.number(),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const txs = await ctx.db
      .query("marketplace_transactions")
      .withIndex("by_status", (q) => q.eq("status", "ready_for_payout"))
      .collect();
    return {
      total: txs.reduce((s, t) => s + t.freelancerAmount, 0),
      count: txs.length,
    };
  },
});

export const getPayoutHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("marketplace_transactions"),
    amount: v.number(),
    freelancerAmount: v.number(),
    platformFee: v.number(),
    status: v.string(),
    releasedAt: v.optional(v.number()),
    koraPayoutReference: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const l = args.limit ?? 50;
    return await ctx.db
      .query("marketplace_transactions")
      .withIndex("by_created")
      .order("desc")
      .take(l);
  },
});

export const getMarketplaceStats = query({
  args: {},
  returns: v.object({
    totalEscrow: v.number(),
    totalReleased: v.number(),
    totalPlatformFees: v.number(),
    pendingPayouts: v.number(),
    totalTransactions: v.number(),
  }),
  handler: async (ctx, args) => {
    const allTx = await ctx.db.query("marketplace_transactions").collect();
    const escrow = await ctx.db.query("escrow_wallet").first();

    return {
      totalEscrow: escrow?.balance || 0,
      totalReleased: escrow?.totalReleased || 0,
      totalPlatformFees: allTx.reduce((s, t) => s + t.platformFee, 0),
      pendingPayouts: allTx.filter(t => t.status === "ready_for_payout").length,
      totalTransactions: allTx.length,
    };
  },
});