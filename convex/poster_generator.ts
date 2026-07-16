import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// POSTER GENERATOR - AI-generated posters via Pollinations.ai / NVIDIA / Replicate
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "\u{1F4DA}", color: "#3b82f6", tagline: "Expert Research & Writing Assistance", prompt: "professional academic tutoring service poster, books, graduation cap, scholarly, blue gradient background" },
  { id: "A2", name: "Business Pro", icon: "\u{1F4BC}", color: "#8b5cf6", tagline: "Strategic Business Planning & Consulting", prompt: "corporate business consulting poster, suit, briefcase, city skyline, purple gradient, professional" },
  { id: "A3", name: "Content Pro", icon: "\u{1F4DD}", color: "#ec4899", tagline: "Viral Content Creation & Marketing", prompt: "social media content creation poster, phone, likes, viral, pink gradient, creative" },
  { id: "A4", name: "Career Pro", icon: "\u{1F3AF}", color: "#f59e0b", tagline: "Land Your Dream Job With AI", prompt: "career success poster, rocket launch, target, golden, professional growth" },
  { id: "A5", name: "Personal Shopper", icon: "\u{1F6CD}", color: "#10b981", tagline: "Smart Shopping & Deal Finding", prompt: "online shopping poster, shopping bags, deals, green gradient, modern ecommerce" },
  { id: "A6", name: "Exam Pro", icon: "\u{1F4DA}", color: "#6366f1", tagline: "Ace Your Exams With AI", prompt: "exam preparation poster, books, pencil, indigo gradient, study, education" },
  { id: "A7", name: "Finance Pro", icon: "\u{1F4B0}", color: "#059669", tagline: "Take Control of Your Finances", prompt: "finance and investment poster, coins, charts, green gradient, wealth management" },
  { id: "A8", name: "MediaStudio Pro", icon: "\u{1F3AC}", color: "#dc2626", tagline: "Professional Video & Media Creation", prompt: "video production poster, camera, film reel, red gradient, cinema, media studio" },
  { id: "A9", name: "Wellness Pro", icon: "\u{1F3C3}", color: "#14b8a6", tagline: "Your AI Wellness Coach", prompt: "health and wellness poster, yoga, meditation, teal gradient, fitness, wellbeing" },
  { id: "A10", name: "Home Services", icon: "\u{1F3E0}", color: "#78716c", tagline: "Trusted Home Service Providers", prompt: "home services poster, house, tools, warm colors, repair, maintenance" },
  { id: "A11", name: "Language Tutor", icon: "\u{1F5E3}", color: "#0ea5e9", tagline: "Learn Any Language With AI", prompt: "language learning poster, globe, speech bubbles, blue gradient, multilingual" },
  { id: "A12", name: "Travel Planner", icon: "\u{2708}", color: "#8b5cf6", tagline: "Plan Your Perfect Trip", prompt: "travel planning poster, airplane, world map, purple gradient, adventure, vacation" },
  { id: "A13", name: "ServiceMart NG", icon: "\u{1F527}", color: "#f97316", tagline: "Local Services in Nigeria", prompt: "nigerian local services poster, tools, wrench, orange gradient, handymen, marketplace" },
  { id: "A14", name: "Translation Hub", icon: "\u{1F30D}", color: "#06b6d4", tagline: "Translate Anything Instantly", prompt: "translation service poster, globe, languages, cyan gradient, communication, multilingual" },
  { id: "A15", name: "Event Planner", icon: "\u{1F389}", color: "#a855f7", tagline: "Plan Events Effortlessly", prompt: "event planning poster, celebration, confetti, purple gradient, party, wedding" },
];

const SITE_URL = "https://dutchkem-prosuite-app.vercel.app";

// ─── POLLINATIONS.AI (Free, no API key) ───
async function generateWithPollinations(prompt: string, width: number, height: number): Promise<string | null> {
  try {
    const fullPrompt = `${prompt}, high quality, professional, 4K, photorealistic, Dutchkem Ventures branding`;
    const encoded = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
    const response = await fetch(url, { redirect: "follow" });
    if (response.ok && response.url) {
      return response.url;
    }
  } catch (e: any) {
    console.error("[POSTER] Pollinations.ai failed:", e?.message || e);
  }
  return null;
}

// ─── NVIDIA NIM (Requires API key) ───
async function generateWithNvidia(prompt: string, width: number, height: number): Promise<string | null> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) return null;

  try {
    const fullPrompt = `${prompt}, high quality, professional, 4K, photorealistic`;
    const response = await fetch("https://integrate.api.nvidia.com/v1/models/black-forest-labs/flux.1-schnell/infer", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        width,
        height,
        steps: 4,
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      if (data.artifacts && data.artifacts[0]?.base64) {
        return `data:image/png;base64,${data.artifacts[0].base64}`;
      }
      if (data.output && data.output.image_url) {
        return data.output.image_url;
      }
    }
  } catch (e: any) {
    console.error("[POSTER] NVIDIA NIM failed:", e?.message || e);
  }
  return null;
}

// ─── REPLICATE (Requires API key) ───
async function generateWithReplicate(prompt: string, width: number, height: number): Promise<string | null> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return null;

  try {
    const fullPrompt = `${prompt}, high quality, professional, 4K, photorealistic`;
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-schnell",
        input: { prompt: fullPrompt, width, height, num_inference_steps: 4 },
      }),
    });

    if (!response.ok) return null;
    const prediction = await response.json() as any;

    // Poll for completion
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { "Authorization": `Token ${apiKey}` },
      });
      const result = await poll.json() as any;
      if (result.status === "succeeded" && result.output) {
        return Array.isArray(result.output) ? result.output[0] : result.output;
      }
      if (result.status === "failed") return null;
    }
  } catch (e: any) {
    console.error("[POSTER] Replicate failed:", e?.message || e);
  }
  return null;
}

// ─── MULTI-TIER GENERATION ───
async function generatePosterImage(prompt: string, width: number, height: number): Promise<{ url: string; provider: string } | null> {
  // Tier 1: Pollinations.ai (free)
  const pollinations = await generateWithPollinations(prompt, width, height);
  if (pollinations) return { url: pollinations, provider: "Pollinations.ai (Free)" };

  // Tier 2: NVIDIA NIM
  const nvidia = await generateWithNvidia(prompt, width, height);
  if (nvidia) return { url: nvidia, provider: "NVIDIA NIM" };

  // Tier 3: Replicate
  const replicate = await generateWithReplicate(prompt, width, height);
  if (replicate) return { url: replicate, provider: "Replicate" };

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ACTIONS
// ═══════════════════════════════════════════════════════════════════

export const generatePosterImageAction = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    platform: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    // Platform-specific dimensions
    const dims: Record<string, { w: number; h: number }> = {
      linkedin: { w: 1200, h: 628 },
      facebook: { w: 1200, h: 628 },
      instagram: { w: 1080, h: 1080 },
      twitter: { w: 1200, h: 675 },
      youtube: { w: 1280, h: 720 },
      story: { w: 1080, h: 1920 },
    };
    const dim = dims[args.platform || "instagram"] || dims.instagram;

    const prompt = args.customPrompt || agent.prompt;
    const result = await generatePosterImage(prompt, dim.w, dim.h);

    if (!result) {
      return { success: false, error: "All image generation providers failed. Check API keys." };
    }

    return {
      success: true,
      agent: agent.name,
      imageUrl: result.url,
      downloadUrl: result.url,
      provider: result.provider,
      dimensions: `${dim.w}x${dim.h}`,
      platform: args.platform || "instagram",
    };
  },
});

export const generateAllPosters = action({
  args: {
    adminToken: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const dim = { w: 1080, h: 1080 };
    const results = [];

    for (const agent of AGENTS) {
      try {
        const result = await generatePosterImage(agent.prompt, dim.w, dim.h);
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: !!result,
          imageUrl: result?.url || null,
          provider: result?.provider || "failed",
        });
      } catch (err: any) {
        results.push({ agentId: agent.id, agentName: agent.name, success: false, error: err.message });
      }
    }

    return {
      success: true,
      total: AGENTS.length,
      generated: results.filter(r => r.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getAgentPoster = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return null;
    return {
      agentId: agent.id,
      agentName: agent.name,
      tagline: agent.tagline,
      color: agent.color,
      icon: agent.icon,
      prompt: agent.prompt,
    };
  },
});

export const getAllAgentPosters = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return AGENTS.map(a => ({
      agentId: a.id,
      agentName: a.name,
      tagline: a.tagline,
      color: a.color,
      icon: a.icon,
      prompt: a.prompt,
    }));
  },
});
