import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Escalate to human support
// ═══════════════════════════════════════════════════════════════════
export const escalateInteraction = mutation({
  args: {
    userId: v.string(),
    interactionId: v.id("support_interactions"),
    agentId: v.string(),
    reason: v.string(),
  },
  returns: v.id("support_escalations"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("support_escalations", {
      userId: args.userId,
      interactionId: args.interactionId,
      agentId: args.agentId,
      reason: args.reason,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Resolve escalation
// ═══════════════════════════════════════════════════════════════════
export const resolveEscalation = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    resolution: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.escalationId, {
      status: "resolved",
      resolution: args.resolution,
      resolvedAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Assign escalation to agent/admin
// ═══════════════════════════════════════════════════════════════════
export const assignEscalation = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    assignedTo: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.escalationId, {
      status: "in_progress",
      assignedTo: args.assignedTo,
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Add response note to escalation
// ═══════════════════════════════════════════════════════════════════
export const addEscalationResponse = mutation({
  args: {
    escalationId: v.id("support_escalations"),
    response: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.escalationId);
    if (!doc) return null;
    const existing = (doc as any).responses || [];
    await ctx.db.patch(args.escalationId, {
      responses: [...existing, { text: args.response, timestamp: Date.now() }],
    } as any);
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all escalations (pending + in_progress)
// ═══════════════════════════════════════════════════════════════════
export const getActiveEscalations = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("support_escalations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    const inProgress = await ctx.db
      .query("support_escalations")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .order("desc")
      .collect();
    return [...pending, ...inProgress];
  },
});
