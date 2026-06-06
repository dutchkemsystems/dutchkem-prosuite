// auth_helpers.test.ts
// Tests for the auth_helpers module — focused on the new checkAdminSession query
// (which is the public-facing session check used by the admin dashboard).
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("auth_helpers — checkAdminSession", () => {
  test("returns { valid: false } when adminToken is missing", async () => {
    const t = convexTest(schema, modules);
    const r: any = await t.query(api.auth_helpers.checkAdminSession, {});
    expect(r.valid).toBe(false);
  });

  test("returns { valid: false } when adminToken points to a non-existent session", async () => {
    const t = convexTest(schema, modules);
    const r: any = await t.query(api.auth_helpers.checkAdminSession, {
      adminToken: "non_existent_session_id_12345",
    });
    expect(r.valid).toBe(false);
  });

  test("returns { valid: false } when session exists but is expired", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "expired-test@example.com",
        name: "Expired Test",
        role: "admin",
      });
    });
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test",
        lastActive: Date.now() - 2 * 60 * 60 * 1000,
        isCurrent: true,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() - 60 * 1000,
      });
    });
    const r: any = await t.query(api.auth_helpers.checkAdminSession, { adminToken: sessionId });
    expect(r.valid).toBe(false);
  });

  test("returns { valid: false } when session is revoked", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "revoked-test@example.com",
        name: "Revoked Test",
        role: "admin",
      });
    });
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test",
        lastActive: Date.now(),
        isCurrent: false,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    });
    const r: any = await t.query(api.auth_helpers.checkAdminSession, { adminToken: sessionId });
    expect(r.valid).toBe(false);
  });

  test("returns { valid: false } when session userType is not admin", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "client-test@example.com",
        name: "Client Test",
        role: "user",
      });
    });
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "client",
        device: "test",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test",
        lastActive: Date.now(),
        isCurrent: true,
        isTwoFactorVerified: false,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    });
    const r: any = await t.query(api.auth_helpers.checkAdminSession, { adminToken: sessionId });
    expect(r.valid).toBe(false);
  });

  test("returns { valid: true, email, name, expiresAt } for a valid admin session", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "valid-admin@example.com",
        name: "Valid Admin",
        role: "admin",
      });
    });
    const futureExpiry = Date.now() + 24 * 60 * 60 * 1000;
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test",
        lastActive: Date.now(),
        isCurrent: true,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: futureExpiry,
      });
    });
    const r: any = await t.query(api.auth_helpers.checkAdminSession, { adminToken: sessionId });
    expect(r.valid).toBe(true);
    expect(r.email).toBe("valid-admin@example.com");
    expect(r.name).toBe("Valid Admin");
    expect(r.expiresAt).toBe(futureExpiry);
  });

  test("returns { valid: false } when user is no longer admin", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "demoted@example.com",
        name: "Demoted",
        role: "user",
      });
    });
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test",
        lastActive: Date.now(),
        isCurrent: true,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    });
    const r: any = await t.query(api.auth_helpers.checkAdminSession, { adminToken: sessionId });
    expect(r.valid).toBe(false);
  });
});
