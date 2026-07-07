// support_orchestrator.test.ts
// Tests for support orchestrator queries and mutations
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Support Orchestrator", () => {
  describe("getOrchestratorStatus", () => {
    test("returns static status with all 15 agents", async () => {
      const t = convexTest(schema, modules);
      const status: any = await t.query(api.support_orchestrator.getOrchestratorStatus, {});
      expect(status).toBeDefined();
      expect(status.success).toBe(true);
      expect(status.isAvailable).toBe(true);
      expect(status.agentCount).toBe(15);
      expect(status.agents).toHaveLength(15);
      expect(status.agents[0]).toEqual({ id: "A1", name: "Academic Pro", icon: "\u{1F393}" });
      expect(status.agents[14]).toEqual({ id: "A15", name: "Event Planner", icon: "\u{1F389}" });
    });

    test("returns model configuration", async () => {
      const t = convexTest(schema, modules);
      const status: any = await t.query(api.support_orchestrator.getOrchestratorStatus, {});
      expect(status.primaryModel).toBe("meta/llama-3.1-8b-instruct");
      expect(status.fallbackModel).toBe("meta/llama-3-8b-instruct");
      expect(status.emergencyModel).toBe("general");
    });

    test("returns feature list", async () => {
      const t = convexTest(schema, modules);
      const status: any = await t.query(api.support_orchestrator.getOrchestratorStatus, {});
      expect(status.features).toContain("Agent routing (A1-A15)");
      expect(status.features).toContain("3-model fallback chain");
      expect(status.features.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("logInteraction", () => {
    test("inserts interaction record", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(api.support_orchestrator.logInteraction, {
        userId: "user-test-1",
        message: "How do I reset my password?",
        response: "Go to Settings > Security.",
        agentId: "A1",
        agentName: "Academic Pro",
        confidence: "high",
        routed: true,
      });

      const interactions = await t.run(async (ctx: any) => {
        return await ctx.db.query("support_interactions").collect();
      });
      expect(interactions).toHaveLength(1);
      expect(interactions[0].userId).toBe("user-test-1");
      expect(interactions[0].agentId).toBe("A1");
      expect(interactions[0].confidence).toBe("high");
      expect(interactions[0].routed).toBe(true);
    });

    test("inserts interaction with optional fields", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(api.support_orchestrator.logInteraction, {
        userId: "user-test-2",
        message: "Tell me about pricing",
        response: "Our plans start at ₦5,000/month.",
        agentId: "A7",
        agentName: "Finance Pro",
        confidence: "medium",
        routed: false,
        sentiment: "positive",
        responseTimeMs: 1200,
      });

      const interactions = await t.run(async (ctx: any) => {
        return await ctx.db.query("support_interactions").collect();
      });
      expect(interactions).toHaveLength(1);
      expect(interactions[0].sentiment).toBe("positive");
      expect(interactions[0].responseTimeMs).toBe(1200);
    });
  });

  describe("escalateInteraction", () => {
    test("creates escalation linked to interaction", async () => {
      const t = convexTest(schema, modules);

      const interactionId = await t.run(async (ctx: any) => {
        return await ctx.db.insert("support_interactions", {
          userId: "user-esc-1",
          message: "I need help with billing",
          response: "Let me escalate this.",
          agentId: "A7",
          agentName: "Finance Pro",
          confidence: "low",
          routed: true,
          createdAt: Date.now(),
        });
      });

      await t.mutation(api.support_orchestrator.escalateInteraction, {
        userId: "user-esc-1",
        interactionId,
        agentId: "A7",
        reason: "Complex billing dispute",
      });

      const escalations = await t.run(async (ctx: any) => {
        return await ctx.db.query("support_escalations").collect();
      });
      expect(escalations).toHaveLength(1);
      expect(escalations[0].userId).toBe("user-esc-1");
      expect(escalations[0].interactionId).toBe(interactionId);
      expect(escalations[0].status).toBe("pending");
    });
  });

  describe("getRecentInteractions", () => {
    test("returns interactions ordered by creation time", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx: any) => {
        await ctx.db.insert("support_interactions", {
          userId: "u1", message: "msg1", response: "resp1",
          agentId: "A1", agentName: "Academic", confidence: "high",
          routed: true, createdAt: 1000,
        });
        await ctx.db.insert("support_interactions", {
          userId: "u2", message: "msg2", response: "resp2",
          agentId: "A2", agentName: "Business", confidence: "medium",
          routed: false, createdAt: 2000,
        });
        await ctx.db.insert("support_interactions", {
          userId: "u3", message: "msg3", response: "resp3",
          agentId: "A3", agentName: "Content", confidence: "low",
          routed: true, createdAt: 3000,
        });
      });

      const recent: any[] = await t.query(api.support_orchestrator.getRecentInteractions, { limit: 2 });
      expect(recent).toHaveLength(2);
      expect(recent[0].createdAt).toBe(3000);
      expect(recent[1].createdAt).toBe(2000);
    });

    test("returns empty array when no interactions exist", async () => {
      const t = convexTest(schema, modules);
      const recent: any[] = await t.query(api.support_orchestrator.getRecentInteractions, {});
      expect(recent).toHaveLength(0);
    });
  });

  describe("getPendingEscalations", () => {
    test("returns only pending escalations", async () => {
      const t = convexTest(schema, modules);

      const interactionId = await t.run(async (ctx: any) => {
        return await ctx.db.insert("support_interactions", {
          userId: "u1", message: "m", response: "r",
          agentId: "A1", agentName: "A", confidence: "high",
          routed: true, createdAt: Date.now(),
        });
      });

      await t.run(async (ctx: any) => {
        await ctx.db.insert("support_escalations", {
          userId: "u1", interactionId, agentId: "A1",
          reason: "needs human", status: "pending", createdAt: 1000,
        });
        await ctx.db.insert("support_escalations", {
          userId: "u2", interactionId, agentId: "A2",
          reason: "resolved issue", status: "resolved", createdAt: 2000,
        });
        await ctx.db.insert("support_escalations", {
          userId: "u3", interactionId, agentId: "A3",
          reason: "in progress", status: "in_progress", createdAt: 3000,
        });
      });

      const pending: any[] = await t.query(api.support_orchestrator.getPendingEscalations, {});
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe("pending");
      expect(pending[0].reason).toBe("needs human");
    });

    test("returns empty array when no pending escalations", async () => {
      const t = convexTest(schema, modules);
      const pending: any[] = await t.query(api.support_orchestrator.getPendingEscalations, {});
      expect(pending).toHaveLength(0);
    });
  });

  describe("getSupportAnalytics", () => {
    test("returns empty analytics when no data", async () => {
      const t = convexTest(schema, modules);
      const analytics: any = await t.query(api.support_orchestrator.getSupportAnalytics, {});
      expect(analytics.totalInteractions).toBe(0);
      expect(analytics.totalEscalations).toBe(0);
      expect(analytics.pendingEscalations).toBe(0);
      expect(analytics.avgResponseMs).toBe(0);
    });

    test("counts interactions and escalations correctly", async () => {
      const t = convexTest(schema, modules);
      const now = Date.now();

      await t.run(async (ctx: any) => {
        const id = await ctx.db.insert("support_interactions", {
          userId: "u1", message: "m1", response: "r1",
          agentId: "A1", agentName: "Academic", confidence: "high",
          routed: true, responseTimeMs: 500, createdAt: now,
        });
        await ctx.db.insert("support_interactions", {
          userId: "u2", message: "m2", response: "r2",
          agentId: "A7", agentName: "Finance", confidence: "low",
          routed: false, responseTimeMs: 1500, createdAt: now,
        });
        await ctx.db.insert("support_escalations", {
          userId: "u1", interactionId: id, agentId: "A1",
          reason: "complex", status: "pending", createdAt: now,
        });
      });

      const analytics: any = await t.query(api.support_orchestrator.getSupportAnalytics, { days: 1 });
      expect(analytics.totalInteractions).toBe(2);
      expect(analytics.totalEscalations).toBe(1);
      expect(analytics.pendingEscalations).toBe(1);
      expect(analytics.avgResponseMs).toBe(1000);
      expect(analytics.routedCount).toBe(1);
      expect(analytics.unroutedCount).toBe(1);
      expect(analytics.agentCounts.A1).toBe(1);
      expect(analytics.agentCounts.A7).toBe(1);
      expect(analytics.confidenceCounts.high).toBe(1);
      expect(analytics.confidenceCounts.low).toBe(1);
    });

    test("daily breakdown has correct number of days", async () => {
      const t = convexTest(schema, modules);
      const analytics: any = await t.query(api.support_orchestrator.getSupportAnalytics, { days: 7 });
      expect(analytics.dailyBreakdown).toHaveLength(7);
      expect(analytics.dailyBreakdown[0].date).toBeDefined();
      expect(analytics.dailyBreakdown[0].interactions).toBe(0);
    });
  });
});
