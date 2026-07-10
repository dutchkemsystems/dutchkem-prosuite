import { action } from "../_generated/server";
import { tryGetAdminSessionInAction } from "../auth_helpers";
import { PLATFORM_CONFIGS } from "./platform-configs";

export const connectTelegramBot = action({
  args: {
    botToken: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; username?: string; botId?: number; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.botToken || !args.botToken.includes(":")) {
        return {
          success: false,
          error: "Invalid bot token format. Expected: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
        };
      }

      const res = await fetch(`https://api.telegram.org/bot${args.botToken}/getMe`);
      if (!res.ok) return { success: false, error: "Invalid bot token — Telegram rejected the token" };

      const data: any = await res.json();
      if (!data.ok) return { success: false, error: data.description || "Telegram API error" };

      const bot = data.result;
      const username = bot.username ? `@${bot.username}` : "Telegram Bot";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "telegram", platformName: "Telegram",
        accessToken: args.botToken, refreshToken: "", platformUserId: String(bot.id || ""),
        platformUsername: username, scopes: "", anonymousByDefault: false,
        integrationId: "telegram_bot",
      });

      return { success: true, username, botId: bot.id };
    } catch (err: any) {
      return { success: false, error: `Telegram connection failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Connect Bluesky via AT Protocol
// ═══════════════════════════════════════════════════════════════════
export const connectBluesky = action({
  args: {
    identifier: v.string(),
    appPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; handle?: string; did?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.identifier || !args.appPassword) {
        return { success: false, error: "Identifier and app password are required" };
      }

      const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: args.identifier, password: args.appPassword }),
      });

      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        return {
          success: false,
          error: err.message || "Bluesky login failed — check your handle and app password",
        };
      }

      const data: any = await res.json();
      const handle = data.handle || args.identifier;
      const did = data.did || "";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "bluesky", platformName: "Bluesky",
        accessToken: data.accessJwt || "", refreshToken: data.refreshJwt || "",
        platformUserId: did, platformUsername: handle, scopes: "atproto",
        anonymousByDefault: true, integrationId: "atproto",
      });

      return { success: true, handle, did };
    } catch (err: any) {
      return { success: false, error: `Bluesky connection failed: ${err?.message || String(err)}` };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// PLATFORM API HELPERS
// ═══════════════════════════════════════════════════════════════════
function getPlatformClientId(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_ID, linkedin: process.env.LINKEDIN_CLIENT_ID,
    facebook: process.env.FACEBOOK_APP_ID, instagram: process.env.FACEBOOK_APP_ID,
    tiktok: process.env.TIKTOK_CLIENT_KEY, youtube: process.env.GOOGLE_CLIENT_ID,
    pinterest: process.env.PINTEREST_APP_ID, reddit: process.env.REDDIT_CLIENT_ID,
    threads: process.env.THREADS_APP_ID, discord: process.env.DISCORD_CLIENT_ID,
  };
  return map[platform] || "";
}

function getPlatformClientSecret(platform: string): string {
  const map: Record<string, string | undefined> = {
    x: process.env.X_CLIENT_SECRET, linkedin: process.env.LINKEDIN_CLIENT_SECRET,
    facebook: process.env.FACEBOOK_APP_SECRET, instagram: process.env.FACEBOOK_APP_SECRET,
    tiktok: process.env.TIKTOK_CLIENT_SECRET, youtube: process.env.GOOGLE_CLIENT_SECRET,
    pinterest: process.env.PINTEREST_APP_SECRET, reddit: process.env.REDDIT_CLIENT_SECRET,
    threads: process.env.THREADS_APP_SECRET, discord: process.env.DISCORD_CLIENT_SECRET,
  };
  return map[platform] || "";
}

function getRedirectUri(platform: string): string {
  const baseUrl = process.env.CONVEX_SITE_URL || "https://warmhearted-aardvark-280.convex.site";
  return `${baseUrl}/api/social/callback/${platform}`;
}

async function exchangeCodeForToken(
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

async function fetchUserInfo(
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

async function postToPlatformApi(
  platform: string, accessToken: string, content: string,
  mediaUrls?: Array<string>, _anonymous?: boolean
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return { success: false, error: "Unknown platform" };

  try {
    switch (platform) {
      case "x": {
        let mediaIds: string[] = [];
        if (mediaUrls && mediaUrls.length > 0) {
          for (const url of mediaUrls) {
            const imgRes = await fetch(url);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: (() => { const fd = new FormData(); fd.append("command", "INIT"); fd.append("total_bytes", String(blob.size)); fd.append("media_type", blob.type || "image/jpeg"); return fd; })(),
              });
              const initData = await initRes.json();
              if (initRes.ok && initData.media_id_string) {
                const appendRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}` },
                  body: (() => { const fd = new FormData(); fd.append("command", "APPEND"); fd.append("media_id", initData.media_id_string); fd.append("segment_index", "0"); fd.append("media_data", url); return fd; })(),
                });
                if (appendRes.ok) {
                  await fetch("https://upload.twitter.com/1.1/media/upload.json", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: (() => { const fd = new FormData(); fd.append("command", "FINALIZE"); fd.append("media_id", initData.media_id_string); return fd; })(),
                  });
                  mediaIds.push(initData.media_id_string);
                }
              }
            }
          }
        }
        const tweetBody: any = { text: content };
        if (mediaIds.length > 0) tweetBody.media = { media_ids: mediaIds };
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(tweetBody),
        });
        const data = await res.json();
        return res.ok
          ? { success: true, postId: data.data?.id }
          : { success: false, error: data.detail || data.errors?.[0]?.message || "Tweet failed" };
      }
      case "linkedin": {
        let shareMediaCategory = "NONE";
        let mediaUrn = "";
        if (mediaUrls && mediaUrls.length > 0) {
          shareMediaCategory = "IMAGE";
          mediaUrn = mediaUrls[0];
        }
        const ugcPost: any = {
          author: "urn:li:person:me",
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory,
              ...(mediaUrn ? { media: { status: "READY", originalUrl: mediaUrn } } : {}),
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        };
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(ugcPost),
        });
        return res.ok ? { success: true, postId: "linkedin_post" } : { success: false, error: "LinkedIn post failed" };
      }
      case "facebook": {
        if (mediaUrls && mediaUrls.length > 0) {
          const imgUrl = mediaUrls[0];
          const res = await fetch(
            `https://graph.facebook.com/v19.0/me/photos?url=${encodeURIComponent(imgUrl)}&message=${encodeURIComponent(content)}&access_token=${accessToken}`,
            { method: "POST" }
          );
          const data = await res.json();
          return res.ok
            ? { success: true, postId: data.id }
            : { success: false, error: data.error?.message || "Facebook media post failed" };
        }
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me/feed?message=${encodeURIComponent(content)}&access_token=${accessToken}`,
          { method: "POST" }
        );
        const data = await res.json();
        return res.ok
          ? { success: true, postId: data.id }
          : { success: false, error: data.error?.message || "Facebook post failed" };
      }
      case "instagram": {
        if (mediaUrls && mediaUrls.length > 1) {
          const children: string[] = [];
          for (const url of mediaUrls) {
            const containerRes = await fetch(
              `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(url)}&access_token=${accessToken}`,
              { method: "POST" }
            );
            const containerData = await containerRes.json();
            if (containerRes.ok && containerData.id) children.push(containerData.id);
          }
          if (children.length === 0) return { success: false, error: "Failed to create carousel containers" };
          const carouselRes = await fetch(
            `https://graph.facebook.com/v19.0/me/media?children=${children.join(",")}&caption=${encodeURIComponent(content)}&access_token=${accessToken}`,
            { method: "POST" }
          );
          const carouselData = await carouselRes.json();
          if (!carouselRes.ok || !carouselData.id) return { success: false, error: "Failed to create carousel" };
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${carouselData.id}&access_token=${accessToken}`,
            { method: "POST" }
          );
          const publishData = await publishRes.json();
          return publishRes.ok
            ? { success: true, postId: publishData.id }
            : { success: false, error: "Instagram carousel publish failed" };
        }
        if (mediaUrls && mediaUrls.length === 1) {
          const containerRes = await fetch(
            `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(mediaUrls[0])}&caption=${encodeURIComponent(content)}&access_token=${accessToken}`,
            { method: "POST" }
          );
          const containerData = await containerRes.json();
          if (!containerRes.ok || !containerData.id) return { success: false, error: "Instagram container creation failed" };
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerData.id}&access_token=${accessToken}`,
            { method: "POST" }
          );
          const publishData = await publishRes.json();
          return publishRes.ok
            ? { success: true, postId: publishData.id }
            : { success: false, error: "Instagram photo publish failed" };
        }
        return { success: false, error: "Instagram requires at least one image URL" };
      }
      case "youtube": {
        if (!mediaUrls || mediaUrls.length === 0) return { success: false, error: "YouTube requires a video URL" };
        const videoUrl = mediaUrls[0];
        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) return { success: false, error: "Failed to fetch video from URL" };
        const videoBlob = await videoRes.blob();
        const metadata = { snippet: { title: content.substring(0, 100), description: content, tags: ["dutchkem"], categoryId: "22" }, status: { privacyStatus: "public" } };
        const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Upload-Content-Type": videoBlob.type || "video/mp4", "X-Upload-Content-Length": String(videoBlob.size) },
          body: JSON.stringify(metadata),
        });
        if (!initRes.ok) { const err = await initRes.json(); return { success: false, error: err.error?.message || "YouTube init failed" }; }
        const uploadUrl = initRes.headers.get("Location");
        if (!uploadUrl) return { success: false, error: "No upload URL returned" };
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": videoBlob.type || "video/mp4", "Content-Length": String(videoBlob.size) },
          body: videoBlob,
        });
        const uploadData = await uploadRes.json();
        return uploadRes.ok
          ? { success: true, postId: uploadData.id }
          : { success: false, error: uploadData.error?.message || "YouTube upload failed" };
      }
      case "reddit": {
        const res = await fetch("https://oauth.reddit.com/api/submit", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sr: "self", kind: "self", title: content.substring(0, 100), text: content,
          }).toString(),
        });
        return res.ok ? { success: true, postId: "reddit_post" } : { success: false, error: "Reddit post failed" };
      }
      case "discord": {
        const res = await fetch("https://discord.com/api/v10/channels/@me/messages", {
          method: "POST",
          headers: { Authorization: `Bot ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        return res.ok ? { success: true, postId: "discord_msg" } : { success: false, error: "Discord post failed" };
      }
      default:
        return { success: false, error: `Direct posting not yet implemented for ${platform}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// RAPIDAPI FALLBACK — Used when primary posting fails
// ═══════════════════════════════════════════════════════════════════
async function postViaRapidAPIFallback(
  ctx: any, platformId: string, content: string, mediaUrls: string[]
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return { success: false, error: "RAPIDAPI_KEY not configured" };

  const { RAPIDAPI_PLATFORMS } = await import("./rapidapi");
  const cfg = RAPIDAPI_PLATFORMS[platformId];
  if (!cfg) return { success: false, error: `No RapidAPI config for ${platformId}` };

  const payloads: Record<string, any> = {
    x: { text: content.substring(0, 280) },
    facebook: { message: content },
    instagram: { caption: content, image_url: mediaUrls[0] },
    tumblr: { type: "text", body: content, title: content.substring(0, 100) },
    pinterest: { title: content.substring(0, 100), description: content, image_url: mediaUrls[0] },
    telegram: { chat_id: process.env.TELEGRAM_CHAT_ID || "", text: content },
    discord: { content },
    whatsapp: { to: process.env.WHATSAPP_NUMBER || "", text: { body: content } },
    medium: { title: content.substring(0, 100), content, contentFormat: "html" },
    snapchat: { caption: content, media_url: mediaUrls[0] },
    twitch: { title: content.substring(0, 140) },
    spotify: { name: content.substring(0, 100), description: content },
    substack: { title: content.substring(0, 100), body: content },
  };

  try {
    const res = await fetch(cfg.url, {
      method: cfg.method,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": cfg.host,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloads[platformId] || { text: content }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      await ctx.runMutation(internal.rapidapi.logPost, {
        platformId, content: content.substring(0, 500),
        status: "rate_limited", errorMessage: "Rate limit exceeded",
        fallbackTriggered: true,
      });
      return { success: false, error: "RapidAPI rate limit exceeded" };
    }

    if (!res.ok) {
      await ctx.runMutation(internal.rapidapi.logPost, {
        platformId, content: content.substring(0, 500),
        status: "failed", errorMessage: data.message || `HTTP ${res.status}`,
        responseData: data, fallbackTriggered: true,
      });
      return { success: false, error: data.message || `RapidAPI ${res.status}` };
    }

    await ctx.runMutation(internal.rapidapi.logPost, {
      platformId, content: content.substring(0, 500),
      status: "success", responseData: data, fallbackTriggered: true,
    });
    return { success: true, postId: data.id || data.post_id || "rapidapi_fallback" };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PLATFORM-SPECIFIC ACTIONS (Facebook, Instagram, X, LinkedIn, YouTube, Reddit, Canva)
// ═══════════════════════════════════════════════════════════════════

// ─── FACEBOOK: Upload media to page ───
export const facebookUploadMedia = action({
  args: { accessToken: v.string(), pageId: v.string(), imageUrl: v.string(), message: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.pageId}/photos?url=${encodeURIComponent(args.imageUrl)}&message=${encodeURIComponent(args.message || "")}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Facebook media upload failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── FACEBOOK: Get comments on a post ───
export const facebookGetComments = action({
  args: { accessToken: v.string(), postId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.postId}/comments?access_token=${args.accessToken}&fields=id,message,from,created_time,like_count`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, comments: data.data || [] } : { success: false, error: data.error?.message || "Failed to get comments" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── FACEBOOK: Reply to a comment ───
export const facebookReplyToComment = action({
  args: { accessToken: v.string(), commentId: v.string(), message: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.commentId}/comments?message=${encodeURIComponent(args.message)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, replyId: data.id } : { success: false, error: data.error?.message || "Reply failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── FACEBOOK: Delete a post ───
export const facebookDeletePost = action({
  args: { accessToken: v.string(), postId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.postId}?access_token=${args.accessToken}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.error?.message || "Delete failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Publish photo ───
export const instagramPublishPhoto = action({
  args: { accessToken: v.string(), imageUrl: v.string(), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(args.imageUrl)}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) return { success: false, error: containerData.error?.message || "Container creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: publishData.error?.message || "Publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Publish video/reel ───
export const instagramPublishVideo = action({
  args: { accessToken: v.string(), videoUrl: v.string(), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?media_type=REELS&video_url=${encodeURIComponent(args.videoUrl)}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) return { success: false, error: containerData.error?.message || "Reel container creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: publishData.error?.message || "Reel publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Publish carousel ───
export const instagramPublishCarousel = action({
  args: { accessToken: v.string(), imageUrls: v.array(v.string()), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const children: string[] = [];
      for (const url of args.imageUrls) {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(url)}&access_token=${args.accessToken}`,
          { method: "POST" }
        );
        const data = await res.json();
        if (res.ok && data.id) children.push(data.id);
      }
      if (children.length === 0) return { success: false, error: "No carousel containers created" };
      const carouselRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?children=${children.join(",")}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || !carouselData.id) return { success: false, error: "Carousel creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${carouselData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: "Carousel publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Get insights/analytics ───
export const instagramGetInsights = action({
  args: { accessToken: v.string(), mediaId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.mediaId}/insights?metric=impressions,reach,engagement,video_views&access_token=${args.accessToken}`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, insights: data.data || [] } : { success: false, error: data.error?.message || "Insights failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Get comments ───
export const instagramGetComments = action({
  args: { accessToken: v.string(), mediaId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.mediaId}/comments?access_token=${args.accessToken}&fields=id,text,timestamp,username`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, comments: data.data || [] } : { success: false, error: data.error?.message || "Get comments failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── INSTAGRAM: Send DM ───
export const instagramSendDM = action({
  args: { accessToken: v.string(), recipientId: v.string(), text: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?recipient=${encodeURIComponent(JSON.stringify({ id: args.recipientId }))}&message=${encodeURIComponent(JSON.stringify({ text: args.text }))}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, messageId: data.message_id } : { success: false, error: data.error?.message || "DM failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── X/TWITTER: Upload media (base64) ───
export const twitterUploadMedia = action({
  args: { accessToken: v.string(), mediaData: v.string(), mediaType: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "INIT"); fd.append("total_bytes", String(atob(args.mediaData).length)); fd.append("media_type", args.mediaType || "image/jpeg"); return fd; })(),
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData.media_id_string) return { success: false, error: initData.errors?.[0]?.message || "Twitter media init failed" };
      const mediaId = initData.media_id_string;
      await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "APPEND"); fd.append("media_id", mediaId); fd.append("segment_index", "0"); fd.append("media_data", args.mediaData); return fd; })(),
      });
      const finalizeRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "FINALIZE"); fd.append("media_id", mediaId); return fd; })(),
      });
      const finalizeData = await finalizeRes.json();
      return finalizeRes.ok ? { success: true, mediaId } : { success: false, error: "Twitter media finalize failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── X/TWITTER: Get user info ───
export const twitterGetUserInfo = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics,description,created_at", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, user: data.data } : { success: false, error: data.detail || "Failed to get user info" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── X/TWITTER: Like a tweet ───
export const twitterLikeTweet = action({
  args: { accessToken: v.string(), userId: v.string(), tweetId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(`https://api.twitter.com/2/users/${args.userId}/likes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_id: args.tweetId }),
      });
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.detail || "Like failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── X/TWITTER: Reply to tweet ───
export const twitterReplyToTweet = action({
  args: { accessToken: v.string(), tweetId: v.string(), text: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: args.text, reply: { in_reply_to_tweet_id: args.tweetId } }),
      });
      const data = await res.json();
      return res.ok ? { success: true, postId: data.data?.id } : { success: false, error: data.detail || "Reply failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── X/TWITTER: Search tweets ───
export const twitterSearchTweets = action({
  args: { accessToken: v.string(), query: v.string(), maxResults: v.optional(v.number()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(args.query)}&max_results=${args.maxResults || 10}&tweet.fields=created_at,public_metrics,author_id`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, tweets: data.data || [] } : { success: false, error: data.detail || "Search failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── LINKEDIN: Get user profile ───
export const linkedinGetProfile = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~digitalmediaStream:playableStreams),headline,industry,summary)", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, profile: data } : { success: false, error: "Failed to get LinkedIn profile" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── LINKEDIN: Get organization pages ───
export const linkedinGetOrganizations = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.linkedin.com/v2/organizationalContactRoleProjection~projection=(elements*(organizationalTarget~(id,name,vanityName)))", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, organizations: data.elements || [] } : { success: false, error: "Failed to get organizations" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── YOUTUBE: Get channel info ───
export const youtubeGetChannelInfo = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok && data.items?.length > 0 ? { success: true, channel: data.items[0] } : { success: false, error: "No channel found" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── YOUTUBE: List recent videos ───
export const youtubeListVideos = action({
  args: { accessToken: v.string(), maxResults: v.optional(v.number()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const channelData = await channelRes.json();
      if (!channelData.items?.length) return { success: false, error: "No channel found" };
      const uploadsPlaylist = channelData.items[0].contentDetails.relatedPlaylists.uploads;
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylist}&maxResults=${args.maxResults || 10}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, videos: data.items || [] } : { success: false, error: "Failed to list videos" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── YOUTUBE: Get video analytics ───
export const youtubeGetAnalytics = action({
  args: { accessToken: v.string(), videoId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${args.videoId}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok && data.items?.length > 0 ? { success: true, analytics: data.items[0].statistics, snippet: data.items[0].snippet } : { success: false, error: "No video data" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── YOUTUBE: Track video performance ───
export const youtubeTrackPerformance = action({
  args: { accessToken: v.string(), videoIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${args.videoIds.join(",")}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, videos: (data.items || []).map((v: any) => ({ id: v.id, title: v.snippet?.title, stats: v.statistics })) } : { success: false, error: "Tracking failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── REDDIT: Create post with subreddit ───
export const redditCreatePost = action({
  args: { accessToken: v.string(), subreddit: v.string(), title: v.string(), text: v.string(), flairId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const body: any = { sr: args.subreddit, kind: "self", title: args.title, text: args.text };
      if (args.flairId) body.flair_id = args.flairId;
      const res = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });
      const data = await res.json();
      return res.ok ? { success: true, postId: data.jquery?.[0]?.[3] || "reddit_post" } : { success: false, error: data.error || "Reddit post failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── REDDIT: Get subreddit info ───
export const redditGetSubredditInfo = action({
  args: { accessToken: v.string(), subreddit: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${args.subreddit}/about`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, subreddit: data.data } : { success: false, error: "Failed to get subreddit info" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── CANVA: Generate design via Composio ───
export const canvaDesignPublish = action({
  args: { accessToken: v.string(), templateId: v.string(), title: v.string(), elements: v.optional(v.any()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.canva.com/v1/designs", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ design_type: "template", template_id: args.templateId, title: args.title, ...(args.elements ? { elements: args.elements } : {}) }),
      });
      const data = await res.json();
      return res.ok ? { success: true, design: data } : { success: false, error: data.message || "Canva design failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ─── CANVA: List available templates ───
export const canvaListTemplates = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.canva.com/v1/designs?query=template", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, templates: data.items || [] } : { success: false, error: "Failed to list templates" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

// ═══════════════════════════════════════════════════════════════════
// CRYPTO HELPERS
// FIX: generateCodeVerifier now works directly with raw bytes (Uint8Array)
// instead of converting to a binary string first — avoids UTF-8 double-encoding
// PLUS: replaced crypto.getRandomValues with safeRandomBytes because
//       `crypto` is NOT defined in the Convex action runtime.
// ═══════════════════════════════════════════════════════════════════

// Safe random bytes — Convex action runtime has no `crypto` global
function safeRandomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function uuidV4(): string {
  const bytes = safeRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: Array<string> = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" +
    hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" +
    hex.slice(10, 16).join("")
  );
}

// FIX: Accepts Uint8Array directly — no string conversion needed
function base64UrlFromBytes(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "";
    result += i + 2 < bytes.length ? B64_CHARS[triplet & 0x3f] : "";
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_");
}

// FIX: Generates verifier directly from raw bytes — no binary string intermediary
function generateCodeVerifier(): string {
  const bytes = safeRandomBytes(32);
  return base64UrlFromBytes(bytes);
}

function generateCodeChallenge(verifier: string): string {
  const utf8: Array<number> = [];
  for (let i = 0; i < verifier.length; i++) {
    const c = verifier.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
  }
  const digest = sha256(new Uint8Array(utf8));
  return base64UrlFromBytes(digest);
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL SHA-256 (pure JS — Convex action runtime has no crypto.subtle)
// ═══════════════════════════════════════════════════════════════════
const SHA256_K: Array<number> = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256(bytes: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen & 0xffffffff);

  const w = new Uint32Array(64);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(chunk + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0); outView.setUint32(4, h1); outView.setUint32(8, h2); outView.setUint32(12, h3);
  outView.setUint32(16, h4); outView.setUint32(20, h5); outView.setUint32(24, h6); outView.setUint32(28, h7);
  return out;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL BASE64 (standard, for HTTP Basic Auth headers)
// ═══════════════════════════════════════════════════════════════════
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function manualBase64Standard(input: string): string {
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

// ═══════════════════════════════════════════════════════════════════
// INTERNAL ACTION: Refresh expired tokens for all connected platforms
// ═══════════════════════════════════════════════════════════════════
export const refreshExpiredTokens = internalAction({