import { v } from "convex/values";
import { query, internalQuery, internalMutation } from "../_generated/server";
import { AGENT_MAP } from "./agents";

// ═══════════════════════════════════════════════════════════════════
// LOAD BALANCING — Track active conversations per agent
// ═══════════════════════════════════════════════════════════════════

export async function fetchAgentLoad(ctx: any): Promise<Record<string, number>> {
  const agentIds = Object.keys(AGENT_MAP);
  const load: Record<string, number> = {};

  for (const id of agentIds) {
    try {
      const config = await ctx.runQuery(
        (await import("../_generated/api")).internal.support.load_balancing._getAgentLoad,
        { agentId: id }
      );
      load[id] = (config as number) || 0;
    } catch {
      load[id] = 0;
    }
  }
  return load;
}

export async function incrementAgentLoad(ctx: any, agentId: string): Promise<void> {
  await ctx.runMutation(
    (await import("../_generated/api")).internal.support.load_balancing._incrementAgentLoad,
    { agentId }
  );
}

export async function decrementAgentLoad(ctx: any, agentId: string): Promise<void> {
  await ctx.runMutation(
    (await import("../_generated/api")).internal.support.load_balancing._decrementAgentLoad,
    { agentId }
  );
}

// Find least-busy enabled agent from candidates
export function selectLeastBusy(candidates: string[], agentLoad: Record<string, number>, agentStates: Record<string, boolean>): string {
  const enabled = candidates.filter((id) => agentStates[id] !== false);
  if (enabled.length === 0) return candidates[0]; // Fallback to first candidate
  return enabled.reduce((best, id) => (agentLoad[id] || 0) < (agentLoad[best] || 0) ? id : best, enabled[0]);
}

// ═══════════════════════════════════════════════════════════════════
// SENTIMENT DETECTION — Simple keyword-based
// ═══════════════════════════════════════════════════════════════════
export function detectSentiment(message: string): string {
  const lower = message.toLowerCase();
  const negative = ["angry", "frustrated", "terrible", "worst", "hate", "disappointed", "unacceptable", "furious", "annoyed", "waste"];
  const positive = ["great", "awesome", "love", "excellent", "amazing", "perfect", "thank", "happy", "satisfied", "wonderful"];

  const negCount = negative.filter((w) => lower.includes(w)).length;
  const posCount = positive.filter((w) => lower.includes(w)).length;

  if (negCount >= 2) return "negative";
  if (posCount >= 2) return "positive";
  if (negCount === 1) return "slightly_negative";
  return "neutral";
}

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent enabled states
// ═══════════════════════════════════════════════════════════════════
export const getAgentStates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));

    const states: Record<string, boolean> = {};
    for (const id of agentIds) {
      const val = configMap.get(`agent_enabled_${id}`);
      states[id] = val !== undefined ? (val as boolean) : true;
    }
    return states;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get agent load (active conversations)
// ═══════════════════════════════════════════════════════════════════
export const getAgentLoad = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));

    const load: Record<string, number> = {};
    for (const id of agentIds) {
      const val = configMap.get(`agent_active_conversations_${id}`);
      load[id] = (val as number) || 0;
    }
    return load;
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL: Agent load management
// ═══════════════════════════════════════════════════════════════════

export const _getAgentLoad = internalQuery({
  args: { agentId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const key = `agent_active_conversations_${args.agentId}`;
    const config = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return (config?.value as number) || 0;
  },
});

export const _getAllSystemConfig = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("system_config").collect();
  },
});

export const _incrementAgentLoad = internalMutation({
  args: { agentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `agent_active_conversations_${args.agentId}`;
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const current = (existing?.value as number) || 0;
    if (existing) {
      await ctx.db.patch(existing._id, { value: current + 1, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", { key, value: 1, description: `Active conversations for ${args.agentId}`, updatedAt: Date.now() });
    }
    return null;
  },
});

export const _decrementAgentLoad = internalMutation({
  args: { agentId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `agent_active_conversations_${args.agentId}`;
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      const current = (existing.value as number) || 0;
      await ctx.db.patch(existing._id, { value: Math.max(0, current - 1), updatedAt: Date.now() });
    }
    return null;
  },
});
