import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════
// SUB-ADMIN AUTH HELPER
// ═══════════════════════════════════════════════════════════════
async function validateSubAdmin(
  ctx: { db: { get: (id: any) => Promise<any>; query: (table: string) => any } },
  subAdminToken: string | null | undefined,
): Promise<{ subAdmin: any; companyId: string; orgId: Id<"enterprise_organizations"> } | null> {
  if (!subAdminToken) return null;
  let session: any = null;
  try { session = await ctx.db.get(subAdminToken as any); } catch { return null; }
  if (!session || session.isRevoked) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) return null;
  if (session.userType !== "subadmin") return null;
  const subAdmin = await ctx.db.get(session.userId);
  if (!subAdmin || subAdmin.status !== "active") return null;
  return { subAdmin, companyId: subAdmin.companyId, orgId: subAdmin.orgId };
}

// ═══════════════════════════════════════════════════════════════
// SUPER ADMIN FUNCTIONS (full access)
// ═══════════════════════════════════════════════════════════════

/** Create a client under a company (Super Admin only) */
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

/** List clients for a company (Super Admin) */
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

/** List all clients across all companies (Super Admin view) */
export const listAllClients = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_clients").collect();
  },
});

/** Update client status (Super Admin) */
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

/** Delete a client (Super Admin) */
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

/** Assign a sub-admin to clients (Super Admin) */
export const assignSubAdmin = mutation({
  args: {
    clientIds: v.array(v.id("enterprise_clients")),
    subAdminId: v.string(),
    subAdminName: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    for (const clientId of args.clientIds) {
      await ctx.db.patch(clientId, { assignedSubAdmin: args.subAdminId, updatedAt: now });
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "CLIENTS_ASSIGNED",
      actor: identity._id,
      action: "assign_subadmin",
      target: args.subAdminId,
      details: { clientIds: args.clientIds, subAdminName: args.subAdminName },
      createdAt: now,
    });

    return { success: true, assigned: args.clientIds.length };
  },
});

/** Create multiple clients at once (Super Admin) */
export const createBulkClients = mutation({
  args: {
    companyId: v.string(),
    orgId: v.id("enterprise_organizations"),
    clients: v.array(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      clientType: v.optional(v.string()),
      assignedSubAdmin: v.optional(v.string()),
    })),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    if (args.clients.length === 0) return { error: "No clients provided" };
    if (args.clients.length > 100) return { error: "Maximum 100 clients per batch" };

    const now = Date.now();
    const created: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    const batchEmails = new Set<string>();
    for (const client of args.clients) {
      if (batchEmails.has(client.email.toLowerCase())) {
        skipped.push({ email: client.email, reason: "Duplicate in batch" });
        continue;
      }
      batchEmails.add(client.email.toLowerCase());

      const existing = await ctx.db.query("enterprise_clients")
        .withIndex("by_email", (q) => q.eq("email", client.email))
        .first();
      if (existing) {
        skipped.push({ email: client.email, reason: "Already exists" });
        continue;
      }

      const recordId = await ctx.db.insert("enterprise_clients", {
        companyId: args.companyId,
        orgId: args.orgId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        status: "active",
        clientType: client.clientType,
        assignedSubAdmin: client.assignedSubAdmin,
        totalSpent: 0,
        lastActivity: undefined,
        createdAt: now,
        updatedAt: now,
      });
      created.push(recordId);
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "CLIENTS_BULK_CREATED",
      actor: identity._id,
      action: "bulk_create_clients",
      target: args.companyId,
      details: { count: created.length, skipped: skipped.length, batchSize: args.clients.length },
      createdAt: now,
    });

    return { success: true, created: created.length, skipped: skipped.length, skippedDetails: skipped, clientIds: created };
  },
});

// ═══════════════════════════════════════════════════════════════
// SUB-ADMIN SCOPED FUNCTIONS (limited to their company)
// ═══════════════════════════════════════════════════════════════

/** Sub-admin: list clients in their company */
export const subAdminListClients = query({
  args: { subAdminToken: v.string(), clientType: v.optional(v.string()), status: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await validateSubAdmin(ctx, args.subAdminToken);
    if (!auth) throw new Error("Not authenticated as sub-admin");

    let q = ctx.db.query("enterprise_clients")
      .withIndex("by_company", (q2) => q2.eq("companyId", auth.companyId));

    if (args.clientType && args.clientType !== "all") {
      q = q.filter((q2) => q2.eq(q2.field("clientType"), args.clientType));
    }
    if (args.status && args.status !== "all") {
      q = q.filter((q2) => q2.eq(q2.field("status"), args.status));
    }

    return await q.collect();
  },
});

/** Sub-admin: update client status (their company only) */
export const subAdminUpdateClientStatus = mutation({
  args: {
    clientId: v.id("enterprise_clients"),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    subAdminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await validateSubAdmin(ctx, args.subAdminToken);
    if (!auth) throw new Error("Not authenticated as sub-admin");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.companyId !== auth.companyId) {
      return { error: "Client not found in your company" };
    }

    await ctx.db.patch(args.clientId, { status: args.status, updatedAt: Date.now() });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "CLIENT_STATUS_CHANGED",
      actor: auth.subAdmin._id,
      action: "update_client_status",
      target: args.clientId,
      details: { status: args.status, subAdmin: auth.subAdmin.name },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Sub-admin: delete a client (their company only) */
export const subAdminDeleteClient = mutation({
  args: { clientId: v.id("enterprise_clients"), subAdminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await validateSubAdmin(ctx, args.subAdminToken);
    if (!auth) throw new Error("Not authenticated as sub-admin");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.companyId !== auth.companyId) {
      return { error: "Client not found in your company" };
    }

    await ctx.db.delete(args.clientId);

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "CLIENT_DELETED",
      actor: auth.subAdmin._id,
      action: "delete_client",
      target: args.clientId,
      details: { subAdmin: auth.subAdmin.name },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/** Sub-admin: get client stats for their company */
export const subAdminGetClientStats = query({
  args: { subAdminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await validateSubAdmin(ctx, args.subAdminToken);
    if (!auth) throw new Error("Not authenticated as sub-admin");

    const clients = await ctx.db.query("enterprise_clients")
      .withIndex("by_company", (q) => q.eq("companyId", auth.companyId))
      .collect();

    return {
      total: clients.length,
      active: clients.filter((c: any) => c.status === "active").length,
      suspended: clients.filter((c: any) => c.status === "suspended").length,
      inactive: clients.filter((c: any) => c.status === "inactive").length,
      byType: {
        individual: clients.filter((c: any) => c.clientType === "individual").length,
        business: clients.filter((c: any) => c.clientType === "business").length,
        enterprise: clients.filter((c: any) => c.clientType === "enterprise").length,
        government: clients.filter((c: any) => c.clientType === "government").length,
      },
      totalRevenue: clients.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0),
    };
  },
});
