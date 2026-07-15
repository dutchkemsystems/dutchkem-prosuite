import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";
import { hashPasswordPure } from "../crypto_pure";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Ent";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  pw += "!";
  return pw;
}

export const getOrganizationPasswords = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return null;
    const users = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return {
      orgPassword: org.passwordHash,
      users: users.map((u: any) => ({
        _id: u._id, name: u.name, email: u.email, password: u.passwordHash,
        role: u.role, status: u.status, mustChangePassword: u.mustChangePassword,
      })),
    };
  },
});

export const updateCompanyInfo = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    name: v.optional(v.string()), email: v.optional(v.string()),
    industry: v.optional(v.string()), size: v.optional(v.string()),
    phone: v.optional(v.string()), website: v.optional(v.string()),
    subdomain: v.optional(v.string()), address: v.optional(v.string()),
    city: v.optional(v.string()), country: v.optional(v.string()),
    billingEmail: v.optional(v.string()), taxId: v.optional(v.string()),
    logo: v.optional(v.string()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const key of ["name","email","industry","size","phone","website","subdomain","address","city","country","billingEmail","taxId","logo"] as const) {
      if (args[key] !== undefined) updates[key] = args[key];
    }
    await ctx.db.patch(args.orgId, updates);
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANY_INFO_UPDATED", actor: identity._id,
      action: "update_company_info", target: args.orgId,
      details: { updates }, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const resetOrganizationPassword = mutation({
  args: { orgId: v.id("enterprise_organizations"), newPassword: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const hashedPassword = await hashPasswordPure(args.newPassword);
    await ctx.db.patch(args.orgId, { passwordHash: hashedPassword, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_PASSWORD_RESET", actor: identity._id,
      action: "reset_org_password", target: args.orgId,
      details: { name: org.name }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Password Reset - Dutchkem Ventures",
      body: `Your organization password has been reset by an administrator.\n\nPlease contact your admin for the new password.`,
      type: "password_reset", status: "sent", createdAt: Date.now(),
    });
    return { success: true, newPassword: args.newPassword };
  },
});

export const resetOrgUserPassword = mutation({
  args: { userId: v.id("enterprise_org_users"), newPassword: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user) return { success: false, error: "User not found" };
    const newPassword = args.newPassword || generateTempPassword();
    const hashedPassword = await hashPasswordPure(newPassword);
    await ctx.db.patch(args.userId, { passwordHash: hashedPassword, mustChangePassword: true, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "USER_PASSWORD_RESET", actor: identity._id,
      action: "reset_user_password", target: args.userId,
      details: { email: user.email }, createdAt: Date.now(),
    });
    return { success: true, newPassword };
  },
});

export const getOrganization = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return null;
    const users = await ctx.db.query("enterprise_org_users").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect();
    const transactions = await ctx.db.query("enterprise_org_transactions").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).order("desc").take(100);
    const analytics = await ctx.db.query("enterprise_org_analytics").withIndex("by_org_date", (q) => q.eq("orgId", args.orgId)).order("desc").take(30);
    return { ...org, users, transactions, analytics, userCount: users.length };
  },
});

export const updateOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"), name: v.optional(v.string()),
    industry: v.optional(v.string()), size: v.optional(v.string()),
    phone: v.optional(v.string()), website: v.optional(v.string()),
    logo: v.optional(v.string()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const key of ["name","industry","size","phone","website","logo"] as const) {
      if (args[key] !== undefined) updates[key] = args[key];
    }
    await ctx.db.patch(args.orgId, updates);
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UPDATED", actor: identity._id,
      action: "update_organization", target: args.orgId,
      details: { updates }, createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), reason: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { status: "suspended" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_DELETED", actor: identity._id,
      action: "delete_organization", target: args.orgId,
      details: { name: org.name, reason: args.reason }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Account Deleted - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been deleted.\n\nReason: ${args.reason || "Not specified"}`,
      type: "org_deleted", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const suspendOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), days: v.number(), reason: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const suspendUntil = Date.now() + (args.days * 24 * 60 * 60 * 1000);
    await ctx.db.patch(args.orgId, { status: "suspended" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_SUSPENDED", actor: identity._id,
      action: "suspend_organization", target: args.orgId,
      details: { name: org.name, days: args.days, reason: args.reason, suspendUntil }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Suspended - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been suspended for ${args.days} days.\n\nReason: ${args.reason}`,
      type: "org_suspended", status: "sent", createdAt: Date.now(),
    });
    return { success: true, suspendUntil };
  },
});

export const unsuspendOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { status: "active" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UNSUSPENDED", actor: identity._id,
      action: "unsuspend_organization", target: args.orgId,
      details: { name: org.name }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Reinstated - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been reinstated and is now active.`,
      type: "org_unsuspended", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const freezeOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), days: v.number(), reason: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const frozenUntil = Date.now() + (args.days * 24 * 60 * 60 * 1000);
    await ctx.db.patch(args.orgId, { status: "suspended" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_FROZEN", actor: identity._id,
      action: "freeze_organization", target: args.orgId,
      details: { name: org.name, days: args.days, reason: args.reason, frozenUntil }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Frozen - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been frozen for ${args.days} days.\n\nReason: ${args.reason}`,
      type: "org_frozen", status: "sent", createdAt: Date.now(),
    });
    return { success: true, frozenUntil };
  },
});

export const thawOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { status: "active" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_THAWED", actor: identity._id,
      action: "thaw_organization", target: args.orgId,
      details: { name: org.name }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Unfrozen - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been unfrozen and is now active.`,
      type: "org_thawed", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const lockOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), reason: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { status: "suspended" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_LOCKED", actor: identity._id,
      action: "lock_organization", target: args.orgId,
      details: { name: org.name, reason: args.reason }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Locked - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been locked for security reasons.\n\nReason: ${args.reason}`,
      type: "org_locked", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const unlockOrganization = mutation({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { status: "active" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UNLOCKED", actor: identity._id,
      action: "unlock_organization", target: args.orgId,
      details: { name: org.name }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Unlocked - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been unlocked and is now active.`,
      type: "org_unlocked", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const upgradeOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    newPlan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { plan: args.newPlan, status: "active" as any, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UPGRADED", actor: identity._id,
      action: "upgrade_organization", target: args.orgId,
      details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Upgraded - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been upgraded to the ${args.newPlan} plan.`,
      type: "org_upgraded", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const downgradeOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    newPlan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    reason: v.optional(v.string()), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    await ctx.db.patch(args.orgId, { plan: args.newPlan, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_DOWNGRADED", actor: identity._id,
      action: "downgrade_organization", target: args.orgId,
      details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan, reason: args.reason }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Organization Plan Changed - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been downgraded to the ${args.newPlan} plan.\n\nReason: ${args.reason || "Not specified"}`,
      type: "org_downgraded", status: "sent", createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const extendTrial = mutation({
  args: { orgId: v.id("enterprise_organizations"), days: v.number(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };
    const newTrialEnds = (org.trialEndsAt || Date.now()) + (args.days * 24 * 60 * 60 * 1000);
    await ctx.db.patch(args.orgId, { trialEndsAt: newTrialEnds, updatedAt: Date.now() });
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRIAL_EXTENDED", actor: identity._id,
      action: "extend_trial", target: args.orgId,
      details: { name: org.name, days: args.days, newTrialEnds }, createdAt: Date.now(),
    });
    await ctx.db.insert("email_notifications", {
      to: org.email, subject: "Trial Extended - Dutchkem Ventures",
      body: `Your trial for "${org.name}" has been extended by ${args.days} days.\n\nNew trial end date: ${new Date(newTrialEnds).toLocaleDateString()}`,
      type: "trial_extended", status: "sent", createdAt: Date.now(),
    });
    return { success: true, newTrialEnds };
  },
});
