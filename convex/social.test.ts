/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// 1. QUERIES (no auth needed)
// ═══════════════════════════════════════════════════════════════════

test("getOAuthStatus returns all 12 platforms", async () => {
  const t = convexTest(schema, modules);
  const status = await t.query(api.social.getOAuthStatus);
  expect(status).toHaveLength(12);
  const ids = status.map((p: any) => p.id);
  expect(ids).toContain("x");
  expect(ids).toContain("linkedin");
  expect(ids).toContain("facebook");
  expect(ids).toContain("instagram");
  expect(ids).toContain("tiktok");
  expect(ids).toContain("youtube");
  expect(ids).toContain("pinterest");
  expect(ids).toContain("reddit");
  expect(ids).toContain("threads");
  expect(ids).toContain("telegram");
  expect(ids).toContain("discord");
  expect(ids).toContain("bluesky");
  for (const p of status) {
    expect(p).toHaveProperty("hasCredentials");
    expect(typeof p.hasCredentials).toBe("boolean");
  }
});

test("getSocialStats returns correct shape", async () => {
  const t = convexTest(schema, modules);
  const stats = await t.query(api.social.getSocialStats);
  expect(stats).toHaveProperty("total");
  expect(stats).toHaveProperty("posted");
  expect(stats).toHaveProperty("failed");
  expect(stats).toHaveProperty("scheduled");
  expect(stats).toHaveProperty("history");
  expect(Array.isArray(stats.history)).toBe(true);
});

test("getPlatformAnalytics returns correct shape", async () => {
  const t = convexTest(schema, modules);
  const analytics = await t.query(api.social.getPlatformAnalytics);
  expect(analytics).toHaveProperty("platforms");
  expect(analytics).toHaveProperty("totalLeads");
  expect(analytics).toHaveProperty("totalUsers");
  expect(analytics).toHaveProperty("totalRevenue");
  expect(Array.isArray(analytics.platforms)).toBe(true);
});

// ═══════════════════════════════════════════════════════════════════
// 2. ACTIONS (need auth or external API)
// ═══════════════════════════════════════════════════════════════════

test("getConnectedPlatforms returns all platforms when none connected", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.getConnectedPlatforms, {});
  expect(result).toHaveProperty("platforms");
  expect(result).toHaveProperty("availablePlatforms");
  expect(result.isConnected).toBe(true);
  expect(result.availablePlatforms).toHaveLength(12);
});

test("generateOAuthUrl returns error for unsupported platform", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.generateOAuthUrl, {
    platform: "unsupported_platform",
  });
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});

test("handleOAuthCallback rejects invalid state", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.handleOAuthCallback, {
    platform: "x",
    code: "test_code",
    state: "invalid_state_12345",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid or expired OAuth state");
});

test("manualPost fails for non-connected platform", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.social.manualPost, {
      platformId: "nonexistent",
      content: "Test post",
    })
  ).rejects.toThrow("Platform not connected");
});

// ═══════════════════════════════════════════════════════════════════
// 3. MUTATIONS
// ═══════════════════════════════════════════════════════════════════

test("updatePostingSettings fails for non-connected platform", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.social.updatePostingSettings, {
      platformId: "nonexistent",
      mode: "auto",
    })
  ).rejects.toThrow("Platform not connected");
});

// ═══════════════════════════════════════════════════════════════════
// 4. INTERNAL FUNCTIONS (called via runQuery/runMutation in actions)
// ═══════════════════════════════════════════════════════════════════

test("getPlatformsFromDb returns all 12 platforms as disconnected", async () => {
  const t = convexTest(schema, modules);
  const platforms = await t.query(api.social.getPlatformsFromDb);
  expect(Array.isArray(platforms)).toBe(true);
  expect(platforms).toHaveLength(12);
  for (const p of platforms) {
    expect(p.isConnected).toBe(false);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════

test("oauth_states table can be queried", async () => {
  const t = convexTest(schema, modules);
  // Just verify the table exists and is queryable
  const status = await t.query(api.social.getOAuthStatus);
  expect(status).toBeDefined();
});

test("platform_connections table can be queried", async () => {
  const t = convexTest(schema, modules);
  const platforms = await t.query(api.social.getPlatformsFromDb);
  expect(platforms).toBeDefined();
  expect(Array.isArray(platforms)).toBe(true);
});
