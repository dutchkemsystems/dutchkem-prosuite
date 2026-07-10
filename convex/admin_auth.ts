import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const adminLogin = mutation({
  args: { 
    email: v.string(), 
    password: v.string(),
    deviceId: v.string(),
    ip: v.optional(v.string()),
  },
  returns: v.object({ 
    status: v.union(v.literal("success"), v.literal("2fa_required"), v.literal("locked"), v.literal("failed")),
    message: v.string(),
    token: v.optional(v.string()) 
  }),
  handler: async (ctx, args) => {
    const clientIp = args.ip || "unknown";
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
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

    // 2. Verify Password
    const isValid = user.adminPasswordHash
      ? await ctx.runMutation(internal.auth_helpers._verifyPassword, { password: args.password, stored: user.adminPasswordHash })
      : false;

    if (!isValid) {
      const failedAttempts = (user.adminFailedLoginAttempts || 0) + 1;
      const patch: Record<string, unknown> = { adminFailedLoginAttempts: failedAttempts };
      
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        patch.adminLockedUntil = now + LOCKOUT_MS;
        patch.adminFailedLoginAttempts = 0; // Reset after lockout trigger
      }

      await ctx.db.patch("users", user._id, patch);
      
      await ctx.runMutation(internal.admin.logAdminAction, {
        adminEmail: args.email,
        action: "LOGIN_FAILURE",
        details: `Failed attempt ${failedAttempts} from IP ${clientIp}`,
        ip: clientIp,
      });

      return { status: "failed" as const, message: "Invalid credentials" };
    }

    // 3. Reset failed attempts on success
    await ctx.db.patch("users", user._id, { 
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
      await ctx.db.delete("user_sessions", session._id);
    }

    const sessionId =     await ctx.db.insert("user_sessions", {
      userId: user._id,
      userType: "admin" as const,
      device: args.deviceId,
      location: "Admin Portal",
      ip: clientIp,
      fingerprint: args.deviceId,
      lastActive: now,
      isCurrent: true,
      isTwoFactorVerified: false,
      deviceInfo: {
        userAgent: "Admin Portal",
        deviceType: "web",
        browser: "web",
        os: "web",
      },
      isRevoked: false,
      expiresAt: now + SESSION_EXPIRY_MS,
    });

    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.email,
      action: "LOGIN_SUCCESS",
      details: `Successful login from ${clientIp}`,
      ip: clientIp,
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
    ip: v.optional(v.string())
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const clientIp = args.ip || "unknown";
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.adminTwoFactorEnabled) throw new Error("2FA not active");

    const isValidCode = user.adminBackupCodes?.includes(args.code);

    if (!isValidCode) {
      return { success: false, message: "Invalid 2FA code" };
    }

    // Remove backup code if used
    if (user.adminBackupCodes?.includes(args.code)) {
      await ctx.db.patch("users", user._id, {
        adminBackupCodes: user.adminBackupCodes.filter(c => c !== args.code)
      });
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("user_sessions", {
      userId: user._id,
      userType: "admin" as const,
      device: args.deviceId,
      location: "Admin Portal (2FA)",
      ip: clientIp,
      fingerprint: args.deviceId,
      lastActive: now,
      isCurrent: true,
      isTwoFactorVerified: true,
      deviceInfo: {
        userAgent: "Admin Portal",
        deviceType: "web",
        browser: "web",
        os: "web",
      },
      isRevoked: false,
      expiresAt: now + SESSION_EXPIRY_MS,
    });

    return { success: true, token: sessionId };
  },
});

export const getAdminSessions = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    return await ctx.db.query("user_sessions").collect();
  },
});

export const terminateAllSessions = mutation({
  args: { adminToken: v.string(), adminEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    const sessions = await ctx.db.query("user_sessions").collect();
    for (const s of sessions) await ctx.db.delete("user_sessions", s._id);
    
    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.adminEmail,
      action: "TERMINATE_ALL_SESSIONS",
      details: "Global session termination triggered",
      ip: "internal",
    });
  }
});
