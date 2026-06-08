import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Default feature flags for the platform */
export const DEFAULT_FLAGS = [
  { key: "voice_calls", label: "Voice Calls", description: "Enable WebRTC voice calls with agents" },
  { key: "client_2fa", label: "Client 2FA", description: "Enable two-factor authentication for clients" },
  { key: "email_magic_link", label: "Email Magic Link", description: "Enable email-based login via Resend" },
  { key: "referral_withdrawal", label: "Referral Withdrawal", description: "Enable referral earnings withdrawal" },
  { key: "push_notifications", label: "Push Notifications", description: "Enable browser push notifications" },
  { key: "agent_file_upload", label: "Agent File Upload", description: "Allow file uploads to agents" },
  { key: "advanced_analytics", label: "Advanced Analytics", description: "Show advanced analytics on client dashboard" },
  { key: "enterprise_features", label: "Enterprise Features", description: "Enable enterprise hub features" },
];

export const listFlags = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("feature_flags").order("asc").collect();
  },
});

export const getFlag = query({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, { key }) => {
    return await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
  },
});

export const isEnabled = query({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { key }) => {
    const flag = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", key))
      .first();
    return flag?.enabled ?? false;
  },
});

/** Admin-only: set a feature flag */
export const setFlag = mutation({
  args: {
    adminToken: v.string(),
    key: v.string(),
    enabled: v.boolean(),
    label: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const existing = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch("feature_flags", existing._id, { enabled: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("feature_flags", {
        key: args.key,
        enabled: args.enabled,
        label: args.label,
        description: args.description,
        updatedAt: Date.now(),
      });
    }

    return { key: args.key, enabled: args.enabled };
  },
});

/** Admin-only: seed default feature flags */
export const seedDefaultFlags = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let seeded = 0;
    for (const flag of DEFAULT_FLAGS) {
      const existing = await ctx.db.query("feature_flags")
        .withIndex("by_key", q => q.eq("key", flag.key))
        .first();
      if (!existing) {
        await ctx.db.insert("feature_flags", {
          key: flag.key,
          enabled: false,
          label: flag.label,
          description: flag.description,
          updatedAt: Date.now(),
        });
        seeded++;
      }
    }
    return { seeded };
  },
});

/** Admin-only: bulk toggle all flags */
export const bulkToggle = mutation({
  args: { adminToken: v.string(), enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const flags = await ctx.db.query("feature_flags").collect();
    for (const flag of flags) {
      await ctx.db.patch("feature_flags", flag._id, { enabled: args.enabled, updatedAt: Date.now() });
    }
    return { toggled: flags.length, enabled: args.enabled };
  },
});
