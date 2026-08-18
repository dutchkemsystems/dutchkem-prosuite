/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Helper to create a platform connection with correct schema fields
async function createConnection(t: ReturnType<typeof convexTest>, platformId: string, overrides: Record<string, any> = {}) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("platform_connections", {
      adminId: "admin-1",
      platformId,
      platformName: platformId,
      integrationId: "direct",
      accessToken: `token-${platformId}`,
      isConnected: true,
      autoPostEnabled: false,
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    } as any);
  });
}

test("social_automation: getConnectionStatus returns all 12 platforms", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  expect(result.platforms.length).toBe(12);
  expect(result.summary.total).toBe(12);
  expect(result.summary.connected).toBe(0);
  expect(result.summary.disconnected).toBe(12);
});

test("social_automation: getConnectionStatus shows connected platforms", async () => {
  const t = convexTest(schema, modules);
  await createConnection(t, "linkedin", { expiresAt: Date.now() + 86400000 });

  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  const linkedin = result.platforms.find((p: any) => p.platform === "linkedin");
  expect(linkedin.connected).toBe(true);
  expect(linkedin.expired).toBe(false);
  expect(result.summary.connected).toBe(1);
});

test("social_automation: getConnectionStatus detects expired tokens", async () => {
  const t = convexTest(schema, modules);
  await createConnection(t, "x", { expiresAt: Date.now() - 1000 });

  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  const x = result.platforms.find((p: any) => p.platform === "x");
  expect(x.connected).toBe(true);
  expect(x.expired).toBe(true);
  expect(result.summary.expired).toBe(1);
});

test("social_automation: getConnectionStatus detects expiring soon tokens", async () => {
  const t = convexTest(schema, modules);
  await createConnection(t, "facebook", { expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 });

  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  const fb = result.platforms.find((p: any) => p.platform === "facebook");
  expect(fb.connected).toBe(true);
  expect(fb.expiringSoon).toBe(true);
  expect(result.summary.expiringSoon).toBe(1);
});

test("social_automation: _getAllConnections returns all connections", async () => {
  const t = convexTest(schema, modules);
  await createConnection(t, "telegram");

  const result: any = await t.query(internal.social_automation._getAllConnections, {});
  expect(result.length).toBeGreaterThanOrEqual(1);
  expect(result.some((c: any) => c.platformId === "telegram")).toBe(true);
});

test("social_automation: _logBatchPost inserts social_posts records", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(internal.social_automation._logBatchPost, {
    content: "Test post content",
    platforms: ["linkedin", "x"],
    results: [
      { platform: "linkedin", success: true, postId: "li-123" },
      { platform: "x", success: false, error: "Rate limited" },
    ],
    postedBy: "admin-1",
  });

  const posts: any = await t.run(async (ctx) => {
    return await ctx.db.query("social_posts").collect();
  });
  expect(posts.length).toBeGreaterThanOrEqual(2);
  const linkedinPost = posts.find((p: any) => p.platform === "linkedin");
  expect(linkedinPost).toBeDefined();
  expect(linkedinPost.status).toBe("posted");
  expect(linkedinPost.agentId).toBe("automation");
});

test("social_automation: _logAutomatedPost inserts social_posts records", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(internal.social_automation._logAutomatedPost, {
    contentType: "flyer",
    platforms: ["linkedin", "facebook"],
    results: [
      { platform: "linkedin", status: "posted" },
      { platform: "facebook", status: "posted" },
    ],
  });

  const posts: any = await t.run(async (ctx) => {
    return await ctx.db.query("social_posts").collect();
  });
  expect(posts.length).toBeGreaterThanOrEqual(2);
  const last = posts[posts.length - 1];
  expect(last.content).toContain("flyer");
  expect(last.agentId).toBe("automation");
});

test("social_automation: _updateConnectionTokens updates token data", async () => {
  const t = convexTest(schema, modules);
  const connId = await createConnection(t, "reddit", {
    accessToken: "old-token",
    refreshToken: "old-refresh",
    expiresAt: Date.now() + 3600000,
  });

  await t.mutation(internal.social_automation._updateConnectionTokens, {
    connectionId: connId,
    accessToken: "new-token",
    refreshToken: "new-refresh",
    expiresIn: 7200,
  });

  const conn: any = await t.run(async (ctx) => await ctx.db.get(connId));
  expect(conn.accessToken).toBe("new-token");
  expect(conn.refreshToken).toBe("new-refresh");
  expect(conn.updatedAt).toBeDefined();
});

test("social_automation: refreshAllTokens requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social_automation.refreshAllTokens, {
    adminToken: "invalid",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
});

test("social_automation: postToAllConnected requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social_automation.postToAllConnected, {
    adminToken: "invalid",
    content: "Test",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
});

test("social_automation: autoGenerateAndPost requires auth", async () => {
  const t = convexTest(schema, modules);
  const result = await t.action(api.social_automation.autoGenerateAndPost, {
    adminToken: "invalid",
    contentType: "text",
  });
  expect(result).toHaveProperty("error", "Unauthorized");
});
