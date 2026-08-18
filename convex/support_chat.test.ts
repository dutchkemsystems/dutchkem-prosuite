/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// SUPPORT CHAT END-TO-END TESTS
// Tests the full chat flow: processMessage → intent classification → response
// ═══════════════════════════════════════════════════════════════════

test("support: processMessage returns response for pricing question", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.support_orchestrator.processMessage, {
    message: "How much does the pro plan cost?",
    userId: "test-user-1",
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();
  expect(result.response.length).toBeGreaterThan(10);
  expect(result.agentId).toBeDefined();
  expect(result.responseTimeMs).toBeGreaterThan(0);
}, 30000);

test("support: processMessage returns response for feature question", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.support_orchestrator.processMessage, {
    message: "What features does the platform offer?",
    userId: "test-user-2",
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();
  expect(result.response.length).toBeGreaterThan(10);
}, 30000);

test("support: processMessage returns response for greeting", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.support_orchestrator.processMessage, {
    message: "Hello, I need help",
    userId: "test-user-3",
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();
  expect(result.response.length).toBeGreaterThan(10);
}, 30000);

test("support: processMessage handles anonymous user", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.support_orchestrator.processMessage, {
    message: "Hi there",
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();
}, 30000);

test("support: processMessage with conversation history", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.support_orchestrator.processMessage, {
    message: "Tell me more about that",
    userId: "test-user-4",
    conversationHistory: [
      { role: "user", content: "I'm interested in your services" },
      { role: "assistant", content: "Great! We offer 15 AI agents..." },
    ],
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.response).toBeDefined();
}, 30000);

test("support: getOrchestratorStatus returns status", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.support_orchestrator.getOrchestratorStatus, {});

  expect(result).toBeDefined();
  expect(result).toHaveProperty("isAvailable");
  expect(result).toHaveProperty("agentCount");
}, 15000);

test("support: getAgentStates returns all agents", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.support_orchestrator.getAgentStates, {});

  expect(result).toBeDefined();
  expect(typeof result).toBe("object");
  // Should have entries for A1-A15
  expect(Object.keys(result).length).toBeGreaterThanOrEqual(15);
}, 15000);

test("support: logInteraction works", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.support_orchestrator.logInteraction, {
    userId: "test-user-log",
    message: "Test message",
    response: "Test response",
    agentId: "A1",
    agentName: "Academic Pro",
    confidence: "high",
    routed: true,
  });

  // Verify it was logged
  const logs: any = await t.query(api.support_orchestrator.getRecentInteractions, { limit: 5 });
  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0].message).toBe("Test message");
}, 15000);

test("support: getSupportAnalytics returns stats", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.support_orchestrator.getSupportAnalytics, { days: 7 });

  expect(result).toBeDefined();
  expect(result).toHaveProperty("totalInteractions");
}, 15000);

test("support: getBusinessHoursStatus returns status", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.support_orchestrator.getBusinessHoursStatus, {});

  expect(result).toBeDefined();
  expect(result).toHaveProperty("hours");
  expect(result).toHaveProperty("timezone");
}, 15000);
