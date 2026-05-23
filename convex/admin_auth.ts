import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export const adminLogin = mutation({
  args: { 
    email: v.string(), 
    password: v.string(),
    deviceId: v.string(),
    ip: v.string()
  },
  returns: v.object({ 
    status: v.union(v.literal("success"), v.literal("2fa_required"), v.literal("locked"), v.literal("failed")),
    message: v.string(),
    token: v.optional(v.string()) 
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user || user.role !== "admin") {
      return { status: "failed" as const, message: "Invalid credentials" };
    }

    const now = Date.now();

    // 1. Check Lockout
    if (user.adminLockedUntil && user.adminLockedUntil > now) {
      const minutesLeft = Math.ceil((user.adminLockedUntil - now) / 60000);
      return { status: "locked" as const, message: `Account locked for ${minutesLeft} more minutes` };
    }

    // 2. Verify Password (Mocking hash comparison)
    const isValid = user.adminPasswordHash === "MOCK_HASH_" + args.password;

    if (!isValid) {
      const failedAttempts = (user.adminFailedLoginAttempts || 0) + 1;
      const patch: any = { adminFailedLoginAttempts: failedAttempts };
      
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        patch.adminLockedUntil = now + LOCKOUT_MS;
        patch.adminFailedLoginAttempts = 0; // Reset after lockout trigger
      }

      await ctx.db.patch(user._id, patch);
      
      await ctx.runMutation(internal.admin.logAdminAction, {
        adminEmail: args.email,
        action: "LOGIN_FAILURE",
        details: `Failed attempt ${failedAttempts} from IP ${args.ip}`,
        ip: args.ip,
      });

      return { status: "failed" as const, message: "Invalid credentials" };
    }

    // 3. Reset failed attempts on success
    await ctx.db.patch(user._id, { 
      adminFailedLoginAttempts: 0,
      adminLockedUntil: undefined,
      adminLastLoginAt: now
    });

    // 4. Handle 2FA
    if (user.adminTwoFactorEnabled) {
      return { status: "2fa_required" as const, message: "Two-factor authentication required" };
    }

    // 5. Create Session (Invalidate old ones for single session enforcement)
    const existingSessions = await ctx.db
      .query("user_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    const sessionId = await ctx.db.insert("user_sessions", {
      userId: user._id,
      device: args.deviceId,
      location: "Admin Portal",
      ip: args.ip,
      fingerprint: args.deviceId,
      lastActive: now,
      isCurrent: true,
      isTwoFactorVerified: false,
    });

    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.email,
      action: "LOGIN_SUCCESS",
      details: `Successful login from ${args.ip}`,
      ip: args.ip,
    });

    return { 
      status: "success" as const, 
      message: "Welcome to Command Center", 
      token: sessionId // Simplified: using sessionId as token for this implementation
    };
  },
});

export const verifyAdmin2FA = mutation({
  args: { 
    email: v.string(), 
    code: v.string(),
    deviceId: v.string(),
    ip: v.string()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user || !user.adminTwoFactorEnabled) throw new Error("2FA not active");

    // In a real app, verify TOTP code with user.adminTwoFactorSecret
    const isValidCode = args.code === "123456" || user.adminBackupCodes?.includes(args.code);

    if (!isValidCode) {
      return { success: false, message: "Invalid 2FA code" };
    }

    // Remove backup code if used
    if (user.adminBackupCodes?.includes(args.code)) {
      await ctx.db.patch(user._id, {
        adminBackupCodes: user.adminBackupCodes.filter(c => c !== args.code)
      });
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("user_sessions", {
      userId: user._id,
      device: args.deviceId,
      location: "Admin Portal (2FA)",
      ip: args.ip,
      fingerprint: args.deviceId,
      lastActive: now,
      isCurrent: true,
      isTwoFactorVerified: true,
    });

    return { success: true, token: sessionId };
  },
});

export const getAdminSessions = query({
  args: {},
  handler: async (ctx) => {
    // In real app, check context for authenticated admin
    return await ctx.db.query("user_sessions").collect();
  },
});

export const terminateAllSessions = mutation({
  args: { adminEmail: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("user_sessions").collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    
    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.adminEmail,
      action: "TERMINATE_ALL_SESSIONS",
      details: "Global session termination triggered",
      ip: "internal",
    });
  }
});
