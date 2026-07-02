// agent_routing.test.ts
// Tests for cross-agent routing in the chat factory
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Cross-Agent Routing", () => {
  test("finance agent suggests academic pro for thesis request", async () => {
    const t = convexTest(schema, modules);
    const response: string = await t.action(
      api.finance_chat.generateSimpleResponse,
      { prompt: "I need help writing my thesis on financial markets" }
    );
    // Should mention Academic Pro or thesis expert
    const lower = response.toLowerCase();
    expect(
      lower.includes("academic") ||
      lower.includes("thesis") ||
      lower.includes("research") ||
      lower.includes("a1")
    ).toBe(true);
  });

  test("academic agent suggests finance pro for budget question", async () => {
    const t = convexTest(schema, modules);
    const response: string = await t.action(
      api.academic_chat.generateSimpleResponse,
      { prompt: "How do I create a personal budget plan?" }
    );
    const lower = response.toLowerCase();
    expect(
      lower.includes("finance") ||
      lower.includes("budget") ||
      lower.includes("a7")
    ).toBe(true);
  });

  test("agent handles own domain correctly", async () => {
    const t = convexTest(schema, modules);
    const response: string = await t.action(
      api.finance_chat.generateSimpleResponse,
      { prompt: "Help me create a budget for my small business" }
    );
    expect(response.length).toBeGreaterThan(50);
  });

  test("all 15 agent chat modules exist", async () => {
    const agentKeys = [
      "academic_chat", "business_chat", "content_chat", "career_chat",
      "shopping_chat", "exam_career_chat", "finance_chat", "video_chat",
      "wellness_chat", "home_chat", "language_chat", "travel_chat",
      "certification_chat", "translation_chat", "event_chat"
    ];
    // Verify each module has the required exports
    for (const key of agentKeys) {
      const mod = (api as any)[key];
      expect(mod).toBeDefined();
      expect(mod.createThread).toBeDefined();
      expect(mod.sendMessage).toBeDefined();
      expect(mod.listMessages).toBeDefined();
      expect(mod.generateSimpleResponse).toBeDefined();
    }
  });
});
