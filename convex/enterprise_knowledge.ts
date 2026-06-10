import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Add an entry */
export const addEntry = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    source: v.string(),
    entity: v.string(),
    relationship: v.string(),
    confidence: v.number(),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const entryId = await ctx.db.insert("enterprise_knowledge_entries", {
      orgId: args.orgId,
      source: args.source,
      entity: args.entity,
      relationship: args.relationship,
      confidence: args.confidence,
      metadata: args.metadata,
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "KNOWLEDGE_ENTRY_ADDED",
      actor: identity._id,
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
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Search entries */
export const searchEntries = query({
  args: { orgId: v.id("enterprise_organizations"), query: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
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
  args: { entryId: v.id("enterprise_knowledge_entries"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.entryId);
    return { success: true };
  },
});

/** Get stats */
export const getStats = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
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