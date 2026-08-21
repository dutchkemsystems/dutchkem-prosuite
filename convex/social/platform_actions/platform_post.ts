import { PLATFORM_CONFIGS } from "../platform_configs";

export async function postToPlatformApi(
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
      case "telegram": {
        const chatId = process.env.TELEGRAM_CHAT_ID || "";
        if (!chatId) return { success: false, error: "TELEGRAM_CHAT_ID not configured in Convex env vars" };
        const payload: any = { chat_id: chatId, text: content, parse_mode: "Markdown" };
        if (mediaUrls && mediaUrls.length > 0) {
          payload.photo = mediaUrls[0];
          payload.caption = content;
          delete payload.parse_mode;
          const res = await fetch(`https://api.telegram.org/bot${accessToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          return res.ok
            ? { success: true, postId: String(data.result?.message_id || "telegram_msg") }
            : { success: false, error: data.description || "Telegram photo send failed" };
        }
        const res = await fetch(`https://api.telegram.org/bot${accessToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        return res.ok
          ? { success: true, postId: String(data.result?.message_id || "telegram_msg") }
          : { success: false, error: data.description || "Telegram send failed" };
      }
      default:
        return { success: false, error: `Direct posting not yet implemented for ${platform}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
