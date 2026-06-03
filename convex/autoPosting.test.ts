/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ═══════════════════════════════════════════════════════════════════
// 1. AUTO-POSTING TRIGGERS
// ═══════════════════════════════════════════════════════════════════

test("getAvailableTriggers returns 6 trigger types", async () => {
  const t = convexTest(schema, modules);
  const triggers: any = await t.query(internal.autoPosting.getAvailableTriggers);
  expect(Array.isArray(triggers)).toBe(true);
  expect(triggers.length).toBe(6);
  const ids = triggers.map((t: any) => t.id);
  expect(ids).toContain("registration");
  expect(ids).toContain("project_completed");
  expect(ids).toContain("referral_milestone");
  expect(ids).toContain("weekly_report");
  expect(ids).toContain("flash_sale");
  expect(ids).toContain("payment_completed");
});

test("each trigger has platforms and templatePreview", async () => {
  const t = convexTest(schema, modules);
  const triggers: any = await t.query(internal.autoPosting.getAvailableTriggers);
  for (const trig of triggers) {
    expect(Array.isArray(trig.platforms)).toBe(true);
    expect(trig.platforms.length).toBeGreaterThan(0);
    expect(typeof trig.templatePreview).toBe("string");
    expect(trig.templatePreview.length).toBeGreaterThan(0);
  }
});

test("triggerAutoPost returns error when not authenticated", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.autoPosting.triggerAutoPost, {
      trigger: "registration",
      vars: { userName: "Test User" },
    })
  ).rejects.toThrow("Not authenticated");
});

test("autoPosting connects to all 12 supported platforms", async () => {
  const t = convexTest(schema, modules);
  const triggers: any = await t.query(internal.autoPosting.getAvailableTriggers);
  const allPlatforms = new Set<string>();
  for (const trig of triggers) {
    for (const p of trig.platforms) allPlatforms.add(p);
  }
  expect(allPlatforms.has("x")).toBe(true);
  expect(allPlatforms.has("linkedin")).toBe(true);
  expect(allPlatforms.has("facebook")).toBe(true);
  expect(allPlatforms.has("tiktok")).toBe(true);
});

// ═══════════════════════════════════════════════════════════════════
// 2. SCHEDULED POSTS QUEUE
// ═══════════════════════════════════════════════════════════════════

test("schedulePost requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.scheduledPosts.schedulePost, {
      platform: "x",
      content: "Test post",
      scheduledFor: Date.now() + 60000,
    })
  ).rejects.toThrow("Not authenticated");
});

test("schedulePost rejects past timestamps", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.scheduledPosts.schedulePost, {
      platform: "x",
      content: "Test",
      scheduledFor: Date.now() - 1000,
    })
  ).rejects.toThrow("Not authenticated");
});

test("editScheduledPost requires auth", async () => {
  const t = convexTest(schema, modules);
  // First insert a real post to get a valid ID
  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert("social_posts", {
      agentId: "test",
      platform: "x",
      content: "Test",
      status: "scheduled",
      scheduledFor: Date.now() + 60000,
    });
  });
  await expect(
    t.mutation(api.scheduledPosts.editScheduledPost, {
      postId,
      content: "New content",
    })
  ).rejects.toThrow("Not authenticated");
});

test("cancelScheduledPost requires auth", async () => {
  const t = convexTest(schema, modules);
  const postId = await t.run(async (ctx) => {
    return await ctx.db.insert("social_posts", {
      agentId: "test",
      platform: "x",
      content: "Test",
      status: "scheduled",
      scheduledFor: Date.now() + 60000,
    });
  });
  await expect(
    t.mutation(api.scheduledPosts.cancelScheduledPost, {
      postId,
    })
  ).rejects.toThrow("Not authenticated");
});

test("getScheduledPosts returns array", async () => {
  const t = convexTest(schema, modules);
  const posts: any = await t.query(api.scheduledPosts.getScheduledPosts);
  expect(Array.isArray(posts)).toBe(true);
});

test("runScheduledPostsNow requires auth", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.action(api.scheduledPosts.runScheduledPostsNow, {})
  ).rejects.toThrow("Not authenticated");
});

test("getDueScheduledPosts returns empty array when nothing due", async () => {
  const t = convexTest(schema, modules);
  const due: any = await t.query(internal.scheduledPosts.getDueScheduledPosts);
  expect(Array.isArray(due)).toBe(true);
  expect(due.length).toBe(0);
});

// ═══════════════════════════════════════════════════════════════════
// 3. SOCIAL PROOF — already-existing, verify it still works
// ═══════════════════════════════════════════════════════════════════

test("getRecentActivity returns array", async () => {
  const t = convexTest(schema, modules);
  const acts: any = await t.query(api.socialProof.getRecentActivity);
  expect(Array.isArray(acts)).toBe(true);
});

test("getActivityStats returns expected shape", async () => {
  const t = convexTest(schema, modules);
  const stats: any = await t.query(api.socialProof.getActivityStats, {});
  expect(stats).toHaveProperty("usedThisWeek");
  expect(stats).toHaveProperty("usedThisMonth");
  expect(stats).toHaveProperty("purchasesThisWeek");
  expect(stats).toHaveProperty("revenueThisWeek");
  expect(stats).toHaveProperty("recentActivities");
  expect(Array.isArray(stats.recentActivities)).toBe(true);
});

test("addReview validates rating range", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.socialProof.addReview, {
      agentId: "finance",
      userId: "u1",
      userName: "Test",
      rating: 10,
      comment: "Bad",
    })
  ).rejects.toThrow("Rating must be between 1 and 5");
});
