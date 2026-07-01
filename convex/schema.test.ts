// schema.test.ts
// Tests for modularized schema to ensure all tables are properly defined
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Schema Modularization", () => {
  test("schema can be used with convexTest", async () => {
    const t = convexTest(schema, modules);
    expect(t).toBeDefined();
  });

  test("can insert and query users table", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "schema-test@example.com",
        name: "Schema Test",
        role: "user",
      });
    });
    expect(userId).toBeDefined();
    const user = await t.run(async (ctx: any) => {
      return await ctx.db.get(userId);
    });
    expect(user?.email).toBe("schema-test@example.com");
  });

  test("can insert and query subscriptions table", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "sub-schema-test@example.com",
        name: "Sub Schema Test",
        role: "user",
      });
    });
    const subId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("subscriptions", {
        userId,
        plan: "monthly",
        status: "active",
        endsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
        failureCount: 0,
      });
    });
    expect(subId).toBeDefined();
    const sub = await t.run(async (ctx: any) => {
      return await ctx.db.get(subId);
    });
    expect(sub?.plan).toBe("monthly");
  });

  test("can insert and query ai_agents table", async () => {
    const t = convexTest(schema, modules);
    const agentId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("ai_agents", {
        name: "Test Agent",
        description: "A test agent",
        type: "test",
      });
    });
    expect(agentId).toBeDefined();
    const agent = await t.run(async (ctx: any) => {
      return await ctx.db.get(agentId);
    });
    expect(agent?.name).toBe("Test Agent");
  });

  test("can insert and query enterprise_organizations table", async () => {
    const t = convexTest(schema, modules);
    const orgId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_organizations", {
        name: "Test Corp",
        email: "admin@testcorp.com",
        passwordHash: "hashed-password",
        status: "trial",
        plan: "trial",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect(orgId).toBeDefined();
    const org = await t.run(async (ctx: any) => {
      return await ctx.db.get(orgId);
    });
    expect(org?.name).toBe("Test Corp");
    expect(org?.email).toBe("admin@testcorp.com");
  });

  test("can insert and query ad_campaigns table", async () => {
    const t = convexTest(schema, modules);
    const campaignId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("ad_campaigns", {
        name: "Test Campaign",
        platform: "x",
        status: "draft",
        spent: 0,
        startDate: Date.now(),
        createdBy: "test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect(campaignId).toBeDefined();
  });

  test("can insert and query social_posts table", async () => {
    const t = convexTest(schema, modules);
    const postId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("social_posts", {
        agentId: "A3",
        platform: "X",
        content: "Test post content",
        status: "draft",
        scheduledFor: Date.now(),
      });
    });
    expect(postId).toBeDefined();
  });

  test("can insert and query kdp_projects table", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "kdp-test@example.com",
        name: "KDP Test",
        role: "user",
      });
    });
    const projectId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("kdp_projects", {
        userId,
        title: "Test Book",
        status: "planning",
        assets: {},
        metadata: {
          keywords: [],
          categories: [],
          description: "A test book",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    expect(projectId).toBeDefined();
  });

  test("can insert and query notifications table", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "notif-test@example.com",
        name: "Notification Test",
        role: "user",
      });
    });
    const notifId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("notifications", {
        userId,
        title: "Test Notification",
        message: "This is a test",
        type: "system",
        read: false,
        createdAt: Date.now(),
      });
    });
    expect(notifId).toBeDefined();
  });
});
