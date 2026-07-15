import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Create a sub-admin under a company */
export const createSubAdmin = mutation({
  args: {
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("viewer")),
    department: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_subadmins")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { error: "Sub-admin with this email already exists" };

    const now = Date.now();
    const recordId = await ctx.db.insert("enterprise_subadmins", {
      companyId: args.companyId,
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: args.role,
      department: args.department,
      permissions: args.permissions || [],
      status: "active",
      lastLogin: undefined,
      createdBy: identity._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUBADMIN_CREATED",
      actor: identity._id,
      action: "create_subadmin",
      target: args.companyId,
      details: { name: args.name, email: args.email, role: args.role },
      createdAt: now,
    });

    return { success: true, subAdminId: recordId };
  },
});

/** List sub-admins for a company */
export const listSubAdmins = query({
  args: { companyId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_subadmins")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** List all sub-admins across all companies (admin view) */
export const listAllSubAdmins = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_subadmins").collect();
  },
});

/** Update sub-admin role */
export const updateSubAdminRole = mutation({
  args: {
    subAdminId: v.id("enterprise_subadmins"),
    role: v.union(v.literal("company_admin"), v.literal("department_manager"), v.literal("team_lead"), v.literal("viewer")),
    department: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const subAdmin = await ctx.db.get("enterprise_subadmins", args.subAdminId);
    if (!subAdmin) return { error: "Sub-admin not found" };

    const patch: any = { role: args.role, updatedAt: Date.now() };
    if (args.department !== undefined) patch.department = args.department;
    if (args.permissions !== undefined) patch.permissions = args.permissions;

    await ctx.db.patch(args.subAdminId, patch);
    return { success: true };
  },
});

/** Toggle sub-admin status */
export const toggleSubAdminStatus = mutation({
  args: {
    subAdminId: v.id("enterprise_subadmins"),
    status: v.union(v.literal("active"), v.literal("suspended")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.subAdminId, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Delete a sub-admin */
export const deleteSubAdmin = mutation({
  args: { subAdminId: v.id("enterprise_subadmins"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.subAdminId);
    return { success: true };
  },
});
