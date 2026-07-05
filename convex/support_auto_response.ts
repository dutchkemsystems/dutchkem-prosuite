import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default auto-response rules
const DEFAULT_RULES = [
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost", "how much", "plan", "subscription"],
    response: "We offer flexible pricing plans starting from 5,000 NGN/month. Visit our pricing page for details, or I can help you choose the right plan!",
    priority: 1,
    enabled: true,
  },
  {
    id: "features",
    keywords: ["feature", "what can", "capabilities", "services", "agents"],
    response: "We have 15 specialized AI agents covering Sales, Marketing, Support, Design, and more. Each agent is expert in their domain. Which area interests you?",
    priority: 2,
    enabled: true,
  },
  {
    id: "support_hours",
    keywords: ["hours", "when", "available", "open", "close"],
    response: "Our AI support is available 24/7! For human support, we're available Monday-Friday, 9AM-6PM WAT. Enterprise customers get 24/7 priority support.",
    priority: 3,
    enabled: true,
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "cancel", "return"],
    response: "We offer a 30-day money-back guarantee. If you're not satisfied, contact support@dutchkem.com for a full refund.",
    priority: 4,
    enabled: true,
  },
  {
    id: "trial",
    keywords: ["trial", "free", "test", "demo", "try"],
    response: "You can start with our Free tier (50 messages/month, 1 agent) to test the platform. No credit card required!",
    priority: 5,
    enabled: true,
  },
];

export const getAutoResponseRules = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const customRules = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    if (customRules) {
      return JSON.parse(customRules.value);
    }
    
    return DEFAULT_RULES;
  },
});

export const matchAutoResponse = mutation({
  args: { message: v.string() },
  returns: v.object({
    matched: v.boolean(),
    ruleId: v.optional(v.string()),
    response: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    const rules = rulesConfig ? JSON.parse(rulesConfig.value) : DEFAULT_RULES;
    const messageLower = args.message.toLowerCase();
    
    const sortedRules = rules
      .filter((r: any) => r.enabled)
      .sort((a: any, b: any) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      const matched = rule.keywords.some((keyword: string) =>
        messageLower.includes(keyword.toLowerCase())
      );
      
      if (matched) {
        return {
          matched: true,
          ruleId: rule.id,
          response: rule.response,
        };
      }
    }
    
    return { matched: false };
  },
});

export const addAutoResponseRule = mutation({
  args: {
    id: v.string(),
    keywords: v.array(v.string()),
    response: v.string(),
    priority: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    const rules = rulesConfig ? JSON.parse(rulesConfig.value) : DEFAULT_RULES;
    
    const existingIndex = rules.findIndex((r: any) => r.id === args.id);
    const newRule = {
      id: args.id,
      keywords: args.keywords,
      response: args.response,
      priority: args.priority,
      enabled: true,
    };
    
    if (existingIndex >= 0) {
      rules[existingIndex] = newRule;
    } else {
      rules.push(newRule);
    }
    
    if (rulesConfig) {
      await ctx.db.patch(rulesConfig._id, { value: JSON.stringify(rules), updatedAt: Date.now() });
    } else {
      await ctx.db.insert("system_config", {
        key: "auto_response_rules",
        value: JSON.stringify(rules),
        updatedAt: Date.now(),
      });
    }
    
    return { success: true, ruleCount: rules.length };
  },
});

export const toggleAutoResponseRule = mutation({
  args: {
    ruleId: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    if (!rulesConfig) return { success: false, error: "No rules found" };
    
    const rules = JSON.parse(rulesConfig.value);
    const rule = rules.find((r: any) => r.id === args.ruleId);
    
    if (!rule) return { success: false, error: "Rule not found" };
    
    rule.enabled = args.enabled;
    await ctx.db.patch(rulesConfig._id, { value: JSON.stringify(rules), updatedAt: Date.now() });
    
    return { success: true };
  },
});
