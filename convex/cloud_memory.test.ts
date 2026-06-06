/// <reference types="vite/client" />
// Cloud Memory & Self-Healing System tests
// Tests the auth gate, fix logic, query correctness, and the
// public action wrappers used by the dashboard.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Helper: create a valid admin session for tests that need to bypass auth
async function setupAdminSession(t: any) {
  const userId = await t.run(async (ctx: any) => {
    return await ctx.db.insert("users", {
      email: "cloud-mem-admin@example.com",
      name: "Cloud Mem Test Admin",
      role: "admin",
    });
  });
  const sessionId = await t.run(async (ctx: any) => {
    return await ctx.db.insert("user_sessions", {
      userId,
      userType: "admin",
      device: "test-device",
      location: "Test",
      ip: "127.0.0.1",
      fingerprint: "test-fp",
      lastActive: Date.now(),
      isCurrent: true,
      isTwoFactorVerified: true,
      deviceInfo: { userAgent: "test", deviceType: "desktop" },
      isRevoked: false,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
  });
  return { userId, sessionId };
}

// ═══════════════════════════════════════════════════════════════════
// 1. REGRESSION TEST — the original bug
// ═══════════════════════════════════════════════════════════════════
// The dashboard used to call useAction(internal.cloud_memory.runSelfHealing)
// which returned [CONVEX A(cloud_memory:runSelfHealing)] Server Error
// because internal functions can NOT be called from the client.
// The fix: added public action wrappers (runSelfHealingAction,
// autoBackupAction, sendHealingReportAction) that require admin auth
// and delegate to the internal versions. The internal versions still
// exist for cron use.

describe("Cloud Memory auth gate (regression for [CONVEX A] Server Error)", () => {
  test("runSelfHealingAction returns auth error without adminToken", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {});
    expect(result.issues).toContain("Not authenticated as admin");
    expect(result.healed).toBe(false);
  });

  test("autoBackupAction returns auth error without adminToken", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.action(api.cloud_memory.autoBackupAction, {});
    expect(result.results).toContain("Not authenticated as admin");
  });

  test("sendHealingReportAction returns null without adminToken", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.action(api.cloud_memory.sendHealingReportAction, { report: { healed: true } });
    expect(result).toBeNull();
  });

  test("runSelfHealingAction returns auth error with bogus adminToken", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: "fake-session-id" });
    expect(result.issues).toContain("Not authenticated as admin");
  });

  test("runSelfHealingAction returns auth error with revoked admin session", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await setupAdminSession(t);
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test-device",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test-fp-revoked",
        lastActive: Date.now(),
        isCurrent: false,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: true, // revoked!
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    expect(result.issues).toContain("Not authenticated as admin");
  });

  test("runSelfHealingAction returns auth error with expired admin session", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await setupAdminSession(t);
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "admin",
        device: "test-device",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test-fp-expired",
        lastActive: Date.now() - 7200000,
        isCurrent: false,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() - 3600000, // expired 1h ago
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    expect(result.issues).toContain("Not authenticated as admin");
  });

  test("runSelfHealingAction returns auth error with non-admin user session", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "client@example.com",
        name: "Client User",
        role: "user",
      });
    });
    const sessionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("user_sessions", {
        userId,
        userType: "client", // not admin
        device: "test-device",
        location: "Test",
        ip: "127.0.0.1",
        fingerprint: "test-fp-client",
        lastActive: Date.now(),
        isCurrent: true,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "test", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    expect(result.issues).toContain("Not authenticated as admin");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. SUCCESS PATH — the actions work end-to-end
// ═══════════════════════════════════════════════════════════════════

describe("Cloud Memory self-healing success path", () => {
  test("runSelfHealingAction succeeds with valid adminToken and empty system", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.fixes)).toBe(true);
    expect(result.healed).toBe(false); // nothing to heal in a fresh system
    expect(typeof result.timestamp).toBe("number");
  });

  test("runSelfHealingAction heals stuck social posts (1h+ old)", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    // Insert a stuck social post
    await t.run(async (ctx: any) => {
      await ctx.db.insert("social_posts", {
        agentId: "agent-1",
        platform: "x",
        content: "Stuck post",
        status: "scheduled",
        scheduledFor: Date.now() - 7200000, // 2 hours ago
        anonymous: false,
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    expect(result.fixes.some((f: string) => f.includes("stuck social posts"))).toBe(true);
    expect(result.healed).toBe(true);

    // Verify the post was marked failed
    const posts: any = await t.run(async (ctx: any) => ctx.db.query("social_posts").collect());
    expect(posts[0].status).toBe("failed");
    expect(posts[0].error).toMatch(/stuck/i);
  });

  test("runSelfHealingAction does NOT heal posts scheduled for the future", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    await t.run(async (ctx: any) => {
      await ctx.db.insert("social_posts", {
        agentId: "agent-1",
        platform: "x",
        content: "Future post",
        status: "scheduled",
        scheduledFor: Date.now() + 3600000, // 1 hour in the future
        anonymous: false,
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    // No fixes should mention stuck posts
    expect(result.fixes.some((f: string) => f.includes("stuck social posts"))).toBe(false);

    // Post should still be scheduled
    const posts: any = await t.run(async (ctx: any) => ctx.db.query("social_posts").collect());
    expect(posts[0].status).toBe("scheduled");
  });

  test("runSelfHealingAction cleans up expired sessions", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    // Insert an expired session
    await t.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", {
        email: "expired@example.com",
        name: "Expired",
        role: "user",
      });
      await ctx.db.insert("user_sessions", {
        userId,
        userType: "client",
        device: "old",
        location: "Old",
        ip: "127.0.0.1",
        fingerprint: "old-fp",
        lastActive: Date.now() - 7200000,
        isCurrent: false,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "old", deviceType: "desktop" },
        isRevoked: false,
        expiresAt: Date.now() - 3600000, // expired
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    expect(result.fixes.some((f: string) => f.includes("expired sessions"))).toBe(true);
  });

  test("runSelfHealingAction cleans up REVOKED sessions even if not expired", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    await t.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", {
        email: "revoked@example.com",
        name: "Revoked",
        role: "user",
      });
      await ctx.db.insert("user_sessions", {
        userId,
        userType: "client",
        device: "revoked",
        location: "Revoked",
        ip: "127.0.0.1",
        fingerprint: "revoked-fp",
        lastActive: Date.now(),
        isCurrent: false,
        isTwoFactorVerified: true,
        deviceInfo: { userAgent: "revoked", deviceType: "desktop" },
        isRevoked: true, // revoked but not expired
        expiresAt: Date.now() + 3600000,
      });
    });
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    expect(result.fixes.some((f: string) => f.includes("expired sessions"))).toBe(true);
  });

  test("runSelfHealingAction detects missing wallets as an issue", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    // No wallets inserted — should detect as issue
    const result: any = await t.action(api.cloud_memory.runSelfHealingAction, {
      adminToken: sessionId,
    });
    expect(result.issues.some((i: string) => i.includes("wallet"))).toBe(true);
  });

  test("runSelfHealingAction logs the healing attempt to system_config", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    const logs: any = await t.run(async (ctx: any) =>
      ctx.db.query("system_config").collect()
    );
    const healingLogs = logs.filter((l: any) =>
      typeof l.key === "string" && l.key.startsWith("healing_log_")
    );
    expect(healingLogs.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. AUTO-BACKUP
// ═══════════════════════════════════════════════════════════════════

describe("Cloud Memory auto-backup", () => {
  test("autoBackupAction succeeds with valid adminToken", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    const result: any = await t.action(api.cloud_memory.autoBackupAction, {
      adminToken: sessionId,
    });
    expect(result).toBeDefined();
    expect(typeof result.timestamp).toBe("number");
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test("autoBackupAction creates backup records for each subsystem", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    await t.action(api.cloud_memory.autoBackupAction, { adminToken: sessionId });
    const backups: any = await t.run(async (ctx: any) =>
      ctx.db.query("system_backups").collect()
    );
    const types = new Set(backups.map((b: any) => b.backupType));
    expect(types.has("schema_config")).toBe(true);
    expect(types.has("auth_config")).toBe(true);
    expect(types.has("social_config")).toBe(true);
    expect(types.has("payment_config")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. HEALING HISTORY
// ═══════════════════════════════════════════════════════════════════

describe("getHealingHistory", () => {
  test("returns empty array when no healing has occurred", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.query(api.cloud_memory.getHealingHistory, {});
    expect(result).toEqual([]);
  });

  test("returns past healing attempts in reverse chronological order", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    // Run healing 3 times
    for (let i = 0; i < 3; i++) {
      await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    }
    const result: any = await t.query(api.cloud_memory.getHealingHistory, { limit: 10 });
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Verify descending order
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1].value.timestamp || result[i - 1].updatedAt || result[i - 1]._creationTime;
      const curr = result[i].value.timestamp || result[i].updatedAt || result[i]._creationTime;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  test("respects the limit parameter", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    for (let i = 0; i < 5; i++) {
      await t.action(api.cloud_memory.runSelfHealingAction, { adminToken: sessionId });
    }
    const result: any = await t.query(api.cloud_memory.getHealingHistory, { limit: 2 });
    expect(result.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════

describe("getSystemHealth", () => {
  test("returns optimal status (100 - 15 backup penalty = 85) for empty system", async () => {
    const t = convexTest(schema, modules);
    const result: any = await t.query(api.cloud_memory.getSystemHealth, {});
    // An empty system has no backups → -15 penalty → 85
    // Still "optimal" because healthScore >= 80
    expect(result.status).toBe("optimal");
    expect(result.healthScore).toBe(85);
    expect(result.isLive).toBe(true);
  });

  test("returns 100 score when a recent backup exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_health",
      data: { hello: "world" },
    });
    const result: any = await t.query(api.cloud_memory.getSystemHealth, {});
    expect(result.healthScore).toBe(100);
    expect(result.status).toBe("optimal");
  });

  test("health score decreases with stuck posts", async () => {
    const t = convexTest(schema, modules);
    // Insert 2 stuck posts
    await t.run(async (ctx: any) => {
      for (let i = 0; i < 2; i++) {
        await ctx.db.insert("social_posts", {
          agentId: "a",
          platform: "x",
          content: "stuck",
          status: "scheduled",
          scheduledFor: Date.now() - 7200000,
          anonymous: false,
        });
      }
    });
    const result: any = await t.query(api.cloud_memory.getSystemHealth, {});
    // 2 stuck × 3 = 6 penalty
    expect(result.healthScore).toBeLessThan(100);
    expect(result.social.stuckPosts).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. BACKUP / RESTORE
// ═══════════════════════════════════════════════════════════════════

describe("Backup and restore", () => {
  test("createBackup creates a system_backups row with checksum", async () => {
    const t = convexTest(schema, modules);
    const id: any = await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_config",
      data: { foo: "bar" },
      description: "Test backup",
    });
    expect(id).toBeDefined();
    const row: any = await t.run(async (ctx: any) => ctx.db.get(id));
    expect(row.backupType).toBe("test_config");
    expect(row.data).toEqual({ foo: "bar" });
    expect(row.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(row.status).toBe("active");
  });

  test("getLatestBackup returns most recent for a type", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_latest",
      data: { v: 1 },
    });
    await new Promise((r) => setTimeout(r, 10));
    await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_latest",
      data: { v: 2 },
    });
    const latest: any = await t.query(api.cloud_memory.getLatestBackup, {
      backupType: "test_latest",
    });
    expect(latest.data).toEqual({ v: 2 });
  });

  test("getAllBackups returns all active backups", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_all",
      data: {},
    });
    const all: any = await t.query(api.cloud_memory.getAllBackups, {});
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.every((b: any) => b.status === "active")).toBe(true);
  });

  test("restoreFromBackup returns the backup data", async () => {
    const t = convexTest(schema, modules);
    const id: any = await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_restore",
      data: { restored: true },
    });
    const result: any = await t.mutation(api.cloud_memory.restoreFromBackup, {
      backupId: id,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ restored: true });
  });

  test("restoreFromBackup throws 'Backup not found' for missing id", async () => {
    const t = convexTest(schema, modules);
    // Create a backup, then delete it, then try to restore
    const id: any = await t.mutation(internal.cloud_memory.createBackup, {
      backupType: "test_delete",
      data: { x: 1 },
    });
    await t.run(async (ctx: any) => await ctx.db.delete(id));
    await expect(
      t.mutation(api.cloud_memory.restoreFromBackup, { backupId: id })
    ).rejects.toThrow("Backup not found");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. SEND HEALING REPORT
// ═══════════════════════════════════════════════════════════════════

describe("sendHealingReportAction", () => {
  test("stores report as a healing_report backup", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupAdminSession(t);
    await t.action(api.cloud_memory.sendHealingReportAction, {
      adminToken: sessionId,
      report: { healed: true, fixes: ["test fix"] },
    });
    const backups: any = await t.run(async (ctx: any) =>
      ctx.db.query("system_backups")
        .withIndex("by_type_and_time", (q: any) => q.eq("backupType", "healing_report"))
        .collect()
    );
    expect(backups.length).toBeGreaterThanOrEqual(1);
    expect(backups[0].data).toEqual({ healed: true, fixes: ["test fix"] });
  });
});
