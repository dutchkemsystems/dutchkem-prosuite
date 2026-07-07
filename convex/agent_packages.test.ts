// agent_packages.test.ts
// Tests for agent packages module
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Agent Packages", () => {
  test("returns packages for known agent", async () => {
    const t = convexTest(schema, modules);
    const packages: any[] = await t.query(api.agent_packages.getAgentPackages, { agentId: "A2" });
    expect(packages.length).toBeGreaterThan(0);
    expect(packages[0]).toHaveProperty("id");
    expect(packages[0]).toHaveProperty("price");
    expect(packages[0]).toHaveProperty("name");
    expect(packages[0]).toHaveProperty("description");
    expect(packages[0]).toHaveProperty("deliverable");
  });

  test("returns empty for unknown agent", async () => {
    const t = convexTest(schema, modules);
    const packages: any[] = await t.query(api.agent_packages.getAgentPackages, { agentId: "A99" });
    expect(packages).toEqual([]);
  });

  test("returns all packages for all 15 agents", async () => {
    const t = convexTest(schema, modules);
    const all: Record<string, any[]> = await t.query(api.agent_packages.getAllPackages, {});
    expect(Object.keys(all).length).toBe(15);
    expect(all["A1"]).toBeDefined();
    expect(all["A15"]).toBeDefined();
  });

  test("each agent has 2-3 packages", async () => {
    const t = convexTest(schema, modules);
    const all: Record<string, any[]> = await t.query(api.agent_packages.getAllPackages, {});
    for (const [agentId, packages] of Object.entries(all)) {
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeGreaterThanOrEqual(2);
      expect(packages.length).toBeLessThanOrEqual(3);
    }
  });

  test("each package has required fields", async () => {
    const t = convexTest(schema, modules);
    const all: Record<string, any[]> = await t.query(api.agent_packages.getAllPackages, {});
    for (const [agentId, packages] of Object.entries(all)) {
      for (const pkg of packages) {
        expect(pkg.id).toBeDefined();
        expect(pkg.name).toBeDefined();
        expect(pkg.description).toBeDefined();
        expect(pkg.price).toBeGreaterThan(0);
        expect(pkg.deliverable).toBeDefined();
      }
    }
  });
});
