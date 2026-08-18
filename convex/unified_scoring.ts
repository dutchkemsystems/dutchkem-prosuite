import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// UNIFIED LEAD SCORING — Single source of truth
// Consolidates: lead_scoring.ts, ai_sales_agent scoring, chatbotLeads scoring, marketing_automation scoring
// ═══════════════════════════════════════════════════════════════════

interface ScoreReasoning {
  factor: string;
  points: number;
  description: string;
}

interface ScoreResult {
  score: number;
  reasoning: ScoreReasoning[];
  nextBestAction: string;
  tier: string;
}

// ═══════════════════════════════════════════════════════════════════
// SCORING FOR LEADS (new prospects, chatbot captures, AI sales)
// ═══════════════════════════════════════════════════════════════════

export function scoreLead(lead: {
  email?: string;
  phone?: string;
  name?: string;
  source?: string;
  interest?: string;
  budget?: string;
  timeline?: string;
  company?: string;
  metadata?: any;
}): ScoreResult {
  const reasoning: ScoreReasoning[] = [];
  let score = 0;

  // Factor 1: Contact completeness (+5 to +20)
  if (lead.email) { score += 10; reasoning.push({ factor: "Email", points: 10, description: "Email provided" }); }
  if (lead.phone) { score += 8; reasoning.push({ factor: "Phone", points: 8, description: "Phone provided" }); }
  if (lead.name) { score += 5; reasoning.push({ factor: "Name", points: 5, description: "Name provided" }); }
  if (lead.company) { score += 7; reasoning.push({ factor: "Company", points: 7, description: "Company provided" }); }

  // Factor 2: Source quality (+5 to +15)
  const sourceScores: Record<string, number> = {
    referral: 15, ai_sales: 12, facebook: 10, linkedin: 10,
    web: 8, organic: 8, chatbot: 7, campaign: 5,
  };
  const sourceScore = sourceScores[lead.source || "web"] || 5;
  score += sourceScore;
  reasoning.push({ factor: "Source", points: sourceScore, description: `Source: ${lead.source || "web"}` });

  // Factor 3: Interest level (+5 to +25)
  if (lead.interest) {
    const interest = lead.interest.toLowerCase();
    if (interest.includes("enterprise")) { score += 25; reasoning.push({ factor: "Enterprise Interest", points: 25, description: "Enterprise-level interest" }); }
    else if (interest.includes("pro") || interest.includes("business")) { score += 18; reasoning.push({ factor: "Pro Interest", points: 18, description: "Professional/business interest" }); }
    else if (interest.includes("starter") || interest.includes("personal")) { score += 10; reasoning.push({ factor: "Starter Interest", points: 10, description: "Starter plan interest" }); }
    else { score += 8; reasoning.push({ factor: "General Interest", points: 8, description: "General interest expressed" }); }
  }

  // Factor 4: Budget signal (+0 to +20)
  if (lead.budget || lead.metadata?.budget) {
    const budget = (lead.budget || lead.metadata?.budget || "").toLowerCase();
    if (budget.includes("1m") || budget.includes("1,000,000")) { score += 20; reasoning.push({ factor: "High Budget", points: 20, description: "Budget ₦1M+" }); }
    else if (budget.includes("500k") || budget.includes("500,000")) { score += 15; reasoning.push({ factor: "Medium Budget", points: 15, description: "Budget ₦500K+" }); }
    else if (budget.includes("100k") || budget.includes("100,000")) { score += 10; reasoning.push({ factor: "Standard Budget", points: 10, description: "Budget ₦100K+" }); }
    else if (budget.includes("50k") || budget.includes("50,000")) { score += 5; reasoning.push({ factor: "Basic Budget", points: 5, description: "Budget ₦50K+" }); }
  }

  // Factor 5: Timeline urgency (+0 to +15)
  if (lead.timeline || lead.metadata?.timeline) {
    const timeline = (lead.timeline || lead.metadata?.timeline || "").toLowerCase();
    if (timeline.includes("urgent") || timeline.includes("asap") || timeline.includes("immediately")) {
      score += 15; reasoning.push({ factor: "Urgent Timeline", points: 15, description: "Urgent/ASAP timeline" });
    } else if (timeline.includes("week") || timeline.includes("7")) {
      score += 10; reasoning.push({ factor: "Quick Timeline", points: 10, description: "Within a week" });
    } else if (timeline.includes("month")) {
      score += 5; reasoning.push({ factor: "Monthly Timeline", points: 5, description: "Within a month" });
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine tier and next best action
  let tier: string;
  let nextBestAction: string;
  if (score >= 80) { tier = "Hot"; nextBestAction = "Direct sales contact - high value lead"; }
  else if (score >= 60) { tier = "Warm"; nextBestAction = "Send promotional offers to convert"; }
  else if (score >= 40) { tier = "Nurture"; nextBestAction = "Onboarding sequence with agent introduction"; }
  else { tier = "Cold"; nextBestAction = "Nurture with educational content"; }

  return { score, reasoning, nextBestAction, tier };
}

// ═══════════════════════════════════════════════════════════════════
// SCORING FOR REGISTERED USERS (Guardian AI 5-factor)
// ═══════════════════════════════════════════════════════════════════

export const calculateUserScore = internalAction({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.unified_scoring._getUserForScoring, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const reasoning: ScoreReasoning[] = [];
    let score = 0;

    // Factor 1: Account age (+5 to +15)
    const accountAgeDays = (Date.now() - (user._creationTime || 0)) / (1000 * 60 * 60 * 24);
    if (accountAgeDays > 365) { score += 15; reasoning.push({ factor: "Loyal Customer", points: 15, description: "Account over 1 year" }); }
    else if (accountAgeDays > 180) { score += 10; reasoning.push({ factor: "Established", points: 10, description: "Account over 6 months" }); }
    else if (accountAgeDays > 30) { score += 5; reasoning.push({ factor: "Active", points: 5, description: "Account over 1 month" }); }

    // Factor 2: Subscription tier (+10 to +30)
    const subscriptions = await ctx.runQuery(internal.unified_scoring._getUserSubscriptions, { userId: args.userId });
    if (subscriptions.length > 0) {
      const hasYearly = subscriptions.some((s: any) => s.plan === "yearly");
      const hasQuarterly = subscriptions.some((s: any) => s.plan === "quarterly");
      if (hasYearly) { score += 30; reasoning.push({ factor: "Premium Subscription", points: 30, description: "Yearly subscription" }); }
      else if (hasQuarterly) { score += 20; reasoning.push({ factor: "Standard Subscription", points: 20, description: "Quarterly subscription" }); }
      else { score += 10; reasoning.push({ factor: "Basic Subscription", points: 10, description: "Monthly subscription" }); }
    }

    // Factor 3: Activity level (+5 to +20)
    const projects = await ctx.runQuery(internal.unified_scoring._getUserProjects, { userId: args.userId });
    const projectCount = projects?.length || 0;
    if (projectCount > 10) { score += 20; reasoning.push({ factor: "High Activity", points: 20, description: `${projectCount} projects` }); }
    else if (projectCount > 5) { score += 10; reasoning.push({ factor: "Medium Activity", points: 10, description: `${projectCount} projects` }); }
    else if (projectCount > 0) { score += 5; reasoning.push({ factor: "Low Activity", points: 5, description: `${projectCount} project(s)` }); }

    // Factor 4: Payment history (+15)
    const hasPayments = await ctx.runQuery(internal.unified_scoring._checkPaymentHistory, { userId: args.userId });
    if (hasPayments) { score += 15; reasoning.push({ factor: "Good Payer", points: 15, description: "Successful payments" }); }

    // Factor 5: Referrals (+5 to +10)
    const referrals = await ctx.runQuery(internal.unified_scoring._getReferralCount, { userId: args.userId });
    if (referrals > 5) { score += 10; reasoning.push({ factor: "Strong Referrer", points: 10, description: `${referrals} referrals` }); }
    else if (referrals > 0) { score += 5; reasoning.push({ factor: "Referrer", points: 5, description: `${referrals} referral(s)` }); }

    score = Math.min(score, 100);

    let tier: string;
    let nextBestAction: string;
    if (score >= 80) { tier = "VIP"; nextBestAction = "Direct sales contact - high value"; }
    else if (score >= 60) { tier = "Engaged"; nextBestAction = "Send promotional offers"; }
    else if (score >= 40) { tier = "Active"; nextBestAction = "Onboarding sequence"; }
    else { tier = "New"; nextBestAction = "Nurture with content"; }

    return { score, reasoning, nextBestAction, tier };
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const scoreAndStoreLead = mutation({
  args: {
    leadId: v.id("leads"),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    interest: v.optional(v.string()),
    budget: v.optional(v.string()),
    timeline: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = scoreLead(args);

    await ctx.db.patch(args.leadId, {
      score: result.score,
      updatedAt: Date.now(),
      metadata: {
        scoringBreakdown: result.reasoning,
        nextBestAction: result.nextBestAction,
        tier: result.tier,
        scoredAt: Date.now(),
      },
    });

    return result;
  },
});

export const batchScoreLeads = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    let scored = 0;

    for (const lead of leads) {
      const result = scoreLead({
        email: lead.email,
        phone: lead.phone,
        name: lead.name,
        source: lead.source,
        interest: lead.interest,
        metadata: lead.metadata,
      });

      await ctx.db.patch(lead._id, {
        score: result.score,
        updatedAt: Date.now(),
      });
      scored++;
    }

    return { scored, total: leads.length };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getScoreDistribution = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    const distribution = { hot: 0, warm: 0, nurture: 0, cold: 0, unscored: 0 };

    for (const lead of leads) {
      const score = lead.score || 0;
      if (score >= 80) distribution.hot++;
      else if (score >= 60) distribution.warm++;
      else if (score >= 40) distribution.nurture++;
      else if (score > 0) distribution.cold++;
      else distribution.unscored++;
    }

    return { distribution, total: leads.length };
  },
});

export const getTopLeads = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const leads = await ctx.db.query("leads")
      .withIndex("by_score", (q) => q.gt("score", 0))
      .order("desc")
      .take(args.limit || 20);

    return leads.map(l => ({
      _id: l._id,
      name: l.name,
      email: l.email,
      source: l.source,
      score: l.score,
      status: l.status,
      interest: l.interest,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS (for user scoring)
// ═══════════════════════════════════════════════════════════════════

export const _getUserForScoring = internalQuery({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("users", args.userId);
  },
});

export const _getUserSubscriptions = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const _getUserProjects = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const _checkPaymentHistory = internalQuery({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const payments = await ctx.db.query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return payments.some((p: any) => p.status === "completed");
  },
});

export const _getReferralCount = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const conversions = await ctx.db.query("referral_conversions")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();
    return conversions.length;
  },
});
