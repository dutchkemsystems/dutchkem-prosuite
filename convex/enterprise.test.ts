// enterprise.test.ts
// Tests for enterprise schema module
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Enterprise Schema Module", () => {
  test("enterprise_organizations table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_organizations", {
        name: "Test Corp",
        email: "admin@testcorp.com",
        passwordHash: "hashed-password",
        plan: "enterprise",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(orgId).toBeDefined();

    const org = await t.run(async (ctx: any) => {
      return await ctx.db.get(orgId);
    });

    expect(org).toBeDefined();
    expect(org?.name).toBe("Test Corp");
    expect(org?.email).toBe("admin@testcorp.com");
  });

  test("enterprise_members table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "member@enterprise.com",
        name: "Enterprise Member",
        role: "user",
      });
    });

    const orgId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_organizations", {
        name: "Member Test Corp",
        email: "admin@membertest.com",
        passwordHash: "hashed-password",
        plan: "enterprise",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const memberId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_members", {
        orgId,
        userId,
        role: "admin",
        joinedAt: Date.now(),
      });
    });

    expect(memberId).toBeDefined();

    const member = await t.run(async (ctx: any) => {
      return await ctx.db.get(memberId);
    });

    expect(member).toBeDefined();
    expect(member?.role).toBe("admin");
  });

  test("enterprise_clients table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_organizations", {
        name: "Client Test Corp",
        email: "admin@clienttest.com",
        passwordHash: "hashed-password",
        plan: "enterprise",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const clientId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_clients", {
        companyId: "client-test-001",
        orgId,
        name: "Test Client",
        email: "client@test.com",
        status: "active",
        totalSpent: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(clientId).toBeDefined();

    const client = await t.run(async (ctx: any) => {
      return await ctx.db.get(clientId);
    });

    expect(client).toBeDefined();
    expect(client?.name).toBe("Test Client");
    expect(client?.email).toBe("client@test.com");
  });

  test("enterprise_audit_logs table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_organizations", {
        name: "Audit Test Corp",
        email: "admin@audittest.com",
        passwordHash: "hashed-password",
        plan: "enterprise",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const logId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("enterprise_audit_logs", {
        eventType: "member.added",
        actor: "admin@audittest.com",
        action: "member.added",
        target: "test-member-id",
        details: { role: "admin" },
        createdAt: Date.now(),
      });
    });

    expect(logId).toBeDefined();

    const log = await t.run(async (ctx: any) => {
      return await ctx.db.get(logId);
    });

    expect(log).toBeDefined();
    expect(log?.action).toBe("member.added");
    expect(log?.eventType).toBe("member.added");
  });
});
