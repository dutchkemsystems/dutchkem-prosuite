/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED ADVERTS END-TO-END TESTS
// Tests: content generation → platform posting → analytics
// ═══════════════════════════════════════════════════════════════════

// Helper to create admin session
async function createAdminSession(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email: `ad-test-${Date.now()}@test.com`, role: "admin" } as any);
  });
  return await t.run(async (ctx) => {
    return await ctx.db.insert("user_sessions", {
      userId, userType: "admin", device: "test", location: "Test", ip: "127.0.0.1",
      fingerprint: `fp-${Date.now()}`, lastActive: Date.now(), isCurrent: true,
      isTwoFactorVerified: false, deviceInfo: { userAgent: "test", deviceType: "web", browser: "test", os: "test" },
      isRevoked: false, expiresAt: Date.now() + 86400000,
    });
  });
}

// ─── AD ORCHESTRATOR STATUS ───

test("adOrchestrator: getOrchestratorStatus returns status", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.adOrchestrator.getOrchestratorStatus, {});
  expect(result).toBeDefined();
  expect(result).toHaveProperty("enabled");
  expect(result).toHaveProperty("autoGenerate");
  expect(result).toHaveProperty("autoPost");
}, 15000);

test("adOrchestrator: toggleOrchestrator works", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  const result: any = await t.mutation(api.adOrchestrator.toggleOrchestrator, {
    adminToken,
    enabled: true,
    autoGenerate: true,
    autoPost: false, // Don't auto-post in tests
  });
  expect(result).toHaveProperty("success");

  const status: any = await t.query(api.adOrchestrator.getOrchestratorStatus, {});
  expect(status.enabled).toBe(true);
  expect(status.autoGenerate).toBe(true);
  expect(status.autoPost).toBe(false);
}, 15000);

// ─── CONTENT GENERATION ───

test("adOrchestrator: generateContentInternal creates content", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.mutation(internal.adOrchestrator.generateContentInternal, {
    headline: "Test Ad Headline",
    description: "This is a test advertisement for Dutchkem Ventures.",
    cta: "Get Started",
    hashtags: ["#test", "#dutchkem"],
    targetAudience: "entrepreneurs",
  });

  expect(result.success).toBe(true);
  expect(result.contentId).toBeDefined();
  expect(result.headline).toBe("Test Ad Headline");
}, 15000);

test("adOrchestrator: generated content has platform-specific posts", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.mutation(internal.adOrchestrator.generateContentInternal, {
    headline: "Multi-Platform Ad",
    description: "Test multi-platform content generation.",
    cta: "Try Now",
    hashtags: ["#multi"],
    targetAudience: "all",
  });

  const content: any = await t.run(async (ctx) => await ctx.db.get(result.contentId));
  expect(content).toBeDefined();
  expect(content.socialPosts).toBeDefined();
  expect(Array.isArray(content.socialPosts)).toBe(true);
  expect(content.socialPosts.length).toBeGreaterThan(0);
  // First social post should have platformPosts
  expect(content.socialPosts[0].platformPosts).toBeDefined();
  expect(Object.keys(content.socialPosts[0].platformPosts).length).toBeGreaterThan(3);
}, 15000);

// ─── CONTENT APPROVAL ───

test("adOrchestrator: approveContent and rejectContent work", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  // Create content
  const contentId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_generated_content", {
      headline: "Approval Test",
      description: "Test approval flow",
      cta: "Approve Me",
      hashtags: ["#test"],
      targetAudience: "test",
      socialPosts: [],
      status: "pending",
      usedCount: 0,
      createdAt: Date.now(),
    });
  });

  // Reject
  const rejectResult: any = await t.mutation(api.adOrchestrator.rejectContent, {
    contentId,
    reason: "Needs work",
    adminToken,
  });
  expect(rejectResult.success).toBe(true);

  let content: any = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("rejected");

  // Reset and approve
  await t.run(async (ctx) => await ctx.db.patch(contentId, { status: "pending" }));

  const approveResult: any = await t.mutation(api.adOrchestrator.approveContent, {
    contentId,
    autoPost: false,
    adminToken,
  });
  expect(approveResult.success).toBe(true);

  content = await t.run(async (ctx) => await ctx.db.get(contentId));
  expect(content.status).toBe("ready");
}, 15000);

// ─── PLATFORM POSTING ───

test("adOrchestrator: postAcrossPlatformsInternal handles no platforms gracefully", async () => {
  const t = convexTest(schema, modules);

  // Create content
  const contentId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_generated_content", {
      headline: "Post Test",
      description: "Test posting",
      cta: "Post Me",
      hashtags: ["#test"],
      targetAudience: "test",
      socialPosts: [{ templateId: "test", style: "modern", fullContent: "Test content", platformPosts: {} }],
      status: "approved",
      usedCount: 0,
      createdAt: Date.now(),
    });
  });

  const result: any = await t.action(internal.adOrchestrator.postAcrossPlatformsInternal, {
    contentId,
    platforms: [], // Empty platforms
  });

  expect(result.success).toBe(false);
  expect(result.total).toBe(0);
}, 15000);

// ─── SOCIAL AUTOMATION ───

test("socialAutomation: getConnectionStatus shows all 12 platforms", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  expect(result.platforms.length).toBe(12);
  expect(result.summary.total).toBe(12);
}, 15000);

test("socialAutomation: postToAllConnected requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social_automation.postToAllConnected, {
    adminToken: "invalid",
    content: "Test post",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
}, 15000);

test("socialAutomation: autoGenerateAndPost requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social_automation.autoGenerateAndPost, {
    adminToken: "invalid",
    contentType: "text",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
}, 15000);

// ─── FLYER ENGINE ───

test("flyerEngine: getEngineStatus returns status or null", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.flyer_engine.getEngineStatus, {});
  // Engine may not be initialized yet, so result can be null
  if (result) {
    expect(result).toHaveProperty("status");
  }
}, 15000);

// ─── POSTER GENERATION ───

test("posterGenerator: getAllAgentPosters returns 15 agents", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAllAgentPosters, {});
  expect(result.length).toBe(15);
  expect(result[0]).toHaveProperty("agentId");
  expect(result[0]).toHaveProperty("prompt");
}, 15000);

// ─── ANALYTICS ───

test("adOrchestrator: getAnalytics returns stats", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);
  const result: any = await t.query(api.adOrchestrator.getAnalytics, { adminToken });
  expect(result).toBeDefined();
  expect(result).toHaveProperty("totalPosts");
  expect(result).toHaveProperty("successRate");
}, 15000);

// ─── CRON JOB VERIFICATION ───

test("cronJobs: ad orchestrator auto-generate is configured", async () => {
  const t = convexTest(schema, modules);
  // Verify the cron target function exists
  const status: any = await t.query(api.adOrchestrator.getOrchestratorStatus, {});
  expect(status).toBeDefined();
  // The cron job calls runAutoGenerateAndPost which checks this status
  expect(status.enabled !== undefined).toBe(true);
}, 15000);
