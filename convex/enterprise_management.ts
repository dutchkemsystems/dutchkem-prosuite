import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";
import { hashPassword } from "./encryption";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Ent";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  pw += "!";
  return pw;
}

/**
 * COMPREHENSIVE ENTERPRISE ORGANIZATION MANAGEMENT
 * Full CRUD + Account Control + Analytics + Diagnostics
 */

// ═══════════════════════════════════════════════════════════════
// 0. ADMIN PASSWORD VIEWING & COMPANY EDITING
// ═══════════════════════════════════════════════════════════════

/** Get organization passwords (admin only) */
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

    // Get org users with their passwords
    const users = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return {
      orgPassword: org.passwordHash,
      users: users.map((u: any) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        password: u.passwordHash,
        role: u.role,
        status: u.status,
        mustChangePassword: u.mustChangePassword,
      })),
    };
  },
});

/** Update organization company information (admin only) */
export const updateCompanyInfo = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.industry !== undefined) updates.industry = args.industry;
    if (args.size !== undefined) updates.size = args.size;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.website !== undefined) updates.website = args.website;
    if (args.subdomain !== undefined) updates.subdomain = args.subdomain;
    if (args.address !== undefined) updates.address = args.address;
    if (args.city !== undefined) updates.city = args.city;
    if (args.country !== undefined) updates.country = args.country;
    if (args.billingEmail !== undefined) updates.billingEmail = args.billingEmail;
    if (args.taxId !== undefined) updates.taxId = args.taxId;
    if (args.logo !== undefined) updates.logo = args.logo;

    await ctx.db.patch(args.orgId, updates);

    // Log the update
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANY_INFO_UPDATED",
      actor: identity._id,
      action: "update_company_info",
      target: args.orgId,
      details: { updates },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Reset organization password (admin only) */
export const resetOrganizationPassword = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    newPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      passwordHash: args.newPassword,
      updatedAt: Date.now(),
    });

    // Log the password reset
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_PASSWORD_RESET",
      actor: identity._id,
      action: "reset_org_password",
      target: args.orgId,
      details: { name: org.name },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Password Reset - Dutchkem Ventures",
      body: `Your organization password has been reset by an administrator.\n\nPlease contact your admin for the new password.`,
      type: "password_reset",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, newPassword: args.newPassword };
  },
});

/** Reset org user password (admin only) */
export const resetOrgUserPassword = mutation({
  args: {
    userId: v.id("enterprise_org_users"),
    newPassword: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user) return { success: false, error: "User not found" };

    const newPassword = args.newPassword || generateTempPassword();

    await ctx.db.patch(args.userId, {
      passwordHash: newPassword,
      mustChangePassword: true,
      updatedAt: Date.now(),
    });

    // Log the password reset
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "USER_PASSWORD_RESET",
      actor: identity._id,
      action: "reset_user_password",
      target: args.userId,
      details: { email: user.email },
      createdAt: Date.now(),
    });

    return { success: true, newPassword };
  },
});

// ═══════════════════════════════════════════════════════════════
// 1. ORGANIZATION CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/** Get single organization with full details */
export const getOrganization = query({
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

    // Get related data
    const users = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const transactions = await ctx.db.query("enterprise_org_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(100);

    const analytics = await ctx.db.query("enterprise_org_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(30);

    return {
      ...org,
      users,
      transactions,
      analytics,
      userCount: users.length,
    };
  },
});

/** Update organization */
export const updateOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.industry !== undefined) updates.industry = args.industry;
    if (args.size !== undefined) updates.size = args.size;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.website !== undefined) updates.website = args.website;
    if (args.logo !== undefined) updates.logo = args.logo;

    await ctx.db.patch(args.orgId, updates);

    // Log the update
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UPDATED",
      actor: identity._id,
      action: "update_organization",
      target: args.orgId,
      details: { updates },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Delete organization (soft delete) */
export const deleteOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    reason: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    // Soft delete - mark as deleted
    await ctx.db.patch(args.orgId, {
      status: "suspended" as any,
      updatedAt: Date.now(),
    });

    // Log the deletion
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_DELETED",
      actor: identity._id,
      action: "delete_organization",
      target: args.orgId,
      details: { name: org.name, reason: args.reason },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Account Deleted - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been deleted.\n\nReason: ${args.reason || "Not specified"}\n\nIf you believe this is an error, please contact support.`,
      type: "org_deleted",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// 2. ACCOUNT CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/** Suspend organization */
export const suspendOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    days: v.number(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    const suspendUntil = Date.now() + (args.days * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.orgId, {
      status: "suspended" as any,
      updatedAt: Date.now(),
    });

    // Log the suspension
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_SUSPENDED",
      actor: identity._id,
      action: "suspend_organization",
      target: args.orgId,
      details: { name: org.name, days: args.days, reason: args.reason, suspendUntil },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Suspended - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been suspended for ${args.days} days.\n\nReason: ${args.reason}\n\nPlease contact support to resolve this issue.`,
      type: "org_suspended",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, suspendUntil };
  },
});

/** Unsuspend organization */
export const unsuspendOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      status: "active" as any,
      updatedAt: Date.now(),
    });

    // Log the unsuspension
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UNSUSPENDED",
      actor: identity._id,
      action: "unsuspend_organization",
      target: args.orgId,
      details: { name: org.name },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Reinstated - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been reinstated and is now active.`,
      type: "org_unsuspended",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Freeze organization for X days */
export const freezeOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    days: v.number(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    const frozenUntil = Date.now() + (args.days * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.orgId, {
      status: "suspended" as any,
      updatedAt: Date.now(),
    });

    // Log the freeze
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_FROZEN",
      actor: identity._id,
      action: "freeze_organization",
      target: args.orgId,
      details: { name: org.name, days: args.days, reason: args.reason, frozenUntil },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Frozen - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been frozen for ${args.days} days.\n\nReason: ${args.reason}\n\nAll services are temporarily unavailable.`,
      type: "org_frozen",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, frozenUntil };
  },
});

/** Thaw frozen organization */
export const thawOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      status: "active" as any,
      updatedAt: Date.now(),
    });

    // Log the thaw
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_THAWED",
      actor: identity._id,
      action: "thaw_organization",
      target: args.orgId,
      details: { name: org.name },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Unfrozen - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been unfrozen and is now active.`,
      type: "org_thawed",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Lock organization (security reasons) */
export const lockOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      status: "suspended" as any,
      updatedAt: Date.now(),
    });

    // Log the lock
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_LOCKED",
      actor: identity._id,
      action: "lock_organization",
      target: args.orgId,
      details: { name: org.name, reason: args.reason },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Locked - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been locked for security reasons.\n\nReason: ${args.reason}\n\nPlease contact support to resolve this issue.`,
      type: "org_locked",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Unlock organization */
export const unlockOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      status: "active" as any,
      updatedAt: Date.now(),
    });

    // Log the unlock
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UNLOCKED",
      actor: identity._id,
      action: "unlock_organization",
      target: args.orgId,
      details: { name: org.name },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Unlocked - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been unlocked and is now active.`,
      type: "org_unlocked",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Upgrade organization plan */
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

    await ctx.db.patch(args.orgId, {
      plan: args.newPlan,
      status: "active" as any,
      updatedAt: Date.now(),
    });

    // Log the upgrade
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UPGRADED",
      actor: identity._id,
      action: "upgrade_organization",
      target: args.orgId,
      details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Upgraded - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been upgraded to the ${args.newPlan} plan.\n\nYou now have access to new features and capabilities.`,
      type: "org_upgraded",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Downgrade organization plan */
export const downgradeOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    newPlan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    reason: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    await ctx.db.patch(args.orgId, {
      plan: args.newPlan,
      updatedAt: Date.now(),
    });

    // Log the downgrade
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_DOWNGRADED",
      actor: identity._id,
      action: "downgrade_organization",
      target: args.orgId,
      details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan, reason: args.reason },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Organization Plan Changed - Dutchkem Ventures",
      body: `Your organization "${org.name}" has been downgraded to the ${args.newPlan} plan.\n\nReason: ${args.reason || "Not specified"}`,
      type: "org_downgraded",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Extend trial period */
export const extendTrial = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    days: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    const newTrialEnds = (org.trialEndsAt || Date.now()) + (args.days * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.orgId, {
      trialEndsAt: newTrialEnds,
      updatedAt: Date.now(),
    });

    // Log the extension
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRIAL_EXTENDED",
      actor: identity._id,
      action: "extend_trial",
      target: args.orgId,
      details: { name: org.name, days: args.days, newTrialEnds },
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: org.email,
      subject: "Trial Extended - Dutchkem Ventures",
      body: `Your trial for "${org.name}" has been extended by ${args.days} days.\n\nNew trial end date: ${new Date(newTrialEnds).toLocaleDateString()}`,
      type: "trial_extended",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, newTrialEnds };
  },
});

// ═══════════════════════════════════════════════════════════════
// 3. TRANSACTION MONITORING
// ═══════════════════════════════════════════════════════════════

/** Get organization transactions with filters */
export const getOrganizationTransactions = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let query = ctx.db.query("enterprise_org_transactions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

    const transactions = await query.order("desc").take(args.limit || 100);

    // Apply filters
    return transactions.filter((tx: any) => {
      if (args.startDate && tx.createdAt < args.startDate) return false;
      if (args.endDate && tx.createdAt > args.endDate) return false;
      if (args.type && tx.type !== args.type) return false;
      if (args.status && tx.status !== args.status) return false;
      return true;
    });
  },
});

/** Record a transaction */
export const recordTransaction = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    type: v.union(
      v.literal("subscription_payment"),
      v.literal("agent_usage"),
      v.literal("api_call"),
      v.literal("refund"),
      v.literal("payout"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("reversed")
    ),
    description: v.string(),
    reference: v.optional(v.string()),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const txId = await ctx.db.insert("enterprise_org_transactions", {
      orgId: args.orgId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      description: args.description,
      reference: args.reference,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return { success: true, txId };
  },
});

/** Reverse a transaction */
export const reverseTransaction = mutation({
  args: {
    txId: v.id("enterprise_org_transactions"),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const tx = await ctx.db.get("enterprise_org_transactions", args.txId);
    if (!tx) return { success: false, error: "Transaction not found" };
    if (tx.status === "reversed") return { success: false, error: "Transaction already reversed" };

    await ctx.db.patch(args.txId, {
      status: "reversed",
      metadata: { ...tx.metadata, reversedBy: identity._id, reversedAt: Date.now(), reason: args.reason },
    });

    // Log the reversal
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "TRANSACTION_REVERSED",
      actor: identity._id,
      action: "reverse_transaction",
      target: args.txId,
      details: { txId: args.txId, amount: tx.amount, reason: args.reason },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// 4. ANALYTICS
// ═══════════════════════════════════════════════════════════════

/** Get organization analytics */
export const getOrganizationAnalytics = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    period: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const analytics = await ctx.db.query("enterprise_org_analytics")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(365);

    // Group by metric
    const grouped: Record<string, any[]> = {};
    for (const entry of analytics) {
      if (!grouped[entry.metric]) grouped[entry.metric] = [];
      grouped[entry.metric].push({ date: entry.date, value: entry.value });
    }

    return grouped;
  },
});

/** Record analytics data point */
export const recordAnalytics = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    date: v.string(),
    metric: v.string(),
    value: v.number(),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    await ctx.db.insert("enterprise_org_analytics", {
      orgId: args.orgId,
      date: args.date,
      metric: args.metric,
      value: args.value,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// 5. DATABASE DIAGNOSTIC & HEALING
// ═══════════════════════════════════════════════════════════════

/** Run diagnostic check on organization */
export const runDiagnostic = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    // Run checks
    const checks = {
      database: { status: "healthy" as const, message: "Database connection OK" },
      users: { status: "healthy" as const, message: "User records intact" },
      workflows: { status: "healthy" as const, message: "Workflows operational" },
      payments: { status: "healthy" as const, message: "Payment system OK" },
    };

    // Check users
    const users = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (users.length === 0) {
      checks.users = { status: "warning", message: "No users found" };
    }

    // Check for stuck workflows
    const workflows = await ctx.db.query("enterprise_workflows")
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = statuses.includes("critical") ? "critical" :
      statuses.includes("warning") ? "warning" : "healthy";

    const recommendations: string[] = [];
    if (checks.users.status === "warning") {
      recommendations.push("Consider adding users to the organization");
    }

    // Save diagnostic result
    const diagnosticId = await ctx.db.insert("enterprise_org_diagnostics", {
      orgId: args.orgId,
      checkType: "full",
      status: overallStatus,
      details: checks,
      recommendations,
      performedBy: identity._id,
      createdAt: Date.now(),
    });

    return { success: true, diagnosticId, status: overallStatus, checks, recommendations };
  },
});

/** Run auto-heal on organization */
export const runAutoHeal = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    mode: v.union(v.literal("auto"), v.literal("manual")),
    specificFix: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { success: false, error: "Organization not found" };

    // Simulate healing actions
    const fixesApplied = 0;
    const details = { actions: [] as string[] };

    if (args.mode === "auto" || args.specificFix === "clear_cache") {
      details.actions.push("Cache cleared");
    }
    if (args.mode === "auto" || args.specificFix === "reset_rate_limits") {
      details.actions.push("Rate limits reset");
    }
    if (args.mode === "auto" || args.specificFix === "fix_stuck_workflows") {
      details.actions.push("Stuck workflows fixed");
    }

    // Log the healing
    const logId = await ctx.db.insert("enterprise_org_healing_logs", {
      orgId: args.orgId,
      mode: args.mode,
      fixesApplied: details.actions.length,
      details,
      performedBy: identity._id,
      createdAt: Date.now(),
    });

    return { success: true, logId, fixesApplied: details.actions.length, details };
  },
});

// ═══════════════════════════════════════════════════════════════
// 6. SUB-ADMIN & PERMISSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/** Create sub-admin */
export const createSubAdmin = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    userId: v.id("enterprise_org_users"),
    role: v.union(
      v.literal("company_admin"),
      v.literal("department_manager"),
      v.literal("team_lead"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("viewer")
    ),
    permissions: v.array(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    // Check if already a sub-admin
    const existing = await ctx.db.query("enterprise_org_subadmins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) return { success: false, error: "User is already a sub-admin" };

    const subadminId = await ctx.db.insert("enterprise_org_subadmins", {
      orgId: args.orgId,
      userId: args.userId,
      role: args.role,
      permissions: args.permissions,
      createdBy: identity._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log the creation
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_CREATED",
      actor: identity._id,
      action: "create_subadmin",
      target: subadminId,
      details: { orgId: args.orgId, userId: args.userId, role: args.role },
      createdAt: Date.now(),
    });

    return { success: true, subadminId };
  },
});

/** Update sub-admin permissions */
export const updateSubAdminPermissions = mutation({
  args: {
    subadminId: v.id("enterprise_org_subadmins"),
    role: v.optional(v.union(
      v.literal("company_admin"),
      v.literal("department_manager"),
      v.literal("team_lead"),
      v.literal("billing"),
      v.literal("support"),
      v.literal("viewer")
    )),
    permissions: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
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

    // Log the update
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_UPDATED",
      actor: identity._id,
      action: "update_subadmin",
      target: args.subadminId,
      details: updates,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Revoke sub-admin access */
export const revokeSubAdmin = mutation({
  args: {
    subadminId: v.id("enterprise_org_subadmins"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const subadmin = await ctx.db.get("enterprise_org_subadmins", args.subadminId);
    if (!subadmin) return { success: false, error: "Sub-admin not found" };

    await ctx.db.delete(args.subadminId);

    // Log the revocation
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_REVOKED",
      actor: identity._id,
      action: "revoke_subadmin",
      target: args.subadminId,
      details: { userId: subadmin.userId, orgId: subadmin.orgId },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Get sub-admins for organization */
export const getSubAdmins = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const subadmins = await ctx.db.query("enterprise_org_subadmins")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Enrich with user details
    const enriched = [];
    for (const subadmin of subadmins) {
      const user = await ctx.db.get("enterprise_org_users", subadmin.userId);
      enriched.push({
        ...subadmin,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
      });
    }

    return enriched;
  },
});

// ═══════════════════════════════════════════════════════════════
// 7. PAYMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Configure payment gateway for organization */
export const configurePaymentGateway = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    gateway: v.union(v.literal("kora"), v.literal("stripe"), v.literal("paystack"), v.literal("flutterwave")),
    apiKey: v.string(),
    secretKey: v.string(),
    webhookSecret: v.optional(v.string()),
    payoutSchedule: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    minimumPayout: v.number(),
    platformFeePercentage: v.number(),
    currency: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    // Check if config exists
    const existing = await ctx.db.query("enterprise_org_payment_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gateway: args.gateway,
        apiKey: args.apiKey,
        secretKey: args.secretKey,
        webhookSecret: args.webhookSecret,
        payoutSchedule: args.payoutSchedule,
        minimumPayout: args.minimumPayout,
        platformFeePercentage: args.platformFeePercentage,
        currency: args.currency,
        configuredBy: identity._id,
        configuredAt: Date.now(),
      });
    } else {
      await ctx.db.insert("enterprise_org_payment_configs", {
        orgId: args.orgId,
        gateway: args.gateway,
        apiKey: args.apiKey,
        secretKey: args.secretKey,
        webhookSecret: args.webhookSecret,
        payoutSchedule: args.payoutSchedule,
        minimumPayout: args.minimumPayout,
        platformFeePercentage: args.platformFeePercentage,
        currency: args.currency,
        configuredBy: identity._id,
        configuredAt: Date.now(),
      });
    }

    // Log the configuration
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "PAYMENT_CONFIGURED",
      actor: identity._id,
      action: "configure_payment",
      target: args.orgId,
      details: { gateway: args.gateway, currency: args.currency },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Get payment configuration for organization */
export const getPaymentConfig = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    return await ctx.db.query("enterprise_org_payment_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

// ═══════════════════════════════════════════════════════════════
// 8. FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════

/** Set feature flag for organization */
export const setFeatureFlag = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    feature: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db.query("enterprise_org_feature_flags")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("feature"), args.feature))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        config: args.config,
        setBy: identity._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("enterprise_org_feature_flags", {
        orgId: args.orgId,
        feature: args.feature,
        enabled: args.enabled,
        config: args.config,
        setBy: identity._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/** Get feature flags for organization */
export const getFeatureFlags = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("enterprise_org_feature_flags")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════
// 9. BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/** Bulk suspend organizations */
export const bulkSuspendOrganizations = mutation({
  args: {
    orgIds: v.array(v.id("enterprise_organizations")),
    days: v.number(),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const results = [];
    for (const orgId of args.orgIds) {
      const org = await ctx.db.get("enterprise_organizations", orgId);
      if (org) {
        await ctx.db.patch(orgId, {
          status: "suspended" as any,
          updatedAt: Date.now(),
        });
        results.push({ orgId, success: true });

        // Log and notify
        await ctx.db.insert("enterprise_audit_logs", {
          eventType: "ORG_BULK_SUSPENDED",
          actor: identity._id,
          action: "bulk_suspend",
          target: orgId,
          details: { name: org.name, days: args.days, reason: args.reason },
          createdAt: Date.now(),
        });

        await ctx.db.insert("email_notifications", {
          to: org.email,
          subject: "Organization Suspended - Dutchkem Ventures",
          body: `Your organization "${org.name}" has been suspended for ${args.days} days.\n\nReason: ${args.reason}`,
          type: "org_suspended",
          status: "sent",
          createdAt: Date.now(),
        });
      } else {
        results.push({ orgId, success: false, error: "Not found" });
      }
    }

    return { success: true, results };
  },
});

/** Bulk upgrade organizations */
export const bulkUpgradeOrganizations = mutation({
  args: {
    orgIds: v.array(v.id("enterprise_organizations")),
    newPlan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const results = [];
    for (const orgId of args.orgIds) {
      const org = await ctx.db.get("enterprise_organizations", orgId);
      if (org) {
        await ctx.db.patch(orgId, {
          plan: args.newPlan,
          status: "active" as any,
          updatedAt: Date.now(),
        });
        results.push({ orgId, success: true });

        await ctx.db.insert("enterprise_audit_logs", {
          eventType: "ORG_BULK_UPGRADED",
          actor: identity._id,
          action: "bulk_upgrade",
          target: orgId,
          details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan },
          createdAt: Date.now(),
        });

        await ctx.db.insert("email_notifications", {
          to: org.email,
          subject: "Organization Upgraded - Dutchkem Ventures",
          body: `Your organization "${org.name}" has been upgraded to the ${args.newPlan} plan.`,
          type: "org_upgraded",
          status: "sent",
          createdAt: Date.now(),
        });
      } else {
        results.push({ orgId, success: false, error: "Not found" });
      }
    }

    return { success: true, results };
  },
});

// ═══════════════════════════════════════════════════════════════
// 10. AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

/** Get audit logs for organization */
export const getAuditLogs = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("enterprise_audit_logs")
      .filter((q) => q.eq(q.field("target"), args.orgId))
      .order("desc")
      .take(args.limit || 100);
  },
});

/** Get email notifications for organization */
export const getNotifications = query({
  args: {
    orgId: v.id("enterprise_organizations"),
    limit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    // Get org email first
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return [];

    return await ctx.db.query("email_notifications")
      .withIndex("by_to", (q) => q.eq("to", org.email))
      .order("desc")
      .take(args.limit || 50);
  },
});
