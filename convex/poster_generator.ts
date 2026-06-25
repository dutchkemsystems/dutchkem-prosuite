import { v } from "convex/values";
import { action } from "./_generated/server";
import { tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// POSTER GENERATOR - Creates actual JPG/PNG posters
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "📚", color: "#3b82f6", tagline: "Expert Research & Writing Assistance" },
  { id: "A2", name: "Business Pro", icon: "💼", color: "#8b5cf6", tagline: "Strategic Business Planning & Consulting" },
  { id: "A3", name: "Content Pro", icon: "📝", color: "#ec4899", tagline: "Viral Content Creation & Marketing" },
  { id: "A4", name: "Career Pro", icon: "🎯", color: "#f59e0b", tagline: "Land Your Dream Job With AI" },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", color: "#10b981", tagline: "Smart Shopping & Deal Finding" },
  { id: "A6", name: "Exam Pro", icon: "📚", color: "#6366f1", tagline: "Ace Your Exams With AI" },
  { id: "A7", name: "Finance Pro", icon: "💰", color: "#059669", tagline: "Take Control of Your Finances" },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", color: "#dc2626", tagline: "Professional Video & Media Creation" },
  { id: "A9", name: "Wellness Pro", icon: "🏃", color: "#14b8a6", tagline: "Your AI Wellness Coach" },
  { id: "A10", name: "Home Services", icon: "🏠", color: "#78716c", tagline: "Trusted Home Service Providers" },
  { id: "A11", name: "Language Tutor", icon: "🗣️", color: "#0ea5e9", tagline: "Learn Any Language With AI" },
  { id: "A12", name: "Travel Planner", icon: "✈️", color: "#8b5cf6", tagline: "Plan Your Perfect Trip" },
  { id: "A13", name: "ServiceMart NG", icon: "🔧", color: "#f97316", tagline: "Local Services in Nigeria" },
  { id: "A14", name: "Translation Hub", icon: "🌍", color: "#06b6d4", tagline: "Translate Anything Instantly" },
  { id: "A15", name: "Event Planner", icon: "🎉", color: "#a855f7", tagline: "Plan Events Effortlessly" },
];

export const generatePosterImage = action({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { error: "Agent not found" };

    // Generate poster data for frontend
    const posterData = {
      title: agent.name,
      headline: agent.tagline,
      cta: "Start Free Trial",
      url: "https://dutchkem-prosuite-app.vercel.app/auth",
      color: agent.color,
      icon: agent.icon,
      format: "jpg",
      dimensions: "1080x1080",
    };

    return {
      success: true,
      agent: agent.name,
      posterData,
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/poster/${args.agentId}`,
      siteUrl: "https://dutchkem-prosuite-app.vercel.app/auth",
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

    const results = AGENTS.map(agent => ({
      agentId: agent.id,
      agentName: agent.name,
      posterData: {
        title: agent.name,
        headline: agent.tagline,
        cta: "Start Free Trial",
        url: "https://dutchkem-prosuite-app.vercel.app/auth",
        color: agent.color,
        icon: agent.icon,
      },
      downloadUrl: `https://dutchkem-prosuite-app.vercel.app/api/poster/${agent.id}`,
    }));

    return {
      success: true,
      total: AGENTS.length,
      posters: results,
    };
  },
});
