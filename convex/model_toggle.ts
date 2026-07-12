import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AI MODEL TOGGLE SYSTEM
// Admin enables/disables models globally across all dashboards
// ═══════════════════════════════════════════════════════════════════

const MODEL_CONFIGS = [
  {
    modelName: "groq",
    displayName: "GROQ",
    icon: "⚡",
    providerType: "chat",
    description: "Lightning-fast inference for chat and quick tasks",
  },
  {
    modelName: "openrouter",
    displayName: "OpenRouter (Nemotron)",
    icon: "🧠",
    providerType: "chat",
    description: "FREE 550B model for complex documents and analysis",
  },
  {
    modelName: "aiml",
    displayName: "AI/ML API",
    icon: "🎨",
    providerType: "multi",
    description: "Images, audio, and multi-modal generation",
  },
  {
    modelName: "mimo",
    displayName: "MiMo-V2.5",
    icon: "🚀",
    providerType: "agentic+multi",
    description: "agentic autonomous agents + multi-modal design & audio generation",
  },
  {
    modelName: "nvidia",
    displayName: "NVIDIA",
    icon: "🟢",
    providerType: "chat",
    description: "Premium quality for complex reasoning",
  },
  {
    modelName: "freellmapi",
    displayName: "FreeLLMAPI",
    icon: "🆓",
    providerType: "free",
    description: "161+ free AI models from 18 providers with auto-failover",
  },
  {
    modelName: "tencent",
    displayName: "Tencent Hy3 (Hunyuan 3)",
    icon: "🐉",
    providerType: "chat+long_context",
    description: "FREE 1M context window model via OpenRouter — excellent for business analysis and long documents",
  },
  {
    modelName: "mistral",
    displayName: "Mistral AI",
    icon: "🌀",
    providerType: "chat+code+reasoning",
    description: "Versatile AI via OpenRouter — Mistral Large 3 (256K context), Small 4, Codestral, Magistral Medium",
  },
];

// ═══════════════════════════════════════════════════════════════════
// SEED — Initialize all models (run once)
// ═══════════════════════════════════════════════════════════════════

export const seedModels = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    let seeded = 0;
    let updated = 0;
    for (const config of MODEL_CONFIGS) {
      const existing = await ctx.db
        .query("ai_model_status")
        .withIndex("by_model", (q) => q.eq("modelName", config.modelName))
        .first();
      if (existing) {
        // Update if providerType or description changed
        if (existing.providerType !== config.providerType || existing.description !== config.description) {
          await ctx.db.patch(existing._id, {
            providerType: config.providerType,
            description: config.description,
            displayName: config.displayName,
            icon: config.icon,
            updatedAt: Date.now(),
          });
          updated++;
        }
      } else {
        await ctx.db.insert("ai_model_status", {
          ...config,
          isEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        seeded++;
      }
    }
    return { success: true, seeded, updated, total: MODEL_CONFIGS.length };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getAllModelStatuses = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const statuses = await ctx.db.query("ai_model_status").take(20);
    
    // If DB is empty, return MODEL_CONFIGS directly (read-only, no write)
    if (statuses.length === 0) {
      return MODEL_CONFIGS.map((c) => ({ ...c, isEnabled: true, _id: "auto-seeded" }));
    }
    return statuses;
  },
});

export const isModelEnabled = query({
  args: { modelName: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("ai_model_status")
      .withIndex("by_model", (q) => q.eq("modelName", args.modelName))
      .first();
    if (!status) return true; // Default: enabled if not found
    return status.isEnabled;
  },
});

export const getEnabledModels = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_status").take(20);
    return all.filter((m) => m.isEnabled).map((m) => ({
      name: m.modelName,
      displayName: m.displayName,
      icon: m.icon,
      providerType: m.providerType,
    }));
  },
});

export const getModelStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_status").take(20);
    const enabled = all.filter((m) => m.isEnabled).length;
    const disabled = all.filter((m) => !m.isEnabled).length;

    // Get recent logs
    const logs = await ctx.db
      .query("ai_model_toggle_logs")
      .order("desc")
      .take(20);

    // If DB is empty, return MODEL_CONFIGS directly (no write needed)
    if (all.length === 0) {
      return {
        total: MODEL_CONFIGS.length,
        enabled: MODEL_CONFIGS.length,
        disabled: 0,
        models: MODEL_CONFIGS.map((c, i) => ({ ...c, isEnabled: true, _id: `auto-${i}` })),
        recentLogs: [],
      };
    }

    return {
      total: all.length,
      enabled,
      disabled,
      models: all,
      recentLogs: logs,
    };
  },
});

export const getToggleLogs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ai_model_toggle_logs")
      .order("desc")
      .take(args.limit || 50);
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const toggleModel = mutation({
  args: {
    modelName: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("ai_model_status")
      .withIndex("by_model", (q) => q.eq("modelName", args.modelName))
      .first();

    if (!status) return { success: false, error: "Model not found" };

    await ctx.db.patch(status._id, {
      isEnabled: args.enabled,
      lastToggledAt: Date.now(),
      toggledBy: args.adminToken || "admin",
      updatedAt: Date.now(),
    });

    // Log the toggle
    await ctx.db.insert("ai_model_toggle_logs", {
      modelName: args.modelName,
      action: args.enabled ? "enabled" : "disabled",
      enabled: args.enabled,
      performedBy: args.adminToken || "admin",
      timestamp: Date.now(),
    });

    return {
      success: true,
      modelName: args.modelName,
      enabled: args.enabled,
    };
  },
});

export const toggleMultipleModels = mutation({
  args: {
    toggles: v.any(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results: Array<{ model: string; success: boolean; enabled: boolean }> = [];

    for (const [modelName, enabled] of Object.entries(args.toggles as Record<string, boolean>)) {
      const status = await ctx.db
        .query("ai_model_status")
        .withIndex("by_model", (q) => q.eq("modelName", modelName))
        .first();

      if (!status) {
        results.push({ model: modelName, success: false, enabled: false });
        continue;
      }

      await ctx.db.patch(status._id, {
        isEnabled: enabled,
        lastToggledAt: Date.now(),
        toggledBy: args.adminToken || "admin",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("ai_model_toggle_logs", {
        modelName,
        action: enabled ? "enabled" : "disabled",
        enabled,
        performedBy: args.adminToken || "admin",
        timestamp: Date.now(),
      });

      results.push({ model: modelName, success: true, enabled });
    }

    return { success: true, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CHECK MODEL (used by AI router)
// ═══════════════════════════════════════════════════════════════════

export const checkModel = query({
  args: { modelName: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("ai_model_status")
      .withIndex("by_model", (q) => q.eq("modelName", args.modelName))
      .first();
    return status ? status.isEnabled : true;
  },
});

// ═══════════════════════════════════════════════════════════════════
// RESET — Restore all models to enabled
// ═══════════════════════════════════════════════════════════════════

export const resetAllModels = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("ai_model_status").take(20);
    for (const m of all) {
      if (!m.isEnabled) {
        await ctx.db.patch(m._id, {
          isEnabled: true,
          lastToggledAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert("ai_model_toggle_logs", {
          modelName: m.modelName,
          action: "reset_enabled",
          enabled: true,
          timestamp: Date.now(),
        });
      }
    }
    return { success: true, reset: all.filter((m) => !m.isEnabled).length };
  },
});
