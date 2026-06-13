import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

const PLATFORM_PROHIBITED_WORDS: Record<string, string[]> = {
  meta: ["guarantee", "miracle", "cure", "instant", "free money", "no risk", "100% free", "act now", "limited time offer", "click here"],
  google_ads: ["best", "cheapest", "free", "guaranteed", "#1", "top rated", "amazing deal"],
  linkedin: ["buy now", "limited offer", "act fast", "don't miss out"],
  tiktok: ["scam", "fake", "clickbait"],
  all: ["hate", "violence", "discrimination", "illegal", "spam"],
};

const DEFAULT_RULES = [
  { platform: "all", ruleName: "No profanity", category: "prohibited_words" as const, pattern: "damn|hell|shit|fuck|ass", severity: "block" as const, enabled: true },
  { platform: "all", ruleName: "No ALL CAPS", category: "content_length" as const, pattern: "^[A-Z\\s!?.]{20,}$", severity: "warn" as const, enabled: true },
  { platform: "meta", ruleName: "Meta policy - no before/after", category: "content_length" as const, pattern: "before and after|before/after", severity: "block" as const, enabled: true },
  { platform: "google_ads", ruleName: "Google - no excessive superlatives", category: "prohibited_words" as const, pattern: "best ever|greatest|most amazing|unbelievable", severity: "warn" as const, enabled: true },
  { platform: "linkedin", ruleName: "LinkedIn - professional tone", category: "brand_safety" as const, pattern: "lol|omg|wtf|bruh", severity: "warn" as const, enabled: true },
];

export const seedDefaultRules = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let inserted = 0;
    for (const rule of DEFAULT_RULES) {
      const existing = await ctx.db.query("ad_compliance_rules")
        .withIndex("by_platform", (q) => q.eq("platform", rule.platform))
        .filter((q) => q.eq(q.field("ruleName"), rule.ruleName))
        .first();
      if (!existing) {
        await ctx.db.insert("ad_compliance_rules", { ...rule, replacement: undefined, createdAt: Date.now() });
        inserted++;
      }
    }
    return { success: true, inserted };
  },
});

export const checkCompliance = action({
  args: {
    adminToken: v.string(),
    adCopy: v.string(),
    headline: v.optional(v.string()),
    platform: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const rules = await ctx.runQuery(internal.ad_compliance.getRulesForPlatform, { platform: args.platform });
    const violations: any[] = [];
    const fullText = `${args.headline || ""} ${args.adCopy}`.toLowerCase();

    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern, "gi");
        if (regex.test(fullText)) {
          const suggestion = rule.severity === "block"
            ? `Replace prohibited content matching "${rule.pattern}"`
            : `Consider revising: "${rule.pattern}" detected`;
          violations.push({ ruleName: rule.ruleName, category: rule.category, severity: rule.severity, message: `Rule "${rule.ruleName}" triggered`, suggestion });
        }
      } catch {
        if (fullText.includes(rule.pattern.toLowerCase())) {
          violations.push({ ruleName: rule.ruleName, category: rule.category, severity: rule.severity, message: `Keyword "${rule.pattern}" detected`, suggestion: `Remove or replace "${rule.pattern}"` });
        }
      }
    }

    const blocked = violations.filter((v) => v.severity === "block");
    const warnings = violations.filter((v) => v.severity === "warn");
    const score = Math.max(0, 100 - blocked.length * 30 - warnings.length * 10);

    return { score, passed: blocked.length === 0, violations, blockedCount: blocked.length, warningCount: warnings.length };
  },
});

export const saveComplianceLog = mutation({
  args: {
    adId: v.id("ad_ads"),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    overallScore: v.number(),
    passed: v.boolean(),
    violations: v.array(v.object({
      ruleName: v.string(), category: v.string(), severity: v.string(), message: v.string(), suggestion: v.optional(v.string()),
    })),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("ad_compliance_logs", {
      ...args, checkedAt: Date.now(),
    });
    return { success: true, logId };
  },
});

export const getRulesForPlatform = query({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const platformRules = await ctx.db.query("ad_compliance_rules")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .collect();
    const allRules = await ctx.db.query("ad_compliance_rules")
      .withIndex("by_platform", (q) => q.eq("platform", "all"))
      .collect();
    return [...platformRules, ...allRules].filter((r) => r.enabled);
  },
});

export const addComplianceRule = mutation({
  args: {
    adminToken: v.string(),
    platform: v.string(),
    ruleName: v.string(),
    category: v.union(v.literal("prohibited_words"), v.literal("image_policy"), v.literal("content_length"), v.literal("hashtag_limit"), v.literal("url_policy"), v.literal("brand_safety")),
    pattern: v.string(),
    severity: v.union(v.literal("block"), v.literal("warn"), v.literal("info")),
    replacement: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const ruleId = await ctx.db.insert("ad_compliance_rules", {
      platform: args.platform, ruleName: args.ruleName, category: args.category,
      pattern: args.pattern, severity: args.severity, replacement: args.replacement,
      enabled: true, createdAt: Date.now(),
    });
    return { success: true, ruleId };
  },
});

export const listComplianceLogs = query({
  args: { campaignId: v.id("ad_campaigns"), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("ad_compliance_logs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(args.limit || 50);
  },
});

import { internal } from "./_generated/api";
