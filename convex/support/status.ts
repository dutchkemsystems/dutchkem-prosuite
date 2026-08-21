import { query } from "../_generated/server";
import { v } from "convex/values";

export const getOrchestratorStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const defaultModels = {
      primaryModel: "meta/llama-3.3-70b-instruct",
      fallbackModel: "meta/llama-3.1-70b-instruct",
      emergencyModel: "general",
    };

    const configDoc = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "support_orchestrator_config"))
      .first();

    const models = configDoc
      ? { ...defaultModels, ...(configDoc.value as Record<string, string>) }
      : defaultModels;

    return {
      success: true,
      isAvailable: true,
      primaryModel: models.primaryModel,
      fallbackModel: models.fallbackModel,
      emergencyModel: models.emergencyModel,
      agentCount: 15,
      agents: [
        { id: "A1", name: "Academic Pro", icon: "\u{1F393}" },
        { id: "A2", name: "Business Pro", icon: "\u{1F4BC}" },
        { id: "A3", name: "Content Pro", icon: "\u270D\uFE0F" },
        { id: "A4", name: "Career Pro", icon: "\u{1F4C4}" },
        { id: "A5", name: "Personal Shopper", icon: "\u{1F6CD}\uFE0F" },
        { id: "A6", name: "Exam Pro", icon: "\u{1F4DD}" },
        { id: "A7", name: "Finance Pro", icon: "\u{1F4B0}" },
        { id: "A8", name: "MediaStudio Pro", icon: "\u{1F3AC}" },
        { id: "A9", name: "Health Pro", icon: "\u{1F3E5}" },
        { id: "A10", name: "Home Services Pro", icon: "\u{1F9F9}" },
        { id: "A11", name: "Language Tutor", icon: "\u{1F5E3}\uFE0F" },
        { id: "A12", name: "Travel Planner", icon: "\u2708\uFE0F" },
        { id: "A13", name: "ServiceMart NG", icon: "\u{1F680}" },
        { id: "A14", name: "Translation Hub", icon: "\u{1F5E3}\uFE0F\u{1F4DD}" },
        { id: "A15", name: "Event Planner", icon: "\u{1F389}" },
      ],
      features: [
        "LLM-powered intent classification (llama-3.3-70b)",
        "Agent routing (A1-A15)",
        "Repetition detection",
        "Conversation context passing",
        "3-model fallback chain",
        "General support fallback",
      ],
    };
  },
});
