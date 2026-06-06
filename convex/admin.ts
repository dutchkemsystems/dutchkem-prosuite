import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Helper for shared logic
async function fetchSweepSettings(ctx: import("./_generated/server").QueryCtx) {
    const settings = await ctx.db.query("system_config").collect();
    const config: Record<string, unknown> = {};
    settings.forEach((s) => config[s.key] = s.value);

    return {
        enabled: config.DAILY_SWEEP_ENABLED ?? true,
        minimumAmount: config.DAILY_SWEEP_MINIMUM_AMOUNT ?? 1000,
        time: config.DAILY_SWEEP_TIME ?? "23:00",
        sweepType: config.DAILY_SWEEP_TYPE ?? "full",
        keepBalance: config.DAILY_SWEEP_KEEP_BALANCE ?? 0,
        fixedAmount: config.DAILY_SWEEP_FIXED_AMOUNT ?? 0,
        maximumAmount: config.DAILY_SWEEP_MAXIMUM_AMOUNT ?? 0,
        days: config.DAILY_SWEEP_DAYS ?? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        bankDetails: {
            bankName: "OPay",
            accountNumber: "8121161202",
            accountName: "Oladotun Alabi"
        }
    };
}

/**
 * Helper for admin security
 */
async function _verifyAdminAccess(ctx: { db: import("./_generated/server").QueryCtx["db"] }, args: { sessionId: Id<"user_sessions">, ip?: string }) {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
        throw new Error("2FA Required for administration");
    }

    const config = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", "ADMIN_ALLOWED_IPS_ONLY")).first();
    if (config?.value === true && args.ip) {
        const user = await ctx.db.get(session.userId);
        if (user && user.adminAllowedIps && !user.adminAllowedIps.includes(args.ip)) {
            throw new Error(`Access Denied: IP ${args.ip} not authorized for administrative operations.`);
        }
    }
    return session;
}

/**
 * ADMIN SECTION 1: STATS OVERVIEW
 */
export const getAdminStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
const dayAgo = now - (24 * 60 * 60 * 1000);
const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Revenue metrics from database
    const verifications = await ctx.db.query("payment_verifications").collect();
    const approved = verifications.filter(v => v.status === "approved");
    
    const dailyRevenue = approved.filter(v => v.verifiedAt >= dayAgo).reduce((sum, v) => sum + v.amount, 0);
    const weeklyRevenue = approved.filter(v => v.verifiedAt >= weekAgo).reduce((sum, v) => sum + v.amount, 0);
    const monthlyRevenue = approved.filter(v => v.verifiedAt >= monthAgo).reduce((sum, v) => sum + v.amount, 0);
    const totalRevenue = approved.reduce((sum, v) => sum + v.amount, 0);

    const activeSubscriptions = await ctx.db.query("subscriptions")
      .withIndex("by_status_and_endsAt", q => q.eq("status", "active"))
      .collect();

    const stats = {
      revenue: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        yearly: totalRevenue,
        total: totalRevenue,
      },
      mrr: monthlyRevenue,
      subscribers: activeSubscriptions.length,
      activeAgents: 15,
      platformFees: Math.round(monthlyRevenue * 0.15),
      fraudStopped: 0,
    };

    const agentHealth = [
        { modelName: "meta-llama/llama-3.3-70b-instruct", status: "healthy", failureCount: 0, avgResponseTime: 1.8, requestsToday: 0, fallbackTriggered: 0 },
        { modelName: "meta-llama/llama-3.1-70b-instruct", status: "healthy", failureCount: 0, avgResponseTime: 2.1, requestsToday: 0, fallbackTriggered: 0 },
        { modelName: "mistralai/mixtral-8x22b-instruct", status: "healthy", failureCount: 0, avgResponseTime: 2.5, requestsToday: 0, fallbackTriggered: 0 },
        { modelName: "meta-llama/llama-3-8b-instruct", status: "healthy", failureCount: 0, avgResponseTime: 0.9, requestsToday: 0, fallbackTriggered: 0 },
    ];

    const recentPayments = await ctx.db.query("payment_verifications")
      .withIndex("by_status", q => q.eq("status", "approved"))
      .order("desc")
      .take(10);

    const guardianStats = {
        todayTransactions: approved.filter(v => v.verifiedAt >= dayAgo).length,
        autoApproved: approved.filter(v => v.verifiedAt >= dayAgo).length,
        autoApprovedValue: dailyRevenue,
        autoRejected: verifications.filter(v => v.status === "rejected" && v.verifiedAt >= dayAgo).length,
        autoRejectedValue: verifications.filter(v => v.status === "rejected" && v.verifiedAt >= dayAgo).reduce((sum, v) => sum + v.amount, 0),
        flagged: verifications.filter(v => v.status === "manual_review" && v.verifiedAt >= dayAgo).length,
        avgVerificationTime: 2.3,
        fraudPreventedMonth: 0,
        lastVerification: recentPayments[0]?.verifiedAt || now,
        status: "online"
    };

    return { stats, agentHealth, guardianStats };
  },
});

/**
 * ADMIN SECTION: EARNINGS SUMMARY
 */
export const getEarningsSummary = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const startOfWeek = now - (7 * 24 * 60 * 60 * 1000);
        const startOfMonth = now - (30 * 24 * 60 * 60 * 1000);

        const verifications = await ctx.db.query("payment_verifications")
            .withIndex("by_status", (q) => q.eq("status", "approved"))
            .collect();

        const mainWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "main")).unique();

        const calculateEarnings = (items: { amount: number }[]) => {
            const revenue = items.reduce((acc, i) => acc + i.amount, 0);
            const fee = revenue * 0.15;
            return { revenue, fee, share: revenue - fee };
        };

        return {
            today: calculateEarnings(verifications.filter(v => v.verifiedAt >= startOfDay)),
            week: calculateEarnings(verifications.filter(v => v.verifiedAt >= startOfWeek)),
            month: calculateEarnings(verifications.filter(v => v.verifiedAt >= startOfMonth)),
            allTime: calculateEarnings(verifications),
            walletBalance: mainWallet?.balance ?? 0
        };
    }
});

/**
 * ADMIN SECTION: SWEEP SETTINGS
 */
export const getSweepSettings = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        return await fetchSweepSettings(ctx);
    }
});

export const getSweepSettingsInternal = internalQuery({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        return await fetchSweepSettings(ctx);
    }
});

export const updateSweepSettings = mutation({
    args: { 
        settings: v.object({
            enabled: v.boolean(),
            minimumAmount: v.number(),
            time: v.string(),
            sweepType: v.union(v.literal("full"), v.literal("threshold"), v.literal("fixed")),
            keepBalance: v.optional(v.number()),
            fixedAmount: v.optional(v.number()),
            maximumAmount: v.optional(v.number()),
            days: v.array(v.string())
        }),
        adminEmail: v.string(),
        sessionId: v.id("user_sessions")
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required for payout settings");
        }

        const keys = Object.keys(args.settings) as Array<keyof typeof args.settings>;
        for (const key of keys) {
            const configKey = `DAILY_SWEEP_${key.toUpperCase()}`;
            const existing = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", configKey)).first();
            const value = args.settings[key];
            
            if (existing) {
                await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
            } else {
                await ctx.db.insert("system_config", { key: configKey, value, updatedAt: Date.now() });
            }
        }

        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "UPDATE_SWEEP_SETTINGS",
            details: "Updated daily automated payout configuration",
            ip: "internal"
        });
    }
});

/**
 * ADMIN SECTION: SYSTEM CONFIG
 */
export const getSystemConfig = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        return await ctx.db.query("system_config").collect();
    }
});

export const updateSystemConfig = mutation({
    args: { key: v.string(), value: v.any(), adminEmail: v.string(), sessionId: v.id("user_sessions") },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Security check
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required for configuration changes");
        }

        const existing = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", args.key)).first();
        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("system_config", { key: args.key, value: args.value, updatedAt: Date.now() });
        }

        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "UPDATE_CONFIG",
            details: `Set ${args.key} to ${JSON.stringify(args.value)}`,
            ip: "internal"
        });
    }
});

/**
 * ADMIN SECTION: BROADCAST NOTIFICATIONS
 */
export const broadcastNotification = mutation({
    args: { 
        title: v.string(), 
        message: v.string(), 
        type: v.string(), 
        adminEmail: v.string(), 
        sessionId: v.id("user_sessions") 
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required for broadcast");
        }

        await ctx.db.insert("notifications", {
            // Broadcast to all — omit userId
            title: args.title,
            message: args.message,
            type: args.type,
            read: false,
            createdAt: Date.now()
        });

        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "BROADCAST_NOTIFICATION",
            details: `Broadcast: ${args.title}`,
            ip: "internal"
        });
    }
});

/**
 * ADMIN SECTION: MANUAL PAYOUT
 */
export const manualPayout = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        type: v.union(v.literal("freelancer"), v.literal("referral"), v.literal("sweep")),
        adminEmail: v.string(),
        sessionId: v.id("user_sessions")
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required for manual payouts");
        }

        // 1. Check daily limit (₦5,000,000)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentPayouts = await ctx.db.query("payouts").collect();
        const dailyTotal = recentPayouts
            .filter(p => p.createdAt >= dayAgo && p.status === "completed")
            .reduce((acc, p) => acc + p.amount, 0);

        if (dailyTotal + args.amount > 5000000) {
            throw new Error("Maximum daily payout limit (₦5M) reached. Request blocked by Guardian AI.");
        }

        // 2. Process Payout
        await ctx.db.insert("payouts", {
            userId: args.userId,
            amount: args.amount,
            status: "completed",
            type: args.type,
            createdAt: Date.now()
        });

        // 3. Log Action
        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "MANUAL_PAYOUT",
            details: `Paid ₦${args.amount} to user ${args.userId} (${args.type})`,
            ip: "internal"
        });

        return { success: true };
    }
});

/**
 * ADMIN SECTION 3: FLAGGED TRANSACTIONS
 */
export const getFlaggedTransactions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("payment_verifications")
      .withIndex("by_status", (q) => q.eq("status", "manual_review"))
      .order("desc")
      .collect();
  },
});

/**
 * ADMIN SECTION: DAILY SWEEPS
 */
export const getDailySweeps = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        return await ctx.db.query("daily_sweeps").order("desc").take(30);
    }
});

/**
 * ADMIN SECTION: RECENT TRANSACTIONS (Last 24 Hours)
 */
export const getRecentTransactions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
      return await ctx.db
        .query("payment_verifications")
        .order("desc")
        .take(20);
  }
});

/**
 * ADMIN SECTION: AUDIT LOGS
 */
export const getAuditLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("audit_logs")
      .order("desc")
      .take(50);
  }
});

/**
 * ADMIN SECTION 6: FREELANCER MANAGEMENT
 */
export const getFreelancerOverview = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const freelancers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "freelancer")).collect();
    const jobs = await ctx.db.query("jobs").collect();
    const payouts = await ctx.db.query("payouts").collect();
    
    return {
      total: freelancers.length,
      pendingApplications: jobs.filter(j => j.status === "pending").length,
      autoApprovedWeek: 0,
      autoRejectedWeek: 0,
      totalPaidMonth: payouts.filter(p => p.type === "freelancer").reduce((sum, p) => sum + p.amount, 0),
      avgEarnings: freelancers.length > 0 ? Math.round(payouts.filter(p => p.type === "freelancer").reduce((sum, p) => sum + p.amount, 0) / freelancers.length) : 0,
      pendingJobs: jobs.filter(j => j.status === "pending").length,
      approvedJobs: jobs.filter(j => j.status === "approved").length,
    };
  },
});

/**
 * ADMIN SECTION: REFERRAL OVERVIEW
 */
export const getReferralOverview = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const payouts = await ctx.db.query("payouts").collect();
        const referralPayouts = payouts.filter(p => p.type === "referral");
        const usersWithReferrals = users.filter(u => u.referredBy);
        
        return {
            totalReferrers: usersWithReferrals.length,
            totalPaidLifetime: referralPayouts.reduce((sum, p) => sum + p.amount, 0),
            pendingPayouts: referralPayouts.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0),
            avgCommission: referralPayouts.length > 0 ? Math.round(referralPayouts.reduce((sum, p) => sum + p.amount, 0) / referralPayouts.length) : 0,
            topReferrer: null,
        };
    }
});

/**
 * ADMIN AUDIT LOGGING
 */
export const logAdminAction = internalMutation({
  args: {
    adminEmail: v.string(),
    action: v.string(),
    details: v.string(),
    ip: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      userId: undefined,
      action: `ADMIN: ${args.action}`,
      details: `[${args.adminEmail}] ${args.details}`,
      ip: args.ip,
      userAgent: "ProSuite Admin Panel",
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * ADMIN ACTIONS (Quick Actions)
 */
export const listAllUsers = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const manualOverrideTransaction = mutation({
  args: { 
    reference: v.string(), 
    action: v.union(v.literal("approve"), v.literal("reject")),
    adminEmail: v.string(),
    sessionId: v.id("user_sessions")
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Security: Verify session and 2FA
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
      throw new Error("2FA Required for sensitive operations");
    }

    const verification = await ctx.db.query("payment_verifications")
      .withIndex("by_reference", q => q.eq("reference", args.reference))
      .first();
    
    if (!verification) throw new Error("Transaction not found");

    await ctx.db.patch(verification._id, {
      status: args.action === "approve" ? "approved" : "rejected",
      reason: `Manual Override by ${args.adminEmail}`,
    });

    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.adminEmail,
      action: "OVERRIDE_TRANSACTION",
      details: `${args.action.toUpperCase()} transaction ${args.reference}`,
      ip: "internal",
    });

    return { success: true };
  },
});

export const terminateSession = mutation({
    args: { sessionId: v.id("user_sessions"), adminEmail: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.delete(args.sessionId);
        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "TERMINATE_SESSION",
            details: `Terminated session: ${args.sessionId}`,
            ip: "internal"
        });
    }
});

export const archiveBeneficiary = mutation({
    args: { id: v.id("beneficiaries"), adminEmail: v.string(), sessionId: v.id("user_sessions") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required");
        }
        await ctx.db.patch(args.id, { status: "archived", updatedAt: Date.now() });
        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "ARCHIVE_BENEFICIARY",
            details: `Archived beneficiary: ${args.id}`,
            ip: "internal"
        });
    }
});

export const getAgentServices = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_services")
      .withIndex("by_agent", q => q.eq("agent_id", args.agentId))
      .collect();
  },
});

export const getTaxWalletStats = query({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const taxWallet = await ctx.db.query("system_wallets").withIndex("by_type", q => q.eq("type", "tax")).unique();
        const history = await ctx.db.query("tax_transactions").order("desc").take(10);
        const interest = await ctx.db.query("interest_earnings").order("desc").take(5);

        return {
            balance: taxWallet?.balance ?? 0,
            interestEarned: interest.reduce((acc: number, i: any) => acc + i.interest_earned, 0),
            history: history.map((h: any) => ({
                amount: h.amount,
                type: h.type,
                date: new Date(h.date).toLocaleDateString()
            }))
        };
    }
});

export const rotateEncryptionKeys = mutation({
    args: { adminEmail: v.string(), sessionId: v.id("user_sessions") },
    returns: v.any(),
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session || !session.isCurrent || !session.isTwoFactorVerified) {
            throw new Error("2FA Required for key rotation");
        }
        
        // In a real system, this would re-encrypt all records with a new key.
        // For this implementation, we log the intent and status.
        await ctx.runMutation(internal.admin.logAdminAction, {
            adminEmail: args.adminEmail,
            action: "ROTATE_KEYS",
            details: "Security key rotation protocol initialized",
            ip: "internal"
        });
        
        return { success: true, nextRotation: Date.now() + (90 * 24 * 60 * 60 * 1000) };
    }
});

export const getAdminProfile = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Use admin session to identify the correct admin user
    let adminUser: any = null;
    
    if (args.adminToken) {
      // Validate session and get the admin user
      const session: any = await ctx.db.get(args.adminToken as any);
      if (session && session.userId && session.userType === "admin" && !session.isRevoked) {
        adminUser = await ctx.db.get(session.userId);
      }
    }
    
    // Fallback: find admin by role if no session
    if (!adminUser) {
      adminUser = await ctx.db.query("users")
        .withIndex("by_role", q => q.eq("role", "admin"))
        .first();
    }

    if (!adminUser) return { _id: "unknown", name: "Admin", email: "admin@dutchkem.com", role: "admin", lastLogin: null, loginCount: 0 };

    const configs = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return {
      _id: adminUser._id,
      name: adminUser.name || "Super Admin",
      email: adminUser.email,
      role: adminUser.role || "admin",
      lastLogin: adminUser.adminLastLoginAt
        ? new Date(adminUser.adminLastLoginAt).toISOString()
        : configMap.ADMIN_LAST_LOGIN
          ? new Date(configMap.ADMIN_LAST_LOGIN as number).toISOString()
          : null,
      loginCount: (configMap.ADMIN_LOGIN_COUNT as number) || 0,
    };
  },
});

export const getUpgradeStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const flag = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", "auto_upgrade_enabled"))
      .first();

    const enabled = flag?.enabled === true;

    return {
      autoUpgradeEnabled: enabled,
      currentStatus: enabled ? "System current" : "Updates pending",
      statusIndicator: enabled ? "🟢" : "🔴",
    };
  },
});
