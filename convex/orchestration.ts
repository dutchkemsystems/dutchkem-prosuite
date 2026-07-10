import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createWorkflow = mutation({
  args: { adminToken: v.string(), name: v.string(), description: v.string(), steps: v.array(v.any()), triggers: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const workflowId = `wf-${Date.now()}`;
    await ctx.db.insert("orchestration_workflows", {
      workflowId, name: args.name, description: args.description, steps: args.steps,
      triggers: args.triggers, isActive: true, createdBy: "admin", createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { success: true, workflowId };
  },
});

export const updateWorkflow = mutation({
  args: { adminToken: v.string(), workflowId: v.string(), name: v.optional(v.string()), description: v.optional(v.string()), steps: v.optional(v.array(v.any())), triggers: v.optional(v.any()), isActive: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const wf = await ctx.db.query("orchestration_workflows").withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId)).first();
    if (!wf) return { error: "Not found" };
    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.steps !== undefined) patch.steps = args.steps;
    if (args.triggers !== undefined) patch.triggers = args.triggers;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(wf._id, patch);
    return { success: true };
  },
});

export const startWorkflowRun = mutation({
  args: { adminToken: v.string(), workflowId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const wf = await ctx.db.query("orchestration_workflows").withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId)).first();
    if (!wf) return { error: "Workflow not found" };
    const runId = `run-${Date.now()}`;
    await ctx.db.insert("orchestration_workflow_runs", {
      runId, workflowId: args.workflowId, status: "running", currentStep: 0,
      totalSteps: wf.steps.length, startedAt: Date.now(),
    });
    return { success: true, runId, totalSteps: wf.steps.length };
  },
});

export const completeRun = mutation({
  args: { adminToken: v.string(), runId: v.string(), status: v.union(v.literal("completed"), v.literal("failed"), v.literal("paused")), result: v.optional(v.any()), error: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const run = await ctx.db.query("orchestration_workflow_runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).first();
    if (!run) return { error: "Not found" };
    await ctx.db.patch(run._id, { status: args.status, result: args.result, error: args.error, completedAt: Date.now() });
    return { success: true };
  },
});

export const getWorkflows = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => await ctx.db.query("orchestration_workflows").order("desc").take(50),
});

export const getWorkflowRuns = query({
  args: { workflowId: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.workflowId) return await ctx.db.query("orchestration_workflow_runs").withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId!)).order("desc").take(args.limit ?? 20);
    return await ctx.db.query("orchestration_workflow_runs").order("desc").take(args.limit ?? 50);
  },
});

export const getOrchestrationStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const wfs = await ctx.db.query("orchestration_workflows").take(100);
    const runs = await ctx.db.query("orchestration_workflow_runs").take(200);
    return { totalWorkflows: wfs.length, activeWorkflows: wfs.filter((w) => w.isActive).length, totalRuns: runs.length, running: runs.filter((r) => r.status === "running").length, completed: runs.filter((r) => r.status === "completed").length, failed: runs.filter((r) => r.status === "failed").length };
  },
});

export const deleteWorkflow = mutation({
  args: { adminToken: v.string(), workflowId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const wf = await ctx.db.query("orchestration_workflows").withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId)).first();
    if (!wf) return { error: "Not found" };
    await ctx.db.delete(wf._id);
    return { success: true };
  },
});
