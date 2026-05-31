import { mutation, query, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Feature 2: Smart Lead Scoring with Guardian AI

export const calculateLeadScore = internalAction({
  args: { userId: v.id("users") },
  returns: v.object({
    score: v.number(),
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.lead_scoring.getUserForScoring, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const reasoning: Array<{factor: string; points: number; description: string}> = [];
    let totalScore = 0;

    // Factor 1: Account age (+5 to +15)
    const accountAgeDays = (Date.now() - (user._creationTime || 0)) / (1000 * 60 * 60 * 24);
    if (accountAgeDays > 365) {
      reasoning.push({ factor: "Loyal Customer", points: 15, description: "Account over 1 year old" });
      totalScore += 15;
    } else if (accountAgeDays > 180) {
      reasoning.push({ factor: "Established Customer", points: 10, description: "Account over 6 months old" });
      totalScore += 10;
    } else if (accountAgeDays > 30) {
      reasoning.push({ factor: "Active Customer", points: 5, description: "Account over 1 month old" });
      totalScore += 5;
    }

    // Factor 2: Subscription tier (+10 to +30)
    const subscriptions = await ctx.runQuery(internal.lead_scoring.getUserSubscriptions, { userId: args.userId });
    if (subscriptions.length > 0) {
      const hasYearly = subscriptions.some(s => s.plan === "yearly");
      const hasQuarterly = subscriptions.some(s => s.plan === "quarterly");
      if (hasYearly) {
        reasoning.push({ factor: "Premium Subscription", points: 30, description: "Yearly subscription holder" });
        totalScore += 30;
      } else if (hasQuarterly) {
        reasoning.push({ factor: "Standard Subscription", points: 20, description: "Quarterly subscription holder" });
        totalScore += 20;
      } else {
        reasoning.push({ factor: "Basic Subscription", points: 10, description: "Monthly/weekly subscription" });
        totalScore += 10;
      }
    }

    // Factor 3: Activity level (+5 to +20)
    const projects = await ctx.runQuery(internal.lead_scoring.getUserProjects, { userId: args.userId });
    const projectCount = projects?.length || 0;
    if (projectCount > 10) {
      reasoning.push({ factor: "High Activity", points: 20, description: `${projectCount} projects completed` });
      totalScore += 20;
    } else if (projectCount > 5) {
      reasoning.push({ factor: "Medium Activity", points: 10, description: `${projectCount} projects` });
      totalScore += 10;
    } else if (projectCount > 0) {
      reasoning.push({ factor: "Low Activity", points: 5, description: `${projectCount} project(s)` });
      totalScore += 5;
    }

    // Factor 4: Payment history (+5 to +15)
    const hasSuccessfulPayments = await ctx.runQuery(internal.lead_scoring.checkPaymentHistory, { userId: args.userId });
    if (hasSuccessfulPayments) {
      reasoning.push({ factor: "Good Payment History", points: 15, description: "No failed payments" });
      totalScore += 15;
    }

    // Factor 5: Referral activity (+5 to +10)
    const referrals = await ctx.runQuery(internal.lead_scoring.getReferralCount, { userId: args.userId });
    if (referrals > 5) {
      reasoning.push({ factor: "Strong Referrer", points: 10, description: `${referrals} successful referrals` });
      totalScore += 10;
    } else if (referrals > 0) {
      reasoning.push({ factor: "Referrer", points: 5, description: `${referrals} referral(s)` });
      totalScore += 5;
    }

    // Cap score at 100
    totalScore = Math.min(totalScore, 100);

    // Determine next best action based on score
    let nextBestAction = "Nurture with educational content";
    if (totalScore >= 80) {
      nextBestAction = "Direct sales contact - high value lead";
    } else if (totalScore >= 60) {
      nextBestAction = "Send promotional offers to convert";
    } else if (totalScore >= 40) {
      nextBestAction = "Onboarding sequence with agent introduction";
    }

    return {
      score: totalScore,
      reasoning,
      nextBestAction,
    };
  },
});

export const updateLeadScore = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.runAction(internal.lead_scoring.calculateLeadScore, { userId: args.userId });
    
    const existing = await ctx.db
      .query("lead_scores")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: result.score,
        reasoning: result.reasoning,
        nextBestAction: result.nextBestAction,
        lastCalculated: Date.now(),
        isActive: true,
      });
    } else {
      await ctx.db.insert("lead_scores", {
        userId: args.userId,
        score: result.score,
        reasoning: result.reasoning,
        nextBestAction: result.nextBestAction,
        lastCalculated: Date.now(),
        isActive: true,
      });
    }
    return null;
  },
});

export const getLeadScore = query({
  args: { userId: v.id("users") },
  returns: v.object({
    score: v.number(),
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
    lastCalculated: v.number(),
  }),
  handler: async (ctx, args) => {
    const leadScore = await ctx.db
      .query("lead_scores")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!leadScore) {
      return {
        score: 0,
        reasoning: [],
        nextBestAction: "No score calculated yet",
        lastCalculated: 0,
      };
    }
    return leadScore;
  },
});

export const getTopLeads = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    userId: v.id("users"),
    score: v.number(),
    nextBestAction: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const leadScores = await ctx.db
      .query("lead_scores")
      .withIndex("by_score")
      .order("desc")
      .take(limit);

    const results = [];
    for (const lead of leadScores) {
      const user = await ctx.db.get(lead.userId);
      results.push({
        userId: lead.userId,
        score: lead.score,
        nextBestAction: lead.nextBestAction,
        userName: user?.name ?? undefined,
        userEmail: user?.email ?? undefined,
      });
    }
    return results;
  },
});

// Internal queries used by the scoring engine
export const getUserForScoring = internalQuery({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserSubscriptions = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getUserProjects = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const checkPaymentHistory = query({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return refunds.length === 0;
  },
});

export const getReferralCount = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.referralCode) return 0;
    const referrals = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "user"))
      .collect();
    return referrals.filter(u => u.referredBy === args.userId).length;
  },
});

// Batch calculate for all users (used by cron)
export const calculateAllLeadScores = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const users = await ctx.runQuery(internal.lead_scoring._getAllUsers);
    
    for (const user of users) {
      try {
        await ctx.runAction(internal.lead_scoring.calculateLeadScore, { userId: user._id });
        
        // Update the stored score
        const result = await ctx.runQuery(internal.lead_scoring._getLatestScore, { userId: user._id });
        if (result) {
          await ctx.runMutation(internal.lead_scoring._updateStoredScore, {
            userId: user._id,
            score: result.score,
            reasoning: result.reasoning,
            nextBestAction: result.nextBestAction,
          });
        }
      } catch (error) {
        console.error(`Failed to calculate score for user ${user._id}:`, error);
      }
    }
    return null;
  },
});

export const _getAllUsers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.query("users").collect();
  },
});

export const _getLatestScore = query({
  args: { userId: v.id("users") },
  returns: v.optional(v.object({
    score: v.number(),
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
  })),
  handler: async (ctx, args) => {
    const leadScore = await ctx.db
      .query("lead_scores")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!leadScore) return undefined;
    return {
      score: leadScore.score,
      reasoning: leadScore.reasoning,
      nextBestAction: leadScore.nextBestAction,
    };
  },
});

export const _updateStoredScore = mutation({
  args: {
    userId: v.id("users"),
    score: v.number(),
    reasoning: v.array(v.object({
      factor: v.string(),
      points: v.number(),
      description: v.string(),
    })),
    nextBestAction: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lead_scores")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        reasoning: args.reasoning,
        nextBestAction: args.nextBestAction,
        lastCalculated: Date.now(),
        isActive: true,
      });
    } else {
      await ctx.db.insert("lead_scores", {
        userId: args.userId,
        score: args.score,
        reasoning: args.reasoning,
        nextBestAction: args.nextBestAction,
        lastCalculated: Date.now(),
        isActive: true,
      });
    }
    return null;
  },
});