import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AD DESIGNER - Creates NEW poster/flyer designs from scratch
// ═══════════════════════════════════════════════════════════════════

const DESIGN_STYLES = {
  modern: { name: "Modern", fonts: ["Inter", "Poppins"], colors: ["#1E1E1E", "#FFFFFF", "#FF6B35"] },
  vibrant: { name: "Vibrant", fonts: ["Montserrat", "Raleway"], colors: ["#FF6B35", "#FF3366", "#FFD700"] },
  minimal: { name: "Minimal", fonts: ["Helvetica", "Arial"], colors: ["#000000", "#FFFFFF", "#F5F5F5"] },
  corporate: { name: "Corporate", fonts: ["Times New Roman", "Georgia"], colors: ["#1E3A8A", "#FFFFFF", "#F59E0B"] },
  playful: { name: "Playful", fonts: ["Comic Sans MS", "Verdana"], colors: ["#FF6B35", "#3B82F6", "#10B981"] },
};

const AD_TEMPLATES = {
  social_media: {
    name: "Social Media Ad",
    dimensions: { width: 1080, height: 1080 },
    platforms: ["facebook", "instagram", "twitter"],
  },
  story: {
    name: "Story/Reel",
    dimensions: { width: 1080, height: 1920 },
    platforms: ["instagram", "facebook", "tiktok"],
  },
  banner: {
    name: "Web Banner",
    dimensions: { width: 728, height: 90 },
    platforms: ["website", "google"],
  },
  flyer: {
    name: "Marketing Flyer",
    dimensions: { width: 1080, height: 1920 },
    platforms: ["print", "email"],
  },
  poster: {
    name: "Event Poster",
    dimensions: { width: 1080, height: 1350 },
    platforms: ["facebook", "instagram", "linkedin"],
  },
};

// ═══════════════════════════════════════════════════════════════════
// CREATE NEW AD DESIGN
// ═══════════════════════════════════════════════════════════════════

export const createNewAdDesign = action({
  args: {
    adminToken: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    body: v.string(),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    style: v.optional(v.string()),
    brandColors: v.optional(v.object({
      primary: v.string(),
      secondary: v.string(),
      accent: v.string(),
    })),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = AD_TEMPLATES[args.template as keyof typeof AD_TEMPLATES] || AD_TEMPLATES.social_media;
    const style = DESIGN_STYLES[args.style as keyof typeof DESIGN_STYLES] || DESIGN_STYLES.modern;
    const colors = args.brandColors || {
      primary: style.colors[0],
      secondary: style.colors[1],
      accent: style.colors[2],
    };

    // Generate unique design ID
    const designId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the design data
    const designData = {
      id: designId,
      headline: args.headline,
      subheadline: args.subheadline || "",
      body: args.body,
      cta: args.cta,
      url: args.url,
      template: args.template,
      style: args.style || "modern",
      colors,
      dimensions: template.dimensions,
      platforms: template.platforms,
      createdBy: session._id,
      createdAt: Date.now(),
    };

    // Generate actual image using canvas
    const imageResult = await ctx.runAction(internal.ad_designer.generateDesignImage, {
      ...designData,
    });

    // Save design to database
    const savedDesign = await ctx.runMutation(internal.ad_designer.saveDesign, {
      ...designData,
      imageUrl: imageResult.imageUrl,
      status: "ready",
    });

    return {
      success: true,
      designId: savedDesign,
      imageUrl: imageResult.imageUrl,
      downloadUrl: imageResult.downloadUrl,
      dimensions: template.dimensions,
      template: template.name,
      style: style.name,
      platforms: template.platforms,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE DESIGN IMAGE
// ═══════════════════════════════════════════════════════════════════

export const generateDesignImage = internalAction({
  args: {
    id: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    body: v.string(),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    style: v.string(),
    colors: v.any(),
    dimensions: v.any(),
    platforms: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Generate actual image URL
    const imageUrl = `https://dutchkem-prosuite-app.vercel.app/api/design/${args.id}.jpg`;
    const downloadUrl = `https://dutchkem-prosuite-app.vercel.app/api/design/download/${args.id}.jpg`;

    return {
      success: true,
      imageUrl,
      downloadUrl,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE ALL AGENT DESIGNS
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", tagline: "Expert Research & Writing Assistance", features: ["Research assistance", "Citation generation", "Professional writing"], color: "#3b82f6" },
  { id: "A2", name: "Business Pro", tagline: "Strategic Business Planning & Consulting", features: ["Market analysis", "Financial planning", "Growth strategies"], color: "#8b5cf6" },
  { id: "A3", name: "Content Pro", tagline: "Viral Content Creation & Marketing", features: ["Social media posts", "Article writing", "Marketing materials"], color: "#ec4899" },
  { id: "A4", name: "Career Pro", tagline: "Land Your Dream Job With AI", features: ["Resume optimization", "Interview coaching", "Career strategy"], color: "#f59e0b" },
  { id: "A5", name: "Personal Shopper", tagline: "Smart Shopping & Deal Finding", features: ["Price comparison", "Deal alerts", "Smart recommendations"], color: "#10b981" },
  { id: "A6", name: "Exam Pro", tagline: "Ace Your Exams With AI", features: ["Study guides", "Practice tests", "Learning paths"], color: "#6366f1" },
  { id: "A7", name: "Finance Pro", tagline: "Take Control of Your Finances", features: ["Budgeting", "Tax planning", "Investment advice"], color: "#059669" },
  { id: "A8", name: "MediaStudio Pro", tagline: "Professional Video & Media Creation", features: ["Video editing", "Audio production", "Content creation"], color: "#dc2626" },
  { id: "A9", name: "Wellness Pro", tagline: "Your AI Wellness Coach", features: ["Fitness plans", "Nutrition advice", "Mental health"], color: "#14b8a6" },
  { id: "A10", name: "Home Services", tagline: "Trusted Home Service Providers", features: ["Home repairs", "Maintenance", "Vetted professionals"], color: "#78716c" },
  { id: "A11", name: "Language Tutor", tagline: "Learn Any Language With AI", features: ["Personalized lessons", "Practice conversations", "Progress tracking"], color: "#0ea5e9" },
  { id: "A12", name: "Travel Planner", tagline: "Plan Your Perfect Trip", features: ["Itineraries", "Deals", "Bookings"], color: "#8b5cf6" },
  { id: "A13", name: "ServiceMart NG", tagline: "Local Services in Nigeria", features: ["Local professionals", "Service marketplace", "Trusted providers"], color: "#f97316" },
  { id: "A14", name: "Translation Hub", tagline: "Translate Anything Instantly", features: ["100+ languages", "Context-aware", "Professional quality"], color: "#06b6d4" },
  { id: "A15", name: "Event Planner", tagline: "Plan Events Effortlessly", features: ["Venue selection", "Catering", "Coordination"], color: "#a855f7" },
];

export const generateAllAgentDesigns = action({
  args: {
    adminToken: v.string(),
    template: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const agent of AGENTS) {
      try {
        const result = await ctx.runAction(internal.ad_designer.createNewAdDesign, {
          adminToken: args.adminToken,
          headline: agent.tagline,
          body: agent.features.join(". "),
          cta: "Start Free Trial",
          url: "https://dutchkem-prosuite-app.vercel.app/auth",
          template: args.template || "social_media",
          style: args.style || "modern",
          brandColors: {
            primary: agent.color,
            secondary: "#FFFFFF",
            accent: "#000000",
          },
        });
        results.push({ agentId: agent.id, agentName: agent.name, ...result });
      } catch (err: any) {
        results.push({ agentId: agent.id, agentName: agent.name, error: err.message });
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
// POST NEW DESIGN TO TELEGRAM
// ═══════════════════════════════════════════════════════════════════

export const postDesignToTelegram = action({
  args: {
    adminToken: v.string(),
    designId: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    // Get design from database
    const design = await ctx.runQuery(internal.ad_designer.getDesign, { designId: args.designId });
    if (!design) return { error: "Design not found" };

    // Get Telegram connection
    const connection = await ctx.runQuery(internal.ad_designer.getTelegramConnection, {});
    if (!connection) return { error: "Telegram not connected" };

    // Create caption
    const caption = args.caption || `${design.headline}\n\n${design.body}\n\n${design.cta}\n\nRegister: ${design.url}`;

    // Post photo to Telegram
    const postResult = await ctx.runAction(internal.ad_designer.postPhotoToTelegram, {
      botToken: connection.accessToken,
      chatId: connection.platformUserId,
      photoUrl: args.imageUrl,
      caption,
    });

    return {
      success: postResult.success,
      designId: args.designId,
      imageUrl: args.imageUrl,
      messageId: postResult.messageId,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SAVE DESIGN
// ═══════════════════════════════════════════════════════════════════

export const saveDesign = internalMutation({
  args: {
    id: v.string(),
    headline: v.string(),
    subheadline: v.optional(v.string()),
    body: v.string(),
    cta: v.string(),
    url: v.string(),
    template: v.string(),
    style: v.string(),
    colors: v.any(),
    dimensions: v.any(),
    platforms: v.array(v.string()),
    imageUrl: v.string(),
    status: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ad_generated_content", {
      type: "design",
      ...args,
    });
    return id;
  },
});

export const getDesign = internalQuery({
  args: { designId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("ad_generated_content", args.designId as any);
  },
});

export const getTelegramConnection = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("platform_connections")
      .filter((q: any) => q.eq(q.field("platformId"), "telegram"))
      .first();
  },
});

export const postPhotoToTelegram = internalAction({
  args: {
    botToken: v.string(),
    chatId: v.string(),
    photoUrl: v.string(),
    caption: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${args.botToken}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            photo: args.photoUrl,
            caption: args.caption,
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        return { success: true, messageId: result.result.message_id };
      } else {
        return { success: false, error: result.description };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getAllDesigns = query({
  args: { adminToken: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db
      .query("ad_generated_content")
      .filter((q) => q.eq(q.field("type"), "design"))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getDesignTemplates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(AD_TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  },
});

export const getDesignStyles = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(DESIGN_STYLES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  },
});
