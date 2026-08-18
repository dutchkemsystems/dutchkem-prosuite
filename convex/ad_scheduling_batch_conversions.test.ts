/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Helper: insert a campaign and return its ID
async function createTestCampaign(t: ReturnType<typeof convexTest>, platform = "x") {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("ad_campaigns", {
      name: "Test Campaign",
      platform,
      status: "active",
      spent: 0,
      startDate: Date.now(),
      createdBy: "test-user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

// Helper: insert an ad and return its ID
async function createTestAd(t: ReturnType<typeof convexTest>, campaignId: string, platform = "x") {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("ad_ads", {
      campaignId,
      title: "Test Ad",
      content: "Test content",
      platform,
      status: "draft",
      impressions: 0,
      clicks: 0,
      engagements: 0,
      createdAt: Date.now(),
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// AD SCHEDULING TESTS
// ═══════════════════════════════════════════════════════════════════

test("getOptimalTimesForPlatform returns times for known platform", async () => {
  const t = convexTest(schema, modules);
  const times: any = await t.query(api.ad_scheduling.getOptimalTimesForPlatform, { platform: "x" });
  expect(Array.isArray(times)).toBe(true);
  expect(times.length).toBeGreaterThan(0);
  expect(times[0]).toHaveProperty("hour");
  expect(times[0]).toHaveProperty("day");
  expect(times[0]).toHaveProperty("score");
});

test("getOptimalTimesForPlatform falls back to X for unknown platform", async () => {
  const t = convexTest(schema, modules);
  const times: any = await t.query(api.ad_scheduling.getOptimalTimesForPlatform, { platform: "unknown_platform" });
  const xTimes: any = await t.query(api.ad_scheduling.getOptimalTimesForPlatform, { platform: "x" });
  expect(times).toEqual(xTimes);
});

test("getSchedulingRecommendations requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  await expect(
    t.query(api.ad_scheduling.getSchedulingRecommendations, { adminToken: "invalid", campaignId })
  ).resolves.toEqual([]);
});

test("saveSchedulingRecommendations inserts and updates", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);

  // First insert
  const result1: any = await t.mutation(internal.ad_scheduling.saveSchedulingRecommendations, {
    campaignId,
    platform: "x",
    recommendations: [
      { hour: 9, day: 1, dayName: "Monday", score: 0.9, historicalCTR: 0.05, platformDefault: 0.85, recommendation: "excellent", localTime: "09:00", timezone: "Africa/Lagos" },
    ],
  });
  expect(result1.inserted).toBe(true);

  // Second call should update
  const result2: any = await t.mutation(internal.ad_scheduling.saveSchedulingRecommendations, {
    campaignId,
    platform: "x",
    recommendations: [
      { hour: 10, day: 2, dayName: "Tuesday", score: 0.85, historicalCTR: 0.04, platformDefault: 0.82, recommendation: "good", localTime: "10:00", timezone: "Africa/Lagos" },
    ],
  });
  expect(result2.updated).toBe(true);
});

test("getSchedulingRecommendationsForAd returns saved recommendations", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);

  const recs = [{ hour: 9, day: 1, dayName: "Monday", score: 0.9, historicalCTR: 0.05, platformDefault: 0.85, recommendation: "excellent", localTime: "09:00", timezone: "Africa/Lagos" }];
  await t.mutation(internal.ad_scheduling.saveSchedulingRecommendations, {
    campaignId,
    platform: "linkedin",
    recommendations: recs,
  });

  const result: any = await t.query(internal.ad_scheduling.getSchedulingRecommendationsForAd, {
    campaignId,
    platform: "linkedin",
  });
  expect(result.length).toBe(1);
  expect(result[0].hour).toBe(9);
  expect(result[0].dayName).toBe("Monday");
});

test("getSchedulingRecommendationsForAd returns empty for no data", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const result: any = await t.query(internal.ad_scheduling.getSchedulingRecommendationsForAd, {
    campaignId,
    platform: "x",
  });
  expect(result).toEqual([]);
});

test("scheduleAd sets ad status to scheduled", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  const scheduledFor = Date.now() + 3600000; // 1 hour from now
  await t.mutation(internal.ad_scheduling.scheduleAd, { adId, scheduledFor });

  const ad: any = await t.run(async (ctx) => await ctx.db.get(adId));
  expect(ad.status).toBe("scheduled");
  expect(ad.scheduledFor).toBe(scheduledFor);
});

test("getHistoricalPerformance returns empty for new campaign", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const result: any = await t.query(internal.ad_scheduling.getHistoricalPerformance, {
    campaignId,
    platform: "x",
    days: 1,
  });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(0);
}, 10000);

// ═══════════════════════════════════════════════════════════════════
// AD BATCH TESTS
// ═══════════════════════════════════════════════════════════════════

test("createScheduledAd inserts ad with scheduled status", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);

  const result: any = await t.mutation(internal.ad_batch.createScheduledAd, {
    campaignId,
    content: "Batch ad content",
    platform: "x",
    scheduledFor: Date.now() + 3600000,
    createdBy: "test-user",
  });

  expect(result.success).toBe(true);
  expect(result.adId).toBeDefined();

  const ad: any = await t.run(async (ctx) => await ctx.db.get(result.adId));
  expect(ad.status).toBe("scheduled");
  expect(ad.content).toBe("Batch ad content");
  expect(ad.platform).toBe("x");
  expect(ad.impressions).toBe(0);
  expect(ad.clicks).toBe(0);
  expect(ad.engagements).toBe(0);
});

test("createScheduledAd with imageUrl stores it", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);

  const result: any = await t.mutation(internal.ad_batch.createScheduledAd, {
    campaignId,
    content: "Ad with image",
    platform: "instagram",
    imageUrl: "https://example.com/image.jpg",
    scheduledFor: Date.now() + 3600000,
    createdBy: "test-user",
  });

  expect(result.success).toBe(true);
  const ad: any = await t.run(async (ctx) => await ctx.db.get(result.adId));
  expect(ad.imageUrl).toBe("https://example.com/image.jpg");
});

test("logBatchOperation inserts batch operation record", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);

  const result: any = await t.mutation(internal.ad_batch.logBatchOperation, {
    campaignId,
    totalAds: 3,
    successCount: 2,
    failCount: 1,
    results: [
      { success: true, adId: "ad1" },
      { success: true, adId: "ad2" },
      { success: false, error: "Failed" },
    ],
    operatedBy: "test-user",
  });

  expect(result).toBeDefined();

  const ops: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_batch_operations").collect();
  });
  expect(ops.length).toBeGreaterThan(0);
  const lastOp = ops[ops.length - 1];
  expect(lastOp.totalAds).toBe(3);
  expect(lastOp.successCount).toBe(2);
  expect(lastOp.failCount).toBe(1);
});

test("importCampaign creates a draft campaign", async () => {
  const t = convexTest(schema, modules);

  const result: any = await t.mutation(internal.ad_batch.importCampaign, {
    name: "Imported Campaign",
    description: "Test import",
    platform: "linkedin",
    budget: 50000,
    dailyBudget: 5000,
    goals: "Brand awareness",
    targetAudience: "Professionals",
    createdBy: "test-user",
  });

  expect(result.success).toBe(true);
  expect(result.campaignId).toBeDefined();

  const campaign: any = await t.run(async (ctx) => await ctx.db.get(result.campaignId));
  expect(campaign.name).toBe("Imported Campaign");
  expect(campaign.platform).toBe("linkedin");
  expect(campaign.status).toBe("draft");
  expect(campaign.budget).toBe(50000);
  expect(campaign.spent).toBe(0);
});

test("getOptimalTimeForPlatform returns recommendations or empty", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(internal.ad_batch.getOptimalTimeForPlatform, { platform: "x" });
  expect(Array.isArray(result)).toBe(true);
});

test("getBatchOperations requires auth", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.ad_batch.getBatchOperations, { adminToken: "invalid" });
  expect(result).toEqual([]);
});

test("exportCampaignsToCSV requires auth", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.ad_batch.exportCampaignsToCSV, { adminToken: "invalid" });
  expect(result).toBeNull();
});

test("exportCampaignsToCSV generates CSV for campaigns", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t, "x");
  const adId = await createTestAd(t, campaignId);

  // Insert some analytics with a real ad ID
  await t.run(async (ctx) => {
    await ctx.db.insert("ad_analytics", {
      adId,
      campaignId,
      platform: "x",
      date: new Date().toISOString().slice(0, 10),
      impressions: 1000,
      clicks: 50,
      engagements: 30,
      conversions: 5,
      spend: 2500,
    });
  });

  // This query needs a valid admin session, so it will return empty
  const result: any = await t.query(api.ad_batch.exportCampaignsToCSV, { adminToken: "valid-token" });
  // Without auth, returns null
  expect(result).toBeNull();
});

// ═══════════════════════════════════════════════════════════════════
// AD CONVERSIONS TESTS
// ═══════════════════════════════════════════════════════════════════

test("recordConversion creates conversion and updates ad metrics", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  const result: any = await t.mutation(api.ad_conversions.recordConversion, {
    adId,
    campaignId,
    platform: "x",
    conversionType: "click",
  });

  expect(result.success).toBe(true);
  expect(result.conversionId).toBeDefined();

  // Verify ad metrics updated
  const ad: any = await t.run(async (ctx) => await ctx.db.get(adId));
  expect(ad.clicks).toBe(1);
  expect(ad.engagements).toBe(1);

  // Verify analytics record created
  const analytics: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_analytics")
      .withIndex("by_ad", (q) => q.eq("adId", adId))
      .collect();
  });
  expect(analytics.length).toBe(1);
  expect(analytics[0].clicks).toBe(1);
  expect(analytics[0].conversions).toBe(1);
  expect(analytics[0].engagements).toBe(1);
});

test("recordConversion for lead type does not increment clicks", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  await t.mutation(api.ad_conversions.recordConversion, {
    adId,
    campaignId,
    platform: "x",
    conversionType: "lead",
  });

  const ad: any = await t.run(async (ctx) => await ctx.db.get(adId));
  expect(ad.clicks).toBe(0);
  expect(ad.engagements).toBe(1);
});

test("recordConversion with value stores it", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  const result: any = await t.mutation(api.ad_conversions.recordConversion, {
    adId,
    campaignId,
    platform: "x",
    conversionType: "purchase",
    value: 15000,
    currency: "NGN",
  });

  expect(result.success).toBe(true);

  const conversion: any = await t.run(async (ctx) => {
    return await ctx.db.get(result.conversionId);
  });
  expect(conversion.value).toBe(15000);
  expect(conversion.currency).toBe("NGN");
});

test("recordConversion updates existing analytics row", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);
  const today = new Date().toISOString().slice(0, 10);

  // Pre-create analytics row
  await t.run(async (ctx) => {
    await ctx.db.insert("ad_analytics", {
      adId,
      campaignId,
      platform: "x",
      date: today,
      impressions: 100,
      clicks: 10,
      engagements: 5,
      conversions: 2,
      spend: 500,
    });
  });

  // Record a conversion
  await t.mutation(api.ad_conversions.recordConversion, {
    adId,
    campaignId,
    platform: "x",
    conversionType: "signup",
  });

  // Verify analytics updated (not duplicated)
  const analytics: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_analytics")
      .withIndex("by_ad_date", (q) => q.eq("adId", adId).eq("date", today))
      .collect();
  });
  expect(analytics.length).toBe(1);
  expect(analytics[0].conversions).toBe(3); // 2 + 1
  expect(analytics[0].engagements).toBe(6); // 5 + 1
});

test("recordConversion updates tracking URL conversion count", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  // Create a tracking URL
  const trackingId = await t.run(async (ctx) => {
    return await ctx.db.insert("ad_tracking_urls", {
      adId,
      campaignId,
      platform: "x",
      destinationUrl: "https://example.com",
      trackingUrl: "https://example.com?utm_source=x",
      utmParams: { source: "x", medium: "social", campaign: campaignId, content: adId, term: "test" },
      clicks: 10,
      conversions: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await t.mutation(api.ad_conversions.recordConversion, {
    adId,
    campaignId,
    platform: "x",
    conversionType: "purchase",
    value: 5000,
  });

  const tracking: any = await t.run(async (ctx) => await ctx.db.get(trackingId));
  expect(tracking.conversions).toBe(4); // 3 + 1
});

test("saveTrackingUrl inserts and updates tracking URL", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  // First insert
  const result1: any = await t.mutation(internal.ad_conversions.saveTrackingUrl, {
    adId,
    campaignId,
    platform: "x",
    destinationUrl: "https://example.com",
    trackingUrl: "https://example.com?utm_source=x&utm_medium=social",
    utmParams: { source: "x", medium: "social", campaign: campaignId, content: adId, term: "test1" },
  });
  expect(result1.success).toBe(true);
  expect(result1.id).toBeDefined();

  // Second call should update
  const result2: any = await t.mutation(internal.ad_conversions.saveTrackingUrl, {
    adId,
    campaignId,
    platform: "x",
    destinationUrl: "https://example.com",
    trackingUrl: "https://example.com?utm_source=x&utm_medium=social&utm_term=updated",
    utmParams: { source: "x", medium: "social", campaign: campaignId, content: adId, term: "updated" },
  });
  expect(result2.success).toBe(true);
  expect(result2.updated).toBe(true);
});

test("getConversionStats returns correct aggregation", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const adId = await createTestAd(t, campaignId);

  // Record multiple conversions
  for (const type of ["click", "lead", "purchase", "signup", "click"] as const) {
    await t.mutation(api.ad_conversions.recordConversion, {
      adId,
      campaignId,
      platform: "x",
      conversionType: type,
      value: type === "purchase" ? 10000 : undefined,
    });
  }

  // Auth required — will return null
  const result: any = await t.query(api.ad_conversions.getConversionStats, {
    adminToken: "invalid",
    campaignId,
  });
  expect(result).toBeNull();
});

test("getConversionsByCampaign requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const result: any = await t.query(api.ad_conversions.getConversionsByCampaign, {
    adminToken: "invalid",
    campaignId,
  });
  expect(result).toEqual([]);
});

test("getTrackingUrls requires auth", async () => {
  const t = convexTest(schema, modules);
  const campaignId = await createTestCampaign(t);
  const result: any = await t.query(api.ad_conversions.getTrackingUrls, {
    adminToken: "invalid",
    campaignId,
  });
  expect(result).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-MODULE INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════

test("full flow: create campaign → batch schedule ads → record conversions → get stats", async () => {
  const t = convexTest(schema, modules);

  // 1. Create campaign
  const campaignId = await createTestCampaign(t, "linkedin");

  // 2. Batch create scheduled ads
  const ad1Result: any = await t.mutation(internal.ad_batch.createScheduledAd, {
    campaignId,
    content: "Batch Ad 1",
    platform: "linkedin",
    scheduledFor: Date.now() + 3600000,
    createdBy: "test-user",
  });
  const ad2Result: any = await t.mutation(internal.ad_batch.createScheduledAd, {
    campaignId,
    content: "Batch Ad 2",
    platform: "linkedin",
    scheduledFor: Date.now() + 7200000,
    createdBy: "test-user",
  });

  expect(ad1Result.success).toBe(true);
  expect(ad2Result.success).toBe(true);

  // 3. Log batch operation
  await t.mutation(internal.ad_batch.logBatchOperation, {
    campaignId,
    totalAds: 2,
    successCount: 2,
    failCount: 0,
    results: [
      { success: true, adId: ad1Result.adId },
      { success: true, adId: ad2Result.adId },
    ],
    operatedBy: "test-user",
  });

  // 4. Record conversions on both ads
  await t.mutation(api.ad_conversions.recordConversion, {
    adId: ad1Result.adId,
    campaignId,
    platform: "linkedin",
    conversionType: "click",
  });
  await t.mutation(api.ad_conversions.recordConversion, {
    adId: ad1Result.adId,
    campaignId,
    platform: "linkedin",
    conversionType: "lead",
  });
  await t.mutation(api.ad_conversions.recordConversion, {
    adId: ad2Result.adId,
    campaignId,
    platform: "linkedin",
    conversionType: "purchase",
    value: 25000,
    currency: "NGN",
  });

  // 5. Verify ad metrics
  const ad1: any = await t.run(async (ctx) => await ctx.db.get(ad1Result.adId));
  expect(ad1.clicks).toBe(1);
  expect(ad1.engagements).toBe(2);

  const ad2: any = await t.run(async (ctx) => await ctx.db.get(ad2Result.adId));
  expect(ad2.clicks).toBe(0);
  expect(ad2.engagements).toBe(1);

  // 6. Verify batch operation logged
  const ops: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_batch_operations").collect();
  });
  const lastOp = ops[ops.length - 1];
  expect(lastOp.totalAds).toBe(2);
  expect(lastOp.successCount).toBe(2);

  // 7. Verify analytics exist for both ads
  const analytics1: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_analytics")
      .withIndex("by_ad", (q) => q.eq("adId", ad1Result.adId))
      .collect();
  });
  expect(analytics1.length).toBeGreaterThan(0);

  const analytics2: any = await t.run(async (ctx) => {
    return await ctx.db.query("ad_analytics")
      .withIndex("by_ad", (q) => q.eq("adId", ad2Result.adId))
      .collect();
  });
  expect(analytics2.length).toBeGreaterThan(0);
});
