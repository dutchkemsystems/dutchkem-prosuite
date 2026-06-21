import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Create a client under a company */
export const createClient = mutation({
  args: {
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    clientType: v.optional(v.string()),
    assignedSubAdmin: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_clients")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) return { error: "Client with this email already exists" };

    const now = Date.now();
    const recordId = await ctx.db.insert("enterprise_clients", {
      companyId: args.companyId,
      orgId: args.orgId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      company: args.company,
      status: "active",
      clientType: args.clientType,
      assignedSubAdmin: args.assignedSubAdmin,
      totalSpent: 0,
      lastActivity: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "CLIENT_CREATED",
      actor: identity._id,
      action: "create_client",
      target: args.companyId,
      details: { name: args.name, email: args.email },
      createdAt: now,
    });

    return { success: true, clientId: recordId };
  },
});

/** List clients for a company */
export const listClients = query({
  args: { companyId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_clients")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** List all clients across all companies (admin view) */
export const listAllClients = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_clients").collect();
  },
});

/** Update client status */
export const updateClientStatus = mutation({
  args: {
    clientId: v.id("enterprise_clients"),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.clientId, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Delete a client */
export const deleteClient = mutation({
  args: { clientId: v.id("enterprise_clients"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.clientId);
    return { success: true };
  },
});
