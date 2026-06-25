import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE PLATFORM-SPECIFIC COMPLIANCE RULES
// Real-time checking, auto-fix, and platform-specific enforcement
// ═══════════════════════════════════════════════════════════════════

// ─── PLATFORM-SPECIFIC RULES ───

const PLATFORM_RULES: Record<string, {
  prohibitedWords: string[];
  contentLimits: { maxLength: number; maxHashtags: number; maxMentions: number };
  imagePolicy: { minWidth: number; minHeight: number; aspectRatio: string; formats: string[] };
  specialRules: string[];
}> = {
  meta: {
    prohibitedWords: ["guarantee", "miracle", "cure", "instant", "free money", "no risk", "100% free", "act now", "limited time offer", "click here", "before and after", "weight loss", "make money fast"],
    contentLimits: { maxLength: 2200, maxHashtags: 30, maxMentions: 5 },
    imagePolicy: { minWidth: 600, minHeight: 600, aspectRatio: "1:1", formats: ["jpg", "png", "gif"] },
    specialRules: ["no_personal_attributes", "no_health_claims", "no_political_ads_without_disclaimer"],
  },
  linkedin: {
    prohibitedWords: ["buy now", "limited offer", "act fast", "don't miss out", "free", "guaranteed", "100%", "click here", "subscribe now"],
    contentLimits: { maxLength: 3000, maxHashtags: 5, maxMentions: 10 },
    imagePolicy: { minWidth: 1200, minHeight: 627, aspectRatio: "1.91:1", formats: ["jpg", "png"] },
    specialRules: ["professional_tone", "no_hard_selling", "no_caps_lock_headlines"],
  },
  tiktok: {
    prohibitedWords: ["scam", "fake", "clickbait", "buy now", "limited time", "free money", "guaranteed results"],
    contentLimits: { maxLength: 2200, maxHashtags: 30, maxMentions: 5 },
    imagePolicy: { minWidth: 1080, minHeight: 1920, aspectRatio: "9:16", formats: ["mp4", "jpg", "png"] },
    specialRules: ["no_misleading_claims", "no_dangerous_challenges", "no_music_copyright"],
  },
  x: {
    prohibitedWords: ["buy now", "click here", "free money", "guaranteed", "100% free", "act now", "limited time"],
    contentLimits: { maxLength: 280, maxHashtags: 10, maxMentions: 10 },
    imagePolicy: { minWidth: 600, minHeight: 335, aspectRatio: "16:9", formats: ["jpg", "png", "gif", "mp4"] },
    specialRules: ["no_spam", "no_bot_behavior", "no_manipulation"],
  },
  youtube: {
    prohibitedWords: ["subscribe now", "like and subscribe", "click the bell", "free giveaway", "guaranteed views"],
    contentLimits: { maxLength: 5000, maxHashtags: 15, maxMentions: 10 },
    imagePolicy: { minWidth: 1280, minHeight: 720, aspectRatio: "16:9", formats: ["mp4", "jpg", "png"] },
    specialRules: ["no_misleading_thumbnails", "no_copyright_music", "no_sensitive_content"],
  },
  pinterest: {
    prohibitedWords: ["buy now", "limited time", "act fast", "free money", "guaranteed"],
    contentLimits: { maxLength: 500, maxHashtags: 20, maxMentions: 5 },
    imagePolicy: { minWidth: 1000, minHeight: 1500, aspectRatio: "2:3", formats: ["jpg", "png"] },
    specialRules: ["vertical_images_only", "no_text_heavy_images", "no_sale_prices"],
  },
  instagram: {
    prohibitedWords: ["buy now", "limited time", "act fast", "free money", "guaranteed", "click here"],
    contentLimits: { maxLength: 2200, maxHashtags: 30, maxMentions: 5 },
    imagePolicy: { minWidth: 1080, minHeight: 1080, aspectRatio: "1:1", formats: ["jpg", "png", "mp4"] },
    specialRules: ["no_watermarks", "no_low_quality", "no_stock_photos_without_disclosure"],
  },
  reddit: {
    prohibitedWords: ["buy now", "click here", "free money", "guaranteed", "act now", "limited time"],
    contentLimits: { maxLength: 40000, maxHashtags: 0, maxMentions: 3 },
    imagePolicy: { minWidth: 600, minHeight: 315, aspectRatio: "1.91:1", formats: ["jpg", "png", "gif", "mp4"] },
    specialRules: ["no_self_promotion_spam", "no_vote_manipulation", "no_fake_engagement"],
  },
  threads: {
    prohibitedWords: ["buy now", "click here", "free money", "guaranteed", "act now", "limited time"],
    contentLimits: { maxLength: 500, maxHashtags: 10, maxMentions: 5 },
    imagePolicy: { minWidth: 1080, minHeight: 1080, aspectRatio: "1:1", formats: ["jpg", "png"] },
    specialRules: ["no_spam", "no_bot_behavior"],
  },
  discord: {
    prohibitedWords: ["buy now", "free money", "guaranteed", "act now", "limited time", "click here"],
    contentLimits: { maxLength: 2000, maxHashtags: 0, maxMentions: 10 },
    imagePolicy: { minWidth: 128, minHeight: 128, aspectRatio: "any", formats: ["jpg", "png", "gif"] },
    specialRules: ["no_unsolicited_dms", "no_server_invites_without_permission"],
  },
  bluesky: {
    prohibitedWords: ["buy now", "click here", "free money", "guaranteed", "act now", "limited time"],
    contentLimits: { maxLength: 300, maxHashtags: 10, maxMentions: 10 },
    imagePolicy: { minWidth: 600, minHeight: 400, aspectRatio: "any", formats: ["jpg", "png", "gif"] },
    specialRules: ["no_spam", "no_manipulation"],
  },
};

// ─── AUTO-FIX SUGGESTIONS ───

const AUTO_FIX_SUGGESTIONS: Record<string, (text: string) => string> = {
  "before_and_after": (text) => text.replace(/before and after/gi, "transformation").replace(/before\/after/gi, "transformation"),
  "all_caps": (text) => text.replace(/^[A-Z\s!?.]{20,}$/gm, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()),
  "excessive_exclamation": (text) => text.replace(/!{2,}/g, "!"),
  "excessive_ellipsis": (text) => text.replace(/\.{4,}/g, "..."),
  "multiple_hashtags": (text) => {
    const hashtags = text.match(/#\w+/g) || [];
    if (hashtags.length > 10) {
      const kept = hashtags.slice(0, 10);
      let result = text;
      for (const tag of hashtags.slice(10)) {
        result = result.replace(tag, "");
      }
      return result.replace(/\s+/g, " ").trim();
    }
    return text;
  },
};

// ─── REAL-TIME COMPLIANCE CHECK ───

export const checkComplianceRealtime = action({
  args: {
    adminToken: v.string(),
    adCopy: v.string(),
    headline: v.optional(v.string()),
    platform: v.string(),
    imageUrl: v.optional(v.string()),
    autoFix: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const platformRules = PLATFORM_RULES[args.platform] || PLATFORM_RULES.all;
    const fullText = `${args.headline || ""} ${args.adCopy}`;
    const violations: any[] = [];
    const autoFixes: string[] = [];

    // Check prohibited words
    const lowerText = fullText.toLowerCase();
    for (const word of platformRules.prohibitedWords) {
      if (lowerText.includes(word.toLowerCase())) {
        violations.push({
          type: "prohibited_word",
          severity: "block",
          word,
          message: `Prohibited word "${word}" detected`,
          suggestion: getReplacementSuggestion(word),
        });
      }
    }

    // Check content length
    if (fullText.length > platformRules.contentLimits.maxLength) {
      violations.push({
        type: "content_length",
        severity: "block",
        message: `Content exceeds ${platformRules.contentLimits.maxLength} characters (${fullText.length} used)`,
        suggestion: `Reduce content by ${fullText.length - platformRules.contentLimits.maxLength} characters`,
      });
    }

    // Check hashtag count
    const hashtags = fullText.match(/#\w+/g) || [];
    if (hashtags.length > platformRules.contentLimits.maxHashtags) {
      violations.push({
        type: "hashtag_limit",
        severity: "warn",
        message: `Too many hashtags (${hashtags.length} used, max ${platformRules.contentLimits.maxHashtags})`,
        suggestion: `Remove ${hashtags.length - platformRules.contentLimits.maxHashtags} hashtags`,
      });
    }

    // Check image dimensions if provided
    if (args.imageUrl) {
      // In production, you'd fetch and check image dimensions
      // For now, just check format
      const format = args.imageUrl.split(".").pop()?.toLowerCase();
      if (format && !platformRules.imagePolicy.formats.includes(format)) {
        violations.push({
          type: "image_format",
          severity: "warn",
          message: `Image format "${format}" may not be optimal for ${args.platform}`,
          suggestion: `Use ${platformRules.imagePolicy.formats.join(", ")} formats`,
        });
      }
    }

    // Check special rules
    for (const rule of platformRules.specialRules) {
      const violation = checkSpecialRule(rule, fullText, args.imageUrl);
      if (violation) {
        violations.push(violation);
      }
    }

    // Apply auto-fixes if requested
    let fixedText = fullText;
    if (args.autoFix) {
      for (const [rule, fixFn] of Object.entries(AUTO_FIX_SUGGESTIONS)) {
        const before = fixedText;
        fixedText = fixFn(fixedText);
        if (before !== fixedText) {
          autoFixes.push(rule);
        }
      }
    }

    // Calculate score
    const blocked = violations.filter((v) => v.severity === "block");
    const warnings = violations.filter((v) => v.severity === "warn");
    const score = Math.max(0, 100 - blocked.length * 30 - warnings.length * 10);

    // Log compliance check
    await ctx.runMutation(internal.ad_compliance_enhanced.logComplianceCheck, {
      platform: args.platform,
      score,
      passed: blocked.length === 0,
      violationsCount: violations.length,
      autoFixesCount: autoFixes.length,
      timestamp: Date.now(),
    });

    return {
      score,
      passed: blocked.length === 0,
      violations,
      autoFixes,
      fixedText: args.autoFix ? fixedText : undefined,
      platform: args.platform,
      contentLimits: platformRules.contentLimits,
      imagePolicy: platformRules.imagePolicy,
    };
  },
});

// ─── HELPER FUNCTIONS ───

function getReplacementSuggestion(word: string): string {
  const suggestions: Record<string, string> = {
    "guarantee": "promise/commitment",
    "miracle": "remarkable/impressive",
    "cure": "help/improve",
    "instant": "quick/rapid",
    "free money": "earn money",
    "no risk": "low risk",
    "100% free": "free trial",
    "act now": "get started",
    "limited time offer": "special offer",
    "click here": "learn more",
    "buy now": "shop now",
    "before and after": "transformation",
  };
  return suggestions[word.toLowerCase()] || `Consider rephrasing "${word}"`;
}

function checkSpecialRule(rule: string, text: string, imageUrl?: string): any | null {
  switch (rule) {
    case "no_personal_attributes":
      if (/\b(personal|private|confidential)\b/i.test(text)) {
        return { type: "special_rule", severity: "warn", message: "Avoid personal attributes in ads", suggestion: "Remove personal/private references" };
      }
      break;
    case "no_health_claims":
      if (/\b(cure|treat|heal|medical|diagnosis)\b/i.test(text)) {
        return { type: "special_rule", severity: "block", message: "Health claims require special disclaimers", suggestion: "Add medical disclaimer or remove health claims" };
      }
      break;
    case "professional_tone":
      if (/\b(lol|omg|wtf|bruh|yo|hey)\b/i.test(text)) {
        return { type: "special_rule", severity: "warn", message: "Unprofessional language detected", suggestion: "Use more professional tone" };
      }
      break;
    case "no_misleading_claims":
      if (/\b(guaranteed|100%|no risk|free money)\b/i.test(text)) {
        return { type: "special_rule", severity: "block", message: "Misleading claims detected", suggestion: "Remove misleading language" };
      }
      break;
    default:
      return null;
  }
  return null;
}

// ─── LOG COMPLIANCE CHECK ───

export const logComplianceCheck = internalMutation({
  args: {
    platform: v.string(),
    score: v.number(),
    passed: v.boolean(),
    violationsCount: v.number(),
    autoFixesCount: v.number(),
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `compliance_${args.platform}`,
      status: args.passed ? "healthy" : "warning",
      responseTimeMs: 0,
      details: `Score: ${args.score}, Violations: ${args.violationsCount}, Auto-fixes: ${args.autoFixesCount}`,
      checksRun: 1,
      checksPassed: args.passed ? 1 : 0,
      checksFailed: args.passed ? 0 : 1,
      issuesFound: args.violationsCount,
      issuesAutoFixed: args.autoFixesCount,
      severity: args.passed ? "info" : args.score < 50 ? "critical" : "warning",
      timestamp: args.timestamp,
    });
  },
});

// ─── GET PLATFORM RULES ───

export const getPlatformRules = query({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rules = PLATFORM_RULES[args.platform] || PLATFORM_RULES.all;
    return {
      platform: args.platform,
      ...rules,
      totalProhibitedWords: rules.prohibitedWords.length,
      totalSpecialRules: rules.specialRules.length,
    };
  },
});

// ─── GET ALL PLATFORM RULES ───

export const getAllPlatformRules = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(PLATFORM_RULES).map(([platform, rules]) => ({
      platform,
      prohibitedWordsCount: rules.prohibitedWords.length,
      contentLimits: rules.contentLimits,
      imagePolicy: rules.imagePolicy,
      specialRulesCount: rules.specialRules.length,
    }));
  },
});

// ─── GET COMPLIANCE HISTORY ───

export const getComplianceHistory = query({
  args: { adminToken: v.string(), platform: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("mimo_health_logs")
      .filter((q) => q.gte(q.field("timestamp"), Date.now() - 7 * 24 * 60 * 60 * 1000));

    if (args.platform) {
      q = q.filter((q) => q.eq(q.field("component"), `compliance_${args.platform}`));
    } else {
      q = q.filter((q) => q.gt(q.field("component"), "compliance_").and(q.lt(q.field("component"), "compliance_z")));
    }

    return await q.order("desc").take(args.limit || 50);
  },
});

// ─── SEED PLATFORM-SPECIFIC RULES ───

export const seedPlatformRules = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let inserted = 0;
    const now = Date.now();

    for (const [platform, rules] of Object.entries(PLATFORM_RULES)) {
      // Add prohibited words as rules
      for (const word of rules.prohibitedWords) {
        const existing = await ctx.db.query("ad_compliance_rules")
          .withIndex("by_platform", (q) => q.eq("platform", platform))
          .filter((q) => q.eq(q.field("pattern"), word))
          .first();

        if (!existing) {
          await ctx.db.insert("ad_compliance_rules", {
            platform,
            ruleName: `Prohibited: ${word}`,
            category: "prohibited_words",
            pattern: word,
            severity: "block",
            replacement: getReplacementSuggestion(word),
            enabled: true,
            createdAt: now,
          });
          inserted++;
        }
      }
    }

    return { success: true, inserted, platforms: Object.keys(PLATFORM_RULES).length };
  },
});

// ─── BATCH COMPLIANCE CHECK ───

export const batchCheckCompliance = action({
  args: {
    adminToken: v.string(),
    ads: v.array(v.object({
      adCopy: v.string(),
      headline: v.optional(v.string()),
      platform: v.string(),
    })),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const ad of args.ads) {
      const result = await ctx.runAction(internal.ad_compliance_enhanced.checkComplianceRealtime, {
        adminToken: args.adminToken,
        adCopy: ad.adCopy,
        headline: ad.headline,
        platform: ad.platform,
        autoFix: true,
      });
      results.push({ ...ad, compliance: result });
    }

    const passedCount = results.filter((r) => r.compliance.passed).length;
    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  },
});

// ─── GET COMPLIANCE STATS ───

export const getComplianceStats = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentChecks = await ctx.db.query("mimo_health_logs")
      .filter((q) => 
        q.gte(q.field("timestamp"), oneWeekAgo).and(
          q.gt(q.field("component"), "compliance_").and(q.lt(q.field("component"), "compliance_z"))
        )
      )
      .collect();

    const todayChecks = recentChecks.filter((c) => c.timestamp >= oneDayAgo);
    const passedChecks = recentChecks.filter((c) => c.status === "healthy");
    const failedChecks = recentChecks.filter((c) => c.status !== "healthy");

    return {
      thisWeek: {
        total: recentChecks.length,
        passed: passedChecks.length,
        failed: failedChecks.length,
        successRate: recentChecks.length > 0 ? ((passedChecks.length / recentChecks.length) * 100).toFixed(1) : "0",
      },
      today: {
        total: todayChecks.length,
        passed: todayChecks.filter((c) => c.status === "healthy").length,
        failed: todayChecks.filter((c) => c.status !== "healthy").length,
      },
      platforms: [...new Set(recentChecks.map((c) => c.component.replace("compliance_", "")))],
    };
  },
});
