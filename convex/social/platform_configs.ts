// Platform configurations extracted from social.ts
// Direct OAuth + API integration for 12 social media platforms

// ═══════════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════
export const PLATFORM_CONFIGS: Record<string, {
  name: string; icon: string; color: string;
  authUrl: string; tokenUrl: string; apiUrl: string;
  scopes: Array<string>; anonymousSupported: boolean;
  usesCodeVerifier: boolean;
}> = {
  x: {
    name: "X (Twitter)", icon: "🐦", color: "#1DA1F2",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    apiUrl: "https://api.twitter.com/2",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    anonymousSupported: true, usesCodeVerifier: true,
  },
  linkedin: {
    name: "LinkedIn", icon: "💼", color: "#0A66C2",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    apiUrl: "https://api.linkedin.com/v2",
    scopes: ["w_member_social", "r_liteprofile", "r_emailaddress"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  facebook: {
    name: "Facebook", icon: "📘", color: "#1877F2",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    apiUrl: "https://graph.facebook.com/v19.0",
    scopes: ["pages_manage_posts", "pages_read_engagement", "public_profile"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  instagram: {
    name: "Instagram", icon: "📸", color: "#E4405F",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    apiUrl: "https://graph.facebook.com/v19.0",
    scopes: ["pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  tiktok: {
    name: "TikTok", icon: "🎵", color: "#000000",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    apiUrl: "https://open.tiktokapis.com/v2",
    scopes: ["user.info.basic", "video.publish"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  youtube: {
    name: "YouTube", icon: "🎬", color: "#FF0000",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    apiUrl: "https://www.googleapis.com/youtube/v3",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  pinterest: {
    name: "Pinterest", icon: "📌", color: "#E60023",
    authUrl: "https://pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    apiUrl: "https://api.pinterest.com/v5",
    scopes: ["pins:read", "pins:write", "boards:read"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  reddit: {
    name: "Reddit", icon: "🤖", color: "#FF4500",
    authUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    apiUrl: "https://oauth.reddit.com",
    scopes: ["submit", "read", "identity"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  threads: {
    name: "Threads", icon: "🧵", color: "#000000",
    authUrl: "https://www.threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/v1.0/access_token",
    apiUrl: "https://graph.threads.net/v1.0",
    scopes: ["threads_basic", "threads_content_publish"],
    anonymousSupported: true, usesCodeVerifier: false,
  },
  telegram: {
    name: "Telegram", icon: "📱", color: "#0088CC",
    authUrl: "", tokenUrl: "", apiUrl: "https://api.telegram.org",
    scopes: [], anonymousSupported: false, usesCodeVerifier: false,
  },
  discord: {
    name: "Discord", icon: "🎮", color: "#5865F2",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    apiUrl: "https://discord.com/api/v10",
    scopes: ["identify", "email", "guilds", "webhook.incoming"],
    anonymousSupported: false, usesCodeVerifier: false,
  },
  bluesky: {
    name: "Bluesky", icon: "🦋", color: "#0085FF",
    authUrl: "", tokenUrl: "", apiUrl: "https://bsky.social/xrpc",
    scopes: [], anonymousSupported: true, usesCodeVerifier: false,
  },
};

export const SUPPORTED_PLATFORMS = Object.entries(PLATFORM_CONFIGS).map(([id, config]) => ({
  id, ...config,
}));

export const COMPOSIO_APP_MAP: Record<string, string | undefined> = {
  x: "x",
  linkedin: "linkedin",
  facebook: "facebook",
  instagram: "instagram",
  youtube: "youtube",
  reddit: "reddit",
  discord: "discord",
  tiktok: "tiktok",
  threads: "threads",
  pinterest: "pinterest",
  bluesky: undefined,
  telegram: undefined,
};

// Platforms that can be connected via TryPost's Socialite OAuth
export const TRYPOST_PLATFORMS: Record<string, string> = {
  pinterest: "pinterest",
  tiktok: "tiktok",
  threads: "threads",
};
