import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

/** Add a knowledge entry */
export const addEntry = mutation({
  args: {
    token: v.string(),
    source: v.string(),
    entity: v.string(),
    relationship: v.string(),
    confidence: v.number(),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const id = await ctx.db.insert("enterprise_knowledge_entries", {
      orgId,
      source: args.source,
      entity: args.entity,
      relationship: args.relationship,
      confidence: args.confidence,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return { success: true, entryId: id };
  },
});

/** List knowledge entries for an org */
export const listEntries = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return entries;
  },
});

/** Search knowledge entries by entity or source */
export const searchEntries = query({
  args: { token: v.string(), query: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const q = args.query.toLowerCase();
    return entries.filter((e: any) =>
      e.entity.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.relationship.toLowerCase().includes(q)
    );
  },
});

/** Delete a knowledge entry */
export const deleteEntry = mutation({
  args: { token: v.string(), entryId: v.id("enterprise_knowledge_entries") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const entry = await ctx.db.get("enterprise_knowledge_entries", args.entryId);
    if (!entry || entry.orgId !== orgId) return { error: "Not found" };

    await ctx.db.delete(args.entryId);
    return { success: true };
  },
});

/** Get knowledge stats */
export const getStats = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { totalEntries: 0, entities: [], sources: [], avgConfidence: 0 };

    const entries = await ctx.db.query("enterprise_knowledge_entries")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const entityMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    let totalConfidence = 0;

    for (const e of entries) {
      entityMap.set(e.entity, (entityMap.get(e.entity) || 0) + 1);
      sourceMap.set(e.source, (sourceMap.get(e.source) || 0) + 1);
      totalConfidence += e.confidence;
    }

    return {
      totalEntries: entries.length,
      entities: Array.from(entityMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      sources: Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      avgConfidence: entries.length > 0 ? totalConfidence / entries.length : 0,
    };
  },
});
