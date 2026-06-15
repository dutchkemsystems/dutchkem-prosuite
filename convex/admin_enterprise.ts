import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Ent";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  pw += "!";
  return pw;
}

/** Create an organization */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale"))),
    adminName: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated — please refresh the page");

    const existing = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { error: "An organization with this email already exists" };

    const tempPassword = generateTempPassword();
    const now = Date.now();
    const orgId = await ctx.db.insert("enterprise_organizations", {
      name: args.name,
      email: args.email,
      passwordHash: tempPassword, // Store the actual password for enterprise login
      industry: args.industry || "",
      size: args.size || "",
      phone: args.phone || "",
      website: args.website || "",
      status: args.plan && args.plan !== "trial" ? "active" : "trial",
      plan: args.plan || "trial",
      trialEndsAt: now + (14 * 24 * 60 * 60 * 1000),
      subscriptionEndsAt: undefined,
      spendingLimit: 0,
      twoFactorSecret: undefined,
      twoFactorEnabled: false,
      logo: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const adminUserEmail = args.adminEmail || args.email;
    const adminUserName = args.adminName || args.name;
    const adminId = await ctx.db.insert("enterprise_org_users", {
      orgId,
      name: adminUserName,
      email: adminUserEmail,
      passwordHash: tempPassword,
      role: "org_admin",
      status: "active",
      mustChangePassword: true,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_sessions", {
      orgId,
      token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      isCurrent: true,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_CREATED",
      actor: identity._id,
      action: "create_organization",
      target: orgId,
      details: { name: args.name, email: args.email, adminName: adminUserName },
      createdAt: now,
    });

    return { success: true, orgId, adminId, tempPassword, adminEmail: adminUserEmail };
  },
});

/** Create an org admin user */
export const createOrgAdminUser = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
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

    const tempPassword = generateTempPassword();
    const now = Date.now();
    const userId = await ctx.db.insert("enterprise_org_users", {
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      passwordHash: tempPassword,
      role: "org_admin",
      status: "active",
      mustChangePassword: true,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_sessions", {
      orgId: args.orgId,
      token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      isCurrent: true,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    return { success: true, userId, tempPassword };
  },
});

/** List organizations — returns empty array on auth failure instead of throwing */
export const listOrganizations = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return [];
      return await ctx.db.query("enterprise_organizations").collect();
    } catch {
      return [];
    }
  },
});

/** List org users — returns empty array on auth failure instead of throwing */
export const listOrgUsers = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return [];
      return await ctx.db.query("enterprise_org_users")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
    } catch {
      return [];
    }
  },
});

/** Reset org user password */
export const resetOrgUserPassword = mutation({
  args: {
    userId: v.id("enterprise_org_users"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user) return { error: "User not found" };

    const tempPassword = generateTempPassword();
    await ctx.db.patch(args.userId, {
      passwordHash: tempPassword,
      mustChangePassword: true,
      updatedAt: Date.now(),
    });

    return { success: true, tempPassword };
  },
});

/** Toggle org user status */
export const toggleOrgUserStatus = mutation({
  args: {
    userId: v.id("enterprise_org_users"),
    status: v.union(v.literal("active"), v.literal("suspended")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user) return { error: "User not found" };

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
