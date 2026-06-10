import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Create an organization */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    industry: v.string(),
    size: v.string(),
    phone: v.string(),
    website: v.string(),
    adminName: v.string(),
    adminEmail: v.string(),
    adminPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { error: "Organization already registered" };

    const now = Date.now();
    const orgId = await ctx.db.insert("enterprise_organizations", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      industry: args.industry,
      size: args.size,
      phone: args.phone,
      website: args.website,
      status: "pending",
      plan: "free",
      trialEndsAt: now + (14 * 24 * 60 * 60 * 1000),
      subscriptionEndsAt: undefined,
      spendingLimit: 0,
      twoFactorSecret: undefined,
      twoFactorEnabled: false,
      logo: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const adminId = await ctx.db.insert("enterprise_org_users", {
      orgId,
      name: args.adminName,
      email: args.adminEmail,
      passwordHash: args.adminPassword,
      role: "org_admin",
      status: "active",
      mustChangePassword: false,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_sessions", {
      orgId,
      token: generateToken(),
      isCurrent: true,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_CREATED",
      actor: identity._id,
      action: "create_organization",
      target: orgId,
      details: { name: args.name, email: args.email, adminName: args.adminName },
      createdAt: now,
    });

    return { success: true, orgId, adminId };
  },
});

/** Create an org admin user */
export const createOrgAdminUser = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_org_users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { error: "User already exists" };

    const now = Date.now();
    const userId = await ctx.db.insert("enterprise_org_users", {
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      passwordHash: args.password,
      role: "org_admin",
      status: "active",
      mustChangePassword: false,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_sessions", {
      orgId: args.orgId,
      token: generateToken(),
      isCurrent: true,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    return { success: true, userId };
  },
});

/** List organizations */
export const listOrganizations = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_organizations").collect();
  },
});

/** List org users */
export const listOrgUsers = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Reset org user password */
export const resetOrgUserPassword = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    userId: v.id("enterprise_org_users"),
    newPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user || user.orgId !== args.orgId) return { error: "User not found" };

    await ctx.db.patch(args.userId, {
      passwordHash: args.newPassword,
      mustChangePassword: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/** Toggle org user status */
export const toggleOrgUserStatus = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    userId: v.id("enterprise_org_users"),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user || user.orgId !== args.orgId) return { error: "User not found" };

    await ctx.db.patch(args.userId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/** Delete organization */
export const deleteOrganization = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.orgId);
    return { success: true };
  },
});