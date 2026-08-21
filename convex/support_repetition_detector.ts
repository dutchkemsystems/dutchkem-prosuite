import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const checkRepetition = mutation({
  args: {
    agentId: v.string(),
    message: v.string(),
    response: v.string(),
  },
  returns: v.object({
    isRepetitive: v.boolean(),
    similarity: v.number(),
    suggestion: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get recent responses from this agent
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(10);
    
    if (recentInteractions.length < 2) {
      return { isRepetitive: false, similarity: 0 };
    }
    
    // Simple text similarity check (Jaccard similarity)
    const responseWords = new Set(args.response.toLowerCase().split(/\s+/));
    
    let maxSimilarity = 0;
    let mostSimilarResponse = "";
    
    for (const interaction of recentInteractions) {
      if (!interaction.response) continue;
      
      const existingWords = new Set(interaction.response.toLowerCase().split(/\s+/));
      const intersection = new Set([...responseWords].filter((w) => existingWords.has(w)));
      const union = new Set([...responseWords, ...existingWords]);
      
      const similarity = intersection.size / union.size;
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarResponse = interaction.response;
      }
    }
    
    const isRepetitive = maxSimilarity > 0.7;
    
    return {
      isRepetitive,
      similarity: maxSimilarity,
      suggestion: isRepetitive
        ? "Response is too similar to recent answers. Please provide a different response."
        : undefined,
    };
  },
});

export const getRepetitionStats = query({
  args: {
    agentId: v.optional(v.string()),
    timeWindowHours: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeWindow = (args.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = now - timeWindow;
    
    const base = ctx.db.query("support_interactions");
    
    const q = args.agentId
      ? base.withIndex("by_agent", (qq) => qq.eq("agentId", args.agentId!))
      : base.withIndex("by_created", (qq) => qq.gte("createdAt", cutoff));
    
    const interactions = (await q
      .order("desc")
      .take(100)).filter((i) => i.createdAt >= cutoff);
    
    // Calculate repetition metrics
    const responses = interactions
      .filter((i) => i.response)
      .map((i) => i.response!.toLowerCase().split(/\s+/).join(" "));
    
    const uniqueResponses = new Set(responses);
    
    return {
      totalResponses: responses.length,
      uniqueResponses: uniqueResponses.size,
      repetitionRate: responses.length > 0
        ? ((responses.length - uniqueResponses.size) / responses.length) * 100
        : 0,
      timeWindowHours: args.timeWindowHours || 24,
    };
  },
});
