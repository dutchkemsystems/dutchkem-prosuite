import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

/** Generate a temporary password */
export const generateTempPassword = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)];
    return password;
  },
});

/** Register a new organization */
export const register = mutation({
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
  },
  returns: v.any(),
  handler: async (ctx, args) => {
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
      status: "trial",
      plan: "trial",
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
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_sessions", {
      orgId,
      token: await ctx.runQuery(internal.auth_helpers.generateToken),
      isCurrent: true,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_REGISTERED",
      actor: "system",
      action: "register",
      target: orgId,
      details: { name: args.name, email: args.email, adminName: args.adminName },
      createdAt: now,
    });

    return { success: true, orgId, adminId };
  },
});

/** Login */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    rememberMe: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // First try to find organization by email
    let org = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // If not found by org email, try to find via org_users email
    if (!org) {
      const orgUser = await ctx.db.query("enterprise_org_users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (orgUser) {
        org = await ctx.db.get("enterprise_organizations", orgUser.orgId);
      }
    }

    if (!org) return { error: "Invalid credentials" };

    // Check password against organization password OR org_user password
    let passwordMatch = org.passwordHash === args.password;

    // Also check org_users table
    if (!passwordMatch) {
      const orgUser = await ctx.db.query("enterprise_org_users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (orgUser && orgUser.passwordHash === args.password) {
        passwordMatch = true;
      }
    }

    if (!passwordMatch) return { error: "Invalid credentials" };

    const now = Date.now();
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    await ctx.db.insert("enterprise_sessions", {
      orgId: org._id,
      token,
      isCurrent: true,
      expiresAt: args.rememberMe ? now + (30 * 24 * 60 * 60 * 1000) : now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    // Invalidate old sessions
    const existingSessions = await ctx.db.query("enterprise_sessions")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .filter((q) => q.eq(q.field("isCurrent"), true))
      .collect();
    for (const session of existingSessions) {
      if (session.token !== token) {
        await ctx.db.patch(session._id, { isCurrent: false });
      }
    }

    return { success: true, token, org };
  },
});

/** Validate session */
export const validateSession = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now() || !session.isCurrent) {
      return { valid: false };
    }

    const org = await ctx.db.get("enterprise_organizations", session.orgId);
    const orgUser = await ctx.db.query("enterprise_org_users")
      .withIndex("by_email", (q) => q.eq("email", org?.email || ""))
      .first();

    return { valid: true, org, session, orgUser };
  },
});

/** Logout */
export const logout = mutation({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { isCurrent: false });
    }

    return { success: true };
  },
});

/** Get organization details — orgId derived from session if not provided */
export const getOrgDetails = query({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.isCurrent) {
      throw new Error("Unauthorized");
    }

    const orgId = args.orgId || session.orgId;

    if (session.orgId !== orgId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get("enterprise_organizations", orgId);
  },
});

/** Admin list organizations */
export const adminListOrganizations = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_organizations").collect();
  },
});

/** Admin update organization */
export const adminUpdateOrg = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    status: v.optional(v.union(v.literal("trial"), v.literal("active"), v.literal("suspended"), v.literal("expired"))),
    plan: v.optional(v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale"))),
    spendingLimit: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const patch: any = { updatedAt: Date.now() };
    if (args.status !== undefined) patch.status = args.status;
    if (args.plan !== undefined) patch.plan = args.plan;
    if (args.spendingLimit !== undefined) patch.spendingLimit = args.spendingLimit;

    await ctx.db.patch(args.orgId, patch);

    return { success: true };
  },
});

/** Record capability usage */
export const recordCapabilityUsage = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    capability: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.insert("enterprise_capability_usage", {
      orgId: args.orgId,
      capability: args.capability,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});