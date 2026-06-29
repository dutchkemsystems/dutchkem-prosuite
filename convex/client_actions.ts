import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const toggle2FA = mutation({
  args: { enable: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get("users", userId);
    if (!user) return { error: "User not found" };

    await ctx.db.patch("users", userId, {
      adminTwoFactorEnabled: args.enable,
      adminTwoFactorSecret: args.enable ? generateSecret() : undefined,
    });

    await ctx.db.insert("audit_logs", {
      userId,
      action: args.enable ? "2FA_ENABLED" : "2FA_DISABLED",
      details: `Two-factor authentication ${args.enable ? "enabled" : "disabled"} by user`,
      ip: "client",
      userAgent: "client-dashboard",
      createdAt: Date.now(),
    });

    return { success: true, enabled: args.enable };
  },
});

export const changeClientPassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get("users", userId);
    if (!user) return { error: "User not found" };

    if (args.newPassword.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }

    if (user.adminPasswordHash) {
      const valid = await ctx.runMutation(internal.auth_helpers._verifyPassword, { password: args.currentPassword, stored: user.adminPasswordHash });
      if (!valid) return { error: "Current password is incorrect" };
    }

    const newHash = await ctx.runMutation(internal.auth_helpers._hashPassword, { password: args.newPassword });
    await ctx.db.patch("users", userId, { adminPasswordHash: newHash });

    await ctx.db.insert("audit_logs", {
      userId,
      action: "CLIENT_PASSWORD_CHANGED",
      details: "Client password changed via dashboard",
      ip: "client",
      userAgent: "client-dashboard",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const get2FAStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { enabled: false };

    const user = await ctx.db.get("users", userId);
    return { enabled: (user as any)?.adminTwoFactorEnabled ?? false };
  },
});

export const requestReferralPayout = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get("users", userId);
    if (!user) return { error: "User not found" };

    const conversions = await ctx.db.query("referral_conversions")
      .withIndex("by_referrer", q => q.eq("referrerId", userId as any))
      .filter(q => q.eq(q.field("status"), "earned"))
      .collect();

    const totalAvailable = conversions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

    if (totalAvailable < 1000) {
      return { error: "Minimum payout is ₦1,000", available: totalAvailable };
    }

    await ctx.db.insert("referral_payouts", {
      userId: userId as any,
      amount: totalAvailable,
      status: "pending",
      period: new Date().toISOString().substring(0, 7),
      createdAt: Date.now(),
    });

    for (const conv of conversions) {
      await ctx.db.patch(conv._id, { status: "paid" });
    }

    await ctx.db.insert("audit_logs", {
      userId,
      action: "REFERRAL_PAYOUT_REQUESTED",
      details: `Requested referral payout of ₦${totalAvailable.toLocaleString()}`,
      ip: "client",
      userAgent: "client-dashboard",
      createdAt: Date.now(),
    });

    return { success: true, amount: totalAvailable };
  },
});

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const ensureReferralCode = mutation({
  args: {},
  returns: v.object({ referralCode: v.string(), generated: v.boolean() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { referralCode: "", generated: false };

    const user = await ctx.db.get("users", userId);
    if (!user) return { referralCode: "", generated: false };

    if ((user as any).referralCode) {
      return { referralCode: (user as any).referralCode, generated: false };
    }

    const referralCode = generateReferralCode();
    await ctx.db.patch("users", userId, { referralCode });
    return { referralCode, generated: true };
  },
});
