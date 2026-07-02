// platform_analytics.test.ts
// Tests for platform analytics queries and mutations
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Platform Analytics", () => {
  describe("getPlatformAnalyticsSummary", () => {
    test("returns summary with all required fields", async () => {
      const t = convexTest(schema, modules);
      const result: any = await t.query(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "month" });
      expect(result).toBeDefined();
      expect(result.platforms).toBeDefined();
      expect(result.totals).toBeDefined();
      expect(result.timeRange).toBe("month");
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
    });

    test("returns 8 platforms", async () => {
      const t = convexTest(schema, modules);
      const result: any = await t.query(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "week" });
      expect(result.platforms).toHaveLength(8);
    });

    test("each platform has required fields", async () => {
      const t = convexTest(schema, modules);
      const result: any = await t.query(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "day" });
      for (const platform of result.platforms) {
        expect(platform.id).toBeDefined();
        expect(platform.name).toBeDefined();
        expect(platform.icon).toBeDefined();
        expect(typeof platform.visits).toBe("number");
        expect(typeof platform.registrations).toBe("number");
        expect(typeof platform.revenue).toBe("number");
        expect(typeof platform.conversionRate).toBe("number");
      }
    });

    test("totals match sum of platforms", async () => {
      const t = convexTest(schema, modules);
      const result: any = await t.query(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "year" });
      const totalVisits = result.platforms.reduce((sum: number, p: any) => sum + p.visits, 0);
      expect(result.totals.visits).toBe(totalVisits);
    });

    test("day timeRange uses correct window", async () => {
      const t = convexTest(schema, modules);
      const result: any = await t.query(api.platform_analytics.getPlatformAnalyticsSummary, { timeRange: "day" });
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      expect(result.startTime).toBeGreaterThanOrEqual(now - oneDay - 1000);
      expect(result.endTime).toBeLessThanOrEqual(now + 1000);
    });
  });

  describe("getDailyPlatformMetrics", () => {
    test("returns array of daily metrics", async () => {
      const t = convexTest(schema, modules);
      const result: any[] = await t.query(api.platform_analytics.getDailyPlatformMetrics, { days: 7 });
      expect(result).toHaveLength(7);
    });

    test("each day has required fields", async () => {
      const t = convexTest(schema, modules);
      const result: any[] = await t.query(api.platform_analytics.getDailyPlatformMetrics, { days: 3 });
      for (const day of result) {
        expect(day.date).toBeDefined();
        expect(typeof day.visits).toBe("number");
        expect(typeof day.registrations).toBe("number");
        expect(typeof day.revenue).toBe("number");
      }
    });

    test("days are in correct order", async () => {
      const t = convexTest(schema, modules);
      const result: any[] = await t.query(api.platform_analytics.getDailyPlatformMetrics, { days: 5 });
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date > result[i - 1].date).toBe(true);
      }
    });
  });

  describe("trackVisit", () => {
    test("creates visit counter in system_config", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(api.platform_analytics.trackVisit, { platform: "web" });
      const config = await t.run(async (ctx: any) => {
        const today = new Date().toISOString().split("T")[0];
        const key = `VISIT_WEB_${today}`;
        return await ctx.db.query("system_config").withIndex("by_key", (q: any) => q.eq("key", key)).first();
      });
      expect(config).toBeDefined();
      expect(config.value).toBe(1);
    });

    test("increments existing visit counter", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(api.platform_analytics.trackVisit, { platform: "x" });
      await t.mutation(api.platform_analytics.trackVisit, { platform: "x" });
      const config = await t.run(async (ctx: any) => {
        const today = new Date().toISOString().split("T")[0];
        const key = `VISIT_X_${today}`;
        return await ctx.db.query("system_config").withIndex("by_key", (q: any) => q.eq("key", key)).first();
      });
      expect(config).toBeDefined();
      expect(config.value).toBe(2);
    });
  });
});
