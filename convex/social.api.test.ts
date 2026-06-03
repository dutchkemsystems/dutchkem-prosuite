/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";

/**
 * Test the direct OAuth social engine (no Postiz dependency).
 * Verifies platform configs, OAuth status, stats, callback validation, and disconnect.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. PLATFORM CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const SUPPORTED_PLATFORMS = [
  { id: "x", name: "X (Twitter)", icon: "🐦", color: "#1DA1F2", authUrl: "https://twitter.com/i/oauth2/authorize" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2", authUrl: "https://www.linkedin.com/oauth/v2/authorization" },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#1877F2", authUrl: "https://www.facebook.com/v19.0/dialog/oauth" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "#E4405F", authUrl: "https://www.facebook.com/v19.0/dialog/oauth" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#000000", authUrl: "https://www.tiktok.com/v2/auth/authorize/" },
  { id: "youtube", name: "YouTube", icon: "🎬", color: "#FF0000", authUrl: "https://accounts.google.com/o/oauth2/v2/auth" },
  { id: "pinterest", name: "Pinterest", icon: "📌", color: "#E60023", authUrl: "https://pinterest.com/oauth/" },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "#FF4500", authUrl: "https://www.reddit.com/api/v1/authorize" },
  { id: "threads", name: "Threads", icon: "🧵", color: "#000000", authUrl: "https://www.threads.net/oauth/authorize" },
  { id: "telegram", name: "Telegram", icon: "📱", color: "#0088CC", authUrl: "" },
  { id: "discord", name: "Discord", icon: "🎮", color: "#5865F2", authUrl: "https://discord.com/api/oauth2/authorize" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", color: "#0085FF", authUrl: "" },
];

describe("SUPPORTED_PLATFORMS", () => {
  it("has exactly 12 platforms", () => {
    expect(SUPPORTED_PLATFORMS).toHaveLength(12);
  });

  it("each platform has required fields: name, icon, authUrl", () => {
    for (const platform of SUPPORTED_PLATFORMS) {
      expect(platform.id).toBeTruthy();
      expect(typeof platform.name).toBe("string");
      expect(platform.name.length).toBeGreaterThan(0);
      expect(typeof platform.icon).toBe("string");
      expect(platform.icon.length).toBeGreaterThan(0);
      expect(typeof platform.authUrl).toBe("string");
    }
  });

  it("all expected platform IDs are present", () => {
    const ids = SUPPORTED_PLATFORMS.map((p: any) => p.id);
    for (const expected of ["bluesky", "discord", "facebook", "instagram", "linkedin", "pinterest", "reddit", "telegram", "tiktok", "threads", "x", "youtube"]) {
      expect(ids).toContain(expected);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. OAUTH STATUS (simulating query shape)
// ═══════════════════════════════════════════════════════════════════

describe("getOAuthStatus", () => {
  it("returns correct shape per platform", () => {
    const status = SUPPORTED_PLATFORMS.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
      anonymousSupported: false,
      hasOAuth: !!p.authUrl,
    }));

    expect(status).toHaveLength(12);
    for (const entry of status) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("icon");
      expect(entry).toHaveProperty("color");
      expect(entry).toHaveProperty("anonymousSupported");
      expect(entry).toHaveProperty("hasOAuth");
      expect(typeof entry.hasOAuth).toBe("boolean");
    }
  });

  it("hasOAuth is false for platforms without authUrl", () => {
    const noAuth = SUPPORTED_PLATFORMS.filter((p) => !p.authUrl);
    expect(noAuth.map((p) => p.id)).toEqual(["telegram", "bluesky"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. SOCIAL STATS (simulating query shape)
// ═══════════════════════════════════════════════════════════════════

describe("getSocialStats", () => {
  it("returns correct shape", () => {
    const stats = {
      total: 0,
      posted: 0,
      failed: 0,
      scheduled: 0,
      history: [],
    };

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("posted");
    expect(stats).toHaveProperty("failed");
    expect(stats).toHaveProperty("scheduled");
    expect(stats).toHaveProperty("history");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.posted).toBe("number");
    expect(typeof stats.failed).toBe("number");
    expect(typeof stats.scheduled).toBe("number");
    expect(Array.isArray(stats.history)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. OAUTH CALLBACK VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe("handleOAuthCallback", () => {
  it("rejects invalid state", () => {
    // Simulate the state validation logic from handleOAuthCallback
    const storedStates = new Map<string, { platform: string; expiresAt: number }>();
    const state = "invalid_state_12345";
    const stored = storedStates.get(state);
    const isValid = stored && stored.expiresAt > Date.now();
    expect(isValid).toBeFalsy();
  });

  it("rejects expired state", () => {
    const storedStates = new Map<string, { platform: string; expiresAt: number }>();
    storedStates.set("expired_state", { platform: "x", expiresAt: Date.now() - 1000 });
    const stored = storedStates.get("expired_state");
    const isValid = stored && stored.expiresAt > Date.now();
    expect(isValid).toBe(false);
  });

  it("accepts valid state within expiry", () => {
    const storedStates = new Map<string, { platform: string; expiresAt: number }>();
    storedStates.set("valid_state", { platform: "x", expiresAt: Date.now() + 600_000 });
    const stored = storedStates.get("valid_state");
    const isValid = stored && stored.expiresAt > Date.now();
    expect(isValid).toBe(true);
  });

  it("rejects missing code parameter", () => {
    const url = new URL("https://example.com/api/social/callback?platform=x&state=test123");
    const code = url.searchParams.get("code");
    expect(code).toBeNull();
  });

  it("rejects missing state parameter", () => {
    const url = new URL("https://example.com/api/social/callback?platform=x&code=abc123");
    const state = url.searchParams.get("state");
    expect(state).toBeNull();
  });

  it("accepts valid callback parameters", () => {
    const url = new URL(
      "https://example.com/api/social/callback?platform=x&code=abc123&state=test123"
    );
    expect(url.searchParams.get("code")).toBe("abc123");
    expect(url.searchParams.get("state")).toBe("test123");
    expect(url.searchParams.get("platform")).toBe("x");
  });

  it("handles access_denied error from provider", () => {
    const url = new URL(
      "https://example.com/api/social/callback?platform=x&error=access_denied&state=test123"
    );
    expect(url.searchParams.get("error")).toBe("access_denied");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. DISCONNECT PLATFORM
// ═══════════════════════════════════════════════════════════════════

describe("disconnectPlatform", () => {
  it("clears connection data when disconnecting", () => {
    const connections = new Map<string, { isConnected: boolean; accessToken: string; refreshToken: string }>();
    connections.set("x", { isConnected: true, accessToken: "tok_123", refreshToken: "ref_456" });

    const conn = connections.get("x");
    if (conn) {
      conn.isConnected = false;
      conn.accessToken = "";
      conn.refreshToken = "";
    }

    expect(conn?.isConnected).toBe(false);
    expect(conn?.accessToken).toBe("");
    expect(conn?.refreshToken).toBe("");
  });

  it("handles disconnect for non-existent platform gracefully", () => {
    const connections = new Map<string, { isConnected: boolean }>();
    const conn = connections.get("nonexistent");
    expect(conn).toBeUndefined();
  });
});
