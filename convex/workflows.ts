import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Feature 3: Smart Workflows & Automation Engine

export const createWorkflow = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.object({
      type: v.union(v.literal("new_lead"), v.literal("payment"), v.literal("agent_usage"), v.literal("subscription"), v.literal("schedule")),
      config: v.any(),
    }),
    actions: v.array(v.object({
      type: v.union(v.literal("send_sms"), v.literal("send_email"), v.literal("assign_agent"), v.literal("apply_discount"), v.literal("webhook"), v.literal("notification")),
      config: v.any(),
      order: v.number(),
    })),
    isActive: v.boolean(),
    createdBy: v.id("users"),
  },
  returns: v.id("workflows"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflows", {
      ...args,
      triggerCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    trigger: v.optional(v.object({
      type: v.union(v.literal("new_lead"), v.literal("payment"), v.literal("agent_usage"), v.literal("subscription"), v.literal("schedule")),
      config: v.any(),
    })),
    actions: v.optional(v.array(v.object({
      type: v.union(v.literal("send_sms"), v.literal("send_email"), v.literal("assign_agent"), v.literal("apply_discount"), v.literal("webhook"), v.literal("notification")),
      config: v.any(),
      order: v.number(),
    }))),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workflowId, ...updates } = args;
    await ctx.db.patch(workflowId, { ...updates, updatedAt: Date.now() });
    return null;
  },
});

export const deleteWorkflow = mutation({
  args: { workflowId: v.id("workflows") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.workflowId);
    return null;
  },
});

export const getWorkflows = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("workflows"),
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.any(),
    actions: v.any(),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    triggerCount: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db.query("workflows").collect();
  },
});

export const getActiveWorkflows = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("workflows"),
    name: v.string(),
    trigger: v.any(),
    actions: v.any(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflows")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Execute a workflow based on trigger event
export const executeWorkflow = internalAction({
  args: {
    workflowId: v.id("workflows"),
    triggerEvent: v.any(),
  },
  returns: v.object({
    success: v.boolean(),
    executedActions: v.array(v.object({
      actionType: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      executedAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const workflow = await ctx.runQuery(internal.workflows.getWorkflowById, { workflowId: args.workflowId });
    if (!workflow || !workflow.isActive) {
      return { success: false, executedActions: [] };
    }

    const executedActions: Array<{actionType: string; success: boolean; error?: string; executedAt: number}> = [];

    for (const action of workflow.actions.sort((a, b) => a.order - b.order)) {
      try {
        switch (action.type) {
          case "send_sms":
            await ctx.runMutation(internal.workflows.executeSendSms, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
          case "send_email":
            await ctx.runMutation(internal.workflows.executeSendEmail, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
          case "assign_agent":
            await ctx.runMutation(internal.workflows.executeAssignAgent, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
          case "apply_discount":
            await ctx.runMutation(internal.workflows.executeApplyDiscount, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
          case "notification":
            await ctx.runMutation(internal.workflows.executeNotification, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
          case "webhook":
            await ctx.runMutation(internal.workflows.executeWebhook, {
              config: action.config,
              triggerEvent: args.triggerEvent,
            });
            break;
        }
        executedActions.push({ actionType: action.type, success: true, executedAt: Date.now() });
      } catch (error: any) {
        executedActions.push({ actionType: action.type, success: false, error: error.message, executedAt: Date.now() });
      }
    }

    const overallSuccess = executedActions.every(a => a.success);
    
    // Log execution
    await ctx.runMutation(internal.workflows.logWorkflowExecution, {
      workflowId: args.workflowId,
      triggerEvent: args.triggerEvent,
      executedActions,
      status: overallSuccess ? "success" : executedActions.some(a => a.success) ? "partial" : "failed",
    });

    // Update workflow trigger count
    await ctx.runMutation(internal.workflows.updateTriggerCount, { workflowId: args.workflowId });

    return { success: overallSuccess, executedActions };
  },
});

export const getWorkflowById = query({
  args: { workflowId: v.id("workflows") },
  returns: v.optional(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workflowId);
  },
});

export const logWorkflowExecution = mutation({
  args: {
    workflowId: v.id("workflows"),
    triggerEvent: v.any(),
    executedActions: v.array(v.object({
      actionType: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      executedAt: v.number(),
    })),
    status: v.union(v.literal("success"), v.literal("partial"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("workflow_executions", {
      workflowId: args.workflowId,
      triggerEvent: args.triggerEvent,
      executedActions: args.executedActions,
      status: args.status,
      executedAt: Date.now(),
    });
    return null;
  },
});

export const updateTriggerCount = mutation({
  args: { workflowId: v.id("workflows") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (workflow) {
      await ctx.db.patch(args.workflowId, {
        triggerCount: workflow.triggerCount + 1,
        lastTriggered: Date.now(),
      });
    }
    return null;
  },
});

export const getWorkflowExecutions = query({
  args: { workflowId: v.id("workflows") },
  returns: v.array(v.object({
    _id: v.id("workflow_executions"),
    status: v.string(),
    executedActions: v.any(),
    executedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflow_executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(50);
  },
});

// Action executors
export const executeSendSms = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { phone, message } = args.config;
    // Integration with Termii SMS
    await ctx.runMutation(internal.communication.sendSms, {
      to: phone || args.triggerEvent.phone,
      message: message || `New activity on your Dutchkem account!`,
    });
    return null;
  },
});

export const executeSendEmail = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Email sending would be implemented here
    return null;
  },
});

export const executeAssignAgent = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Agent assignment logic
    return null;
  },
});

export const executeApplyDiscount = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Discount application logic
    return null;
  },
});

export const executeNotification = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, title, message } = args.config;
    await ctx.db.insert("notifications", {
      userId: userId || args.triggerEvent.userId,
      title: title || "Workflow Notification",
      message: message || "A workflow has been triggered",
      type: "system",
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const executeWebhook = mutation({
  args: { config: v.any(), triggerEvent: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Webhook execution would be implemented here
    return null;
  },
});

// Cron-triggered workflow evaluation
export const evaluateWorkflows = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const workflows = await ctx.runQuery(internal.workflows.getScheduledWorkflows);
    
    for (const workflow of workflows) {
      if (workflow.trigger.type === "schedule") {
        await ctx.runAction(internal.workflows.executeWorkflow, {
          workflowId: workflow._id,
          triggerEvent: { type: "schedule", timestamp: Date.now() },
        });
      }
    }
    return null;
  },
});

export const getScheduledWorkflows = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflows")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()
      .then(w => w.filter(workflow => workflow.trigger.type === "schedule"));
  },
});