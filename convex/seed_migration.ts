import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * SEED MIGRATION — Idempotent system initializer
 * Run ONCE after fresh deploy:  npx convex run seed_migration:run
 * Re-run safely anytime:  npx convex run seed_migration:run
 */
export const run = mutation({
  args: {
    adminIPs: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results: Array<string> = [];

    // ── 1. 3 Admin IP Whitelist Entries ──
    const ips = args.adminIPs ?? [
      "102.89.22.0/24",   // Main office — Lagos
      "105.112.0.0/16",   // Backup office — Abuja
      "197.210.0.0/16",   // Remote / VPN pool
    ];

    const admins = await ctx.db.query("users")
      .withIndex("by_role", q => q.eq("role", "admin"))
      .collect();

    if (admins.length === 0) {
      results.push("SKIP — No admin accounts found. Run seed_admin:seed first.");
    } else {
      for (const admin of admins) {
        const existing = await ctx.db.query("ip_whitelist")
          .withIndex("by_admin", q => q.eq("adminId", admin._id))
          .first();

        if (existing) {
          await ctx.db.patch("ip_whitelist", existing._id, {
            ipAddresses: ips,
            description: `Auto-migrated ${new Date().toISOString().split('T')[0]}`,
          });
          results.push(`UPDATED ip_whitelist for ${admin.email}`);
        } else {
          await ctx.db.insert("ip_whitelist", {
            adminId: admin._id,
            ipAddresses: ips,
            description: "Initial 3-office whitelist",
          });
          results.push(`CREATED ip_whitelist for ${admin.email}`);
        }

        // Also update adminAllowedIps on user record
        await ctx.db.patch("users", admin._id, {
          adminAllowedIps: ips,
          adminTwoFactorEnabled: true,
        });

        // ── 2. Set up 2FA for admin (if not already) ──
        const existing2fa = await ctx.db.query("admin_2fa")
          .withIndex("by_admin", q => q.eq("adminId", admin._id))
          .first();

        if (!existing2fa) {
          const backupCodes = Array.from({ length: 10 }, () =>
            Math.random().toString(36).slice(2, 10).toUpperCase()
          );
          // Generate placeholder TOTP secret (replace with real one on first login)
          const tempSecret = Math.random().toString(36).slice(2, 18).toUpperCase();

          await ctx.db.insert("admin_2fa", {
            adminId: admin._id,
            secret: tempSecret,
            backupCodes,
            isEnabled: true,
          });

          await ctx.db.patch("users", admin._id, {
            adminTwoFactorSecret: tempSecret,
            adminTwoFactorEnabled: true,
            adminBackupCodes: backupCodes,
          });

          results.push(`CREATED 2FA for ${admin.email} — backup codes generated`);
        } else {
          results.push(`OK — 2FA already configured for ${admin.email}`);
        }
      }
    }

    // ── 3. Seed feature_flags defaults ──
    const defaultFlags: Array<{ key: string; label: string; enabled: boolean; description?: string }> = [
      { key: "kdp_publishing", label: "Amazon KDP Publishing", enabled: true, description: "A1 KDP ebook service" },
      { key: "admin_auto_upgrade", label: "Bi-Annual Auto-Upgrade", enabled: true, description: "Spring/Fall system upgrades" },
      { key: "holiday_discounts", label: "Holiday Discount Engine", enabled: true, description: "25% off on Nigerian holidays" },
      { key: "admin_2fa_required", label: "Admin 2FA Required", enabled: true, description: "TOTP mandatory for all admin" },
      { key: "admin_ip_whitelist", label: "Admin IP Whitelist", enabled: true, description: "Restrict admin to whitelisted IPs" },
    ];

    for (const flag of defaultFlags) {
      const existing = await ctx.db.query("feature_flags")
        .withIndex("by_key", q => q.eq("key", flag.key))
        .first();

      if (!existing) {
        await ctx.db.insert("feature_flags", {
          ...flag,
          updatedAt: Date.now(),
        });
        results.push(`CREATED feature_flag: ${flag.key}`);
      } else {
        results.push(`OK — feature_flag ${flag.key} already exists`);
      }
    }

    // ── 4. Seed system_config defaults ──
    const defaultConfig: Array<{ key: string; value: any; description?: string }> = [
      { key: "ADMIN_AVATAR_URL", value: "", description: "Admin profile avatar URL" },
      { key: "SESSION_TIMEOUT_MINUTES", value: 120, description: "Client session inactivity timeout" },
      { key: "ADMIN_SESSION_TIMEOUT_MINUTES", value: 30, description: "Admin session inactivity timeout" },
      { key: "MAX_CONCURRENT_SESSIONS", value: 3, description: "Max client sessions per user" },
      { key: "MAX_ADMIN_CONCURRENT_SESSIONS", value: 1, description: "Max admin sessions" },
      { key: "LOGIN_RATE_LIMIT_WINDOW", value: 15, description: "Rate limit window in minutes" },
      { key: "LOGIN_RATE_LIMIT_MAX", value: 5, description: "Max login attempts per window" },
      { key: "ADMIN_LOGIN_RATE_LIMIT_MAX", value: 3, description: "Max admin login attempts per window" },
      { key: "FAILED_LOGIN_LOCKOUT_MINUTES", value: 30, description: "Lockout duration after max failures" },
      { key: "ADMIN_FAILED_LOGIN_LOCKOUT_MINUTES", value: 60, description: "Admin lockout duration" },
    ];

    for (const cfg of defaultConfig) {
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", cfg.key))
        .first();

      if (!existing) {
        await ctx.db.insert("system_config", {
          ...cfg,
          updatedAt: Date.now(),
        });
        results.push(`CREATED system_config: ${cfg.key}`);
      } else {
        results.push(`OK — system_config ${cfg.key} already exists`);
      }
    }

    // ── 5. Log migration event ──
    await ctx.runMutation(internal.guardian.logSecurityEvent, {
      action: "SYSTEM_MIGRATION",
      details: `seed_migration:run completed — ${results.length} actions`,
      ip: "internal",
      userAgent: "System Migration",
    });

    return {
      success: true,
      adminCount: admins.length,
      whitelistedIPs: ips,
      results,
      message: "Migration complete. See results array for detail.",
    };
  },
});

/**
 * STATUS — Check current migration state
 */
export const status = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const admins = await ctx.db.query("users")
      .withIndex("by_role", q => q.eq("role", "admin"))
      .collect();

    const adminDetails = await Promise.all(admins.map(async (a) => {
      const whitelist = await ctx.db.query("ip_whitelist")
        .withIndex("by_admin", q => q.eq("adminId", a._id))
        .first();
      const twofa = await ctx.db.query("admin_2fa")
        .withIndex("by_admin", q => q.eq("adminId", a._id))
        .first();
      return {
        email: a.email,
        hasWhitelist: !!whitelist,
        whitelistIPs: whitelist?.ipAddresses ?? a.adminAllowedIps ?? [],
        has2FA: !!twofa,
        twofaEnabled: twofa?.isEnabled ?? false,
      };
    }));

    const flagCount = (await ctx.db.query("feature_flags").collect()).length;
    const configCount = (await ctx.db.query("system_config").collect()).length;

    return {
      adminCount: admins.length,
      admins: adminDetails,
      featureFlags: flagCount,
      systemConfigs: configCount,
      migrationComplete: adminDetails.every(a => a.hasWhitelist && a.has2FA),
    };
  },
});
