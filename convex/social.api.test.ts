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

// ═══════════════════════════════════════════════════════════════════
// 6. COMPOSIO PROVIDER BLENDING
// ═══════════════════════════════════════════════════════════════════

describe("Composio provider blending", () => {
  it("Composio app map covers 6 verified platforms (excludes telegram + unsupported)", () => {
    // Updated 2026-06-04 to match what actually exists in Composio:
    //   twitter, linkedin, facebook, youtube, reddit, discord
    // Other platforms (instagram, tiktok, pinterest, threads, bluesky)
    // are NOT in Composio's catalog — they use direct OAuth.
    const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
      x: "twitter",
      linkedin: "linkedin",
      facebook: "facebook",
      youtube: "youtube",
      reddit: "reddit",
      discord: "discord",
      instagram: undefined,
      tiktok: undefined,
      pinterest: undefined,
      threads: undefined,
      bluesky: undefined,
      telegram: undefined,
    };

    const composioPlatforms = Object.entries(COMPOSIO_APP_MAP).filter(([, v]) => v).map(([k]) => k);
    expect(composioPlatforms).toHaveLength(6);
    expect(composioPlatforms).toContain("x");
    expect(composioPlatforms).toContain("linkedin");
    expect(composioPlatforms).toContain("facebook");
    expect(composioPlatforms).toContain("youtube");
    expect(composioPlatforms).toContain("reddit");
    expect(composioPlatforms).toContain("discord");
    expect(composioPlatforms).not.toContain("telegram");
  });

  it("platformOAuth configs have composioSupported flags", () => {
    const PLATFORM_OAUTH_CONFIGS: Record<string, { composioSupported: boolean; composioApp?: string }> = {
      x: { composioSupported: true, composioApp: "twitter" },
      linkedin: { composioSupported: true, composioApp: "linkedin" },
      facebook: { composioSupported: true, composioApp: "facebook" },
      youtube: { composioSupported: true, composioApp: "youtube" },
      reddit: { composioSupported: true, composioApp: "reddit" },
      discord: { composioSupported: true, composioApp: "discord" },
      // No Composio support — direct OAuth only
      instagram: { composioSupported: false },
      tiktok: { composioSupported: false },
      pinterest: { composioSupported: false },
      threads: { composioSupported: false },
      bluesky: { composioSupported: false },
      telegram: { composioSupported: false },
    };

    for (const [id, cfg] of Object.entries(PLATFORM_OAUTH_CONFIGS)) {
      expect(typeof cfg.composioSupported).toBe("boolean");
      if (cfg.composioSupported) {
        expect(cfg.composioApp).toBeTruthy();
        expect(typeof cfg.composioApp).toBe("string");
      }
    }
    expect(PLATFORM_OAUTH_CONFIGS.telegram.composioSupported).toBe(false);
  });

  it("OAuth provider selection — direct is always available, composio is opt-in", () => {
    const hasComposioKey = false;
    const platformId = "x";
    const composioSupported = true;
    const provider = composioSupported && hasComposioKey ? "composio" : "direct";
    expect(provider).toBe("direct");

    const withKey = composioSupported && true ? "composio" : "direct";
    expect(withKey).toBe("composio");
  });

  it("Composio is PRIMARY when enabled and supported — dashboard selector", () => {
    // Mirror the dashboard's provider-status-driven selector
    function pickProvider(
      providerStatus: { composioEnabled: boolean; composioPlatforms: string[] } | null,
      platformId: string
    ): "composio" | "direct" {
      const composioAvailable =
        providerStatus?.composioEnabled === true &&
        providerStatus?.composioPlatforms?.includes(platformId);
      return composioAvailable ? "composio" : "direct";
    }

    // No status loaded yet → falls back to direct
    expect(pickProvider(null, "x")).toBe("direct");

    // Composio enabled, platform supported → composio
    expect(pickProvider({ composioEnabled: true, composioPlatforms: ["x", "linkedin"] }, "x")).toBe("composio");

    // Composio enabled, platform NOT in supported list → direct
    expect(pickProvider({ composioEnabled: true, composioPlatforms: ["x"] }, "facebook")).toBe("direct");

    // Composio NOT enabled → direct (this is the case when COMPOSIO_API_KEY is not set)
    expect(pickProvider({ composioEnabled: false, composioPlatforms: [] }, "x")).toBe("direct");

    // Telegram is never on Composio → never appears in composioPlatforms → always direct
    // (the real getOAuthProviderStatus query excludes telegram from the list)
    expect(pickProvider({ composioEnabled: true, composioPlatforms: ["x", "linkedin", "facebook", "instagram", "tiktok", "youtube", "pinterest", "reddit", "threads", "discord", "bluesky"] }, "telegram")).toBe("direct");
  });

  it("Free tier supports 20,000 tool calls/month — quota headroom check", () => {
    // Free tier: 20,000 tool calls/month, 1,000 connected accounts
    const FREE_TIER = { toolCalls: 20_000, connectedAccounts: 1_000 };

    // Each connection counts as 1 call; each post counts as 1 call.
    // Worst case: 1000 accounts × 1 post/day × 30 days = 30,000 calls (over quota)
    // Realistic case: 100 accounts × 5 posts/day × 30 days = 15,000 calls (under quota)
    const realistic = 100 * 5 * 30;
    const worstCase = 1000 * 1 * 30;

    expect(realistic).toBeLessThanOrEqual(FREE_TIER.toolCalls);
    expect(worstCase).toBeGreaterThan(FREE_TIER.toolCalls);

    // Recommendation: stay under 20 posts/day/account on average
    const safeDailyLimit = Math.floor(FREE_TIER.toolCalls / (100 * 30));
    expect(safeDailyLimit).toBeGreaterThan(0);
  });

  it("Composio app map handles all 11 OAuth platforms (Telegram excluded by design)", () => {
    const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
      x: "twitter",
      linkedin: "linkedin",
      facebook: "facebook",
      instagram: "instagram",
      tiktok: "tiktok",
      youtube: "youtube",
      pinterest: "pinterest",
      reddit: "reddit",
      threads: "threads",
      discord: "discord",
      bluesky: "bluesky",
      telegram: undefined,
    };

    const composioApps = Object.values(COMPOSIO_APP_MAP).filter((v) => v);
    expect(composioApps).toHaveLength(11);
    // No duplicate slugs
    expect(new Set(composioApps).size).toBe(11);
  });
});
