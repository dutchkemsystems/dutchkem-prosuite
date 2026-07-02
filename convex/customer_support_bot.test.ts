// customer_support_bot.test.ts
// Tests for customer support chatbot FAQ and stats
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Customer Support Bot", () => {
  describe("getSupportFAQ", () => {
    test("returns FAQ entries", async () => {
      const t = convexTest(schema, modules);
      const faq: any[] = await t.query(api.customer_support_bot.getSupportFAQ, {});
      expect(faq.length).toBeGreaterThanOrEqual(6);
    });

    test("each FAQ has question and answer", async () => {
      const t = convexTest(schema, modules);
      const faq: any[] = await t.query(api.customer_support_bot.getSupportFAQ, {});
      for (const entry of faq) {
        expect(entry.question).toBeDefined();
        expect(entry.answer).toBeDefined();
        expect(typeof entry.question).toBe("string");
        expect(typeof entry.answer).toBe("string");
      }
    });

    test("includes pricing FAQ", async () => {
      const t = convexTest(schema, modules);
      const faq: any[] = await t.query(api.customer_support_bot.getSupportFAQ, {});
      const pricing = faq.find((e) => e.question.toLowerCase() === "pricing");
      expect(pricing).toBeDefined();
      expect(pricing.answer).toContain("₦5,000");
    });

    test("includes features FAQ", async () => {
      const t = convexTest(schema, modules);
      const faq: any[] = await t.query(api.customer_support_bot.getSupportFAQ, {});
      const features = faq.find((e) => e.question.toLowerCase() === "features");
      expect(features).toBeDefined();
      expect(features.answer).toContain("Academic Pro");
      expect(features.answer).toContain("Event Planner");
    });
  });

  describe("getSupportStats", () => {
    test("returns support stats with required fields", async () => {
      const t = convexTest(schema, modules);
      const stats: any = await t.query(api.customer_support_bot.getSupportStats, {});
      expect(stats.totalConversations).toBeDefined();
      expect(stats.avgResponseTime).toBeDefined();
      expect(stats.satisfactionRate).toBeDefined();
      expect(stats.available247).toBe(true);
    });
  });
});
