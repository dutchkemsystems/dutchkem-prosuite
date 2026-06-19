import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";

const FLYER_WIDTH = 500;
const FLYER_HEIGHT = 700;

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < bytes.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

const NVIDIA_MODELS = [
  { id: "qwen/qwen-image-2512", name: "Qwen Image 2512", supportsText: true },
  { id: "black-forest-labs/flux.1-schnell", name: "Flux Schnell", supportsText: false },
  { id: "black-forest-labs/flux.2-klein-4b", name: "Flux Klein", supportsText: false },
];

const PLATFORM_SIZES: Record<string, { w: number; h: number }> = {
  linkedin: { w: 1200, h: 628 },
  facebook: { w: 1200, h: 630 },
  instagram: { w: 1080, h: 1080 },
  youtube: { w: 1280, h: 720 },
  reddit: { w: 1200, h: 628 },
  threads: { w: 1080, h: 1080 },
  telegram: { w: 1200, h: 675 },
  discord: { w: 1200, h: 675 },
};

const DESIGN_PRESETS = [
  {
    name: "Neon Tech",
    primaryColor: "#00f0ff",
    secondaryColor: "#7b2ff7",
    accentColor: "#ff006e",
    bgColor: "#0a0a1a",
    textColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    layout: "modern" as const,
  },
  {
    name: "Corporate Gold",
    primaryColor: "#c9a84c",
    secondaryColor: "#1a1a2e",
    accentColor: "#e8d5b7",
    bgColor: "#0f0f23",
    textColor: "#f5f5f5",
    fontFamily: "Georgia, serif",
    layout: "corporate" as const,
  },
  {
    name: "Fresh Green",
    primaryColor: "#00c853",
    secondaryColor: "#1b5e20",
    accentColor: "#a5d6a7",
    bgColor: "#0d1f0d",
    textColor: "#ffffff",
    fontFamily: "Verdana, sans-serif",
    layout: "minimal" as const,
  },
  {
    name: "Sunset Vibes",
    primaryColor: "#ff6b35",
    secondaryColor: "#f7c59f",
    accentColor: "#efefd0",
    bgColor: "#1a0a00",
    textColor: "#ffffff",
    fontFamily: "Trebuchet MS, sans-serif",
    layout: "creative" as const,
  },
  {
    name: "Bold Purple",
    primaryColor: "#9c27b0",
    secondaryColor: "#e040fb",
    accentColor: "#f3e5f5",
    bgColor: "#12002e",
    textColor: "#ffffff",
    fontFamily: "Impact, sans-serif",
    layout: "bold" as const,
  },
  {
    name: "Ocean Blue",
    primaryColor: "#0288d1",
    secondaryColor: "#01579b",
    accentColor: "#b3e5fc",
    bgColor: "#001a2d",
    textColor: "#ffffff",
    fontFamily: "Helvetica, sans-serif",
    layout: "modern" as const,
  },
  {
    name: "Crimson Fire",
    primaryColor: "#d32f2f",
    secondaryColor: "#b71c1c",
    accentColor: "#ffcdd2",
    bgColor: "#1a0000",
    textColor: "#ffffff",
    fontFamily: "Trebuchet MS, sans-serif",
    layout: "bold" as const,
  },
  {
    name: "Mint Fresh",
    primaryColor: "#26a69a",
    secondaryColor: "#00897b",
    accentColor: "#b2dfdb",
    bgColor: "#0a1f1e",
    textColor: "#ffffff",
    fontFamily: "Verdana, sans-serif",
    layout: "minimal" as const,
  },
  {
    name: "Royal Gold",
    primaryColor: "#ffd700",
    secondaryColor: "#b8860b",
    accentColor: "#fff8e1",
    bgColor: "#1a1000",
    textColor: "#ffffff",
    fontFamily: "Georgia, serif",
    layout: "corporate" as const,
  },
  {
    name: "Electric Pink",
    primaryColor: "#e91e63",
    secondaryColor: "#c2185b",
    accentColor: "#fce4ec",
    bgColor: "#1a0010",
    textColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    layout: "creative" as const,
  },
];

function generateQRSvg(text: string, size: number = 60): string {
  const modules = 21;
  const cellSize = size / modules;
  const hash = simpleHash(text);
  let svg = `<g transform="translate(0,0)">`;

  svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="white" rx="4"/>`;

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const isFinder = (row < 7 && col < 7) || (row < 7 && col >= modules - 7) || (row >= modules - 7 && col < 7);
      const isDark = isFinder
        ? !((row === 0 || row === 6 || col === 0 || col === 6) || (row >= 2 && row <= 4 && col >= 2 && col <= 4))
        : ((hash + row * modules + col) % 3 === 0);

      if (isDark) {
        svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  svg += `</g>`;
  return svg;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateFlyerSvg(
  headline: string,
  subheadline: string | undefined,
  cta: string,
  style: typeof DESIGN_PRESETS[number],
  platform: string,
  bgImageUrl?: string
): string {
  const size = PLATFORM_SIZES[platform] || { w: FLYER_WIDTH, h: FLYER_HEIGHT };
  const w = size.w;
  const h = size.h;
  const qrSvg = generateQRSvg(`https://dutchkem-prosuite-app.vercel.app`);

  const bgImageTag = bgImageUrl
    ? `<image href="${bgImageUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" opacity="0.3"/>`
    : '';

  const gradientId = `grad-${simpleHash(headline) % 1000}`;

  let pattern = '';
  if (style.layout === "modern") {
    pattern = `
      <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${w * 0.15}" fill="${style.primaryColor}" opacity="0.1"/>
      <circle cx="${w * 0.2}" cy="${h * 0.7}" r="${w * 0.2}" fill="${style.secondaryColor}" opacity="0.08"/>
      <line x1="0" y1="${h * 0.45}" x2="${w}" y2="${h * 0.45}" stroke="${style.primaryColor}" stroke-width="2" opacity="0.3"/>
    `;
  } else if (style.layout === "bold") {
    pattern = `
      <rect x="0" y="0" width="${w}" height="${h * 0.08}" fill="${style.primaryColor}"/>
      <rect x="0" y="${h * 0.92}" width="${w}" height="${h * 0.08}" fill="${style.primaryColor}"/>
      <rect x="${w * 0.05}" y="${h * 0.35}" width="${w * 0.9}" height="3" fill="${style.accentColor}" opacity="0.5"/>
    `;
  } else if (style.layout === "minimal") {
    pattern = `
      <line x1="${w * 0.1}" y1="${h * 0.5}" x2="${w * 0.3}" y2="${h * 0.5}" stroke="${style.primaryColor}" stroke-width="3"/>
    `;
  } else if (style.layout === "creative") {
    pattern = `
      <polygon points="${w * 0.7},0 ${w},0 ${w},${h * 0.3}" fill="${style.primaryColor}" opacity="0.15"/>
      <circle cx="${w * 0.15}" cy="${h * 0.85}" r="${w * 0.1}" fill="${style.accentColor}" opacity="0.1"/>
    `;
  } else {
    pattern = `
      <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="${style.primaryColor}" stroke-width="2" opacity="0.2" rx="8"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.bgColor}"/>
      <stop offset="50%" stop-color="${style.secondaryColor}"/>
      <stop offset="100%" stop-color="${style.bgColor}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${gradientId})"/>
  ${bgImageTag}
  ${pattern}
  <text x="${w / 2}" y="${h * 0.25}" text-anchor="middle" font-family="${style.fontFamily}" font-size="${Math.round(w * 0.07)}" font-weight="bold" fill="${style.textColor}">
    ${escapeXml(headline.slice(0, 40))}
  </text>
  ${subheadline ? `<text x="${w / 2}" y="${h * 0.35}" text-anchor="middle" font-family="${style.fontFamily}" font-size="${Math.round(w * 0.035)}" fill="${style.accentColor}">
    ${escapeXml(subheadline.slice(0, 60))}
  </text>` : ''}
  <rect x="${w * 0.2}" y="${h * 0.55}" width="${w * 0.6}" height="${h * 0.08}" rx="${w * 0.02}" fill="${style.primaryColor}"/>
  <text x="${w / 2}" y="${h * 0.61}" text-anchor="middle" font-family="${style.fontFamily}" font-size="${Math.round(w * 0.04)}" font-weight="bold" fill="${style.bgColor}">
    ${escapeXml(cta.slice(0, 30))}
  </text>
  <g transform="translate(${w * 0.38}, ${h * 0.72})">
    ${qrSvg}
  </g>
  <text x="${w / 2}" y="${h * 0.95}" text-anchor="middle" font-family="${style.fontFamily}" font-size="${Math.round(w * 0.025)}" fill="${style.textColor}" opacity="0.6">
    dutchkem-prosuite-app.vercel.app
  </text>
</svg>`;

  return svg;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const getDesignPresets = query({
  args: {},
  handler: async (ctx) => {
    return DESIGN_PRESETS.map((p, i) => ({ ...p, index: i }));
  },
});

export const listStyles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("flyer_design_styles").collect();
  },
});

export const createStyle = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    bgColor: v.string(),
    textColor: v.string(),
    fontFamily: v.string(),
    layout: v.union(v.literal("modern"), v.literal("bold"), v.literal("minimal"), v.literal("creative"), v.literal("corporate")),
    generationMode: v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flyer_design_styles", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateStyle = mutation({
  args: {
    styleId: v.id("flyer_design_styles"),
    name: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
    fontFamily: v.optional(v.string()),
    layout: v.optional(v.union(v.literal("modern"), v.literal("bold"), v.literal("minimal"), v.literal("creative"), v.literal("corporate"))),
    generationMode: v.optional(v.union(v.literal("full_ai"), v.literal("ai_bg_svg_text"), v.literal("svg_only"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { styleId, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(styleId, filtered);
  },
});

export const deleteStyle = mutation({
  args: { styleId: v.id("flyer_design_styles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.styleId);
  },
});

export const generateNvidiaBackground = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not configured");

    const model = args.model || "black-forest-labs/flux.1-schnell";
    const w = args.width || FLYER_WIDTH;
    const h = args.height || FLYER_HEIGHT;

    const response = await fetch("https://integrate.api.nvidia.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: args.prompt,
        n: 1,
        response_format: "b64_json",
        width: w,
        height: h,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NVIDIA API error ${response.status}: ${err}`);
    }

    const result = await response.json();
    if (result.data && result.data[0] && result.data[0].b64_json) {
      return `data:image/png;base64,${result.data[0].b64_json}`;
    }
    throw new Error("No image data in NVIDIA response");
  },
});

export const generateFlyerSvgOnly = action({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    styleIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const styleIdx = args.styleIndex ?? 0;
    const style = DESIGN_PRESETS[styleIdx % DESIGN_PRESETS.length];
    const svg = generateFlyerSvg(args.headline, args.subheadline, args.cta, style, args.platform);
    return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
  },
});

export const generateFullAiFlyer = action({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    styleIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not configured");

    const size = PLATFORM_SIZES[args.platform] || { w: FLYER_WIDTH, h: FLYER_HEIGHT };
    const prompt = `Professional marketing flyer for "${args.headline}". ${args.subheadline || ''} Call to action: "${args.cta}". Modern business design, high quality, clean layout, professional typography, brand colors. Size ${size.w}x${size.h}. No text on the image, just visual design elements.`;

    const response = await fetch("https://integrate.api.nvidia.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen-image-2512",
        prompt,
        n: 1,
        response_format: "b64_json",
        width: size.w,
        height: size.h,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NVIDIA Qwen API error ${response.status}: ${err}`);
    }

    const result = await response.json();
    if (result.data && result.data[0] && result.data[0].b64_json) {
      return `data:image/png;base64,${result.data[0].b64_json}`;
    }
    throw new Error("No image data in NVIDIA Qwen response");
  },
});

export const generateAiBackgroundWithSvgOverlay = action({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    platform: v.string(),
    styleIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not configured");

    const styleIdx = args.styleIndex ?? 0;
    const style = DESIGN_PRESETS[styleIdx % DESIGN_PRESETS.length];
    const size = PLATFORM_SIZES[args.platform] || { w: FLYER_WIDTH, h: FLYER_HEIGHT };

    const bgPrompt = `Abstract ${style.layout} background, ${style.primaryColor} and ${style.secondaryColor} color palette, smooth gradient, professional marketing background, no text, no words, no letters, clean design, ${size.w}x${size.h}`;

    const modelIdx = (styleIdx % 2) === 0 ? "black-forest-labs/flux.1-schnell" : "black-forest-labs/flux.2-klein-4b";

    const response = await fetch("https://integrate.api.nvidia.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelIdx,
        prompt: bgPrompt,
        n: 1,
        response_format: "b64_json",
        width: size.w,
        height: size.h,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NVIDIA ${modelIdx} API error ${response.status}: ${err}`);
    }

    const result = await response.json();
    if (result.data && result.data[0] && result.data[0].b64_json) {
      return `data:image/png;base64,${result.data[0].b64_json}`;
    }
    throw new Error("No background image data from NVIDIA");
  },
});

export { DESIGN_PRESETS, PLATFORM_SIZES, FLYER_WIDTH, FLYER_HEIGHT, generateFlyerSvg, generateQRSvg };
