import { v } from "convex/values";
import { query } from "../_generated/server";

export const SUPPORTED_PLATFORMS = [
  { id: "twitter", name: "X (Twitter)", icon: "🐦", charLimit: 280, supportsCarousel: false, supportsVideo: true },
  { id: "linkedin", name: "LinkedIn", icon: "💼", charLimit: 3000, supportsCarousel: true, supportsVideo: true },
  { id: "facebook", name: "Facebook", icon: "📘", charLimit: 63206, supportsCarousel: true, supportsVideo: true },
  { id: "instagram", name: "Instagram", icon: "📸", charLimit: 2200, supportsCarousel: true, supportsVideo: true },
  { id: "threads", name: "Threads", icon: "🧵", charLimit: 500, supportsCarousel: false, supportsVideo: true },
  { id: "tiktok", name: "TikTok", icon: "🎵", charLimit: 2200, supportsCarousel: false, supportsVideo: true },
  { id: "youtube", name: "YouTube", icon: "📺", charLimit: 5000, supportsCarousel: false, supportsVideo: true },
  { id: "pinterest", name: "Pinterest", icon: "📌", charLimit: 500, supportsCarousel: true, supportsVideo: false },
  { id: "reddit", name: "Reddit", icon: "🤖", charLimit: 40000, supportsCarousel: true, supportsVideo: true },
  { id: "bluesky", name: "Bluesky", icon: "🦋", charLimit: 300, supportsCarousel: false, supportsVideo: false },
  { id: "telegram", name: "Telegram", icon: "✈️", charLimit: 4096, supportsCarousel: true, supportsVideo: true },
  { id: "discord", name: "Discord", icon: "💬", charLimit: 2000, supportsCarousel: true, supportsVideo: true },
];

export const DAILY_POSTING_TIMES = [
  { hour: 8, label: "Morning Briefing" },
  { hour: 12, label: "Midday Update" },
  { hour: 18, label: "Evening Wrap" },
];

export const getSupportedPlatforms = query({
  args: {},
  returns: v.array(v.any()),
  handler: async () => SUPPORTED_PLATFORMS,
});
