import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession } from "../auth_helpers";
import { DAILY_POSTING_TIMES } from "./platforms";

export const listWorkflows = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    // Allow public read access for workflows
    const workflows = await ctx.db.query("trypost_workflows").order("desc").collect();
    return { authError: false, workflows };
  },
});

export const createWorkflow = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    description: v.string(),
    triggerType: v.string(),
    triggerConfig: v.optional(v.any()),
    steps: v.array(v.any()),
    platforms: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("trypost_workflows", {
      name: args.name,
      description: args.description,
      triggerType: args.triggerType,
      triggerConfig: args.triggerConfig,
      steps: args.steps,
      platforms: args.platforms,
      active: true,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: identity._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const toggleWorkflow = mutation({
  args: { adminToken: v.string(), workflowId: v.id("trypost_workflows"), active: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.workflowId, { active: args.active, updatedAt: Date.now() });
    return { success: true };
  },
});

export const listWorkflowRuns = query({
  args: { adminToken: v.optional(v.string()), workflowId: v.optional(v.id("trypost_workflows")) },
  returns: v.any(),
  handler: async (ctx, { adminToken, workflowId }) => {
    // Allow public read access for workflow runs
    const runs = workflowId
      ? await ctx.db
          .query("trypost_workflow_runs")
          .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
          .order("desc")
          .take(50)
      : await ctx.db.query("trypost_workflow_runs").order("desc").take(50);

    return { authError: false, runs };
  },
});

export const executeDailyPosting = internalAction({
  args: { hourSlot: v.number() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const internalAny: any = internal.trypost;
    const slot = DAILY_POSTING_TIMES.find((t) => t.hour === args.hourSlot);
    if (!slot) return { success: false, error: "Invalid hour slot" };

    const workflows = await ctx.runQuery(internalAny._getActiveWorkflows, {});
    let totalPublished = 0;

    for (const wf of workflows) {
      if (wf.triggerType === "schedule" && (wf.triggerConfig as Record<string, any>)?.hourSlot === args.hourSlot) {
        const runId = await ctx.runMutation(internalAny._startWorkflowRun, {
          workflowId: wf._id,
          triggeredBy: `cron-${args.hourSlot}`,
        });

        try {
          for (const platform of wf.platforms) {
            const content = `[${slot.label}] ${wf.description}`;
            await ctx.runMutation(internalAny._createDailyPost, {
              content,
              platform,
              scheduledFor: Date.now() + 60000,
              workflowId: wf._id,
              runId,
            });
            totalPublished++;
          }
          await ctx.runMutation(internalAny._completeWorkflowRun, {
            runId,
            postsCreated: wf.platforms.length,
            postsPublished: wf.platforms.length,
          });
        } catch (e: any) {
          await ctx.runMutation(internalAny._failWorkflowRun, {
            runId,
            error: e?.message ?? String(e),
          });
        }
      }
    }

    return { success: true, hourSlot: args.hourSlot, slot: slot.label, totalPublished };
  },
});

export const _getActiveWorkflows = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("trypost_workflows")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const _startWorkflowRun = internalMutation({
  args: { workflowId: v.id("trypost_workflows"), triggeredBy: v.string() },
  returns: v.id("trypost_workflow_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("trypost_workflow_runs", {
      workflowId: args.workflowId,
      triggeredBy: args.triggeredBy,
      status: "running",
      postsCreated: 0,
      postsPublished: 0,
      startedAt: Date.now(),
    });
  },
});

export const _completeWorkflowRun = internalMutation({
  args: { runId: v.id("trypost_workflow_runs"), postsCreated: v.number(), postsPublished: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "completed",
      postsCreated: args.postsCreated,
      postsPublished: args.postsPublished,
      completedAt: Date.now(),
    });
  },
});

export const _failWorkflowRun = internalMutation({
  args: { runId: v.id("trypost_workflow_runs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      errors: [args.error],
      completedAt: Date.now(),
    });
  },
});

export const _createDailyPost = internalMutation({
  args: {
    content: v.string(),
    platform: v.string(),
    scheduledFor: v.number(),
    workflowId: v.id("trypost_workflows"),
    runId: v.id("trypost_workflow_runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("trypost_scheduled_posts", {
      content: args.content,
      platforms: [args.platform],
      scheduledFor: args.scheduledFor,
      timezone: "Africa/Lagos",
      status: "scheduled",
      workflowId: args.workflowId,
      createdBy: "system",
      createdAt: Date.now(),
    });
  },
});
