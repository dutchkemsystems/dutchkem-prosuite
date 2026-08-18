/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Helper: create admin user + session, return session ID (used as adminToken)
async function createAdminSession(t: ReturnType<typeof convexTest>, label = "default") {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: `admin-${label}@dutchkem.com`,
      name: `Admin ${label}`,
      role: "admin",
    } as any);
  });

  const sessionId = await t.run(async (ctx) => {
    return await ctx.db.insert("user_sessions", {
      userId,
      userType: "admin",
      device: "test-device",
      location: "Test",
      ip: "127.0.0.1",
      fingerprint: `fp-${label}`,
      lastActive: Date.now(),
      isCurrent: true,
      isTwoFactorVerified: false,
      deviceInfo: { userAgent: "test", deviceType: "web", browser: "test", os: "test" },
      isRevoked: false,
      expiresAt: Date.now() + 86400000,
    });
  });

  return sessionId;
}

// ═══════════════════════════════════════════════════════════════════
// 1. ORCHESTRATION WORKFLOWS (orchestration.ts)
// ═══════════════════════════════════════════════════════════════════

test("orchestration: getWorkflows returns empty array initially", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.orchestration.getWorkflows, {});
  expect(Array.isArray(result)).toBe(true);
});

test("orchestration: getOrchestrationStats returns zeroed stats", async () => {
  const t = convexTest(schema, modules);
  const stats: any = await t.query(api.orchestration.getOrchestrationStats, {});
  expect(stats).toHaveProperty("totalWorkflows");
  expect(stats).toHaveProperty("activeWorkflows");
  expect(stats).toHaveProperty("totalRuns");
  expect(stats).toHaveProperty("running");
  expect(stats).toHaveProperty("completed");
  expect(stats).toHaveProperty("failed");
});

test("orchestration: createWorkflow requires auth", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.mutation(api.orchestration.createWorkflow, {
    adminToken: "invalid",
    name: "Test Workflow",
    description: "A test workflow",
    steps: [{ name: "step1", type: "action" }],
    triggers: { type: "manual" },
  });
  expect(result.authError).toBe(true);
});

test("orchestration: full CRUD lifecycle", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "orch-crud");

  // Create
  const createResult: any = await t.mutation(api.orchestration.createWorkflow, {
    adminToken,
    name: "Lead Nurture",
    description: "Nurture new leads automatically",
    steps: [
      { name: "send_welcome", type: "send_sms", config: { template: "welcome" } },
      { name: "assign_agent", type: "assign_agent", config: { agentId: "A1" } },
    ],
    triggers: { type: "new_lead", config: { source: "web" } },
  });
  expect(createResult.success).toBe(true);
  expect(createResult.workflowId).toBeDefined();

  // Read
  const workflows: any = await t.query(api.orchestration.getWorkflows, {});
  const wf = workflows.find((w: any) => w.workflowId === createResult.workflowId);
  expect(wf).toBeDefined();
  expect(wf.name).toBe("Lead Nurture");
  expect(wf.isActive).toBe(true);
  expect(wf.steps.length).toBe(2);

  // Update
  const updateResult: any = await t.mutation(api.orchestration.updateWorkflow, {
    adminToken,
    workflowId: createResult.workflowId,
    name: "Lead Nurture v2",
    isActive: false,
  });
  expect(updateResult.success).toBe(true);

  const updated: any = await t.query(api.orchestration.getWorkflows, {});
  const updatedWf = updated.find((w: any) => w.workflowId === createResult.workflowId);
  expect(updatedWf.name).toBe("Lead Nurture v2");
  expect(updatedWf.isActive).toBe(false);

  // Delete
  const deleteResult: any = await t.mutation(api.orchestration.deleteWorkflow, {
    adminToken,
    workflowId: createResult.workflowId,
  });
  expect(deleteResult.success).toBe(true);

  const afterDelete: any = await t.query(api.orchestration.getWorkflows, {});
  const deletedWf = afterDelete.find((w: any) => w.workflowId === createResult.workflowId);
  expect(deletedWf).toBeUndefined();
});

test("orchestration: workflow run lifecycle", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "orch-run");

  // Create workflow
  const { workflowId } = await t.mutation(api.orchestration.createWorkflow, {
    adminToken,
    name: "Test Run Workflow",
    description: "For testing runs",
    steps: [{ name: "s1" }, { name: "s2" }, { name: "s3" }],
    triggers: { type: "manual" },
  });

  // Start run
  const runResult: any = await t.mutation(api.orchestration.startWorkflowRun, {
    adminToken,
    workflowId,
  });
  expect(runResult.success).toBe(true);
  expect(runResult.runId).toBeDefined();
  expect(runResult.totalSteps).toBe(3);

  // Check runs
  const runs: any = await t.query(api.orchestration.getWorkflowRuns, { workflowId });
  expect(runs.length).toBe(1);
  expect(runs[0].status).toBe("running");
  expect(runs[0].currentStep).toBe(0);
  expect(runs[0].totalSteps).toBe(3);

  // Complete run
  const completeResult: any = await t.mutation(api.orchestration.completeRun, {
    adminToken,
    runId: runResult.runId,
    status: "completed",
    result: { output: "All steps done" },
  });
  expect(completeResult.success).toBe(true);

  // Verify completed
  const completedRuns: any = await t.query(api.orchestration.getWorkflowRuns, { workflowId });
  expect(completedRuns[0].status).toBe("completed");
  expect(completedRuns[0].completedAt).toBeDefined();

  // Stats
  const stats: any = await t.query(api.orchestration.getOrchestrationStats, {});
  expect(stats.totalWorkflows).toBeGreaterThanOrEqual(1);
  expect(stats.totalRuns).toBeGreaterThanOrEqual(1);
});

// ═══════════════════════════════════════════════════════════════════
// 2. SMART WORKFLOWS & AUTOMATION (workflows.ts)
// ═══════════════════════════════════════════════════════════════════

test("workflows: getWorkflows and getActiveWorkflows return arrays", async () => {
  const t = convexTest(schema, modules);
  const all: any = await t.query(api.workflows.getWorkflows, {});
  const active: any = await t.query(api.workflows.getActiveWorkflows, {});
  expect(Array.isArray(all)).toBe(true);
  expect(Array.isArray(active)).toBe(true);
});

test("workflows: createWorkflow inserts with correct shape", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-test@example.com",
      name: "WF Test User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "Payment Welcome",
    description: "Send welcome SMS on payment",
    trigger: { type: "payment", config: { minAmount: 5000 } },
    actions: [
      { type: "send_sms", config: { phone: "+2348000000000", message: "Thank you!" }, order: 1 },
      { type: "notification", config: { title: "Payment Received", message: "New payment" }, order: 2 },
    ],
    isActive: true,
    createdBy: userId,
  });

  expect(workflowId).toBeDefined();

  const workflows: any = await t.query(api.workflows.getWorkflows, {});
  const wf = workflows.find((w: any) => w._id === workflowId);
  expect(wf).toBeDefined();
  expect(wf.name).toBe("Payment Welcome");
  expect(wf.trigger.type).toBe("payment");
  expect(wf.actions.length).toBe(2);
  expect(wf.triggerCount).toBe(0);
  expect(wf.isActive).toBe(true);
});

test("workflows: updateWorkflow patches fields correctly", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-update@example.com",
      name: "WF Update User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "Before Update",
    trigger: { type: "new_lead", config: {} },
    actions: [{ type: "notification", config: {}, order: 1 }],
    isActive: true,
    createdBy: userId,
  });

  await t.mutation(api.workflows.updateWorkflow, {
    workflowId,
    name: "After Update",
    isActive: false,
  });

  const workflows: any = await t.query(api.workflows.getWorkflows, {});
  const wf = workflows.find((w: any) => w._id === workflowId);
  expect(wf.name).toBe("After Update");
  expect(wf.isActive).toBe(false);
});

test("workflows: deleteWorkflow removes workflow", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-delete@example.com",
      name: "WF Delete User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "To Delete",
    trigger: { type: "schedule", config: { cron: "0 9 * * *" } },
    actions: [],
    isActive: true,
    createdBy: userId,
  });

  await t.mutation(api.workflows.deleteWorkflow, { workflowId });

  const workflows: any = await t.query(api.workflows.getWorkflows, {});
  const deleted = workflows.find((w: any) => w._id === workflowId);
  expect(deleted).toBeUndefined();
});

test("workflows: getActiveWorkflows only returns active ones", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-active@example.com",
      name: "WF Active User",
      role: "user",
    } as any);
  });

  const activeId = await t.mutation(api.workflows.createWorkflow, {
    name: "Active WF",
    trigger: { type: "agent_usage", config: {} },
    actions: [],
    isActive: true,
    createdBy: userId,
  });

  const inactiveId = await t.mutation(api.workflows.createWorkflow, {
    name: "Inactive WF",
    trigger: { type: "agent_usage", config: {} },
    actions: [],
    isActive: false,
    createdBy: userId,
  });

  const active: any = await t.query(api.workflows.getActiveWorkflows, {});
  const activeIds = active.map((w: any) => w._id);
  expect(activeIds).toContain(activeId);
  expect(activeIds).not.toContain(inactiveId);
});

test("workflows: stub executors return null", async () => {
  const t = convexTest(schema, modules);
  expect(await t.mutation(internal.workflows.executeSendEmail, { config: {}, triggerEvent: {} })).toBeNull();
  expect(await t.mutation(internal.workflows.executeAssignAgent, { config: {}, triggerEvent: {} })).toBeNull();
  expect(await t.mutation(internal.workflows.executeApplyDiscount, { config: {}, triggerEvent: {} })).toBeNull();
  expect(await t.mutation(internal.workflows.executeWebhook, { config: {}, triggerEvent: {} })).toBeNull();
});

test("workflows: executeNotification creates a notification record", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "notif-test@example.com",
      name: "Notif Test",
      role: "user",
    } as any);
  });

  await t.mutation(internal.workflows.executeNotification, {
    config: { userId, title: "Test Alert", message: "Something happened" },
    triggerEvent: { userId },
  });

  const notifications: any = await t.run(async (ctx) => {
    return await ctx.db.query("notifications").collect();
  });
  expect(notifications.length).toBeGreaterThan(0);
  const last = notifications[notifications.length - 1];
  expect(last.title).toBe("Test Alert");
  expect(last.message).toBe("Something happened");
  expect(last.type).toBe("system");
  expect(last.read).toBe(false);
});

test("workflows: logWorkflowExecution and getWorkflowExecutions", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-exec@example.com",
      name: "WF Exec User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "Execution Test",
    trigger: { type: "new_lead", config: {} },
    actions: [{ type: "notification", config: {}, order: 1 }],
    isActive: true,
    createdBy: userId,
  });

  await t.mutation(internal.workflows.logWorkflowExecution, {
    workflowId,
    triggerEvent: { type: "new_lead", leadId: "lead-1" },
    executedActions: [{ actionType: "notification", success: true, executedAt: Date.now() }],
    status: "success",
  });

  await t.mutation(internal.workflows.logWorkflowExecution, {
    workflowId,
    triggerEvent: { type: "new_lead", leadId: "lead-2" },
    executedActions: [
      { actionType: "send_sms", success: false, error: "Phone invalid", executedAt: Date.now() },
      { actionType: "notification", success: true, executedAt: Date.now() },
    ],
    status: "partial",
  });

  const executions: any = await t.query(api.workflows.getWorkflowExecutions, { workflowId });
  expect(executions.length).toBe(2);
  expect(executions[0].status).toBe("partial"); // desc order
  expect(executions[1].status).toBe("success");
});

test("workflows: updateTriggerCount increments count", async () => {
  const t = convexTest(schema, modules);

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "wf-trigger@example.com",
      name: "WF Trigger User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "Trigger Count Test",
    trigger: { type: "schedule", config: {} },
    actions: [],
    isActive: true,
    createdBy: userId,
  });

  let wf: any = await t.run(async (ctx) => await ctx.db.get("workflows", workflowId));
  expect(wf.triggerCount).toBe(0);

  await t.mutation(internal.workflows.updateTriggerCount, { workflowId });
  await t.mutation(internal.workflows.updateTriggerCount, { workflowId });
  await t.mutation(internal.workflows.updateTriggerCount, { workflowId });

  wf = await t.run(async (ctx) => await ctx.db.get("workflows", workflowId));
  expect(wf.triggerCount).toBe(3);
  expect(wf.lastTriggered).toBeDefined();
});

// ═══════════════════════════════════════════════════════════════════
// 3. HERMES ORCHESTRATOR (hermes_orchestrator.ts)
// ═══════════════════════════════════════════════════════════════════

test("hermes: getStatus returns defaults when not initialized", async () => {
  const t = convexTest(schema, modules);
  const status: any = await t.query(api.hermes_orchestrator.getStatus, {});
  expect(status.isRunning).toBe(false);
  expect(status.selfHealingActive).toBe(false);
  expect(Array.isArray(status.healingLogs)).toBe(true);
  expect(Array.isArray(status.scheduledTasks)).toBe(true);
  expect(Array.isArray(status.platformGateways)).toBe(true);
});

test("hermes: startOrchestrator requires auth", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.mutation(api.hermes_orchestrator.startOrchestrator, { adminToken: "invalid" });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Unauthorized");
});

test("hermes: start and stop orchestrator lifecycle", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "hermes-lifecycle");

  const startResult: any = await t.mutation(api.hermes_orchestrator.startOrchestrator, { adminToken });
  expect(startResult.success).toBe(true);

  let status: any = await t.query(api.hermes_orchestrator.getStatus, {});
  expect(status.isRunning).toBe(true);
  expect(status.selfHealingActive).toBe(true);
  expect(status.autoDiagnoseActive).toBe(true);
  expect(status.autoDeployActive).toBe(true);

  const stopResult: any = await t.mutation(api.hermes_orchestrator.stopOrchestrator, { adminToken });
  expect(stopResult.success).toBe(true);

  status = await t.query(api.hermes_orchestrator.getStatus, {});
  expect(status.isRunning).toBe(false);
  expect(status.selfHealingActive).toBe(false);
});

test("hermes: delegateTask creates a queued task", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "hermes-delegate");

  const result: any = await t.mutation(api.hermes_orchestrator.delegateTask, {
    task: "Fix WhatsApp session disconnect",
    priority: "high",
    adminToken,
  });

  expect(result.success).toBe(true);
  expect(result.taskId).toBeDefined();
  expect(result.message).toContain("Fix WhatsApp session disconnect");

  const tasks: any = await t.query(api.hermes_orchestrator.getTasks, {});
  expect(tasks.length).toBeGreaterThanOrEqual(1);
  const task = tasks.find((t: any) => t._id === result.taskId);
  expect(task).toBeDefined();
  expect(task.status).toBe("queued");
  expect(task.priority).toBe("high");
});

test("hermes: delegateTask with different priorities", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "hermes-priority");

  for (const priority of ["low", "normal", "high", "critical"] as const) {
    await t.mutation(api.hermes_orchestrator.delegateTask, {
      task: `Task with ${priority} priority`,
      priority,
      adminToken,
    });
  }

  const tasks: any = await t.query(api.hermes_orchestrator.getTasks, { limit: 10 });
  const priorities = tasks.map((t: any) => t.priority);
  expect(priorities).toContain("low");
  expect(priorities).toContain("normal");
  expect(priorities).toContain("high");
  expect(priorities).toContain("critical");
});

test("hermes: getHealingLogs returns array", async () => {
  const t = convexTest(schema, modules);
  const logs: any = await t.query(api.hermes_orchestrator.getHealingLogs, {});
  expect(Array.isArray(logs)).toBe(true);
});

test("hermes: getTasks respects limit", async () => {
  const t = convexTest(schema, modules);
  const tasks5: any = await t.query(api.hermes_orchestrator.getTasks, { limit: 5 });
  const tasks2: any = await t.query(api.hermes_orchestrator.getTasks, { limit: 2 });
  expect(tasks5.length).toBeLessThanOrEqual(5);
  expect(tasks2.length).toBeLessThanOrEqual(2);
});

// ═══════════════════════════════════════════════════════════════════
// 4. MODEL ORCHESTRATOR (model_orchestrator.ts)
// ═══════════════════════════════════════════════════════════════════

test("model_orchestrator: getProviderHealth returns all 9 providers", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.model_orchestrator.getProviderHealth, {});
  expect(result.total).toBe(9);
  expect(result.providers.length).toBe(9);

  const names = result.providers.map((p: any) => p.name);
  expect(names).toContain("freellmapi");
  expect(names).toContain("tencent");
  expect(names).toContain("cerebras");
  expect(names).toContain("mistral");
  expect(names).toContain("groq");
  expect(names).toContain("openrouter");
  expect(names).toContain("nvidia");
  expect(names).toContain("aiml");
  expect(names).toContain("mimo");
});

test("model_orchestrator: getProviderHealth includes health status", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.model_orchestrator.getProviderHealth, {});
  for (const provider of result.providers) {
    expect(provider).toHaveProperty("name");
    expect(provider).toHaveProperty("displayName");
    expect(provider).toHaveProperty("priority");
    expect(provider).toHaveProperty("cost");
    expect(provider).toHaveProperty("category");
    expect(provider).toHaveProperty("capabilities");
    expect(provider).toHaveProperty("health");
    expect(provider.health).toHaveProperty("status");
  }
});

test("model_orchestrator: getUseCaseMapping returns use cases", async () => {
  const t = convexTest(schema, modules);
  const mapping: any = await t.query(api.model_orchestrator.getUseCaseMapping, {});
  expect(mapping).toHaveProperty("chat");
  expect(mapping).toHaveProperty("academic");
  expect(mapping).toHaveProperty("business");
  expect(mapping).toHaveProperty("content");
  expect(mapping).toHaveProperty("code");
  expect(Array.isArray(mapping.chat)).toBe(true);
  expect(mapping.chat.length).toBeGreaterThan(0);
});

test("model_orchestrator: getCostTiers returns tiers", async () => {
  const t = convexTest(schema, modules);
  const tiers: any = await t.query(api.model_orchestrator.getCostTiers, {});
  expect(tiers).toBeDefined();
  expect(typeof tiers).toBe("object");
});

test("model_orchestrator: logRequest inserts usage record", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.model_orchestrator.logRequest, {
    provider: "test-provider",
    model: "test-model",
    useCase: "chat",
    success: true,
    tokens: 100,
    latencyMs: 500,
  });

  const usage: any = await t.run(async (ctx) => {
    return await ctx.db.query("ai_model_usage").collect();
  });
  expect(usage.length).toBeGreaterThan(0);
  const last = usage[usage.length - 1];
  expect(last.modelName).toBe("test-provider");
  expect(last.taskType).toBe("chat");
  expect(last.success).toBe(true);
  expect(last.tokenCount).toBe(100);
});

test("model_orchestrator: logRequest with error", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.model_orchestrator.logRequest, {
    provider: "failing-provider",
    model: "unknown",
    useCase: "content",
    success: false,
    error: "Connection timeout",
  });

  const usage: any = await t.run(async (ctx) => {
    const all = await ctx.db.query("ai_model_usage").collect();
    return all.filter((u: any) => u.modelName === "failing-provider");
  });
  expect(usage.length).toBe(1);
  expect(usage[0].success).toBe(false);
  expect(usage[0].errorMessage).toBe("Connection timeout");
});

test("model_orchestrator: updateProviderHealthMutation creates and updates health", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(internal.model_orchestrator.updateProviderHealthMutation, {
    providerName: "test-health",
    status: "healthy",
  });

  let config: any = await t.run(async (ctx) => {
    return await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "provider_health_test-health"))
      .first();
  });
  expect(config).toBeDefined();
  expect(config.value.status).toBe("healthy");
  expect(config.value.errorCount).toBe(0);

  await t.mutation(internal.model_orchestrator.updateProviderHealthMutation, {
    providerName: "test-health",
    status: "degraded",
    error: "High latency",
  });

  config = await t.run(async (ctx) => {
    return await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "provider_health_test-health"))
      .first();
  });
  expect(config.value.status).toBe("degraded");
  expect(config.value.errorCount).toBe(1);
  expect(config.value.lastError).toBe("High latency");

  await t.mutation(internal.model_orchestrator.updateProviderHealthMutation, {
    providerName: "test-health",
    status: "healthy",
  });

  config = await t.run(async (ctx) => {
    return await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "provider_health_test-health"))
      .first();
  });
  expect(config.value.status).toBe("healthy");
  expect(config.value.errorCount).toBe(0);
});

// ═══════════════════════════════════════════════════════════════════
// 5. AD ORCHESTRATOR (adOrchestrator.ts)
// ═══════════════════════════════════════════════════════════════════

test("adOrchestrator: getPendingApprovals requires auth", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.adOrchestrator.getPendingApprovals, { adminToken: "invalid" });
  expect(result).toEqual([]);
});

test("adOrchestrator: approveContent and rejectContent", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "ad-approve");

  const contentId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_generated_content", {
      headline: "Test Ad",
      description: "A test advertisement",
      cta: "Click Here",
      hashtags: ["#test"],
      targetAudience: "everyone",
      socialPosts: [],
      status: "pending",
      usedCount: 0,
      createdAt: Date.now(),
    });
  });

  // Reject
  const rejectResult: any = await t.mutation(api.adOrchestrator.rejectContent, {
    contentId,
    reason: "Needs revision",
    adminToken,
  });
  expect(rejectResult.success).toBe(true);

  let content: any = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("rejected");
  expect(content.rejectReason).toBe("Needs revision");

  // Reset to pending
  await t.run(async (ctx) => {
    await ctx.db.patch(contentId, { status: "pending" });
  });

  // Approve
  const approveResult: any = await t.mutation(api.adOrchestrator.approveContent, {
    contentId,
    autoPost: false,
    adminToken,
  });
  expect(approveResult.success).toBe(true);

  content = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("ready");
  expect(content.approvedBy).toBeDefined();
  expect(content.approvedAt).toBeDefined();
});

test("adOrchestrator: approveContent with autoPost creates posting log", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "ad-autopost");

  await t.run(async (ctx) => {
    await ctx.db.insert("ad_orchestrator_status", {
      enabled: true,
      autoGenerate: true,
      autoPost: true,
      lastRun: null,
      nextRun: null,
      totalGenerated: 0,
      totalPosted: 0,
      platforms: [
        { id: "x", enabled: true },
        { id: "linkedin", enabled: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const contentId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_generated_content", {
      headline: "Auto Post Test",
      description: "Should auto-post",
      cta: "Buy Now",
      hashtags: ["#auto"],
      targetAudience: "all",
      socialPosts: [],
      status: "pending",
      usedCount: 0,
      createdAt: Date.now(),
    });
  });

  const result: any = await t.mutation(api.adOrchestrator.approveContent, {
    contentId,
    autoPost: true,
    adminToken,
  });
  expect(result.success).toBe(true);

  const content: any = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("approved");

  const logs: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_posting_logs")
      .withIndex("by_content", (q) => q.eq("contentId", contentId))
      .collect();
  });
  expect(logs.length).toBe(1);
  expect(logs[0].platforms).toContain("x");
  expect(logs[0].platforms).toContain("linkedin");
});

// ═══════════════════════════════════════════════════════════════════
// 6. CROSS-MODULE INTEGRATION
// ═══════════════════════════════════════════════════════════════════

test("integration: orchestration workflow → ad orchestrator content flow", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "integration-1");

  // 1. Create orchestration workflow
  const { workflowId } = await t.mutation(api.orchestration.createWorkflow, {
    adminToken,
    name: "Ad Generation Pipeline",
    description: "Auto-generate and approve ads",
    steps: [
      { name: "generate", type: "ai_generate" },
      { name: "review", type: "human_review" },
      { name: "post", type: "social_post" },
    ],
    triggers: { type: "schedule", config: { frequency: "daily" } },
  });

  // 2. Start a workflow run
  const { runId } = await t.mutation(api.orchestration.startWorkflowRun, {
    adminToken,
    workflowId,
  });

  // 3. Create ad content
  const contentId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_generated_content", {
      headline: "AI Generated Ad",
      description: "Created by orchestration workflow",
      cta: "Get Started",
      hashtags: ["#AI", "#Automation"],
      targetAudience: "entrepreneurs",
      socialPosts: [],
      status: "pending",
      usedCount: 0,
      createdAt: Date.now(),
    });
  });

  // 4. Approve the content
  await t.mutation(api.adOrchestrator.approveContent, {
    contentId,
    autoPost: false,
    adminToken,
  });

  // 5. Complete the workflow run
  await t.mutation(api.orchestration.completeRun, {
    adminToken,
    runId,
    status: "completed",
    result: { contentId, action: "content_generated_and_approved" },
  });

  // 6. Verify end state
  const content: any = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("ready");

  const runs: any = await t.query(api.orchestration.getWorkflowRuns, { workflowId });
  const run = runs.find((r: any) => r.runId === runId);
  expect(run.status).toBe("completed");
  expect(run.result.contentId).toBe(contentId);
});

test("integration: hermes self-heal → model orchestrator health tracking", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "integration-2");

  // Start hermes
  await t.mutation(api.hermes_orchestrator.startOrchestrator, { adminToken });

  // Simulate provider degradation
  await t.mutation(internal.model_orchestrator.updateProviderHealthMutation, {
    providerName: "openrouter",
    status: "degraded",
    error: "Rate limited",
  });

  // Run self-heal
  const healResult: any = await t.mutation(api.hermes_orchestrator.runSelfHeal, { adminToken });
  expect(healResult.success).toBe(true);
  expect(healResult.results).toBeDefined();

  // Verify healing log created
  const logs: any = await t.query(api.hermes_orchestrator.getHealingLogs, { limit: 5 });
  expect(logs.length).toBeGreaterThanOrEqual(1);
  expect(logs[0].component).toBe("system");
  expect(logs[0].action).toBe("health_check");

  // Verify provider health still tracked
  const config: any = await t.run(async (ctx) => {
    return await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "provider_health_openrouter"))
      .first();
  });
  expect(config.value.status).toBe("degraded");
});

test("integration: hermes task delegation → smart workflow trigger", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t, "integration-3");

  // Delegate a task via hermes
  const { taskId } = await t.mutation(api.hermes_orchestrator.delegateTask, {
    task: "Process refund for user-456",
    priority: "critical",
    adminToken,
  });

  // Create a workflow
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "task-user@example.com",
      name: "Task User",
      role: "user",
    } as any);
  });

  const workflowId = await t.mutation(api.workflows.createWorkflow, {
    name: "Refund Handler",
    description: "Handles refund requests",
    trigger: { type: "new_lead", config: { taskType: "refund" } },
    actions: [
      { type: "notification", config: { title: "Refund Processed", message: "Refund initiated" }, order: 1 },
    ],
    isActive: true,
    createdBy: userId,
  });

  // Verify both exist
  const tasks: any = await t.query(api.hermes_orchestrator.getTasks, {});
  expect(tasks.some((t: any) => t._id === taskId)).toBe(true);

  const workflows: any = await t.query(api.workflows.getWorkflows, {});
  expect(workflows.some((w: any) => w._id === workflowId)).toBe(true);
});
