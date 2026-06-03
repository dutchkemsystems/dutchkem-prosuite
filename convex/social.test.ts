/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("SUPPORTED_PLATFORMS has all 12 platforms", async () => {
  const t = convexTest(schema, modules);
  const status = await t.query(api.social.getOAuthStatus);
  expect(status).toHaveLength(12);

  const platformIds = status.map((p: any) => p.id);
  expect(platformIds).toContain("x");
  expect(platformIds).toContain("linkedin");
  expect(platformIds).toContain("facebook");
  expect(platformIds).toContain("instagram");
  expect(platformIds).toContain("tiktok");
  expect(platformIds).toContain("youtube");
  expect(platformIds).toContain("pinterest");
  expect(platformIds).toContain("reddit");
  expect(platformIds).toContain("threads");
  expect(platformIds).toContain("telegram");
  expect(platformIds).toContain("discord");
  expect(platformIds).toContain("bluesky");
});

test("getOAuthStatus returns hasCredentials for each platform", async () => {
  const t = convexTest(schema, modules);
  const status = await t.query(api.social.getOAuthStatus);
  for (const platform of status) {
    expect(platform).toHaveProperty("id");
    expect(platform).toHaveProperty("name");
    expect(platform).toHaveProperty("icon");
    expect(platform).toHaveProperty("hasCredentials");
    expect(typeof platform.hasCredentials).toBe("boolean");
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

test("getConnectedPlatforms returns all platforms when none connected", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.getConnectedPlatforms, {});
  expect(result).toHaveProperty("platforms");
  expect(result).toHaveProperty("availablePlatforms");
  expect(result.isConnected).toBe(true);
  expect(result.availablePlatforms).toHaveLength(12);
});

test("disconnectPlatform handles non-existent platform gracefully", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.disconnectPlatform, { platform: "nonexistent" });
  expect(result).toHaveProperty("success");
});

test("updatePostingSettings fails for non-connected platform", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.social.updatePostingSettings, {
      platformId: "nonexistent",
      mode: "auto",
    })
  ).rejects.toThrow("Platform not connected");
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

test("generateOAuthUrl rejects unsupported platform", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.generateOAuthUrl, {
    platform: "unsupported_platform",
    redirectUri: "https://example.com/callback",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Unsupported platform");
});

test("getOAuthUrl is an alias for generateOAuthUrl", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.getOAuthUrl, {
    platform: "unsupported_platform",
    redirectUri: "https://example.com/callback",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Unsupported platform");
});

test("generateOAuthUrl throws when Postiz API key not configured", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.generateOAuthUrl, {
    platform: "x",
    redirectUri: "https://example.com/callback",
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain("Postiz API key not configured");
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

test("getConnections returns empty array when no connections", async () => {
  const t = convexTest(schema, modules);
  const connections = await t.query(api.social.getConnections);
  expect(Array.isArray(connections)).toBe(true);
  expect(connections).toHaveLength(0);
});

test("disconnectAllPlatforms returns success", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social.disconnectAllPlatforms, {});
  expect(result.success).toBe(true);
  expect(result.disconnected).toBe(0);
});
