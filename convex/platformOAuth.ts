/**
 * Platform OAuth 2.0 Configuration
 * Each platform has its own OAuth endpoints and credentials.
 * Supports two providers: "direct" (platform's own OAuth) and "composio" (Composio unified OAuth).
 */

export type OAuthProvider = "direct" | "composio";

export interface PlatformOAuthConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  // Platform-specific User-Agent for token exchange
  userAgent?: string;
  // Whether Composio is a valid alternative provider for this platform
  composioSupported: boolean;
  // The Composio app slug (e.g. "twitter", "linkedin")
  composioApp?: string;
}

export const PLATFORM_OAUTH_CONFIGS: Record<string, PlatformOAuthConfig> = {
  x: {
    id: "x",
    name: "X (Twitter)",
    icon: "𝕏",
    color: "#1DA1F2",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    clientIdEnvKey: "TWITTER_CLIENT_ID",
    clientSecretEnvKey: "TWITTER_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "twitter",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "#0A66C2",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "w_member_social r_liteprofile r_emailaddress",
    clientIdEnvKey: "LINKEDIN_CLIENT_ID",
    clientSecretEnvKey: "LINKEDIN_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "linkedin",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    color: "#1877F2",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "pages_manage_posts pages_read_engagement pages_show_list public_profile email",
    clientIdEnvKey: "FACEBOOK_APP_ID",
    clientSecretEnvKey: "FACEBOOK_APP_SECRET",
    composioSupported: true,
    composioApp: "facebook",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "#E4405F",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "pages_manage_posts pages_read_engagement instagram_basic instagram_content_publish",
    clientIdEnvKey: "INSTAGRAM_CLIENT_ID",
    clientSecretEnvKey: "INSTAGRAM_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "instagram",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    color: "#000000",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scope: "user.info.basic video.publish",
    clientIdEnvKey: "TIKTOK_CLIENT_KEY",
    clientSecretEnvKey: "TIKTOK_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "tiktok",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    icon: "🎬",
    color: "#FF0000",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile",
    clientIdEnvKey: "YOUTUBE_CLIENT_ID",
    clientSecretEnvKey: "YOUTUBE_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "youtube",
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    icon: "📌",
    color: "#E60023",
    authUrl: "https://pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scope: "boards:read pins:read pins:write user_accounts:read",
    clientIdEnvKey: "PINTEREST_CLIENT_ID",
    clientSecretEnvKey: "PINTEREST_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "pinterest",
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    icon: "🤖",
    color: "#FF4500",
    authUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    scope: "identity submit read",
    clientIdEnvKey: "REDDIT_CLIENT_ID",
    clientSecretEnvKey: "REDDIT_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "reddit",
  },
  threads: {
    id: "threads",
    name: "Threads",
    icon: "🧵",
    color: "#000000",
    authUrl: "https://www.threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    scope: "threads_basic threads_content_publish",
    clientIdEnvKey: "THREADS_CLIENT_ID",
    clientSecretEnvKey: "THREADS_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "threads",
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    icon: "📱",
    color: "#0088CC",
    authUrl: "https://oauth.telegram.org/auth",
    tokenUrl: "https://oauth.telegram.org/auth/token",
    scope: "",
    clientIdEnvKey: "TELEGRAM_BOT_TOKEN",
    clientSecretEnvKey: "TELEGRAM_BOT_USERNAME",
    composioSupported: false,
  },
  discord: {
    id: "discord",
    name: "Discord",
    icon: "🎮",
    color: "#5865F2",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email bot",
    clientIdEnvKey: "DISCORD_CLIENT_ID",
    clientSecretEnvKey: "DISCORD_CLIENT_SECRET",
    composioSupported: true,
    composioApp: "discord",
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    icon: "🦋",
    color: "#0085FF",
    authUrl: "https://bsky.social/oauth/authorize",
    tokenUrl: "https://bsky.social/xrpc/com.atproto.server.createSession",
    scope: "",
    clientIdEnvKey: "BLUESKY_IDENTIFIER",
    clientSecretEnvKey: "BLUESKY_APP_PASSWORD",
    composioSupported: true,
    composioApp: "bluesky",
  },
};

/**
 * Get OAuth config for a platform
 */
export function getPlatformOAuthConfig(platformId: string): PlatformOAuthConfig | null {
  return PLATFORM_OAUTH_CONFIGS[platformId] || null;
}

/**
 * Build OAuth authorization URL for a platform
 */
export function buildPlatformAuthUrl(
  platformId: string,
  clientId: string,
  redirectUri: string,
  state: string
): string | null {
  const config = PLATFORM_OAUTH_CONFIGS[platformId];
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: config.scope,
  });

  // TikTok uses different param names
  if (platformId === "tiktok") {
    params.set("client_key", clientId);
    params.delete("client_id");
  }

  // Reddit uses duration=permanent for refresh tokens
  if (platformId === "reddit") {
    params.set("duration", "permanent");
  }

  // Discord uses response_type=code
  if (platformId === "discord") {
    params.set("permissions", "0");
  }

  return `${config.authUrl}?${params.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO INTEGRATION (unified OAuth via Composio)
// Composio provides a single API to manage OAuth flows for many
// platforms. We use it as an alternative to direct platform OAuth.
// Docs: https://docs.composio.dev
// ═══════════════════════════════════════════════════════════════════

const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v1";

export function getComposioApiKey(): string {
  return process.env.COMPOSIO_API_KEY || "";
}

export function isComposioEnabled(): boolean {
  return !!getComposioApiKey();
}

export function getPlatformsSupportingComposio(): Array<string> {
  return Object.values(PLATFORM_OAUTH_CONFIGS)
    .filter((c) => c.composioSupported)
    .map((c) => c.id);
}

/**
 * Start a Composio OAuth connection for a platform.
 * Returns a redirect URL the user visits to grant access.
 */
export async function startComposioConnection(
  platformId: string,
  userId: string,
  redirectUri: string
): Promise<{ success: boolean; redirectUrl?: string; connectionId?: string; error?: string }> {
  const config = PLATFORM_OAUTH_CONFIGS[platformId];
  if (!config) return { success: false, error: `Unknown platform: ${platformId}` };
  if (!config.composioSupported) return { success: false, error: `${config.name} does not support Composio` };

  const apiKey = getComposioApiKey();
  if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured" };

  try {
    const res = await fetch(`${COMPOSIO_API_BASE}/connectedAccounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        integrationId: config.composioApp,
        userId,
        callbackUrl: redirectUri,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `Composio start failed: ${txt}` };
    }
    const data: any = await res.json();
    return {
      success: true,
      redirectUrl: data.redirectUrl || data.redirect_url,
      connectionId: data.id || data.connectionId,
    };
  } catch (err: any) {
    return { success: false, error: `Composio request failed: ${err?.message || String(err)}` };
  }
}

/**
 * Fetch the status of a Composio connection.
 * Used after the user returns from the OAuth redirect to confirm success.
 */
export async function getComposioConnectionStatus(
  connectionId: string
): Promise<{ success: boolean; status?: string; accessToken?: string; error?: string }> {
  const apiKey = getComposioApiKey();
  if (!apiKey) return { success: false, error: "COMPOSIO_API_KEY not configured" };

  try {
    const res = await fetch(`${COMPOSIO_API_BASE}/connectedAccounts/${connectionId}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `Composio status check failed: ${txt}` };
    }
    const data: any = await res.json();
    return {
      success: true,
      status: data.status,
      accessToken: data.accessToken || data.access_token,
    };
  } catch (err: any) {
    return { success: false, error: `Composio request failed: ${err?.message || String(err)}` };
  }
}

/**
 * Decide which provider to use for a given platform.
 * - If COMPOSIO_API_KEY is set AND the platform supports Composio → use Composio
 * - Otherwise fall back to direct platform OAuth
 */
export function selectOAuthProvider(platformId: string): OAuthProvider {
  const config = PLATFORM_OAUTH_CONFIGS[platformId];
  if (config?.composioSupported && isComposioEnabled()) return "composio";
  return "direct";
}
