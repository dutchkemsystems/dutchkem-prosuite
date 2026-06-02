import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword, verifyPassword } from "./encryption";

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
      await ctx.db.delete(log._id);
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
    return await ctx.db.get(adminId);
  },
});

// ─── Password Verification ───

export const verifyUserPassword = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.any(),
  handler: async (ctx, { email, password }) => {
    // Note: Convex Auth stores passwords in auth_passwords table internally.
    // This checks via the admin password hash on the users table.
    const user = await ctx.db.query("users").withIndex("email", q => q.eq("email", email)).first();
    if (!user || !user.adminPasswordHash) return false;
    return verifyPassword(password, user.adminPasswordHash);
  },
});

export const verifyAdminPassword = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.any(),
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).filter(q => q.eq(q.field("email"), email)).first();
    if (!user || !user.adminPasswordHash) return false;
    return verifyPassword(password, user.adminPasswordHash);
  },
});

export const changePassword = mutation({
  args: { userId: v.id("users"), currentPassword: v.string(), newPassword: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId, currentPassword, newPassword }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { success: false, error: "User not found" };

    if (user.adminPasswordHash) {
      const valid = await verifyPassword(currentPassword, user.adminPasswordHash);
      if (!valid) return { success: false, error: "Current password is incorrect" };
    }

    const newHash = await hashPassword(newPassword);
    await ctx.db.patch(userId, { adminPasswordHash: newHash });

    // Log password change
    await ctx.db.insert("audit_logs", {
      userId,
      action: "PASSWORD_CHANGED",
      details: "Password changed by user",
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
    await ctx.db.patch(userId, {
      adminLockedUntil: Date.now() + (minutes * 60 * 1000),
    });
  },
});

export const lockAdminAccount = mutation({
  args: { adminId: v.id("users"), minutes: v.number() },
  returns: v.null(),
  handler: async (ctx, { adminId, minutes }) => {
    await ctx.db.patch(adminId, {
      adminLockedUntil: Date.now() + (minutes * 60 * 1000),
    });
  },
});

export const updateLastLogin = mutation({
  args: { userId: v.id("users"), ip: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, ip: _ip }) => {
    await ctx.db.patch(userId, {
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
    await ctx.db.patch(sessionId, {
      refreshToken,
      lastActive: Date.now(),
    });
  },
});

export const revokeSession = mutation({
  args: { sessionId: v.id("user_sessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { isRevoked: true, isCurrent: false });
  },
});

export const revokeSessionById = mutation({
  args: { sessionId: v.id("user_sessions"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { sessionId, userId }) => {
    const session = await ctx.db.get(sessionId);
    if (session && session.userId === userId) {
      await ctx.db.patch(sessionId, { isRevoked: true, isCurrent: false });
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
      await ctx.db.patch(s._id, { isRevoked: true, isCurrent: false });
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
      await ctx.db.patch(s._id, { isRevoked: true, isCurrent: false });
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

    // Check backup codes first (8+ chars)
    if (totpCode.length >= 8) {
      const idx = twoFactor.backupCodes.indexOf(totpCode.toUpperCase());
      if (idx !== -1) {
        const codes = [...twoFactor.backupCodes];
        codes.splice(idx, 1);
        await ctx.db.patch(twoFactor._id, { backupCodes: codes });
        return true;
      }
    }

    // Verify TOTP using HMAC-SHA1 (RFC 6238)
    // Standard TOTP: 6 digits, 30-second window, SHA-1
    if (totpCode.length === 6 && /^\d{6}$/.test(totpCode)) {
      const secret = twoFactor.secret;
      const window = 1; // Allow 1 step before/after (30s tolerance)
      const timeStep = Math.floor(Date.now() / 30000);
      
      for (let i = -window; i <= window; i++) {
        const computed = await computeTOTP(secret, timeStep + i);
        if (computed === totpCode) {
          return true;
        }
      }
    }

    return false;
  },
});

// TOTP computation using Web Crypto API (RFC 6238 / RFC 4226)
async function computeTOTP(secret: string, timeStep: number): Promise<string> {
  // Convert base32 secret to bytes
  const secretBytes = base32Decode(secret);
  
  // Encode time step as 8-byte big-endian
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, timeStep, false);
  
  // Import key for HMAC-SHA1
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    secretBytes as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  // Sign the time step
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, timeBuffer);
  const hash = new Uint8Array(signature);
  
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
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase()
    );
    const existing = await ctx.db.query("admin_2fa").withIndex("by_admin", q => q.eq("adminId", adminId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { secret, backupCodes, isEnabled: true });
    } else {
      await ctx.db.insert("admin_2fa", { adminId, secret, backupCodes, isEnabled: true });
    }
    await ctx.db.patch(adminId, { adminTwoFactorEnabled: true, adminTwoFactorSecret: secret, adminBackupCodes: backupCodes });
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
      await ctx.db.patch(existing._id, { ipAddresses, description });
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
