// customer_support.test.ts
// Tests for customer support agent configs and support info
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Customer Support", () => {
  describe("getAgentConfigs", () => {
    test("returns all 15 agent configurations", async () => {
      const t = convexTest(schema, modules);
      const configs: any[] = await t.query(api.customer_support.getAgentConfigs, {});
      expect(configs).toHaveLength(15);
    });

    test("each agent has required fields", async () => {
      const t = convexTest(schema, modules);
      const configs: any[] = await t.query(api.customer_support.getAgentConfigs, {});
      for (const config of configs) {
        expect(config.id).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.field).toBeDefined();
        expect(config.specialty).toBeDefined();
        expect(config.model).toBeDefined();
      }
    });

    test("returns known agent A1 (Academic Pro)", async () => {
      const t = convexTest(schema, modules);
      const configs: any[] = await t.query(api.customer_support.getAgentConfigs, {});
      const a1 = configs.find((c) => c.id === "A1");
      expect(a1).toBeDefined();
      expect(a1.name).toBe("Academic Pro");
      expect(a1.field).toBe("Academics");
    });

    test("returns known agent A15 (Event Planner)", async () => {
      const t = convexTest(schema, modules);
      const configs: any[] = await t.query(api.customer_support.getAgentConfigs, {});
      const a15 = configs.find((c) => c.id === "A15");
      expect(a15).toBeDefined();
      expect(a15.name).toBe("Event Planner");
      expect(a15.field).toBe("Events");
    });
  });

  describe("getAgentSupportInfo", () => {
    test("returns full support info for a valid agent", async () => {
      const t = convexTest(schema, modules);
      const info: any = await t.query(api.customer_support.getAgentSupportInfo, { agentId: "A1" });
      expect(info.agentId).toBe("A1");
      expect(info.name).toBe("Academic Pro");
      expect(info.services).toContain("Thesis");
      expect(info.bundles).toBeDefined();
      expect(info.subscriptions).toBeDefined();
    });

    test("returns error for unknown agent", async () => {
      const t = convexTest(schema, modules);
      const info: any = await t.query(api.customer_support.getAgentSupportInfo, { agentId: "UNKNOWN" });
      expect(info.error).toBe("Agent not found");
    });

    test("returns services with pricing for A7 (Finance Pro)", async () => {
      const t = convexTest(schema, modules);
      const info: any = await t.query(api.customer_support.getAgentSupportInfo, { agentId: "A7" });
      expect(info.name).toBe("Finance Pro");
      expect(info.services).toContain("Budget");
      expect(info.services).toContain("₦");
    });
  });
});
