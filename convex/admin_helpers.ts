import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Generate a random ID using crypto-safe randomness */
export const genId = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let id = "";
    for (let i = 0; i < 12; i++) id += chars[array[i] % chars.length];
    return id;
  },
});

/** Generate a session token using crypto-safe randomness */
export const generateToken = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint32Array(32);
    crypto.getRandomValues(array);
    let token = "";
    for (let i = 0; i < 32; i++) token += chars[array[i] % chars.length];
    return token;
  },
});

/** Generate a temporary password using crypto-safe randomness */
export const generateTempPassword = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let password = "";
    for (let i = 0; i < 12; i++) password += chars[array[i] % chars.length];
    return password;
  },
});

/** Validate admin session token — returns true if session exists, not revoked, and not expired */
export const validateAdminToken = internalQuery({
  args: { adminToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.adminToken as any);
    if (!session) return false;
    if (session.isRevoked) return false;
    if (session.expiresAt && session.expiresAt < Date.now()) return false;
    return true;
  },
});