// support_e2e.test.ts
// End-to-end tests for the full support flow
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Support E2E Flow", () => {
  test("full flow: log interaction → query it back → check analytics", async () => {
    const t = convexTest(schema, modules);

    // Step 1: Log an interaction
    await t.mutation(api.support_orchestrator.logInteraction, {
      userId: "e2e-user-1",
      message: "How do I create a budget plan?",
      response: "I'd love to help you create a budget plan! Here are the steps...",
      agentId: "A7",
      agentName: "Finance Pro",
      confidence: "high",
      routed: true,
      sentiment: "positive",
      responseTimeMs: 1500,
    });

    // Step 2: Query it back via getRecentInteractions
    const recent: any[] = await t.query(api.support_orchestrator.getRecentInteractions, { limit: 10 });
    expect(recent.length).toBeGreaterThanOrEqual(1);
    const found = recent.find((i: any) => i.userId === "e2e-user-1");
    expect(found).toBeDefined();
    expect(found.message).toBe("How do I create a budget plan?");
    expect(found.agentId).toBe("A7");
    expect(found.confidence).toBe("high");
    expect(found.routed).toBe(true);

    // Step 3: Check analytics reflect it
    const analytics: any = await t.query(api.support_orchestrator.getSupportAnalytics, { days: 1 });
    expect(analytics.totalInteractions).toBeGreaterThanOrEqual(1);
    expect(analytics.routedCount).toBeGreaterThanOrEqual(1);
    expect(analytics.agentCounts["A7"]).toBeGreaterThanOrEqual(1);
    expect(analytics.confidenceCounts.high).toBeGreaterThanOrEqual(1);
  });

  test("full flow: escalate → resolve → check status", async () => {
    const t = convexTest(schema, modules);

    // Step 1: Log an interaction
    const interactionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("support_interactions", {
        userId: "e2e-esc-user",
        message: "I have a billing dispute",
        response: "Let me escalate this for you.",
        agentId: "A7",
        agentName: "Finance Pro",
        confidence: "low",
        routed: true,
        createdAt: Date.now(),
      });
    });

    // Step 2: Escalate it
    await t.mutation(api.support_orchestrator.escalateInteraction, {
      userId: "e2e-esc-user",
      interactionId,
      agentId: "A7",
      reason: "Complex billing dispute needs human review",
    });

    // Step 3: Check it appears in pending escalations
    const pending: any[] = await t.query(api.support_orchestrator.getPendingEscalations, {});
    const escalation = pending.find((e: any) => e.userId === "e2e-esc-user");
    expect(escalation).toBeDefined();
    expect(escalation.status).toBe("pending");
    expect(escalation.reason).toBe("Complex billing dispute needs human review");

    // Step 4: Resolve it
    await t.mutation(api.support_orchestrator.resolveEscalation, {
      escalationId: escalation._id,
      resolution: "Refunded ₦5,000 to customer account",
    });

    // Step 5: Verify it's no longer pending
    const pendingAfter: any[] = await t.query(api.support_orchestrator.getPendingEscalations, {});
    const stillPending = pendingAfter.find((e: any) => e._id === escalation._id);
    expect(stillPending).toBeUndefined();
  });

  test("full flow: all 15 agents have configs, services, bundles, subscriptions", async () => {
    const t = convexTest(schema, modules);
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];

    for (const id of agentIds) {
      const info: any = await t.query(api.customer_support.getAgentSupportInfo, { agentId: id });
      expect(info.agentId).toBe(id);
      expect(info.name).toBeDefined();
      expect(info.services).toBeDefined();
      expect(info.services.length).toBeGreaterThan(10);
      expect(info.bundles).toBeDefined();
      expect(info.subscriptions).toBeDefined();
      expect(info.subscriptions.length).toBeGreaterThan(10);
    }
  });

  test("full flow: orchestrator status returns all 15 agents", async () => {
    const t = convexTest(schema, modules);
    const status: any = await t.query(api.support_orchestrator.getOrchestratorStatus, {});
    expect(status.success).toBe(true);
    expect(status.isAvailable).toBe(true);
    expect(status.agentCount).toBe(15);
    expect(status.agents).toHaveLength(15);
    expect(status.primaryModel).toBeDefined();
    expect(status.fallbackModel).toBeDefined();
    expect(status.emergencyModel).toBeDefined();
    expect(status.features.length).toBeGreaterThanOrEqual(6);
  });

  test("full flow: multiple interactions from different users", async () => {
    const t = convexTest(schema, modules);

    // Log 3 interactions from different users/agents
    await t.mutation(api.support_orchestrator.logInteraction, {
      userId: "user-a", message: "Help with thesis", response: "Sure!",
      agentId: "A1", agentName: "Academic Pro", confidence: "high", routed: true,
    });
    await t.mutation(api.support_orchestrator.logInteraction, {
      userId: "user-b", message: "Business plan help", response: "Let me assist!",
      agentId: "A2", agentName: "Business Pro", confidence: "medium", routed: true,
    });
    await t.mutation(api.support_orchestrator.logInteraction, {
      userId: "user-c", message: "General question", response: "Here you go!",
      agentId: "GENERAL", agentName: "General Support", confidence: "low", routed: false,
    });

    // Verify analytics
    const analytics: any = await t.query(api.support_orchestrator.getSupportAnalytics, { days: 1 });
    expect(analytics.totalInteractions).toBeGreaterThanOrEqual(3);
    expect(analytics.agentCounts["A1"]).toBeGreaterThanOrEqual(1);
    expect(analytics.agentCounts["A2"]).toBeGreaterThanOrEqual(1);
    expect(analytics.routedCount).toBeGreaterThanOrEqual(2);
    expect(analytics.unroutedCount).toBeGreaterThanOrEqual(1);
  });
});
