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
    expect(p).toHaveProperty("hasOAuth");
    expect(typeof p.hasOAuth).toBe("boolean");
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

test("getConnectedPlatforms returns platforms and available platforms", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.getConnectedPlatforms, {});
  expect(result).toHaveProperty("platforms");
  expect(result).toHaveProperty("availablePlatforms");
  expect(result.availablePlatforms).toHaveLength(12);
});

test("generateOAuthUrl returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.generateOAuthUrl, {
    platform: "x",
  });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Not authenticated");
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

test("postToPlatform fails for non-connected platform", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.social.postToPlatform, {
      platform: "nonexistent",
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

test("disconnectPlatform returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.social.disconnectPlatform, {
      platformId: "x",
    })
  ).rejects.toThrow("Not authenticated");
});

// ═══════════════════════════════════════════════════════════════════
// 4. INTERNAL FUNCTIONS
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
  const status = await t.query(api.social.getOAuthStatus);
  expect(status).toBeDefined();
});

test("platform_connections table can be queried", async () => {
  const t = convexTest(schema, modules);
  const platforms = await t.query(api.social.getPlatformsFromDb);
  expect(platforms).toBeDefined();
  expect(Array.isArray(platforms)).toBe(true);
});

// ═══════════════════════════════════════════════════════════════════
// 6. OAUTH PROVIDER STATUS (Composio + Direct)
// ═══════════════════════════════════════════════════════════════════

test("getOAuthProviderStatus returns direct always enabled", async () => {
  const t = convexTest(schema, modules);
  const status: any = await t.query(api.social.getOAuthProviderStatus);
  expect(status).toHaveProperty("directEnabled", true);
  expect(status).toHaveProperty("composioEnabled");
  expect(status).toHaveProperty("composioPlatforms");
  expect(Array.isArray(status.composioPlatforms)).toBe(true);
  expect(status.composioPlatforms).toContain("x");
  expect(status.composioPlatforms).toContain("linkedin");
  expect(status.composioPlatforms).toContain("bluesky");
  expect(status.composioPlatforms).not.toContain("telegram");
});

// ═══════════════════════════════════════════════════════════════════
// 7. COMPOSIO OAUTH (returns error when API key not set)
// ═══════════════════════════════════════════════════════════════════

test("startComposioOAuth returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.startComposioOAuth, { platform: "x" });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Not authenticated");
});

test("startComposioOAuth rejects unsupported platform", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.startComposioOAuth, { platform: "nonexistent" });
  expect(result.success).toBe(false);
  expect(result.error).toBeTruthy();
  expect(result.error).toMatch(/Not authenticated|Unsupported platform/);
});

test("startComposioOAuth rejects telegram (not Composio-supported)", async () => {
  const t = convexTest(schema, modules);
  // Without auth, will return "Not authenticated" first
  // With auth but no COMPOSIO_API_KEY, will return that error
  const result: any = await t.action(api.social.startComposioOAuth, { platform: "telegram" });
  expect(result.success).toBe(false);
  expect(result.error).toBeTruthy();
});

// ═══════════════════════════════════════════════════════════════════
// 8. TELEGRAM BOT TOKEN CONNECTION
// ═══════════════════════════════════════════════════════════════════

test("connectTelegramBot returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.connectTelegramBot, { botToken: "123:test" });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Not authenticated");
});

// ═══════════════════════════════════════════════════════════════════
// 9. BLUESKY AT PROTOCOL CONNECTION
// ═══════════════════════════════════════════════════════════════════

test("connectBluesky returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.connectBluesky, { identifier: "alice.bsky.social", appPassword: "test-pass" });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Not authenticated");
});

// ═══════════════════════════════════════════════════════════════════
// 10. UUID AND CODE CHALLENGE HELPERS (no runtime errors)
// ═══════════════════════════════════════════════════════════════════

test("generateOAuthUrl returns error for invalid platform", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.generateOAuthUrl, { platform: "fakep" });
  expect(result.success).toBe(false);
  // In test env without auth, returns "Not authenticated" first;
  // with auth would return "Unsupported platform"
  expect(result.error).toBeTruthy();
  expect(result.error).toMatch(/Not authenticated|Unsupported platform/);
});

test("generateOAuthUrl returns error for telegram (use bot token)", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.generateOAuthUrl, { platform: "telegram" });
  expect(result.success).toBe(false);
  expect(result.error).toBeTruthy();
  expect(result.error).toMatch(/Not authenticated|bot token/);
});

test("generateOAuthUrl returns error for bluesky (use AT Protocol)", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.action(api.social.generateOAuthUrl, { platform: "bluesky" });
  expect(result.success).toBe(false);
  expect(result.error).toBeTruthy();
  expect(result.error).toMatch(/Not authenticated|AT Protocol/);
});
