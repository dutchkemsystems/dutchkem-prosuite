/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// FLYER & POSTER CREATION END-TO-END TESTS
// Tests: engine init → generation → posting → analytics
// ═══════════════════════════════════════════════════════════════════

// Pollinations.ai is a free external image service — gate live generation
// calls so the default `npm test` is deterministic.
const RUN_IMAGE_TESTS = process.env.RUN_IMAGE_TESTS === "true";

// Helper to create admin session
async function createAdminSession(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email: `flyer-test-${Date.now()}@test.com`, role: "admin" } as any);
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

// ─── FLYER ENGINE ───

test("flyerEngine: initEngine creates engine record", async () => {
  const t = convexTest(schema, modules);
  const engineId = await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });
  expect(engineId).toBeDefined();

  const engine: any = await t.run(async (ctx) => await ctx.db.get(engineId));
  expect(engine).toBeDefined();
  expect(engine.status).toBe("stopped");
  expect(engine.postingIntervalHours).toBe(4);
  expect(engine.platforms).toBeDefined();
}, 15000);

test("flyerEngine: startEngine and stopEngine toggle status", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });
  await t.mutation(api.flyer_engine.startEngine, {});

  let engine: any = await t.run(async (ctx) => await ctx.db.query("flyer_auto_posting_engine").first());
  expect(engine.status).toBe("running");

  await t.mutation(api.flyer_engine.stopEngine, {});
  engine = await t.run(async (ctx) => await ctx.db.query("flyer_auto_posting_engine").first());
  expect(engine.status).toBe("stopped");
}, 15000);

test("flyerEngine: togglePlatform enables/disables platforms", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  await t.mutation(api.flyer_engine.togglePlatform, { platform: "linkedin", enabled: false });

  const engine: any = await t.run(async (ctx) => await ctx.db.query("flyer_auto_posting_engine").first());
  expect(engine.platforms.linkedin.enabled).toBe(false);
  expect(engine.platforms.facebook.enabled).toBe(true);
}, 15000);

test("flyerEngine: getEngineStatus returns status", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  const result: any = await t.query(api.flyer_engine.getEngineStatus, {});
  expect(result).toBeDefined();
  expect(result.status).toBeDefined();
  expect(result.platforms).toBeDefined();
}, 15000);

// ─── FLYER GENERATION (SVG-only, no API key needed) ───

test("flyerTemplates: generateFlyerSvgOnly produces SVG data URL", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.flyer_templates.generateFlyerSvgOnly, {
    headline: "Test Flyer",
    subheadline: "SVG Only Mode",
    cta: "Get Started",
    platform: "instagram",
  });

  expect(result).toBeDefined();
  expect(result).toContain("data:image/svg+xml;base64,");
  expect(result.length).toBeGreaterThan(100);
}, 30000);

test("flyerTemplates: generateFlyerSvgOnly with different platforms", async () => {
  const t = convexTest(schema, modules);

  for (const platform of ["linkedin", "facebook", "instagram", "twitter"]) {
    const result: any = await t.action(api.flyer_templates.generateFlyerSvgOnly, {
      headline: `Platform: ${platform}`,
      cta: "Learn More",
      platform,
    });
    expect(result).toContain("data:image/svg+xml;base64,");
  }
}, 60000);

test("flyerEngine: generateFlyerInternal with svg_only mode", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  const result: any = await t.action(internal.flyer_engine.generateFlyerInternal, {
    platform: "instagram",
    forceMode: "svg_only",
  });

  expect(result).toBeDefined();
  expect(result.flyerId).toBeDefined();
  expect(result.mode).toBe("svg_only");
  expect(result.headline).toBeDefined();
  expect(result.cta).toBeDefined();
}, 30000);

test("flyerEngine: generateFlyerInternal saves to database", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  const result: any = await t.action(internal.flyer_engine.generateFlyerInternal, {
    platform: "facebook",
    forceMode: "svg_only",
  });

  const flyer: any = await t.run(async (ctx) => await ctx.db.get(result.flyerId));
  expect(flyer).toBeDefined();
  expect(flyer.headline).toBeDefined();
  expect(flyer.imageUrl).toContain("data:image");
  expect(flyer.platform).toBe("facebook");
  expect(flyer.status).toBe("generated");
}, 30000);

// ─── POSTER GENERATION ───

test("posterGenerator: getAllAgentPosters returns 15 agents with prompts", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAllAgentPosters, {});

  expect(result.length).toBe(15);
  expect(result[0]).toHaveProperty("agentId");
  expect(result[0]).toHaveProperty("agentName");
  expect(result[0]).toHaveProperty("prompt");
  expect(result[0]).toHaveProperty("color");
  expect(result[0]).toHaveProperty("icon");
}, 15000);

test("posterGenerator: getAgentPoster returns single agent", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAgentPoster, { agentId: "A1" });

  expect(result).toBeDefined();
  expect(result.agentName).toBe("Academic Pro");
  expect(result.prompt).toContain("academic");
  expect(result.color).toBe("#3b82f6");
}, 15000);

test("posterGenerator: getAgentPoster returns null for unknown agent", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.poster_generator.getAgentPoster, { agentId: "A99" });
  expect(result).toBeNull();
}, 15000);

test("posterGenerator: generatePosterImageAction requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken: "invalid",
    agentId: "A1",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
}, 15000);

test("posterGenerator: generatePosterImageAction returns error for unknown agent", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);
  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken,
    agentId: "A99",
  });
  expect(result.error).toBe("Agent not found");
}, 15000);

test.skipIf(!RUN_IMAGE_TESTS)("posterGenerator: generatePosterImageAction generates image via Pollinations.ai", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken,
    agentId: "A1",
    platform: "instagram",
  }, { timeout: 30000 });

  expect(result.success).toBe(true);
  expect(result.imageUrl).toBeDefined();
  expect(result.imageUrl.length).toBeGreaterThan(10);
  expect(result.dimensions).toBe("1080x1080");
  expect(result.provider).toContain("Pollinations");
}, 35000);

test.skipIf(!RUN_IMAGE_TESTS)("posterGenerator: generatePosterImageAction with different platforms", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken,
    agentId: "A2",
    platform: "linkedin",
  }, { timeout: 30000 });

  expect(result.success).toBe(true);
  expect(result.dimensions).toBe("1200x628");
}, 35000);

// ─── AD DESIGNER ───

test("adDesigner: createNewAdDesign generates design", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  const result: any = await t.action(api.ad_designer.createNewAdDesign, {
    adminToken,
    headline: "Test Design",
    subheadline: "Design System Test",
    body: "This is a test design for the ad designer.",
    cta: "Try Now",
    url: "https://dutchkem-prosuite-app.vercel.app",
    template: "social_media",
    style: "modern",
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.designId).toBeDefined();
  expect(result.dimensions).toBeDefined();
}, 30000);

// ─── CREATIVE PIPELINE ───

test("creativePipeline: getPipelineStatus returns status or auth error", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.creative_pipeline.getPipelineStatus, {});
  // Pipeline may require auth or not be initialized
  expect(result).toBeDefined();
}, 15000);

// ─── FLYER POSTING ───

test("flyerPosting: autoPostTick runs without error", async () => {
  const t = convexTest(schema, modules);
  // Initialize engine first
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  // The tick will skip if engine is stopped
  const result: any = await t.action(internal.flyer_posting.autoPostTick, {});
  expect(result).toBeDefined();
  expect(result).toHaveProperty("skipped");
}, 30000);

// ─── CROSS-MODULE INTEGRATION ───

test("integration: flyer engine → poster generator → ad designer flow", async () => {
  const t = convexTest(schema, modules);
  const adminToken = await createAdminSession(t);

  // 1. Init flyer engine
  await t.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });

  // 2. Generate a flyer
  const flyerResult: any = await t.action(internal.flyer_engine.generateFlyerInternal, {
    platform: "instagram",
    forceMode: "svg_only",
  });
  expect(flyerResult.flyerId).toBeDefined();

  // 3. Generate a poster (using Pollinations.ai - may be slow)
  let posterResult: any;
  try {
    posterResult = await t.action(api.poster_generator.generatePosterImageAction, {
      adminToken,
      agentId: "A3",
      platform: "instagram",
    }, { timeout: 45000 });
  } catch (e: any) {
    // If Pollinations.ai times out, skip poster generation
    posterResult = { success: false, error: "timeout" };
  }

  // 4. Create an ad design
  const designResult: any = await t.action(api.ad_designer.createNewAdDesign, {
    adminToken,
    headline: "Integration Test",
    body: "Testing the full pipeline",
    cta: "Start Now",
    url: "https://example.com",
    template: "social_media",
    style: "modern",
  });
  expect(designResult.success).toBe(true);

  // 5. Verify all content exists in database
  const flyers: any = await t.run(async (ctx) => await ctx.db.query("generated_flyers").collect());
  expect(flyers.length).toBeGreaterThan(0);

  const designs: any = await t.run(async (ctx) => await ctx.db.query("ad_generated_content").collect());
  expect(designs.length).toBeGreaterThan(0);

  // Poster generation may have timed out, but flyer and design should exist
  expect(flyerResult.flyerId).toBeDefined();
  expect(designResult.success).toBe(true);
}, 90000);
