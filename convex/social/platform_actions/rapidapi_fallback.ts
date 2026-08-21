import { internal } from "../../_generated/api";

export async function postViaRapidAPIFallback(
  ctx: any, platformId: string, content: string, mediaUrls: string[]
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return { success: false, error: "RAPIDAPI_KEY not configured" };

  const { RAPIDAPI_PLATFORMS } = await import("../rapidapi");
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
