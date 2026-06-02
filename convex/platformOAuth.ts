/**
 * Platform OAuth 2.0 Configuration
 * Each platform has its own OAuth endpoints and credentials
 */

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
