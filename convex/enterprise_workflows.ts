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

/** Create a workflow */
export const createWorkflow = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    createdBy: v.string(),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) {
      const auth = await tryResolveEnterpriseAuth(ctx, args);
      if (!auth) throw new Error("Not authenticated");
      if (!resolvedOrgId) throw new Error("Organization not found");
    }

    const now = Date.now();
    const workflowId = await ctx.db.insert("enterprise_workflows", {
      orgId: resolvedOrgId!,
      name: args.name,
      description: args.description,
      nodes: args.nodes,
      edges: args.edges,
      status: "draft",
      createdBy: args.createdBy,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, workflowId };
  },
});

/** List all workflows */
export const listWorkflows = query({
  args: { orgId: v.optional(v.id("enterprise_organizations")), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_workflows")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});

/** Get a single workflow */
export const getWorkflow = query({
  args: { workflowId: v.id("enterprise_workflows"), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("enterprise_workflows", args.workflowId);
  },
});

/** Update a workflow */
export const updateWorkflow = mutation({
  args: {
    workflowId: v.id("enterprise_workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
    edges: v.optional(v.array(v.any())),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("paused"))),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const existing = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!existing) return { error: "Workflow not found" };

    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.nodes !== undefined) patch.nodes = args.nodes;
    if (args.edges !== undefined) patch.edges = args.edges;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.workflowId, patch);
    return { success: true };
  },
});

/** Delete a workflow */
export const deleteWorkflow = mutation({
  args: { workflowId: v.id("enterprise_workflows"), adminToken: v.optional(v.string()), token: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    await ctx.db.delete(args.workflowId);
    return { success: true };
  },
});

/** Run a workflow */
export const runWorkflow = mutation({
  args: {
    workflowId: v.id("enterprise_workflows"),
    inputData: v.optional(v.any()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const workflow = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!workflow) return { error: "Workflow not found" };

    await ctx.db.patch(args.workflowId, {
      runCount: workflow.runCount + 1,
      lastRunAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "WORKFLOW_RUN",
      actor: auth.actorId || "unknown",
      action: "run_workflow",
      target: args.workflowId,
      details: { name: workflow.name, runNumber: workflow.runCount + 1 },
      createdAt: Date.now(),
    });

    return { success: true, runNumber: workflow.runCount + 1 };
  },
});

/** Duplicate a workflow */
export const duplicateWorkflow = mutation({
  args: {
    workflowId: v.id("enterprise_workflows"),
    newName: v.string(),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const orgId = auth.orgId;
    const source = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!source || source.orgId !== orgId) return { error: "Not found" };

    const now = Date.now();
    const newId = await ctx.db.insert("enterprise_workflows", {
      orgId,
      name: args.newName,
      description: source.description,
      nodes: source.nodes,
      edges: source.edges,
      status: "draft",
      createdBy: "org",
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, workflowId: newId };
  },
});
