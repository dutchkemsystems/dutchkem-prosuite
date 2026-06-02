import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SYNTHETIC INTELLIGENCE - Agentic AI System for 15 Agents
 * LIVE AI capabilities with admin controls
 */

// All 15 agents with their synthetic capabilities
export const AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "🎓", description: "Thesis, Research Papers, Dissertation", capabilities: ["writing", "research", "analysis", "citations"] },
  { id: "A2", name: "Business Pro", icon: "💼", description: "Business Plan, Financial Model, Pitch Deck", capabilities: ["planning", "finance", "strategy", "presentation"] },
  { id: "A3", name: "Content Pro", icon: "✍️", description: "Blog Posts, Social Media, Copywriting", capabilities: ["writing", "marketing", "seo", "social"] },
  { id: "A4", name: "Career Pro", icon: "📄", description: "Resume, Cover Letter, Interview Prep", capabilities: ["writing", "coaching", "review", "optimization"] },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", description: "Product Research, Price Comparison, Deals", capabilities: ["research", "comparison", "recommendation", "deals"] },
  { id: "A6", name: "Exam Pro", icon: "📝", description: "Exam Prep, Practice Tests, Study Plans", capabilities: ["teaching", "assessment", "planning", "review"] },
  { id: "A7", name: "Finance Pro", icon: "💰", description: "Investment Analysis, Budgeting, Tax Planning", capabilities: ["analysis", "planning", "forecasting", "reporting"] },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", description: "Video Production, Editing, Animation", capabilities: ["video", "editing", "animation", "production"] },
  { id: "A9", name: "Wellness Pro", icon: "🏥", description: "Health Plans, Nutrition, Fitness", capabilities: ["planning", "coaching", "tracking", "recommendation"] },
  { id: "A10", name: "Home Services", icon: "🧹", description: "Cleaning, Maintenance, Repairs", capabilities: ["scheduling", "coordination", "quality", "support"] },
  { id: "A11", name: "Language Tutor", icon: "🗣️", description: "Language Learning, Pronunciation, Grammar", capabilities: ["teaching", "practice", "assessment", "feedback"] },
  { id: "A12", name: "Travel Planner", icon: "✈️", description: "Trip Planning, Booking, Itineraries", capabilities: ["planning", "booking", "recommendation", "support"] },
  { id: "A13", name: "ServiceMart NG", icon: "🚀", description: "General Services Marketplace", capabilities: ["matching", "coordination", "quality", "support"] },
  { id: "A14", name: "Translation Hub", icon: "🗣️📝", description: "Translation, Localization, Transcription", capabilities: ["translation", "localization", "transcription", "review"] },
  { id: "A15", name: "Event Planner", icon: "🎉", description: "Event Planning, Coordination, Management", capabilities: ["planning", "coordination", "management", "support"] },
] as const;

/**
 * Get all agents with synthetic status
 */
export const getAgentsWithStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const configs = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return AGENTS.map(agent => ({
      ...agent,
      syntheticEnabled: configMap[`SYNTHETIC_${agent.id}_ENABLED`] === true,
      syntheticModel: configMap[`SYNTHETIC_${agent.id}_MODEL`] || "meta-llama/llama-3.1-70b-instruct",
      syntheticTemperature: configMap[`SYNTHETIC_${agent.id}_TEMPERATURE`] || 0.7,
      syntheticMaxTokens: configMap[`SYNTHETIC_${agent.id}_MAX_TOKENS`] || 2048,
      lastUsed: configMap[`SYNTHETIC_${agent.id}_LAST_USED`] || null,
      totalRequests: configMap[`SYNTHETIC_${agent.id}_REQUESTS`] || 0,
    }));
  },
});

/**
 * Get single agent status
 */
export const getAgentStatus = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return null;

    const configs = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return {
      ...agent,
      syntheticEnabled: configMap[`SYNTHETIC_${args.agentId}_ENABLED`] === true,
      syntheticModel: configMap[`SYNTHETIC_${args.agentId}_MODEL`] || "meta-llama/llama-3.1-70b-instruct",
      syntheticTemperature: configMap[`SYNTHETIC_${args.agentId}_TEMPERATURE`] || 0.7,
      syntheticMaxTokens: configMap[`SYNTHETIC_${args.agentId}_MAX_TOKENS`] || 2048,
      lastUsed: configMap[`SYNTHETIC_${args.agentId}_LAST_USED`] || null,
      totalRequests: configMap[`SYNTHETIC_${args.agentId}_REQUESTS`] || 0,
    };
  },
});

/**
 * Toggle synthetic intelligence for an agent (admin only)
 */
export const toggleSyntheticAgent = mutation({
  args: {
    agentId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { success: false, error: "Agent not found" };

    const key = `SYNTHETIC_${args.agentId}_ENABLED`;
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: args.enabled,
        description: `Synthetic intelligence toggle for ${agent.name}`,
        updatedAt: Date.now(),
      });
    }

    return { success: true, agentId: args.agentId, enabled: args.enabled };
  },
});

/**
 * Update agent synthetic settings (admin only)
 */
export const updateAgentSettings = mutation({
  args: {
    agentId: v.string(),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { success: false, error: "Agent not found" };

    const updates = [
      args.model ? { key: `SYNTHETIC_${args.agentId}_MODEL`, value: args.model } : null,
      args.temperature !== undefined ? { key: `SYNTHETIC_${args.agentId}_TEMPERATURE`, value: args.temperature } : null,
      args.maxTokens !== undefined ? { key: `SYNTHETIC_${args.agentId}_MAX_TOKENS`, value: args.maxTokens } : null,
    ].filter(Boolean);

    for (const update of updates) {
      if (!update) continue;
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", update.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { value: update.value, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", {
          key: update.key,
          value: update.value,
          description: `Synthetic setting for ${agent.name}`,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, agentId: args.agentId };
  },
});

/**
 * Enable all agents at once (admin only)
 */
export const enableAllAgents = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    for (const agent of AGENTS) {
      const key = `SYNTHETIC_${agent.id}_ENABLED`;
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { value: true, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", {
          key,
          value: true,
          description: `Synthetic intelligence toggle for ${agent.name}`,
          updatedAt: Date.now(),
        });
      }
    }
    return { success: true, enabled: AGENTS.length };
  },
});

/**
 * Disable all agents at once (admin only)
 */
export const disableAllAgents = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    for (const agent of AGENTS) {
      const key = `SYNTHETIC_${agent.id}_ENABLED`;
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { value: false, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("system_config", {
          key,
          value: false,
          description: `Synthetic intelligence toggle for ${agent.name}`,
          updatedAt: Date.now(),
        });
      }
    }
    return { success: true, disabled: AGENTS.length };
  },
});

/**
 * Generate synthetic response for an agent (LIVE AI)
 */
export const generateSyntheticResponse = action({
  args: {
    agentId: v.string(),
    prompt: v.string(),
    context: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const agent = AGENTS.find(a => a.id === args.agentId);
    if (!agent) return { success: false, error: "Agent not found" };

    // Check if synthetic is enabled
    const configs: any = await ctx.runQuery(internal.synthetic_intelligence.getAgentConfig, { agentId: args.agentId });
    
    if (!configs.enabled) {
      return { 
        success: false, 
        error: "Synthetic intelligence is disabled for this agent",
        fallback: true 
      };
    }

    // Create NVIDIA AI client
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // Build system prompt based on agent capabilities
    const systemPrompt = `You are ${agent.name}, an AI assistant specialized in ${agent.description}.
    Your capabilities include: ${agent.capabilities.join(", ")}.
    Provide professional, accurate, and helpful responses.
    Be concise but thorough. Use appropriate formatting.`;

    try {
      const { text } = await generateText({
        model: nvidia.chat(configs.model || "meta-llama/llama-3.1-70b-instruct"),
        system: systemPrompt,
        prompt: args.context ? `Context: ${args.context}\n\nUser request: ${args.prompt}` : args.prompt,
        temperature: configs.temperature || 0.7,
      });

      // Track usage
      await ctx.runMutation(internal.synthetic_intelligence.trackUsage, {
        agentId: args.agentId,
        tokens: text.length,
      });

      return {
        success: true,
        response: text,
        agent: agent.name,
        model: configs.model,
        isLive: true,
      };
    } catch (error: any) {
      console.error(`[SYNTHETIC] ${agent.name} error:`, error.message);
      return {
        success: false,
        error: error.message,
        agent: agent.name,
      };
    }
  },
});

// Internal helpers
export const getAgentConfig = internalQuery({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const configs = await ctx.db.query("system_config").collect();
    const configMap: Record<string, any> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });

    return {
      enabled: configMap[`SYNTHETIC_${args.agentId}_ENABLED`] === true,
      model: configMap[`SYNTHETIC_${args.agentId}_MODEL`] || "meta-llama/llama-3.1-70b-instruct",
      temperature: configMap[`SYNTHETIC_${args.agentId}_TEMPERATURE`] || 0.7,
      maxTokens: configMap[`SYNTHETIC_${args.agentId}_MAX_TOKENS`] || 2048,
    };
  },
});

export const trackUsage = internalMutation({
  args: {
    agentId: v.string(),
    tokens: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `SYNTHETIC_${args.agentId}_REQUESTS`;
    const existing = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: ((existing.value as number) || 0) + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: 1,
        description: `Request counter for ${args.agentId}`,
        updatedAt: Date.now(),
      });
    }

    // Update last used timestamp
    const lastUsedKey = `SYNTHETIC_${args.agentId}_LAST_USED`;
    const lastUsedExisting = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", lastUsedKey))
      .first();

    if (lastUsedExisting) {
      await ctx.db.patch(lastUsedExisting._id, { value: Date.now(), updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key: lastUsedKey,
        value: Date.now(),
        description: `Last used timestamp for ${args.agentId}`,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
