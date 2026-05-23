import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { hashPassword } from "./encryption";

/**
 * SEED ADMIN ACCOUNT
 * Run this mutation ONCE from the Convex dashboard or terminal:
 * npx convex run seed_admin:seed
 */
export const seed = mutation({
  args: {},
  returns: v.object({
    email: v.string(),
    password: v.string(),
    backupCodes: v.array(v.string()),
    message: v.string()
  }),
  handler: async (ctx) => {
    // 1. Check if admin already exists to prevent accidental re-seeding
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "admin@dutchkem.com"))
      .first();

    if (existing) {
      throw new Error("Admin account already exists. Use emergency recovery if locked out.");
    }

    // 2. Generate secure random password
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // 3. Generate 10 single-use backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // 4. Create Admin User
    const passwordHash = await hashPassword(password);
    await ctx.db.insert("users", {
      email: "admin@dutchkem.com",
      name: "Super Admin",
      role: "admin",
      balance: 0,
      adminPasswordHash: passwordHash,
      adminBackupCodes: backupCodes,
      adminTwoFactorEnabled: false,
      adminFailedLoginAttempts: 0,
      adminAllowedIps: ["127.0.0.1"],
    });

    // 5. Log Security Event
    await ctx.runMutation(internal.guardian.logSecurityEvent, {
      action: "ADMIN_SEEDING",
      details: "Initial Super Admin account created via seed script",
      ip: "internal",
      userAgent: "System Initializer",
    });

    return {
      email: "admin@dutchkem.com",
      password,
      backupCodes,
      message: "SAVE THESE CREDENTIALS IMMEDIATELY. THEY WILL NEVER BE SHOWN AGAIN."
    };
  },
});
