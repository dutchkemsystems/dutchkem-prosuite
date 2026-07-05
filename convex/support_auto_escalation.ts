import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Auto-escalation rules
const ESCALATION_RULES = {
  lowConfidenceThreshold: 0.4,
  maxRetriesBeforeEscalation: 2,
  negativeSentimentKeywords: ["angry", "frustrated", "terrible", "worst", "unacceptable", "lawsuit", "cancel"],
};

export const checkAndEscalate = mutation({
  args: {
    interactionId: v.id("support_interactions"),
    confidence: v.string(),
    agentId: v.string(),
    message: v.string(),
  },
  returns: v.object({ escalated: v.boolean(), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Rule 1: Low confidence
    if (args.confidence === "low") {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          userId: "system",
          interactionId: args.interactionId,
          status: "pending",
          reason: "Low confidence response",
          agentId: args.agentId,
          createdAt: now,
        });
        return { escalated: true, reason: "Low confidence" };
      }
    }
    
    // Rule 2: Negative sentiment
    const messageLower = args.message.toLowerCase();
    const hasNegativeSentiment = ESCALATION_RULES.negativeSentimentKeywords.some(
      (keyword) => messageLower.includes(keyword)
    );
    
    if (hasNegativeSentiment) {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          userId: "system",
          interactionId: args.interactionId,
          status: "pending",
          reason: "Negative sentiment detected",
          agentId: args.agentId,
          createdAt: now,
        });
        return { escalated: true, reason: "Negative sentiment" };
      }
    }
    
    // Rule 3: Repeated low confidence (check last 3 interactions from same agent)
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(3);
    
    const lowConfidenceCount = recentInteractions.filter(
      (i) => i.confidence === "low"
    ).length;
    
    if (lowConfidenceCount >= ESCALATION_RULES.maxRetriesBeforeEscalation) {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          userId: "system",
          interactionId: args.interactionId,
          status: "pending",
          reason: `Repeated low confidence responses (${lowConfidenceCount} times)`,
          agentId: args.agentId,
          createdAt: now,
        });
        return { escalated: true, reason: "Repeated low confidence" };
      }
    }
    
    return { escalated: false };
  },
});

export const getEscalationRules = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return ESCALATION_RULES;
  },
});

export const updateEscalationRules = mutation({
  args: {
    rules: v.object({
      lowConfidenceThreshold: v.number(),
      maxRetriesBeforeEscalation: v.number(),
      negativeSentimentKeywords: v.array(v.string()),
    }),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Store updated rules in system_config
    const key = "escalation_rules";
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { value: JSON.stringify(args.rules), updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: JSON.stringify(args.rules),
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});
