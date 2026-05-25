import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./encryption";

export const setupAdminAccount = mutation({
  args: {},
  returns: v.object({ email: v.string(), password: v.string(), backupCodes: v.array(v.string()) }),
  handler: async (ctx) => {
    const adminEmail = "admin@dutchkem.com";
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", adminEmail))
      .first();

    const password = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62])
      .join("");
    
    const passwordHash = await hashPassword(password);

    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    if (!existing) {
      await ctx.db.insert("users", {
        email: adminEmail,
        name: "Dutchkem Admin",
        role: "admin",
        adminPasswordHash: passwordHash,
        adminBackupCodes: backupCodes,
        adminFailedLoginAttempts: 0,
        adminTwoFactorEnabled: false,
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log("=========================================");
        console.log("CRITICAL: ADMIN ACCOUNT CREATED");
        console.log("Email: " + adminEmail);
        console.log("Password: " + password);
        console.log("Backup Codes: " + backupCodes.join(", "));
        console.log("STORE THESE IN A SECURE PASSWORD MANAGER");
        console.log("=========================================");
      }
    }

    return { email: adminEmail, password, backupCodes };
  },
});
