import { v } from "convex/values";
import { query } from "../_generated/server";

const MAX_TOTAL_CONCURRENT = 50;
const MAX_CONCURRENT_PER_AGENT = 5;

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get queue status
// ═══════════════════════════════════════════════════════════════════
export const getQueueStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allConfig = await ctx.db.query("system_config").collect();
    const configMap = new Map(allConfig.map((c) => [c.key, c.value]));

    const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
    const agentLoads: Record<string, number> = {};
    let totalActive = 0;

    for (const id of agentIds) {
      const load = (configMap.get(`agent_active_conversations_${id}`) as number) || 0;
      agentLoads[id] = load;
      totalActive += load;
    }

    return {
      totalActive,
      maxConcurrent: MAX_TOTAL_CONCURRENT,
      maxPerAgent: MAX_CONCURRENT_PER_AGENT,
      agentLoads,
      availableSlots: Math.max(0, MAX_TOTAL_CONCURRENT - totalActive),
    };
  },
});
