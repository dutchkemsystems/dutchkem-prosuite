import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// VOICE & VIDEO AI AGENTS - Avatar and voice configuration
// ═══════════════════════════════════════════════════════════════════

const AVATAR_PRESETS = [
  { id: "professional", name: "Professional", style: "Business formal, neutral background", gender: "neutral" },
  { id: "friendly", name: "Friendly", style: "Warm smile, casual setting", gender: "neutral" },
  { id: "formal", name: "Formal", style: "Suit, corporate background", gender: "neutral" },
  { id: "creative", name: "Creative", style: "Colorful, artistic setting", gender: "neutral" },
  { id: "tech", name: "Tech Expert", style: "Modern, futuristic background", gender: "neutral" },
]

const VOICE_PRESETS = [
  { id: "nigerian_male", name: "Nigerian Male", language: "en-NG", accent: "Nigerian English", rate: 1.0 },
  { id: "nigerian_female", name: "Nigerian Female", language: "en-NG", accent: "Nigerian English", rate: 1.0 },
  { id: "british_male", name: "British Male", language: "en-GB", accent: "British English", rate: 1.0 },
  { id: "british_female", name: "British Female", language: "en-GB", accent: "British English", rate: 1.0 },
  { id: "american_male", name: "American Male", language: "en-US", accent: "American English", rate: 1.0 },
  { id: "american_female", name: "American Female", language: "en-US", accent: "American English", rate: 1.0 },
]

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get avatar presets
// ═══════════════════════════════════════════════════════════════════
export const getAvatarPresets = query({
  args: {},
  returns: v.any(),
  handler: async () => AVATAR_PRESETS,
})

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get voice presets
// ═══════════════════════════════════════════════════════════════════
export const getVoicePresets = query({
  args: {},
  returns: v.any(),
  handler: async () => VOICE_PRESETS,
})

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Save voice/video config for agent
// ═══════════════════════════════════════════════════════════════════
export const saveAgentMediaConfig = mutation({
  args: {
    agentId: v.string(),
    avatarPreset: v.string(),
    voicePreset: v.string(),
    customAvatarUrl: v.optional(v.string()),
    customVoiceId: v.optional(v.string()),
    backgroundUrl: v.optional(v.string()),
    lipSync: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Auth: validate admin token if provided
    if (args.adminToken) {
      const session = await tryGetAdminSession(ctx, args.adminToken);
      if (!session) return null;
    }
    const key = `media_config_${args.agentId}`;
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const value = {
      avatarPreset: args.avatarPreset,
      voicePreset: args.voicePreset,
      customAvatarUrl: args.customAvatarUrl,
      customVoiceId: args.customVoiceId,
      backgroundUrl: args.backgroundUrl,
      lipSync: args.lipSync ?? false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value,
        description: `Media config for agent ${args.agentId}`,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
})

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent media config
// ═══════════════════════════════════════════════════════════════════
export const getAgentMediaConfig = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const key = `media_config_${args.agentId}`;
    const config = await ctx.db.query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return config?.value || null;
  },
})

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all agent media configs
// ═══════════════════════════════════════════════════════════════════
export const getAllAgentMediaConfigs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const configs: Record<string, any> = {};
    for (const id of agentIds) {
      const key = `media_config_${id}`;
      const config = await ctx.db.query("system_config")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      configs[id] = config?.value || null;
    }
    return configs;
  },
})
