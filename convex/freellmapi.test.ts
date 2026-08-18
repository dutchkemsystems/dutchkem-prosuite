// freellmapi.test.ts
// Tests for FreeLLMAPI integration
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("FreeLLMAPI Integration", () => {
  test("schema has freellmapi_usage table", async () => {
    const t = convexTest(schema, modules);
    // Verify the table exists by inserting a record
    const usageId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("freellmapi_usage", {
        model: "test",
        routedVia: "test",
        latencyMs: 0,
        tokensUsed: 0,
        success: true,
        createdAt: Date.now(),
      });
    });
    expect(usageId).toBeDefined();
    // Clean up
    await t.run(async (ctx: any) => {
      await ctx.db.delete(usageId);
    });
  });

  test("can insert and query freellmapi_usage", async () => {
    const t = convexTest(schema, modules);
    const usageId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("freellmapi_usage", {
        model: "gemini-2.5-flash",
        routedVia: "mock/google:gemini-2.5-flash",
        latencyMs: 150,
        tokensUsed: 30,
        success: true,
        createdAt: Date.now(),
      });
    });
    expect(usageId).toBeDefined();

    const usage = await t.run(async (ctx: any) => {
      return await ctx.db.get(usageId);
    });
    expect(usage?.model).toBe("gemini-2.5-flash");
    expect(usage?.success).toBe(true);
  });

  test("can insert usage with error", async () => {
    const t = convexTest(schema, modules);
    const usageId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("freellmapi_usage", {
        model: "test-model",
        routedVia: "error",
        latencyMs: 0,
        tokensUsed: 0,
        success: false,
        error: "Connection failed",
        createdAt: Date.now(),
      });
    });
    expect(usageId).toBeDefined();

    const usage = await t.run(async (ctx: any) => {
      return await ctx.db.get(usageId);
    });
    expect(usage?.success).toBe(false);
    expect(usage?.error).toBe("Connection failed");
  });

  test("indexes work for freellmapi_usage", async () => {
    const t = convexTest(schema, modules);
    
    // Insert multiple records
    await t.run(async (ctx: any) => {
      await ctx.db.insert("freellmapi_usage", {
        model: "model-a",
        routedVia: "provider-a",
        latencyMs: 100,
        tokensUsed: 10,
        success: true,
        createdAt: Date.now() - 5000,
      });
      await ctx.db.insert("freellmapi_usage", {
        model: "model-b",
        routedVia: "provider-b",
        latencyMs: 200,
        tokensUsed: 20,
        success: true,
        createdAt: Date.now() - 4000,
      });
      await ctx.db.insert("freellmapi_usage", {
        model: "model-a",
        routedVia: "provider-a",
        latencyMs: 150,
        tokensUsed: 15,
        success: false,
        createdAt: Date.now() - 3000,
      });
    });

    // Query by model index
    const byModel = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("freellmapi_usage")
        .withIndex("by_model", (q: any) => q.eq("model", "model-a"))
        .collect();
    });
    expect(byModel.length).toBe(2);

    // Query by created index
    const byCreated = await t.run(async (ctx: any) => {
      const cutoff = Date.now() - 4500;
      return await ctx.db
        .query("freellmapi_usage")
        .withIndex("by_created", (q: any) => q.gte("createdAt", cutoff))
        .collect();
    });
    expect(byCreated.length).toBe(2);
  });

  test("can query analytics with aggregation", async () => {
    const t = convexTest(schema, modules);
    
    // Insert test data
    await t.run(async (ctx: any) => {
      await ctx.db.insert("freellmapi_usage", {
        model: "gemini-2.5-flash",
        routedVia: "google",
        latencyMs: 100,
        tokensUsed: 20,
        success: true,
        createdAt: Date.now() - 1000,
      });
      await ctx.db.insert("freellmapi_usage", {
        model: "llama-3.3-70b",
        routedVia: "groq",
        latencyMs: 200,
        tokensUsed: 30,
        success: true,
        createdAt: Date.now() - 2000,
      });
      await ctx.db.insert("freellmapi_usage", {
        model: "gemini-2.5-flash",
        routedVia: "error",
        latencyMs: 0,
        tokensUsed: 0,
        success: false,
        error: "Connection failed",
        createdAt: Date.now() - 3000,
      });
    });

    // Query and aggregate
    const analytics = await t.run(async (ctx: any) => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const usage = await ctx.db
        .query("freellmapi_usage")
        .filter((q: any) => q.gte(q.field("createdAt"), cutoff))
        .collect();

      const totalRequests = usage.length;
      const successfulRequests = usage.filter((u: any) => u.success).length;
      const totalTokens = usage.reduce((sum: number, u: any) => sum + u.tokensUsed, 0);
      const avgLatency = totalRequests > 0
        ? usage.reduce((sum: number, u: any) => sum + u.latencyMs, 0) / totalRequests
        : 0;

      // Group by model
      const byModel: Record<string, number> = {};
      usage.forEach((u: any) => {
        byModel[u.model] = (byModel[u.model] || 0) + 1;
      });

      // Group by routed provider
      const byProvider: Record<string, number> = {};
      usage.forEach((u: any) => {
        byProvider[u.routedVia] = (byProvider[u.routedVia] || 0) + 1;
      });

      return {
        totalRequests,
        successfulRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        totalTokens,
        avgLatency: Math.round(avgLatency),
        byModel,
        byProvider,
      };
    });

    expect(analytics.totalRequests).toBe(3);
    expect(analytics.successfulRequests).toBe(2);
    expect(analytics.successRate).toBeCloseTo(66.67, 1);
    expect(analytics.totalTokens).toBe(50);
    expect(analytics.avgLatency).toBe(100);
    expect(analytics.byModel["gemini-2.5-flash"]).toBe(2);
    expect(analytics.byModel["llama-3.3-70b"]).toBe(1);
    expect(analytics.byProvider["google"]).toBe(1);
    expect(analytics.byProvider["groq"]).toBe(1);
    expect(analytics.byProvider["error"]).toBe(1);
  });
});
