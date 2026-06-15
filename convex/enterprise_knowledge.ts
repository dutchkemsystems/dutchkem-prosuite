import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryResolveEnterpriseAuth } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

/** Resolve orgId from either admin session or enterprise session token */
async function resolveOrgId(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: Id<"enterprise_organizations"> }
): Promise<Id<"enterprise_organizations"> | null> {
  if (args.orgId) return args.orgId;
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
  }
  return null;
}

/** Add an entry */
export const addEntry = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    source: v.string(),
    entity: v.string(),
    relationship: v.string(),
    confidence: v.number(),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: resolvedOrgId });
    if (!auth) throw new Error("Not authenticated");
    if (!resolvedOrgId) throw new Error("Organization not found");

    const now = Date.now();
    const entryId = await ctx.db.insert("enterprise_knowledge_entries", {
      orgId: resolvedOrgId,
      source: args.source,
      entity: args.entity,
      relationship: args.relationship,
      confidence: args.confidence,
      metadata: args.metadata,
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "KNOWLEDGE_ENTRY_ADDED",
      actor: auth.actorId || "unknown",
      action: "add_entry",
      target: entryId,
      details: { source: args.source, entity: args.entity, relationship: args.relationship },
      createdAt: now,
    });

    return { success: true, entryId };
  },
});

/** List entries */
export const listEntries = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});

/** Search entries */
export const searchEntries = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), query: v.string(), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();

    return entries.filter((e: any) =>
      e.source.toLowerCase().includes(args.query.toLowerCase()) ||
      e.entity.toLowerCase().includes(args.query.toLowerCase()) ||
      e.relationship.toLowerCase().includes(args.query.toLowerCase())
    );
  },
});

/** Delete an entry */
export const deleteEntry = mutation({
  args: { entryId: v.id("enterprise_knowledge_entries"), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    await ctx.db.delete(args.entryId);
    return { success: true };
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { totalEntries: 0, sourceBreakdown: {}, avgConfidence: 0 };

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();

    const sourceCounts: Record<string, number> = {};
    entries.forEach((e: any) => {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      sourceBreakdown: sourceCounts,
      avgConfidence: entries.reduce((sum: number, e: any) => sum + e.confidence, 0) / (entries.length || 1),
    };
  },
});
