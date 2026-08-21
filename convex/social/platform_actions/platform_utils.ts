import { PLATFORM_CONFIGS } from "../platform_configs";

export function getPlatformClientId(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_ID, linkedin: process.env.LINKEDIN_CLIENT_ID,
    facebook: process.env.FACEBOOK_APP_ID, instagram: process.env.FACEBOOK_APP_ID,
    tiktok: process.env.TIKTOK_CLIENT_KEY, youtube: process.env.GOOGLE_CLIENT_ID,
    pinterest: process.env.PINTEREST_APP_ID, reddit: process.env.REDDIT_CLIENT_ID,
    threads: process.env.THREADS_APP_ID, discord: process.env.DISCORD_CLIENT_ID,
  };
  return map[platform] || "";
}

export function getPlatformClientSecret(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_SECRET, linkedin: process.env.LINKEDIN_CLIENT_SECRET,
    facebook: process.env.FACEBOOK_APP_SECRET, instagram: process.env.FACEBOOK_APP_SECRET,
    tiktok: process.env.TIKTOK_CLIENT_SECRET, youtube: process.env.GOOGLE_CLIENT_SECRET,
    pinterest: process.env.PINTEREST_APP_SECRET, reddit: process.env.REDDIT_CLIENT_SECRET,
    threads: process.env.THREADS_APP_SECRET, discord: process.env.DISCORD_CLIENT_SECRET,
  };
  return map[platform] || "";
}

export function getRedirectUri(platform: string): string {
  const baseUrl = process.env.CONVEX_SITE_URL || "https://warmhearted-aardvark-280.convex.site";
  return `${baseUrl}/api/social/callback/${platform}`;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function manualBase64Standard(input: string): string {
  const utf8: Array<number> = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else if (c < 0x10000) utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
    else utf8.push((c >> 18) | 0xf0, ((c >> 12) & 0x3f) | 0x80, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
  }
  const data = new Uint8Array(utf8);
  let result = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < data.length ? data[i + 1] : 0;
    const b3 = i + 2 < data.length ? data[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < data.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < data.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

export async function exchangeCodeForToken(
  platform: string, code: string, clientId: string, clientSecret: string,
  redirectUri: string, codeVerifier?: string
): Promise<any> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error("Unknown platform");

  const body: Record<string, string> = {
    code, redirect_uri: redirectUri, client_id: clientId,
    client_secret: clientSecret, grant_type: "authorization_code",
  };

  if (platform === "x" && codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${manualBase64Standard(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`Token exchange failed: ${err}`); }
  return res.json();
}

export async function fetchUserInfo(
  platform: string, accessToken: string
): Promise<{ id: string; username: string; name: string }> {
  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.data?.id || "", username: data.data?.username || "", name: data.data?.name || "" };
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.sub || "", username: data.preferred_username || data.email || "", name: data.name || "" };
      }
      case "facebook":
      case "instagram": {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`
        );
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "tiktok": {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        return {
          id: data.data?.user?.open_id || "",
          username: data.data?.user?.display_name || "",
          name: data.data?.user?.display_name || "",
        };
      }
      case "youtube": {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.email || "", name: data.name || "" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.name || "", name: data.name || "" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return { id: data.id || "", username: data.username || "", name: data.global_name || data.username || "" };
      }
      default:
        return { id: "", username: "", name: "" };
    }
  } catch {
    return { id: "", username: "", name: "" };
  }
}
