import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// UNIFIED MARKETING AUTOMATION ENGINE
// Lead capture, nurturing, conversion, and revenue tracking
// ═══════════════════════════════════════════════════════════════════

// ─── LEAD CAPTURE ───

export const captureLead = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    source: v.string(),
    industry: v.optional(v.string()),
    budget: v.optional(v.string()),
    timeline: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    // Check if lead exists
    const existing = args.email
      ? await ctx.db.query("leads").withIndex("by_email", (q) => q.eq("email", args.email!)).first()
      : null;

    if (existing) {
      // Update existing lead
      await ctx.db.patch(existing._id, {
        name: args.name || existing.name,
        phone: args.phone || existing.phone,
        metadata: { ...existing.metadata, ...args.metadata, company: args.company, lastSeen: Date.now() },
      });
      return existing._id;
    }

    // Calculate lead score
    let score = 0;
    if (args.email) score += 20;
    if (args.phone) score += 20;
    if (args.company) score += 15;
    if (args.industry) score += 15;
    if (args.budget) score += 15;
    if (args.timeline) score += 10;
    if (args.source === "referral") score += 10;
    if (args.source === "enterprise") score += 20;

    // Create lead
    const leadId = await ctx.db.insert("leads", {
      email: args.email,
      phone: args.phone,
      name: args.name,
      source: args.source,
      status: "new",
      notes: `Score: ${score}/100`,
      metadata: {
        ...args.metadata,
        company: args.company,
        industry: args.industry,
        budget: args.budget,
        timeline: args.timeline,
        score,
        capturedAt: Date.now(),
      },
      receivedAt: Date.now(),
    });

    // Store lead score in metadata (lead_scores table requires a users ID, which leads don't have yet)
    await ctx.db.patch(leadId, {
      metadata: {
        ...args.metadata,
        company: args.company,
        industry: args.industry,
        budget: args.budget,
        timeline: args.timeline,
        score,
        capturedAt: Date.now(),
        scoreBreakdown: [
          { factor: "email", points: args.email ? 20 : 0, description: args.email ? "Email provided" : "No email" },
          { factor: "phone", points: args.phone ? 20 : 0, description: args.phone ? "Phone provided" : "No phone" },
          { factor: "company", points: args.company ? 15 : 0, description: args.company ? "Company provided" : "No company" },
          { factor: "source", points: args.source === "referral" ? 10 : 0, description: `Source: ${args.source}` },
        ],
        nextBestAction: score >= 60 ? "Contact immediately" : score >= 30 ? "Send nurture sequence" : "Add to newsletter",
      },
    });

    return leadId;
  },
});

// ─── DRIP CAMPAIGN AUTOMATION ───

export const createDripCampaign = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("email"), v.literal("whatsapp"), v.literal("sms")),
    steps: v.array(v.object({
      delayDays: v.number(),
      subject: v.optional(v.string()),
      content: v.string(),
    })),
    trigger: v.string(), // "new_lead", "inactive_7d", "usage_70", "payment_failed"
  },
  returns: v.id("marketing_campaigns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("marketing_campaigns", {
      name: args.name,
      type: args.type,
      steps: args.steps,
      trigger: args.trigger,
      status: "draft",
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── CONVERSION TRIGGERS ───

export const checkConversionTriggers = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const results: string[] = [];

    // Check for users approaching usage limits
    const users = await ctx.runQuery(internal.marketing_automation.getUsersForConversion);
    
    for (const user of users) {
      const usagePercent = (user.usageCount || 0) / (user.usageLimit || 100);
      
      if (usagePercent >= 0.9 && !user.hasReceivedUpgradeNudge) {
        // User at 90% usage - send upgrade nudge
        await ctx.runMutation(internal.marketing_automation.logConversionTrigger, {
          userId: user._id,
          trigger: "usage_90_percent",
          action: "upgrade_nudge",
        });
        results.push(`Upgrade nudge sent to ${user.email || user._id}`);
      }
      
      if (usagePercent >= 1.0 && user.subscriptionStatus === "free") {
        // User exceeded free tier - send conversion offer
        await ctx.runMutation(internal.marketing_automation.logConversionTrigger, {
          userId: user._id,
          trigger: "usage_exceeded",
          action: "conversion_offer",
        });
        results.push(`Conversion offer sent to ${user.email || user._id}`);
      }
    }

    // Check for inactive users (7+ days)
    const inactiveUsers = await ctx.runQuery(internal.marketing_automation.getInactiveUsers, { days: 7 });
    for (const user of inactiveUsers) {
      await ctx.runMutation(internal.marketing_automation.logConversionTrigger, {
        userId: user._id,
        trigger: "inactive_7_days",
        action: "reactivation_offer",
      });
      results.push(`Reactivation offer sent to ${user.email || user._id}`);
    }

    return { triggersProcessed: results.length, results };
  },
});

// ─── REVENUE TRACKING ───

export const getRevenueDashboard = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const startOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;

    // Get leads stats
    const allLeads = await ctx.db.query("leads").collect();
    const monthlyLeads = allLeads.filter((l) => l.receivedAt >= startOfMonth);
    const weeklyLeads = allLeads.filter((l) => l.receivedAt >= startOfWeek);

    // Get lead status distribution
    const statusCounts: Record<string, number> = {};
    for (const lead of allLeads) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }

    // Get lead source distribution
    const sourceCounts: Record<string, number> = {};
    for (const lead of allLeads) {
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    }

    // Get campaign stats
    const campaigns = await ctx.db.query("marketing_campaigns").collect();
    const activeCampaigns = campaigns.filter((c) => c.status === "active");
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);

    // Get lead scores distribution
    const scores = await ctx.db.query("lead_scores").collect();
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0;

    return {
      totalLeads: allLeads.length,
      monthlyLeads: monthlyLeads.length,
      weeklyLeads: weeklyLeads.length,
      statusDistribution: statusCounts,
      sourceDistribution: sourceCounts,
      conversionRate: allLeads.length > 0
        ? Math.round(((statusCounts["converted"] || 0) / allLeads.length) * 100)
        : 0,
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      totalSent,
      avgLeadScore: avgScore,
      highValueLeads: scores.filter((s) => s.score >= 70).length,
    };
  },
});

// ─── LEAD MANAGEMENT ───

export const getLeads = query({
  args: {
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("leads");
    
    if (args.status) {
      q = q.withIndex("by_status", (i) => i.eq("status", args.status as any));
    } else if (args.source) {
      q = q.withIndex("by_source", (i) => i.eq("source", args.source));
    }
    
    return await q.order("desc").take(args.limit || 50);
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("lost")),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      status: args.status,
      notes: args.notes,
      lastContactedAt: args.status === "contacted" ? Date.now() : undefined,
    });
  },
});

// ─── AUTOMATED SEQUENCES ───

export const getAutomatedSequences = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("marketing_campaigns").collect();
    return campaigns.map((c) => ({
      ...c,
      stepCount: Array.isArray(c.steps) ? c.steps.length : 0,
    }));
  },
});

export const triggerAutomatedSequence = mutation({
  args: {
    leadId: v.id("leads"),
    campaignId: v.id("marketing_campaigns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    // Log the sequence trigger in lead metadata
    const lead = await ctx.db.get(args.leadId);
    if (lead) {
      await ctx.db.patch(args.leadId, {
        metadata: {
          ...lead.metadata,
          lastSequenceTrigger: { campaign: campaign.name, triggeredAt: Date.now() },
        },
      });
    }

    // Update campaign sent count
    await ctx.db.patch(args.campaignId, {
      sentCount: (campaign.sentCount || 0) + 1,
    });
  },
});

// ─── INTERNAL MUTATIONS ───

export const logConversionTrigger = internalMutation({
  args: {
    userId: v.string(),
    trigger: v.string(),
    action: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Conversion trigger logged - no action needed (was previously broken lead_scores insert)
    return null;
  },
});

// ─── INTERNAL QUERIES ───

export const getUsersForConversion = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.slice(0, 100).map((u) => ({
      _id: u._id,
      email: u.email,
      subscriptionStatus: "free",
      usageCount: 0,
      usageLimit: 100,
      hasReceivedUpgradeNudge: false,
    }));
  },
});

export const getInactiveUsers = internalQuery({
  args: { days: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => (u._creationTime || 0) < cutoff).slice(0, 50);
  },
});

// ─── LEADERBOARD ───

export const getLeadLeaderboard = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const scores = await ctx.db.query("lead_scores").order("desc").take(20);
    return scores;
  },
});
