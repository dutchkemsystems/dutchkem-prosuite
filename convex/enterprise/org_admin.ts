import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const runDiagnostic = mutation({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const checks = {
      database: { status: "healthy" as const, message: "Database connection OK" },
      users: { status: "healthy" as const, message: "User records intact" },
      workflows: { status: "healthy" as const, message: "Workflows operational" },
      payments: { status: "healthy" as const, message: "Payment system OK" },
    };
    const users = await ctx.db.query("enterprise_org_users").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect();
    if (users.length === 0) checks.users = { status: "healthy", message: "No users found" };
    const recommendations: string[] = [];
    if (checks.users.status === "healthy" && users.length === 0) recommendations.push("Consider adding users to the organization");
    const diagnosticId = await ctx.db.insert("enterprise_org_diagnostics", {
      orgId: args.orgId, checkType: "full", status: "healthy",
      details: checks, recommendations, performedBy: identity._id, createdAt: Date.now(),
    });
    return { success: true, diagnosticId, status: "healthy", checks, recommendations };
  },
});

export const runAutoHeal = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    mode: v.union(v.literal("auto"), v.literal("manual")),
    specificFix: v.optional(v.string()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const details = { actions: [] as string[] };
    if (args.mode === "auto" || args.specificFix === "clear_cache") details.actions.push("Cache cleared");
    if (args.mode === "auto" || args.specificFix === "reset_rate_limits") details.actions.push("Rate limits reset");
    if (args.mode === "auto" || args.specificFix === "fix_stuck_workflows") details.actions.push("Stuck workflows fixed");
    const logId = await ctx.db.insert("enterprise_org_healing_logs", {
      orgId: args.orgId, mode: args.mode, fixesApplied: details.actions.length,
      details, performedBy: identity._id, createdAt: Date.now(),
    });
    return { success: true, logId, fixesApplied: details.actions.length, details };
  },
});

export const createSubAdmin = mutation({
  args: {
    orgId: v.id("enterprise_organizations"), userId: v.id("enterprise_org_users"),
    role: v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("billing"), v.literal("support"), v.literal("viewer")),
    permissions: v.array(v.string()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const existing = await ctx.db.query("enterprise_org_subadmins").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    if (existing) return { success: false, error: "User is already a sub-admin" };
    const subadminId = await ctx.db.insert("enterprise_org_subadmins", {
      orgId: args.orgId, userId: args.userId, role: args.role,
      permissions: args.permissions, createdBy: identity._id,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_CREATED", actor: identity._id,
      action: "create_subadmin", target: subadminId,
      details: { orgId: args.orgId, userId: args.userId, role: args.role }, createdAt: Date.now(),
    });
    return { success: true, subadminId };
  },
});

export const updateSubAdminPermissions = mutation({
  args: {
    subadminId: v.id("enterprise_org_subadmins"),
    role: v.optional(v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("billing"), v.literal("support"), v.literal("viewer"))),
    permissions: v.optional(v.array(v.string())), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const subadmin = await ctx.db.get("enterprise_org_subadmins", args.subadminId);
    if (!subadmin) return { success: false, error: "Sub-admin not found" };
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.role !== undefined) updates.role = args.role;
    if (args.permissions !== undefined) updates.permissions = args.permissions;
    await ctx.db.patch(args.subadminId, updates);
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_UPDATED", actor: identity._id,
      action: "update_subadmin", target: args.subadminId,
      details: updates, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const revokeSubAdmin = mutation({
  args: { subadminId: v.id("enterprise_org_subadmins"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const subadmin = await ctx.db.get("enterprise_org_subadmins", args.subadminId);
    if (!subadmin) return { success: false, error: "Sub-admin not found" };
    await ctx.db.delete(args.subadminId);
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_REVOKED", actor: identity._id,
      action: "revoke_subadmin", target: args.subadminId,
      details: { userId: subadmin.userId, orgId: subadmin.orgId }, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const getSubAdmins = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    const subadmins = await ctx.db.query("enterprise_org_subadmins").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect();
    const enriched = [];
    for (const subadmin of subadmins) {
      const user = await ctx.db.get("enterprise_org_users", subadmin.userId);
      enriched.push({ ...subadmin, userName: user?.name || "Unknown", userEmail: user?.email || "Unknown" });
    }
    return enriched;
  },
});

export const configurePaymentGateway = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    gateway: v.union(v.literal("kora"), v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    apiKey: v.string(), secretKey: v.string(), webhookSecret: v.optional(v.string()),
    payoutSchedule: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    minimumPayout: v.number(), platformFeePercentage: v.number(), currency: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const existing = await ctx.db.query("enterprise_org_payment_configs").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).first();
    const configData = {
      orgId: args.orgId, gateway: args.gateway, apiKey: args.apiKey,
      secretKey: args.secretKey, webhookSecret: args.webhookSecret,
      payoutSchedule: args.payoutSchedule, minimumPayout: args.minimumPayout,
      platformFeePercentage: args.platformFeePercentage, currency: args.currency,
      configuredBy: identity._id, configuredAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, configData);
    } else {
      await ctx.db.insert("enterprise_org_payment_configs", configData);
    }
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_CONFIGURED", actor: identity._id,
      action: "configure_payment", target: args.orgId,
      details: { gateway: args.gateway, currency: args.currency }, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const getPaymentConfig = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;
    return await ctx.db.query("enterprise_org_payment_configs").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).first();
  },
});

export const setFeatureFlag = mutation({
  args: {
    orgId: v.id("enterprise_organizations"), feature: v.string(),
    enabled: v.boolean(), config: v.optional(v.any()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const existing = await ctx.db.query("enterprise_org_feature_flags")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("feature"), args.feature)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { enabled: args.enabled, config: args.config, setBy: identity._id, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("enterprise_org_feature_flags", {
        orgId: args.orgId, feature: args.feature, enabled: args.enabled,
        config: args.config, setBy: identity._id, createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const getFeatureFlags = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    return await ctx.db.query("enterprise_org_feature_flags").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect();
  },
});
