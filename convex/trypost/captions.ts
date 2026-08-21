import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { tryGetAdminSession } from "../auth_helpers";
import { PLATFORM_CHAR_LIMITS, PLATFORM_BEST_HOURS } from "./constants";

export const generateCaption = action({
  args: {
    adminToken: v.string(),
    topic: v.string(),
    platform: v.string(),
    tone: v.optional(v.string()), // "professional", "casual", "witty", "inspirational"
    brandVoice: v.optional(v.string()),
    includeEmoji: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.runQuery(internal.trypost._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) return { authError: true, caption: null };

    const tone = args.tone ?? "professional";
    const includeEmoji = args.includeEmoji ?? true;
    const charLimit = PLATFORM_CHAR_LIMITS[args.platform] ?? 2000;
    const toneInstructions: Record<string, string> = {
      professional: "Use a polished, authoritative voice. Focus on insights and value.",
      casual: "Use a friendly, conversational tone. Be relatable and approachable.",
      witty: "Use humor and clever wordplay. Be memorable and engaging.",
      inspirational: "Use uplifting, motivational language. Inspire action and growth.",
    };

    const openaiKey = process.env.OPENAI_API_KEY;
    let caption = "";
    let hashtags: string[] = [];
    let source = "fallback";

    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `You are a social media copywriter. ${toneInstructions[tone]} Brand voice: ${args.brandVoice ?? "clear and direct"}. Output a caption (\u2264${charLimit} chars), then 5-10 hashtags. ${includeEmoji ? "Use 2-4 relevant emojis." : "Do not use emojis."} Format: CAPTION: <text>\nHASHTAGS: <space-separated>` },
              { role: "user", content: `Topic: ${args.topic}\nPlatform: ${args.platform}` },
            ],
            max_tokens: 600,
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          const content = json?.choices?.[0]?.message?.content ?? "";
          const capMatch = content.match(/CAPTION:\s*([\s\S]*?)(?:\nHASHTAGS:|$)/i);
          const hashMatch = content.match(/HASHTAGS:\s*([\s\S]*?)$/i);
          caption = (capMatch?.[1] ?? content).trim().slice(0, charLimit);
          hashtags = (hashMatch?.[1] ?? "").trim().split(/\s+/).filter((h: string) => h.startsWith("#")).slice(0, 10);
          source = "openai";
        }
      } catch (e: any) {
        // fall through
      }
    }

    if (!caption) {
      const emojiPrefix = includeEmoji ? "\u2728 " : "";
      caption = `${emojiPrefix}${args.topic}\n\nHere's what you need to know: it matters, it's timely, and your audience is waiting. Take action today.`;
      hashtags = ["#Growth", "#Business", "#Strategy", "#Tips", `${args.platform}`];
      if (includeEmoji) caption += " \uD83D\uDE80\uD83D\uDCA1";
      source = "fallback";
    }

    return {
      authError: false,
      caption,
      hashtags,
      charLimit,
      charCount: caption.length,
      remaining: charLimit - caption.length,
      withinLimit: caption.length <= charLimit,
      tone,
      source,
    };
  },
});

export const suggestHashtags = action({
  args: {
    adminToken: v.string(),
    content: v.string(),
    platform: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.runQuery(internal.trypost._verifyAdmin, { adminToken: args.adminToken });
    if (!identity) return { authError: true, hashtags: [] };

    const count = args.count ?? 12;
    const words = args.content.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const uniqueWords = Array.from(new Set(words)).slice(0, count);

    let hashtags: string[] = [];
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `Generate ${count} relevant, high-traffic hashtags for the content. Mix broad + niche. Format: <space-separated hashtags only, each starting with #>` },
              { role: "user", content: `Platform: ${args.platform ?? "general"}\nContent: ${args.content}` },
            ],
            max_tokens: 200,
            temperature: 0.6,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          const text = (json?.choices?.[0]?.message?.content ?? "").trim();
          hashtags = text.split(/\s+/).filter((h: string) => h.startsWith("#")).slice(0, count);
        }
      } catch (e: any) {
        // fall through
      }
    }

    if (hashtags.length === 0) {
      hashtags = uniqueWords.map((w) => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);
      if (hashtags.length < count) {
        const fillers = ["#Business", "#Growth", "#Tips", "#Strategy", "#Marketing", "#Success", "#Community", "#Innovation"];
        hashtags.push(...fillers.slice(0, count - hashtags.length));
      }
      hashtags = hashtags.slice(0, count);
    }

    return { authError: false, hashtags, count: hashtags.length };
  },
});

export const getBestPostingTimes = query({
  args: { adminToken: v.optional(v.string()), platform: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, platform }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, times: {} };
    if (platform) {
      return { authError: false, times: { [platform]: PLATFORM_BEST_HOURS[platform] ?? [] } };
    }
    return { authError: false, times: PLATFORM_BEST_HOURS };
  },
});

export const previewPost = query({
  args: { adminToken: v.optional(v.string()), content: v.string(), platforms: v.array(v.string()), hashtags: v.optional(v.array(v.string())) },
  returns: v.any(),
  handler: async (ctx, { adminToken, content, platforms, hashtags }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, previews: [] };

    const tagText = (hashtags ?? []).join(" ");
    const fullText = `${content}\n\n${tagText}`.trim();

    const previews = platforms.map((p) => {
      const limit = PLATFORM_CHAR_LIMITS[p] ?? 2000;
      const willFit = fullText.length <= limit;
      const truncated = willFit ? fullText : fullText.slice(0, limit - 3) + "...";
      return {
        platform: p,
        charLimit: limit,
        charCount: fullText.length,
        willFit,
        truncatedContent: truncated,
        overflow: fullText.length - limit,
      };
    });

    return { authError: false, previews };
  },
});
