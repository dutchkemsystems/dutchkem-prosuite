/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Pollinations.ai is a free external image service — gate live generation
// calls so the default `npm test` is deterministic.
const RUN_IMAGE_TESTS = process.env.RUN_IMAGE_TESTS === "true";

test("poster_generator: getAllAgentPosters returns 15 agents with prompts", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAllAgentPosters, {});
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(15);
  for (const agent of result) {
    expect(agent).toHaveProperty("agentId");
    expect(agent).toHaveProperty("agentName");
    expect(agent).toHaveProperty("prompt");
    expect(agent).toHaveProperty("color");
    expect(agent.prompt.length).toBeGreaterThan(10);
  }
});

test("poster_generator: getAgentPoster returns single agent", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAgentPoster, { agentId: "A1" });
  expect(result).toBeDefined();
  expect(result.agentName).toBe("Academic Pro");
  expect(result.prompt).toContain("academic");
});

test("poster_generator: getAgentPoster returns null for unknown agent", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAgentPoster, { agentId: "A99" });
  expect(result).toBeNull();
});

test("poster_generator: generatePosterImageAction requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken: "invalid",
    agentId: "A1",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
});

test("poster_generator: generatePosterImageAction returns invalid agent error", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createTestAdminSession(t);
  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken,
    agentId: "A99",
  });
  expect(result.error).toBe("Agent not found");
});

test.skipIf(!RUN_IMAGE_TESTS)("poster_generator: generatePosterImageAction generates image via Pollinations.ai", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createTestAdminSession(t);

  // Pollinations.ai can be slow, give it 30 seconds
  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken,
    agentId: "A1",
    platform: "instagram",
  }, { timeout: 30000 });

  // Should succeed with Pollinations.ai (free, no key needed)
  expect(result.success).toBe(true);
  expect(result.imageUrl).toBeDefined();
  expect(result.imageUrl.length).toBeGreaterThan(10);
  expect(result.dimensions).toBe("1080x1080");
}, 35000);

// Note: We only test one generation call to avoid Pollinations.ai rate limiting

// Helper: create admin session
async function createTestAdminSession(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: `poster-test-${Date.now()}@dutchkem.com`,
      name: "Poster Test Admin",
      role: "admin",
    } as any);
  });
  const sessionId = await t.run(async (ctx) => {
    return await ctx.db.insert("user_sessions", {
      userId,
      userType: "admin",
      device: "test",
      location: "Test",
      ip: "127.0.0.1",
      fingerprint: `poster-fp-${Date.now()}`,
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
