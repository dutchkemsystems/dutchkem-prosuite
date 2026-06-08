import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword } from "./encryption";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

/** Register a new enterprise organization */
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }

    const existing = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
      .first();
    if (existing) {
      return { error: "An organization with this email already exists" };
    }

    const passwordHash = await hashPassword(args.password);
    const now = Date.now();
    const trialEndsAt = now + (14 * 24 * 60 * 60 * 1000);

    const orgId = await ctx.db.insert("enterprise_organizations", {
      name: args.name,
      email: args.email.toLowerCase(),
      passwordHash,
      industry: args.industry,
      size: args.size,
      phone: args.phone,
      website: args.website,
      status: "trial",
      plan: "trial",
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    const token = generateToken();
    await ctx.db.insert("enterprise_sessions", {
      orgId,
      token,
      isCurrent: true,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    // Log the registration
    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_REGISTERED",
      actor: args.email,
      action: "register",
      target: orgId,
      details: { name: args.name, plan: "trial" },
      createdAt: now,
    });

    return { success: true, token, orgId, trialEndsAt };
  },
});

/** Login to enterprise portal — supports both org-level and org_admin users */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // First check if it's an org_admin user
    const orgUser = await ctx.db.query("enterprise_org_users")
      .withIndex("by_email", q => q.eq("email", emailLower))
      .first();

    if (orgUser) {
      if (orgUser.status === "suspended") {
        return { error: "This account has been suspended. Contact your administrator." };
      }

      const valid = await verifyPassword(args.password, orgUser.passwordHash);
      if (!valid) {
        return { error: "Invalid password" };
      }

      const org = await ctx.db.get("enterprise_organizations", orgUser.orgId);
      if (!org) return { error: "Organization not found" };
      if (org.status === "suspended") return { error: "Organization is suspended" };
      if (org.status === "expired") return { error: "Organization trial has expired" };

      const now = Date.now();
      const token = generateToken();

      // Invalidate old sessions for this org
      const oldSessions = await ctx.db.query("enterprise_sessions")
        .withIndex("by_org", q => q.eq("orgId", org._id))
        .collect();
      for (const session of oldSessions) {
        await ctx.db.patch(session._id, { isCurrent: false });
      }

      await ctx.db.insert("enterprise_sessions", {
        orgId: org._id,
        token,
        isCurrent: true,
        expiresAt: now + (30 * 24 * 60 * 60 * 1000),
        createdAt: now,
      });

      await ctx.db.insert("enterprise_audit_logs", {
        eventType: "ORG_USER_LOGIN",
        actor: emailLower,
        action: "login",
        target: org._id,
        details: { plan: org.plan, status: org.status, role: orgUser.role, mustChangePassword: orgUser.mustChangePassword },
        createdAt: now,
      });

      return {
        success: true,
        token,
        mustChangePassword: orgUser.mustChangePassword,
        org: {
          _id: org._id,
          name: org.name,
          email: org.email,
          status: org.status,
          plan: org.plan,
          trialEndsAt: org.trialEndsAt,
        },
      };
    }

    // Fallback: check org-level login (org created with its own email as login)
    const org = await ctx.db.query("enterprise_organizations")
      .withIndex("by_email", q => q.eq("email", emailLower))
      .first();

    if (!org) {
      return { error: "No account found with this email" };
    }

    if (org.status === "suspended") {
      return { error: "This account has been suspended. Contact support." };
    }

    if (org.status === "expired") {
      return { error: "This trial has expired. Please upgrade to a paid plan." };
    }

    const valid = await verifyPassword(args.password, org.passwordHash);
    if (!valid) {
      return { error: "Invalid password" };
    }

    // Check trial expiration
    if (org.status === "trial" && org.trialEndsAt && org.trialEndsAt < Date.now()) {
      await ctx.db.patch(org._id, { status: "expired" });
      return { error: "This trial has expired. Please upgrade to a paid plan." };
    }

    const now = Date.now();
    const token = generateToken();

    // Invalidate old sessions
    const oldSessions = await ctx.db.query("enterprise_sessions")
      .withIndex("by_org", q => q.eq("orgId", org._id))
      .collect();
    for (const session of oldSessions) {
      await ctx.db.patch(session._id, { isCurrent: false });
    }

    await ctx.db.insert("enterprise_sessions", {
      orgId: org._id,
      token,
      isCurrent: true,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_LOGIN",
      actor: emailLower,
      action: "login",
      target: org._id,
      details: { plan: org.plan, status: org.status },
      createdAt: now,
    });

    return {
      success: true,
      token,
      org: {
        _id: org._id,
        name: org.name,
        email: org.email,
        status: org.status,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt,
      },
    };
  },
});

/** Validate enterprise session */
export const validateSession = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!session || !session.isCurrent) {
      return { valid: false };
    }

    if (session.expiresAt < Date.now()) {
      return { valid: false, reason: "expired" };
    }

    const org = await ctx.db.get("enterprise_organizations", session.orgId);
    if (!org) {
      return { valid: false, reason: "org_not_found" };
    }

    if (org.status === "suspended") {
      return { valid: false, reason: "suspended" };
    }

    if (org.status === "trial" && org.trialEndsAt && org.trialEndsAt < Date.now()) {
      return { valid: false, reason: "trial_expired" };
    }

    return {
      valid: true,
      org: {
        _id: org._id,
        name: org.name,
        email: org.email,
        status: org.status,
        plan: org.plan,
        industry: org.industry,
        size: org.size,
        logo: org.logo,
        trialEndsAt: org.trialEndsAt,
      },
    };
  },
});

/** Logout enterprise session */
export const logout = mutation({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { isCurrent: false });
    }

    return { success: true };
  },
});

/** Get enterprise organization details */
export const getOrgDetails = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!session || !session.isCurrent || session.expiresAt < Date.now()) {
      return null;
    }

    const org = await ctx.db.get("enterprise_organizations", session.orgId);
    if (!org) return null;

    return {
      _id: org._id,
      name: org.name,
      email: org.email,
      status: org.status,
      plan: org.plan,
      industry: org.industry,
      size: org.size,
      phone: org.phone,
      website: org.website,
      logo: org.logo,
      trialEndsAt: org.trialEndsAt,
      createdAt: org.createdAt,
    };
  },
});

/** Admin: list all enterprise organizations */
export const adminListOrganizations = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!args.adminToken) return { authError: true, data: [] };

    const session: any = await ctx.db.get(args.adminToken as any);
    if (!session || !session.userId || session.userType !== "admin" || session.isRevoked) {
      return { authError: true, data: [] };
    }

    const orgs = await ctx.db.query("enterprise_organizations").collect();
    return { data: orgs };
  },
});

/** Admin: update enterprise organization status */
export const adminUpdateOrg = mutation({
  args: {
    adminToken: v.string(),
    orgId: v.id("enterprise_organizations"),
    status: v.optional(v.union(v.literal("trial"), v.literal("active"), v.literal("suspended"), v.literal("expired"))),
    plan: v.optional(v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session: any = await ctx.db.get(args.adminToken as any);
    if (!session || !session.userId || session.userType !== "admin" || session.isRevoked) {
      return { authError: true };
    }

    const patch: any = { updatedAt: Date.now() };
    if (args.status) patch.status = args.status;
    if (args.plan) patch.plan = args.plan;
    if (args.plan && args.plan !== "trial") {
      patch.trialEndsAt = undefined;
    }

    await ctx.db.patch("enterprise_organizations", args.orgId, patch);

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ORG_UPDATED_BY_ADMIN",
      actor: "admin",
      action: "update_org",
      target: args.orgId,
      details: { status: args.status, plan: args.plan },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Record capability usage */
export const recordCapabilityUsage = mutation({
  args: {
    token: v.string(),
    capability: v.string(),
    action: v.string(),
    details: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!session || !session.isCurrent || session.expiresAt < Date.now()) {
      return { error: "Invalid session" };
    }

    await ctx.db.insert("enterprise_capability_usage", {
      orgId: session.orgId,
      capability: args.capability,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
