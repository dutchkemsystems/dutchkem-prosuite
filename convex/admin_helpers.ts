import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Generate a random ID */
export const genId = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  },
});

/** Generate a session token */
export const generateToken = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
    return token;
  },
});

/** Generate a temporary password */
export const generateTempPassword = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)];
    return password;
  },
});

/** Validate admin token */
export const validateAdminToken = internalQuery({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.adminToken as any);
  },
});