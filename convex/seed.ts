import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./encryption";

export const seedAdmin = mutation({
  args: {
    password: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "admin@dutchkem.com"))
      .first();

    const passwordHash = await hashPassword(args.password);
    if (existing) {
      console.log("Admin exists, updating hash");
      await ctx.db.patch(existing._id, {
        adminPasswordHash: passwordHash,
        role: "admin",
      });
      return existing._id;
    }

    const adminId = await ctx.db.insert("users", {
      email: "admin@dutchkem.com",
      name: "Super Admin",
      role: "admin",
      balance: 0,
      referralCode: "ADMIN001",
      adminPasswordHash: passwordHash,
    });

    // Note: In a real @convex-dev/auth setup, passwords are stored in the `auth_passwords` table
    // and accounts in `auth_accounts`. Seeding them manually is tricky without the auth helper.
    // However, we can use the regular password flow once the user exists.
    
    console.log("Admin seeded with ID:", adminId);
    return adminId;
  },
});
