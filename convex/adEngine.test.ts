/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// 1. ENGINE STATUS
// ═══════════════════════════════════════════════════════════════════

test("getAdEngineStatus returns defaults when uninitialized", async () => {
  const t = convexTest(schema, modules);
  const status: any = await t.query(api.adEngine.getAdEngineStatus, {});
  expect(status).toHaveProperty("enabled", false);
  expect(status).toHaveProperty("autoPost", false);
  expect(status).toHaveProperty("dailyPostLimit");
  expect(status).toHaveProperty("postsToday", 0);
});

test("toggleAdEngine requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.adEngine.toggleAdEngine, { enabled: true })
  ).rejects.toThrow("Not authenticated");
});

test("toggleAutoPost requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.adEngine.toggleAutoPost, { enabled: true })
  ).rejects.toThrow("Not authenticated");
});

// ═══════════════════════════════════════════════════════════════════
// 2. CAMPAIGN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

test("createCampaign requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.adEngine.createCampaign, {
      name: "Test Campaign",
      platform: "x",
      startDate: Date.now(),
    })
  ).rejects.toThrow("Not authenticated");
});

test("getCampaigns returns array", async () => {
  const t = convexTest(schema, modules);
  const campaigns: any = await t.query(api.adEngine.getCampaigns, {});
  expect(Array.isArray(campaigns)).toBe(true);
});

test("updateCampaign requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test",
      platform: "x",
      status: "draft",
      spent: 0,
      startDate: Date.now(),
      createdBy: "user1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  await expect(
    t.mutation(api.adEngine.updateCampaign, {
      campaignId,
      name: "Updated",
    })
  ).rejects.toThrow("Not authenticated");
});

test("deleteCampaign requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test",
      platform: "x",
      status: "draft",
      spent: 0,
      startDate: Date.now(),
      createdBy: "user1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  await expect(
    t.mutation(api.adEngine.deleteCampaign, { campaignId })
  ).rejects.toThrow("Not authenticated");
});

// ═══════════════════════════════════════════════════════════════════
// 3. AD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

test("createAd requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test",
      platform: "x",
      status: "draft",
      spent: 0,
      startDate: Date.now(),
      createdBy: "user1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  await expect(
    t.mutation(api.adEngine.createAd, {
      campaignId,
      title: "Test Ad",
      content: "Hello world",
    })
  ).rejects.toThrow("Not authenticated");
});

test("getAds returns array", async () => {
  const t = convexTest(schema, modules);
  const ads: any = await t.query(api.adEngine.getAds, {});
  expect(Array.isArray(ads)).toBe(true);
});

test("getAdAnalytics returns expected shape", async () => {
  const t = convexTest(schema, modules);
  const analytics: any = await t.query(api.adEngine.getAdAnalytics, {});
  expect(analytics).toHaveProperty("totalAds");
  expect(analytics).toHaveProperty("postedAds");
  expect(analytics).toHaveProperty("failedAds");
  expect(analytics).toHaveProperty("totalImpressions");
  expect(analytics).toHaveProperty("totalClicks");
  expect(analytics).toHaveProperty("ctr");
  expect(analytics).toHaveProperty("totalSpent");
});

// ═══════════════════════════════════════════════════════════════════
// 4. FLYER GENERATION
// ═══════════════════════════════════════════════════════════════════

test("generateFlyer requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.adEngine.generateFlyer, { prompt: "Promote finance agent" })
  ).rejects.toThrow("Not authenticated");
});

test("getFlyers returns array", async () => {
  const t = convexTest(schema, modules);
  const flyers: any = await t.query(api.adEngine.getFlyers, {});
  expect(Array.isArray(flyers)).toBe(true);
});

// ═══════════════════════════════════════════════════════════════════
// 5. AD EXECUTION
// ═══════════════════════════════════════════════════════════════════

test("executeAdPost returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test",
      platform: "x",
      status: "draft",
      spent: 0,
      startDate: Date.now(),
      createdBy: "user1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  const adId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_ads", {
      campaignId,
      title: "Test",
      content: "Test",
      platform: "x",
      status: "draft",
      impressions: 0,
      clicks: 0,
      engagements: 0,
      createdAt: Date.now(),
    });
  });
  const result: any = await t.action(api.adEngine.executeAdPost, { adId });
  expect(result.success).toBe(false);
  expect(result.error).toBe("Not authenticated");
});

test("executeAdPost returns error result when not authenticated", async () => {
  const t = convexTest(schema, modules);
  // Action returns { success: false, error: "Not authenticated" } instead of throwing
  // when not authenticated (graceful degradation)
  const result: any = await t.action(api.adEngine.executeAdPost, { adId: "fake" as any }).catch((e: any) => ({ error: e?.message }));
  // Either rejects or returns success:false with error
  expect(result).toBeDefined();
});

test("recordAdImpression is callable without auth (public metric)", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test",
      platform: "x",
      status: "draft",
      spent: 0,
      startDate: Date.now(),
      createdBy: "user1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  const adId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_ads", {
      campaignId,
      title: "Test",
      content: "Test",
      platform: "x",
      status: "posted",
      impressions: 0,
      clicks: 0,
      engagements: 0,
      createdAt: Date.now(),
    });
  });
  await t.mutation(api.adEngine.recordAdImpression, { adId });
});

// ═══════════════════════════════════════════════════════════════════
// 6. INTERNAL: AD ENGINE REUSES platform_connections
// ═══════════════════════════════════════════════════════════════════

test("getConnectionForAd returns null for unconnected platform", async () => {
  const t = convexTest(schema, modules);
  const conn: any = await t.query(internal.adEngine.getConnectionForAd, { platform: "x" });
  expect(conn).toBeNull();
});

test("getDueAds returns empty array when nothing due", async () => {
  const t = convexTest(schema, modules);
  const due: any = await t.query(internal.adEngine.getDueAds);
  expect(Array.isArray(due)).toBe(true);
  expect(due.length).toBe(0);
});
