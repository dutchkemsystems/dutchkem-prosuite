import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * LAYER 7 — GUARDIAN AI: Automated Payment Verification
 * Institutional grade fraud detection and signature validation
 */
export const verifyPayment = internalMutation({
  args: {
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    ip: v.string(),
    userId: v.id("users"),
    signature: v.string(),
    agentId: v.optional(v.string()),
    service: v.optional(v.string()),
  },
  returns: v.object({
    status: v.string(),
    confidenceScore: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Signature Verification (HMAC-SHA256 simulation)
    const encryptionKey = process.env.KORA_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return { status: "rejected", confidenceScore: 0 };
    }
    // Verify HMAC-SHA256 signature
    let isValidSignature = false;
    if (encryptionKey && args.signature) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(encryptionKey),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"]
        );
        const data = `${args.reference}:${args.amount}:${args.currency}`;
        const signatureBytes = Uint8Array.from(atob(args.signature), c => c.charCodeAt(0));
        isValidSignature = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(data));
      } catch {
        isValidSignature = false;
      }
    }
    
    let confidenceScore = 100;
    const flags: Array<string> = [];

    // 2. FRAUD DETECTION SUITE
    const windowStart = Date.now() - (5 * 60 * 1000);
    const recentPayments = await ctx.db
      .query("payment_verifications")
      .order("desc")
      .take(10);
    
    const userRecent = recentPayments.filter(p => p.verifiedAt >= windowStart);
    if (userRecent.length > 2) {
       confidenceScore -= 20;
       flags.push("velocity_violation");
    }

    const session = await ctx.db
      .query("user_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    
    if (session && session.ip !== args.ip) {
      confidenceScore -= 15;
      flags.push("ip_mismatch");
    }

    // Check IP against system_config blacklisted IPs
    const blacklistConfig = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", "blacklisted_ips"))
      .first();
    const fraudList: Array<string> = (blacklistConfig?.value as Array<string>) || [];
    if (fraudList.includes(args.ip)) {
        confidenceScore = 0;
        flags.push("blacklisted_ip");
    }

    // 3. Decision Engine
    let status: "approved" | "rejected" | "manual_review" = "approved";
    let reason = "Verified by Guardian AI Node";

    if (confidenceScore < 50 || !isValidSignature) {
      status = "rejected";
      reason = flags.join(", ") || "Institutional fraud risk detected";
    } else if (confidenceScore < 85) {
      status = "manual_review";
      reason = "Flagged for Human review: " + flags.join(", ");
    }

    // 4. Record Verification
    await ctx.db.insert("payment_verifications", {
      reference: args.reference,
      amount: args.amount,
      status,
      reason,
      confidenceScore,
      verifiedAt: Date.now(),
      agentId: args.agentId,
      service: args.service,
      userId: args.userId,
    });

    // 4.1 Update System Wallets if approved
    if (status === "approved") {
        await ctx.runMutation(internal.guardian.updateSystemWallets, { amount: args.amount, userId: args.userId });
    }

    // 5. Update User Balance / Active Projects
    if (status === "approved" && args.agentId) {
        await ctx.db.insert("projects", {
            userId: args.userId,
            name: args.service || "New Project",
            agentId: args.agentId,
            status: "in-progress",
            format: "MP4",
            createdAt: Date.now()
        });
    }

    // 6. Log Security Event (Layer 8 Audit)
    await ctx.runMutation(internal.guardian.logSecurityEvent, {
      userId: args.userId,
      action: "PAYMENT_VERIFICATION",
      details: `Ref: ${args.reference} | Result: ${status.toUpperCase()} | Score: ${confidenceScore}% | Agent: ${args.agentId}`,
      ip: args.ip,
      userAgent: "Guardian AI Engine",
    });

    // 7. Webhook triggers are handled by the caller (http.ts) — no double-fire here

    return { status, confidenceScore };
  },
});

export const logSecurityEvent = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    details: v.string(),
    ip: v.string(),
    userAgent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      ...args,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const updateSystemWallets = internalMutation({
    args: { amount: v.number(), userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const platformFee = args.amount * 0.15;
        const freelancerShare = args.amount * 0.85;
        const vat = args.amount * 0.075;

        const wallets = ["main", "freelancer", "referral", "tax"];
        for (const type of wallets) {
            const existing = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", type as any)).first();
            if (!existing) {
                await ctx.db.insert("system_wallets", { type: type as any, balance: 0, lastUpdated: Date.now() });
            }
        }

        const mainWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).unique();
        const freelancerWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "freelancer")).unique();
        const taxWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "tax")).unique();

        // 1. Owner gets platform fee
        await ctx.db.patch("system_wallets", mainWallet!._id, { balance: mainWallet!.balance + platformFee, lastUpdated: Date.now() });
        
        // 2. Freelancer pool gets 85%
        await ctx.db.patch("system_wallets", freelancerWallet!._id, { balance: freelancerWallet!.balance + freelancerShare, lastUpdated: Date.now() });

        // 3. Collect VAT into Tax Wallet
        await ctx.db.patch("system_wallets", taxWallet!._id, { balance: taxWallet!.balance + vat, lastUpdated: Date.now() });

        // 4. Log Tax Transaction for VAT
        await ctx.db.insert("tax_transactions", {
            type: "DAILY_DEDUCTION",
            amount: vat,
            from_wallet: "REVENUE",
            to_wallet: "TAX_WALLET",
            date: Date.now(),
            earnings_period_start: Date.now(),
            earnings_period_end: Date.now(),
            earnings_amount: args.amount,
            tax_rate_applied: 7.5,
            reference: `VAT_${Date.now()}`,
            notes: "VAT collected from customer"
        });
    }
});

/**
 * LAYER 4 — SESSION MANAGEMENT: Single Session Enforcement
 */
export const enforceSingleSession = internalMutation({
  args: { userId: v.id("users"), currentFingerprint: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activeSessions = await ctx.db
      .query("user_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const session of activeSessions) {
      if (session.fingerprint !== args.currentFingerprint) {
        await ctx.db.delete("user_sessions", session._id);
        // Log invalidation
        await ctx.db.insert("audit_logs", {
            userId: args.userId,
            action: "SESSION_INVALIDATED",
            details: `Concurrent login detected. Terminated session: ${session.fingerprint}`,
            ip: "system",
            userAgent: "Guardian AI Session Manager",
            createdAt: Date.now()
        });
      }
    }
    return null;
  },
});
