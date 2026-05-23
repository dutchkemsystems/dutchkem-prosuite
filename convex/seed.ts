import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedAdmin = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "admin@dutchkem.com"))
      .first();

    if (existing) {
      console.log("Admin exists, updating hash");
      await ctx.db.patch(existing._id, {
        adminPasswordHash: "MOCK_HASH_" + args.password,
        role: "admin", // Ensure role is correct
      });
      return existing._id;
    }

    const adminId = await ctx.db.insert("users", {
      email: "admin@dutchkem.com",
      name: "Super Admin",
      role: "admin",
      balance: 0,
      referralCode: "ADMIN001",
      adminPasswordHash: "MOCK_HASH_" + args.password,
    });

    // Note: In a real @convex-dev/auth setup, passwords are stored in the `auth_passwords` table
    // and accounts in `auth_accounts`. Seeding them manually is tricky without the auth helper.
    // However, we can use the regular password flow once the user exists.
    
    console.log("Admin seeded with ID:", adminId);
    return adminId;
  },
});
