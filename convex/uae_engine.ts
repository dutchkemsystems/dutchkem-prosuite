import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

/**
 * UNIFIED AUTONOMOUS EVOLUTION (UAE) ENGINE
 * STATUS REPORTING
 */

export const getSystemStatus = query({
  args: {},
  handler: async (ctx) => {
    const lastDiagnosis = await ctx.db.query("guardian_tests").order("desc").first();
    const activeDiscount = await ctx.runQuery(api.holidays.getActiveDiscount, {});
    const lastUpdate = await ctx.db.query("update_history").order("desc").first();
    
    // Status Logic
    let status = "System is fully functional – no updates pending";
    let type: "success" | "warning" | "error" | "processing" = "success";
    let code = "OPTIMAL";

    if (lastDiagnosis?.status === "fail") {
      status = "Guardian Watch detected issues – auto-healing in progress";
      type = "processing";
      code = "HEALING";
    }

    const pendingServices = await ctx.db.query("agent_services")
      .withIndex("by_added_at", (q) => q.eq("added_at", 0))
      .collect();

    if (pendingServices.length > 0) {
      status = "Evolution Engine: New services available for review";
      type = "warning";
      code = "UPDATE_READY";
    }

    return {
      status,
      type,
      code,
      last_update_check: lastUpdate?.timestamp ?? Date.now(),
      last_holiday_check: activeDiscount ? activeDiscount.start_date : Date.now(),
      overall_status: type === "success" ? "🟢" : type === "warning" ? "🟡" : "🔴",
    };
  },
});

/**
 * ADMIN MANUAL TASK OVERRIDE
 */

export const generateAdminManualTask = mutation({
  args: {
    agentId: v.string(),
    serviceId: v.string(),
    prompt: v.string(),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify Admin
    const user = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).first();
    if (!user) throw new Error("Unauthorized");

    // 2. Log Task
    const taskId = await ctx.db.insert("admin_task_log", {
      adminId: user._id,
      agentId: args.agentId,
      userEmail: args.userEmail,
      serviceId: args.serviceId,
      prompt: args.prompt,
      status: "pending",
      timestamp: Date.now(),
    });

    // 3. Trigger Agent (Mock for now, should call relevant agent action)
    await ctx.scheduler.runAfter(0, internal.uae_engine.processManualTask, { taskId, prompt: args.prompt });

    return { taskId };
  },
});

export const processManualTask = internalAction({
  args: { taskId: v.id("admin_task_log"), prompt: v.string() },
  handler: async (ctx, { taskId, prompt }) => {
    // Simulate generation
    const output = `[ADMIN OVERRIDE OUTPUT] for prompt: "${prompt}"\n\nTask completed successfully by UAE Engine.`;
    
    await ctx.runMutation(internal.uae_engine.completeManualTask, { taskId, output });
  },
});

export const completeManualTask = internalMutation({
  args: { taskId: v.id("admin_task_log"), output: v.string() },
  handler: async (ctx, { taskId, output }) => {
    await ctx.db.patch(taskId, {
      status: "completed",
      output,
    });
  },
});

export const getManualTaskLogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("admin_task_log").order("desc").take(20).collect();
  },
});

/**
 * EVOLUTION ORCHESTRATOR
 */

export const rollbackEvolution = mutation({
    args: { cycle: v.string() },
    handler: async (ctx, args) => {
        const history = await ctx.db.query("update_history")
            .withIndex("by_cycle", q => q.eq("cycle", args.cycle))
            .first();
        
        if (!history) throw new Error("Update record not found");

        // Restore snapshot (simplified: just log rollback for now)
        await ctx.db.insert("update_history", {
            cycle: args.cycle,
            version: "rollback",
            status: "rolled_back",
            snapshot: {},
            timestamp: Date.now(),
        });

        return { status: "Rolled back successfully" };
    }
});
