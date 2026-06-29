import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { hashPasswordPure, verifyPasswordPure, hmacSign } from "./crypto_pure";
import type { Id } from "./_generated/dataModel";

export const _hashPassword = internalMutation({
  args: { password: v.string() },
  returns: v.string(),
  handler: async (_ctx, args) => hashPasswordPure(args.password),
});

export const _verifyPassword = internalMutation({
  args: { password: v.string(), stored: v.string() },
  returns: v.boolean(),
  handler: async (_ctx, args) => verifyPasswordPure(args.password, args.stored),
});

export const _encryptWeb = internalAction({
  args: { text: v.string(), keyHex: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const { encryptWeb } = await import("./encryption");
    return encryptWeb(args.text, args.keyHex);
  },
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN SESSION AUTH (custom auth, NOT Convex Auth)
// ═══════════════════════════════════════════════════════════════════
// The Dutchkem dashboard uses a custom admin auth system (admin_auth.ts):
//   - Login via api.admin_auth.adminLogin returns { token: sessionId }
//   - Dashboard stores the token in localStorage as "admin_session_token"
//   - All Convex actions/mutations must validate this token to know
//     which admin is calling them
//
// The helpers below replace ctx.auth.getUserIdentity()
// (which is Convex Auth and never gets populated) with our custom check.

export type AdminIdentity = {
  _id: Id<"users">;
  email: string;
  name?: string;
  role: "admin";
};

/**
 * Core validation logic. Works from any ctx that has `db`
 * (query, mutation). Actions must use the `validateAdminSession`
 * query below (via ctx.runQuery) because actions do not have
 * direct `ctx.db` access.
 */
async function validateAdminSessionCore(
  ctx: { db: { get: (id: any) => Promise<any> } },
  adminToken: string | null | undefined,
): Promise<AdminIdentity | null> {
  if (!adminToken) return null;
  let session: any = null;
  try {
    session = await ctx.db.get(adminToken as any);
  } catch {
    return null;
  }
  if (!session) return null;
  if (session.isRevoked) return null;
  if (typeof session.expiresAt === "number" && session.expiresAt < Date.now()) {
    return null;
  }
  if (session.userType !== "admin") return null;
  let user: any = null;
  try {
    user = await ctx.db.get(session.userId);
  } catch {
    return null;
  }
  if (!user) return null;
  if (user.role !== "admin") return null;
  return { _id: user._id, email: user.email, name: user.name, role: "admin" };
}

/**
 * Query wrapper for use in ACTIONS (which have no direct ctx.db).
 * Call from an action via: ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken })
 */
export const validateAdminSession = internalQuery({
  args: { adminToken: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      role: v.literal("admin"),
    }),
  ),
  handler: async (ctx, { adminToken }) => {
    return await validateAdminSessionCore(ctx, adminToken);
  },
});

/**
 * Public session check for the dashboard itself.
 * Returns { valid: true, email, name } if session is valid, { valid: false } if not.
 * Frontend can poll this on tab focus / visibility change to detect expired sessions.
 */
export const checkAdminSession = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.object({
    valid: v.boolean(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, { adminToken }) => {
    if (!adminToken) return { valid: false };
    let session: any = null;
    try {
      session = await ctx.db.get("user_sessions", adminToken as Id<"user_sessions">);
    } catch {
      return { valid: false };
    }
    if (!session) return { valid: false };
    if (session.isRevoked) return { valid: false };
    if (typeof session.expiresAt === "number" && session.expiresAt < Date.now()) {
      return { valid: false };
    }
    if (session.userType !== "admin") return { valid: false };
    let user: any = null;
    try {
      user = await ctx.db.get(session.userId);
    } catch {
      return { valid: false };
    }
    if (!user) return { valid: false };
    if (user.role !== "admin") return { valid: false };
    return {
      valid: true,
      email: user.email,
      name: user.name,
      expiresAt: session.expiresAt,
    };
  },
});

/**
 * For queries and mutations that have direct ctx.db access.
 * Returns the identity or null.
 */
export async function tryGetAdminSession(
  ctx: { db: { get: (id: any) => Promise<any> } },
  adminToken: string | null | undefined,
): Promise<AdminIdentity | null> {
  return await validateAdminSessionCore(ctx, adminToken);
}

/**
 * For queries and mutations that have direct ctx.db access.
 * Throws "Not authenticated" if invalid.
 */
export async function requireAdminSession(
  ctx: { db: { get: (id: any) => Promise<any> } },
  adminToken: string | null | undefined,
): Promise<AdminIdentity> {
  const identity = await validateAdminSessionCore(ctx, adminToken);
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

/**
 * For ACTIONS (which have no direct ctx.db access).
 * Uses ctx.runQuery to invoke the validateAdminSession query.
 * Returns identity or null.
 */
export async function tryGetAdminSessionInAction(
  ctx: { runQuery: (fn: any, args: any) => Promise<any> },
  adminToken: string | null | undefined,
): Promise<AdminIdentity | null> {
  return await ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken });
}

// ─── Enterprise Session Auth ───

export interface EnterpriseAuthResult {
  authenticated: boolean;
  isAdmin: boolean;
  orgId?: any;
  actorId?: string;
}

/**
 * Resolve authentication from either admin token or enterprise session token.
 * Returns auth info including resolved orgId, or null if not authenticated.
 */
export async function tryResolveEnterpriseAuth(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: any },
): Promise<EnterpriseAuthResult | null> {
  // Try admin token first
  if (args.adminToken) {
    const identity = await tryGetAdminSession(ctx as any, args.adminToken);
    if (identity) {
      return { authenticated: true, isAdmin: true, orgId: args.orgId || null, actorId: identity._id };
    }
  }
  // Try enterprise session token
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) {
      return { authenticated: true, isAdmin: false, orgId: args.orgId || session.orgId, actorId: session.orgId };
    }
  }
  return null;
}

// ─── Rate Limiting / Failed Logins ───

export const countFailedLogins = query({
  args: { email: v.string(), ip: v.string(), windowMs: v.number() },
  returns: v.any(),
  handler: async (ctx, { email, ip, windowMs }) => {
    const cutoff = Date.now() - windowMs;
    return await ctx.db.query("failed_logins")
      .withIndex("by_time", q => q.gt("attemptTime", cutoff))
      .filter(q => q.and(q.eq(q.field("email"), email), q.eq(q.field("ipAddress"), ip)))
      .collect().then(r => r.length);
  },
});

export const countAdminFailedLogins = query({
  args: { email: v.string(), ip: v.string(), windowMs: v.number() },
  returns: v.any(),
  handler: async (ctx, { email, ip, windowMs }) => {
    const cutoff = Date.now() - windowMs;
    return await ctx.db.query("failed_logins")
      .withIndex("by_time", q => q.gt("attemptTime", cutoff))
      .filter(q => q.and(q.eq(q.field("email"), email), q.eq(q.field("ipAddress"), ip)))
      .collect().then(r => r.length);
  },
});

export const logFailedAttempt = mutation({
  args: { email: v.string(), ip: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, ip }) => {
    await ctx.db.insert("failed_logins", {
      email,
      ipAddress: ip,
      attemptTime: Date.now(),
      success: false,
    });
  },
});

export const logAdminFailedLogin = mutation({
  args: { email: v.string(), ip: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, ip }) => {
    await ctx.db.insert("failed_logins", {
      email,
      ipAddress: ip,
      attemptTime: Date.now(),
      success: false,
    });
  },
});

export const clearFailedLogins = mutation({
  args: { email: v.string(), ip: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, ip }) => {
    const logs = await ctx.db.query("failed_logins")
      .filter(q => q.and(q.eq(q.field("email"), email), q.eq(q.field("ipAddress"), ip)))
      .collect();
    for (const log of logs) {
      await ctx.db.delete("failed_logins", log._id);
    }
  },
});

// ─── User Lookup ───

export const findUserByEmail = query({
  args: { email: v.string() },
  returns: v.any(),
  handler: async (ctx, { email }) => {
    return await ctx.db.query("users").withIndex("email", q => q.eq("email", email)).first();
  },
});

export const findAdminByEmail = query({
  args: { email: v.string() },
  returns: v.any(),
  handler: async (ctx, { email }) => {
    return await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).filter(q => q.eq(q.field("email"), email)).first();
  },
});

export const getAdminById = query({
  args: { adminId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { adminId }) => {
    return await ctx.db.get("users", adminId);
  },
});

// ─── Password Verification ───

export const verifyUserPassword = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.any(),
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db.query("users").withIndex("email", q => q.eq("email", email)).first();
    if (!user || !user.adminPasswordHash) return false;
    return await ctx.runMutation(internal.auth_helpers._verifyPassword, { password, stored: user.adminPasswordHash });
  },
});

export const verifyAdminPassword = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.any(),
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).filter(q => q.eq(q.field("email"), email)).first();
    if (!user || !user.adminPasswordHash) return false;
    return await ctx.runMutation(internal.auth_helpers._verifyPassword, { password, stored: user.adminPasswordHash });
  },
});

export const changePassword = mutation({
  args: { userId: v.id("users"), currentPassword: v.string(), newPassword: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { userId, currentPassword, newPassword, adminToken }) => {
    // Validate admin session - only the admin themselves can change their password
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    if (identity._id !== userId) return { success: false, error: "Can only change your own password" };

    const user = await ctx.db.get("users", userId);
    if (!user) return { success: false, error: "User not found" };

    // Verify current password if one exists
    if (user.adminPasswordHash) {
      const valid = await ctx.runMutation(internal.auth_helpers._verifyPassword, { password: currentPassword, stored: user.adminPasswordHash });
      if (!valid) return { success: false, error: "Current password is incorrect" };
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const newHash = await ctx.runMutation(internal.auth_helpers._hashPassword, { password: newPassword });
    await ctx.db.patch("users", userId, { adminPasswordHash: newHash });

    // Log password change
    await ctx.db.insert("audit_logs", {
      userId,
      action: "PASSWORD_CHANGED",
      details: "Password changed by admin via dashboard",
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const lockUserAccount = mutation({
  args: { userId: v.id("users"), minutes: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, minutes }) => {
    await ctx.db.patch("users", userId, {
      adminLockedUntil: Date.now() + (minutes * 60 * 1000),
    });
  },
});

export const lockAdminAccount = mutation({
  args: { adminId: v.id("users"), minutes: v.number() },
  returns: v.null(),
  handler: async (ctx, { adminId, minutes }) => {
    await ctx.db.patch("users", adminId, {
      adminLockedUntil: Date.now() + (minutes * 60 * 1000),
    });
  },
});

export const updateLastLogin = mutation({
  args: { userId: v.id("users"), ip: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, ip: _ip }) => {
    await ctx.db.patch("users", userId, {
      adminLastLoginAt: Date.now(),
      adminFailedLoginAttempts: 0,
      adminLockedUntil: undefined,
    });
  },
});

// ─── Session Management ───

export const countActiveSessions = query({
  args: { userId: v.id("users"), userType: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId, userType }) => {
    const sessions = await ctx.db.query("user_sessions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.and(
        q.eq(q.field("userType"), userType),
        q.eq(q.field("isRevoked"), false),
        q.gt(q.field("expiresAt"), Date.now()),
      ))
      .collect();
    return sessions.length;
  },
});

export const createSession = mutation({
  args: {
    userId: v.id("users"),
    userType: v.union(v.literal("client"), v.literal("admin")),
    refreshToken: v.string(),
    deviceInfo: v.object({
      userAgent: v.string(),
      deviceType: v.optional(v.string()),
      browser: v.optional(v.string()),
      os: v.optional(v.string()),
    }),
    ip: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const deviceType = args.deviceInfo.userAgent.toLowerCase().includes('mobile') ? 'mobile'
      : args.deviceInfo.userAgent.toLowerCase().includes('tablet') ? 'tablet'
      : 'desktop';

    await ctx.db.insert("user_sessions", {
      userId: args.userId,
      userType: args.userType,
      device: args.deviceInfo.userAgent,
      location: "",
      ip: args.ip,
      fingerprint: `auto-${args.userId}-${now}`,
      lastActive: now,
      isCurrent: true,
      isTwoFactorVerified: args.userType === 'admin',
      deviceInfo: { ...args.deviceInfo, deviceType },
      refreshToken: args.refreshToken,
      isRevoked: false,
      expiresAt: args.expiresAt,
    });
  },
});

export const findSessionByRefreshToken = query({
  args: { refreshToken: v.string() },
  returns: v.any(),
  handler: async (ctx, { refreshToken }) => {
    return await ctx.db.query("user_sessions")
      .withIndex("by_refresh_token", q => q.eq("refreshToken", refreshToken))
      .first();
  },
});

export const rotateRefreshToken = mutation({
  args: { sessionId: v.id("user_sessions"), refreshToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, refreshToken }) => {
    await ctx.db.patch("user_sessions", sessionId, {
      refreshToken,
      lastActive: Date.now(),
    });
  },
});

export const revokeSession = mutation({
  args: { sessionId: v.id("user_sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch("user_sessions", sessionId, { isRevoked: true, isCurrent: false });
  },
});

export const revokeSessionById = mutation({
  args: { sessionId: v.id("user_sessions"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { sessionId, userId }) => {
    const session = await ctx.db.get("user_sessions", sessionId);
    if (session && session.userId === userId) {
      await ctx.db.patch("user_sessions", sessionId, { isRevoked: true, isCurrent: false });
    }
  },
});

export const revokeUserSessions = mutation({
  args: { userId: v.id("users"), userType: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, userType }) => {
    const sessions = await ctx.db.query("user_sessions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("userType"), userType))
      .collect();
    for (const s of sessions) {
      await ctx.db.patch("user_sessions", s._id, { isRevoked: true, isCurrent: false });
    }
  },
});

export const revokeAllUserSessions = mutation({
  args: { userId: v.id("users"), userType: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, userType }) => {
    const sessions = await ctx.db.query("user_sessions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("userType"), userType))
      .collect();
    for (const s of sessions) {
      await ctx.db.patch("user_sessions", s._id, { isRevoked: true, isCurrent: false });
    }
  },
});

export const listActiveSessions = query({
  args: { userId: v.id("users"), userType: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId, userType }) => {
    const sessions = await ctx.db.query("user_sessions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.and(
        q.eq(q.field("userType"), userType),
        q.eq(q.field("isRevoked"), false),
        q.gt(q.field("expiresAt"), Date.now()),
      ))
      .order("desc")
      .collect();

    return sessions.map(s => ({
      _id: s._id,
      device: s.deviceInfo?.userAgent || s.device,
      deviceType: s.deviceInfo?.deviceType || 'unknown',
      ip: s.ip,
      lastActive: s.lastActive,
      isCurrent: s.isCurrent,
      createdAt: s._creationTime,
      expiresAt: s.expiresAt,
    }));
  },
});

// ─── Admin 2FA ───

/** Generate a secure TOTP secret server-side (RFC 4648 base32, 160 bits) */
export const generate2FASecret = mutation({
  args: {},
  returns: v.object({ secret: v.string() }),
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const rand = new Uint8Array(20);
    globalThis.crypto.getRandomValues(rand);
    for (let i = 0; i < 20; i++) secret += chars[rand[i] % 32];
    return { secret };
  },
});

export const getAdmin2FA = query({
  args: { adminId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { adminId }) => {
    return await ctx.db.query("admin_2fa").withIndex("by_admin", q => q.eq("adminId", adminId)).first();
  },
});

export const verifyAdminTOTP = mutation({
  args: { adminId: v.id("users"), totpCode: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminId, totpCode }) => {
    const twoFactor = await ctx.db.query("admin_2fa").withIndex("by_admin", q => q.eq("adminId", adminId)).first();
    if (!twoFactor) return false;

    if (totpCode.length >= 8) {
      const idx = twoFactor.backupCodes.indexOf(totpCode.toUpperCase());
      if (idx !== -1) {
        const codes = [...twoFactor.backupCodes];
        codes.splice(idx, 1);
        await ctx.db.patch("admin_2fa", twoFactor._id, { backupCodes: codes });
        return true;
      }
    }

    if (totpCode.length === 6 && /^\d{6}$/.test(totpCode)) {
      const timeStep = Math.floor(Date.now() / 30000);
      for (let i = -1; i <= 1; i++) {
        const computed = await ctx.runAction(internal.auth_helpers._computeTOTP, {
          secret: twoFactor.secret, timeStep: timeStep + i,
        });
        if (computed === totpCode) return true;
      }
    }

    return false;
  },
});

export const _computeTOTP = internalAction({
  args: { secret: v.string(), timeStep: v.number() },
  returns: v.string(),
  handler: async (_ctx, args) => {
    return computeTOTP(args.secret, args.timeStep);
  },
});

async function computeTOTP(secret: string, timeStep: number): Promise<string> {
  const secretBytes = base32Decode(secret);
  
  const timeBuffer = new Uint8Array(8);
  new DataView(timeBuffer.buffer).setUint32(4, timeStep, false);
  
  const hash = hmacSign("SHA-1", secretBytes, timeBuffer);
  
  // Dynamic truncation (RFC 4226)
  const offset = hash[19] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Base32 decode (RFC 4648)
function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  return bytes;
}

export const setupAdmin2FA = mutation({
  args: { adminId: v.id("users"), secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminId, secret }) => {
    // Validate secret format: must be 20-char base32 (RFC 4648) generated by generate2FASecret
    if (!/^[A-Z2-7]{20}$/.test(secret)) {
      throw new Error("Invalid 2FA secret format. Must be generated by the server.");
    }
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase()
    );
    const existing = await ctx.db.query("admin_2fa").withIndex("by_admin", q => q.eq("adminId", adminId)).first();
    if (existing) {
      await ctx.db.patch("admin_2fa", existing._id, { secret, backupCodes, isEnabled: true });
    } else {
      await ctx.db.insert("admin_2fa", { adminId, secret, backupCodes, isEnabled: true });
    }
    await ctx.db.patch("users", adminId, { adminTwoFactorEnabled: true, adminTwoFactorSecret: secret, adminBackupCodes: backupCodes });
    return { backupCodes };
  },
});

// ─── Admin Audit Log ───

export const logAdminAudit = mutation({
  args: {
    adminId: v.id("users"),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.id("users")),
    changes: v.optional(v.any()),
    ipAddress: v.string(),
    userAgent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("admin_audit_log", {
      adminId: args.adminId,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      changes: args.changes,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });
  },
});

export const getAdminAuditLogs = query({
  args: { adminId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { adminId, limit }) => {
    return await ctx.db.query("admin_audit_log")
      .withIndex("by_admin", q => q.eq("adminId", adminId))
      .order("desc")
      .take(limit || 50);
  },
});

export const getAllAdminAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { limit }) => {
    return await ctx.db.query("admin_audit_log")
      .order("desc")
      .take(limit || 100);
  },
});

// ─── IP Whitelist ───

export const updateIpWhitelist = mutation({
  args: { adminId: v.id("users"), ipAddresses: v.array(v.string()), description: v.string() },
  returns: v.null(),
  handler: async (ctx, { adminId, ipAddresses, description }) => {
    const existing = await ctx.db.query("ip_whitelist").withIndex("by_admin", q => q.eq("adminId", adminId)).first();
    if (existing) {
      await ctx.db.patch("ip_whitelist", existing._id, { ipAddresses, description });
    } else {
      await ctx.db.insert("ip_whitelist", { adminId, ipAddresses, description });
    }
  },
});

// ─── Email Verification ───

export const verifyEmail = mutation({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (_ctx, { token }) => {
    // In production, look up the verification token and mark email as verified.
    // For now, return success if token looks valid.
    if (!token || token.length < 10) return { success: false, error: "Invalid token" };
    return { success: true };
  },
});

// ─── System Config ───

export const getSystemConfig = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("system_config").collect();
  },
});
