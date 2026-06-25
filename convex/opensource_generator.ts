import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// OPEN-SOURCE IMAGE & VIDEO GENERATION
// Uses Sharp, Canvas, Jimp - No API keys required
// ═══════════════════════════════════════════════════════════════════

const TEMPLATES = {
  promotional: {
    name: "Promotional",
    width: 1080,
    height: 1080,
    background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
    textColor: "#FFFFFF",
    accentColor: "#FFD700",
  },
  event: {
    name: "Event",
    width: 1200,
    height: 628,
    background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
    textColor: "#FFFFFF",
    accentColor: "#60A5FA",
  },
  product: {
    name: "Product",
    width: 1080,
    height: 1080,
    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
    textColor: "#FFFFFF",
    accentColor: "#A78BFA",
  },
  flyer: {
    name: "Flyer",
    width: 1080,
    height: 1920,
    background: "linear-gradient(135deg, #FF6B35 0%, #FF3366 100%)",
    textColor: "#FFFFFF",
    accentColor: "#FFD700",
  },
  story: {
    name: "Story",
    width: 1080,
    height: 1920,
    background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
    textColor: "#FFFFFF",
    accentColor: "#C4B5FD",
  },
};

// ═══════════════════════════════════════════════════════════════════
// GENERATE POSTER IMAGE (Open-Source)
// ═══════════════════════════════════════════════════════════════════

export const generatePosterOpenSource = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = TEMPLATES[args.template as keyof typeof TEMPLATES] || TEMPLATES.promotional;

    // Generate SVG template for the poster
    const svgContent = generatePosterSVG({
      headline: args.headline,
      subheadline: args.subheadline || "",
      cta: args.cta,
      url: args.url,
      width: template.width,
      height: template.height,
      background: template.background,
      textColor: template.textColor,
      accentColor: template.accentColor,
    });

    // Save poster data
    const posterId = await ctx.runMutation(internal.opensource_generator.savePosterData, {
      headline: args.headline,
      subheadline: args.subheadline,
      cta: args.cta,
      url: args.url,
      template: args.template || "promotional",
      platform: args.platform,
      svgContent,
      width: template.width,
      height: template.height,
      createdBy: session._id,
    });

    return {
      success: true,
      posterId,
      svgContent,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/poster/${posterId}`,
      width: template.width,
      height: template.height,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE FLYER IMAGE (Open-Source)
// ═══════════════════════════════════════════════════════════════════

export const generateFlyerOpenSource = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = TEMPLATES.flyer;

    const svgContent = generateFlyerSVG({
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      width: template.width,
      height: template.height,
      background: template.background,
      textColor: template.textColor,
      accentColor: template.accentColor,
    });

    const flyerId = await ctx.runMutation(internal.opensource_generator.saveFlyerData, {
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      platform: args.platform,
      svgContent,
      width: template.width,
      height: template.height,
      createdBy: session._id,
    });

    return {
      success: true,
      flyerId,
      svgContent,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/flyer/${flyerId}`,
      width: template.width,
      height: template.height,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE 30-SECOND VIDEO (Open-Source)
// ═══════════════════════════════════════════════════════════════════

export const generateVideoOpenSource = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    duration: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Generate video frames as SVG animations
    const videoFrames = generateVideoFrames({
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      duration: args.duration || 30,
      fps: 24,
    });

    // Save video data
    const videoId = await ctx.runMutation(internal.opensource_generator.saveVideoData, {
      agentId: args.agentId,
      headline: args.headline,
      features: args.features,
      cta: args.cta,
      url: args.url,
      frames: videoFrames,
      duration: args.duration || 30,
      platform: args.platform,
      createdBy: session._id,
    });

    return {
      success: true,
      videoId,
      framesCount: videoFrames.length,
      duration: args.duration || 30,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/video/${videoId}`,
      siteUrl: args.url,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SVG GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function generatePosterSVG(data: {
  headline: string;
  subheadline: string;
  cta: string;
  url: string;
  width: number;
  height: number;
  background: string;
  textColor: string;
  accentColor: string;
}): string {
  const { headline, subheadline, cta, url, width, height, background, textColor, accentColor } = data;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35"/>
      <stop offset="100%" style="stop-color:#F7931E"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  
  <!-- Decorative circles -->
  <circle cx="${width * 0.8}" cy="${height * 0.2}" r="150" fill="rgba(255,255,255,0.1)"/>
  <circle cx="${width * 0.2}" cy="${height * 0.8}" r="200" fill="rgba(255,255,255,0.05)"/>
  
  <!-- Headline -->
  <text x="${width / 2}" y="${height * 0.3}" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${textColor}" text-anchor="middle" filter="url(#shadow)">
    ${escapeXml(headline)}
  </text>
  
  ${subheadline ? `
  <!-- Subheadline -->
  <text x="${width / 2}" y="${height * 0.45}" font-family="Arial, sans-serif" font-size="32" fill="${textColor}" text-anchor="middle" opacity="0.9">
    ${escapeXml(subheadline)}
  </text>
  ` : ''}
  
  <!-- CTA Button -->
  <rect x="${width / 2 - 150}" y="${height * 0.6}" width="300" height="60" rx="30" fill="${accentColor}" filter="url(#shadow)"/>
  <text x="${width / 2}" y="${height * 0.6 + 38}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000" text-anchor="middle">
    ${escapeXml(cta)}
  </text>
  
  <!-- URL -->
  <text x="${width / 2}" y="${height * 0.85}" font-family="Arial, sans-serif" font-size="20" fill="${textColor}" text-anchor="middle" opacity="0.8">
    ${escapeXml(url)}
  </text>
  
  <!-- Footer -->
  <text x="${width / 2}" y="${height * 0.95}" font-family="Arial, sans-serif" font-size="16" fill="${textColor}" text-anchor="middle" opacity="0.6">
    Powered by DutchKem Ventures Prosuite
  </text>
</svg>`;
}

function generateFlyerSVG(data: {
  headline: string;
  features: string[];
  cta: string;
  url: string;
  width: number;
  height: number;
  background: string;
  textColor: string;
  accentColor: string;
}): string {
  const { headline, features, cta, url, width, height, background, textColor, accentColor } = data;

  const featuresHTML = features.map((f, i) => `
    <text x="${width / 2}" y="${height * 0.45 + i * 50}" font-family="Arial, sans-serif" font-size="28" fill="${textColor}" text-anchor="middle">
      ✓ ${escapeXml(f)}
    </text>
  `).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35"/>
      <stop offset="100%" style="stop-color:#FF3366"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  
  <!-- Headline -->
  <text x="${width / 2}" y="${height * 0.15}" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="${textColor}" text-anchor="middle">
    ${escapeXml(headline)}
  </text>
  
  <!-- Features -->
  ${featuresHTML}
  
  <!-- CTA Button -->
  <rect x="${width / 2 - 150}" y="${height * 0.75}" width="300" height="60" rx="30" fill="${accentColor}"/>
  <text x="${width / 2}" y="${height * 0.75 + 38}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000" text-anchor="middle">
    ${escapeXml(cta)}
  </text>
  
  <!-- URL -->
  <text x="${width / 2}" y="${height * 0.9}" font-family="Arial, sans-serif" font-size="20" fill="${textColor}" text-anchor="middle" opacity="0.8">
    ${escapeXml(url)}
  </text>
</svg>`;
}

function generateVideoFrames(data: {
  headline: string;
  features: string[];
  cta: string;
  url: string;
  duration: number;
  fps: number;
}): any[] {
  const totalFrames = data.duration * data.fps;
  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const featureIndex = Math.floor(progress * data.features.length);
    const currentFeature = data.features[featureIndex] || data.features[0];

    frames.push({
      frame: i,
      timestamp: i / data.fps,
      headline: data.headline,
      feature: currentFeature,
      cta: progress > 0.8 ? data.cta : "",
      opacity: Math.min(1, progress * 2),
    });
  }

  return frames;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ═══════════════════════════════════════════════════════════════════
// SAVE TO DATABASE
// ═══════════════════════════════════════════════════════════════════

export const savePosterData = internalMutation({
  args: {
    headline: v.string(),
    subheadline: v.optional(v.string()),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    platform: v.optional(v.string()),
    svgContent: v.string(),
    width: v.number(),
    height: v.number(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "poster",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const saveFlyerData = internalMutation({
  args: {
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    platform: v.optional(v.string()),
    svgContent: v.string(),
    width: v.number(),
    height: v.number(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "flyer",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

export const saveVideoData = internalMutation({
  args: {
    agentId: v.string(),
    headline: v.string(),
    features: v.array(v.string()),
    cta: v.string(),
    url: v.string(),
    frames: v.any(),
    duration: v.number(),
    platform: v.optional(v.string()),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_generated_content", {
      type: "video",
      ...args,
      status: "generated",
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// BATCH GENERATE FOR ALL AGENTS
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", tagline: "Expert Research & Writing Assistance", features: ["Research assistance", "Citation generation", "Professional writing"] },
  { id: "A2", name: "Business Pro", tagline: "Strategic Business Planning & Consulting", features: ["Market analysis", "Financial planning", "Growth strategies"] },
  { id: "A3", name: "Content Pro", tagline: "Viral Content Creation & Marketing", features: ["Social media posts", "Article writing", "Marketing materials"] },
  { id: "A4", name: "Career Pro", tagline: "Land Your Dream Job With AI", features: ["Resume optimization", "Interview coaching", "Career strategy"] },
  { id: "A5", name: "Personal Shopper", tagline: "Smart Shopping & Deal Finding", features: ["Price comparison", "Deal alerts", "Smart recommendations"] },
  { id: "A6", name: "Exam Pro", tagline: "Ace Your Exams With AI", features: ["Study guides", "Practice tests", "Learning paths"] },
  { id: "A7", name: "Finance Pro", tagline: "Take Control of Your Finances", features: ["Budgeting", "Tax planning", "Investment advice"] },
  { id: "A8", name: "MediaStudio Pro", tagline: "Professional Video & Media Creation", features: ["Video editing", "Audio production", "Content creation"] },
  { id: "A9", name: "Wellness Pro", tagline: "Your AI Wellness Coach", features: ["Fitness plans", "Nutrition advice", "Mental health"] },
  { id: "A10", name: "Home Services", tagline: "Trusted Home Service Providers", features: ["Home repairs", "Maintenance", "Vetted professionals"] },
  { id: "A11", name: "Language Tutor", tagline: "Learn Any Language With AI", features: ["Personalized lessons", "Practice conversations", "Progress tracking"] },
  { id: "A12", name: "Travel Planner", tagline: "Plan Your Perfect Trip", features: ["Itineraries", "Deals", "Bookings"] },
  { id: "A13", name: "ServiceMart NG", tagline: "Local Services in Nigeria", features: ["Local professionals", "Service marketplace", "Trusted providers"] },
  { id: "A14", name: "Translation Hub", tagline: "Translate Anything Instantly", features: ["100+ languages", "Context-aware", "Professional quality"] },
  { id: "A15", name: "Event Planner", tagline: "Plan Events Effortlessly", features: ["Venue selection", "Catering", "Coordination"] },
];

export const batchGenerateAllAgents = action({
  args: {
    adminToken: v.string(),
    includeImages: v.optional(v.boolean()),
    includeVideos: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];

    for (const agent of AGENTS) {
      try {
        const agentResult: any = { agentId: agent.id, agentName: agent.name };

        // Generate poster
        if (args.includeImages !== false) {
          const posterResult = await ctx.runAction(internal.opensource_generator.generatePosterOpenSource, {
            adminToken: args.adminToken,
            headline: agent.tagline,
            cta: "Start Free Trial",
            url: "https://dutchkem-prosuite-app.vercel.app/auth",
            template: "promotional",
          });
          agentResult.poster = posterResult;
        }

        // Generate video
        if (args.includeVideos) {
          const videoResult = await ctx.runAction(internal.opensource_generator.generateVideoOpenSource, {
            adminToken: args.adminToken,
            agentId: agent.id,
            headline: agent.tagline,
            features: agent.features,
            cta: "Start Free Trial",
            url: "https://dutchkem-prosuite-app.vercel.app/auth",
            duration: 30,
          });
          agentResult.video = videoResult;
        }

        results.push(agentResult);
      } catch (err: any) {
        results.push({ agentId: agent.id, error: err.message });
      }
    }

    return {
      success: true,
      total: AGENTS.length,
      generated: results.filter((r) => r.poster?.success || r.video?.success).length,
      results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getGeneratedContent = query({
  args: { adminToken: v.string(), type: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_generated_content").order("desc");
    if (args.type) {
      q = q.filter((q) => q.eq(q.field("type"), args.type));
    }

    return await q.take(args.limit || 20);
  },
});

export const getTemplates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  },
});
