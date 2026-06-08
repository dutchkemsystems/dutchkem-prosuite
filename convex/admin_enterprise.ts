import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword } from "./encryption";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function validateAdminToken(ctx: any, adminToken: string): boolean {
  const session = ctx.db.get(adminToken);
  if (!session || !session.userId || session.userType !== "admin" || session.isRevoked) return false;
  return true;
}

/** Admin: Create a new enterprise organization */
export const createOrganization = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    email: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { error: "Unauthorized" };
    }

    const existing = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", (q: any) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (existing) {
      return { error: "An organization with this email already exists" };
    }

    const now = Date.now();
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const trialEndsAt = now + (14 * 24 * 60 * 60 * 1000);

    const orgId = await ctx.db.insert("enterprise_organizations", {
      name: args.name,
      email: args.email.toLowerCase(),
      passwordHash,
      industry: args.industry,
      size: args.size,
      phone: args.phone,
      website: args.website,
      status: args.plan && args.plan !== "trial" ? "active" : "trial",
      plan: args.plan || "trial",
      trialEndsAt: args.plan && args.plan !== "trial" ? undefined : trialEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_CREATED_BY_ADMIN",
      actor: adminSession.userId,
      action: "create_organization",
      target: orgId,
      details: { name: args.name, email: args.email, plan: args.plan || "trial" },
      createdAt: now,
    });

    return { success: true, orgId, tempPassword, email: args.email.toLowerCase() };
  },
});

/** Admin: Create an org_admin user for an organization */
export const createOrgAdminUser = mutation({
  args: {
    adminToken: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { error: "Unauthorized" };
    }

    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { error: "Organization not found" };

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const now = Date.now();

    const userId = await ctx.db.insert("enterprise_org_users", {
      orgId: args.orgId,
      name: args.name,
      email: args.email.toLowerCase(),
      passwordHash,
      role: "org_admin",
      status: "active",
      mustChangePassword: true,
      createdBy: "admin",
      createdAt: now,
      updatedAt: now,
    });

    // Create session token for the new user
    const token = generateToken();
    await ctx.db.insert("enterprise_sessions", {
      orgId: args.orgId,
      token,
      isCurrent: false,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_ADMIN_CREATED",
      actor: adminSession.userId,
      action: "create_org_admin",
      target: args.orgId,
      details: { name: args.name, email: args.email },
      createdAt: now,
    });

    return { success: true, userId, tempPassword, email: args.email.toLowerCase() };
  },
});

/** Admin: List all organizations with details */
export const listOrganizations = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { authError: true, data: [] };
    }

    const orgs = await ctx.db.query("enterprise_organizations").collect();
    const result = [];

    for (const org of orgs) {
      const users = await ctx.db.query("enterprise_org_users")
        .withIndex("by_org", (q: any) => q.eq("orgId", org._id))
        .collect();

      const workflows = await ctx.db.query("enterprise_workflows")
        .withIndex("by_org", (q: any) => q.eq("orgId", org._id))
        .collect();

      const txns = await ctx.db.query("enterprise_transactions")
        .withIndex("by_org", (q: any) => q.eq("orgId", org._id))
        .collect();

      result.push({
        _id: org._id,
        name: org.name,
        email: org.email,
        status: org.status,
        plan: org.plan,
        industry: org.industry,
        size: org.size,
        createdAt: org.createdAt,
        trialEndsAt: org.trialEndsAt,
        userCount: users.length,
        workflowCount: workflows.length,
        transactionCount: txns.length,
        totalVolume: txns.filter((t: any) => t.status === "completed").reduce((sum: number, t: any) => sum + t.amount, 0),
      });
    }

    return { data: result };
  },
});

/** Admin: List users for an organization */
export const listOrgUsers = query({
  args: { adminToken: v.string(), orgId: v.id("enterprise_organizations") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { authError: true, data: [] };
    }

    const users = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    return {
      data: users.map((u: any) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        mustChangePassword: u.mustChangePassword,
        createdAt: u.createdAt,
      })),
    };
  },
});

/** Admin: Reset an org user's password */
export const resetOrgUserPassword = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("enterprise_org_users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { error: "Unauthorized" };
    }

    const user = await ctx.db.get("enterprise_org_users", args.userId);
    if (!user) return { error: "User not found" };

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await ctx.db.patch(args.userId, {
      passwordHash,
      mustChangePassword: true,
      updatedAt: Date.now(),
    });

    return { success: true, tempPassword, email: user.email };
  },
});

/** Admin: Suspend/activate an org user */
export const toggleOrgUserStatus = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("enterprise_org_users"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { error: "Unauthorized" };
    }

    await ctx.db.patch(args.userId, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Admin: Delete an organization and all its data */
export const deleteOrganization = mutation({
  args: {
    adminToken: v.string(),
    orgId: v.id("enterprise_organizations"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const adminSession: any = await ctx.db.get(args.adminToken as any);
    if (!adminSession || !adminSession.userId || adminSession.userType !== "admin" || adminSession.isRevoked) {
      return { error: "Unauthorized" };
    }

    // Delete all related data
    const users = await ctx.db.query("enterprise_org_users").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const u of users) await ctx.db.delete(u._id);

    const sessions = await ctx.db.query("enterprise_sessions").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    const workflows = await ctx.db.query("enterprise_workflows").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const w of workflows) await ctx.db.delete(w._id);

    const installs = await ctx.db.query("enterprise_marketplace_installs").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const i of installs) await ctx.db.delete(i._id);

    const knowledge = await ctx.db.query("enterprise_knowledge_entries").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const k of knowledge) await ctx.db.delete(k._id);

    const companions = await ctx.db.query("enterprise_companion_sessions").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const c of companions) await ctx.db.delete(c._id);

    const txns = await ctx.db.query("enterprise_transactions").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const t of txns) await ctx.db.delete(t._id);

    const profiles = await ctx.db.query("enterprise_emotional_profiles").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const p of profiles) await ctx.db.delete(p._id);

    const caps = await ctx.db.query("enterprise_capability_usage").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const c of caps) await ctx.db.delete(c._id);

    const invitations = await ctx.db.query("enterprise_invitations").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const i of invitations) await ctx.db.delete(i._id);

    const members = await ctx.db.query("enterprise_members").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).collect();
    for (const m of members) await ctx.db.delete(m._id);

    await ctx.db.delete(args.orgId);

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_DELETED_BY_ADMIN",
      actor: adminSession.userId,
      action: "delete_organization",
      target: args.orgId,
      details: {},
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
