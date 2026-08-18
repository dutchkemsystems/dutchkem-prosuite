import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { scoreLead } from "./unified_scoring";

// ═══════════════════════════════════════════════════════════════════
// AI SALES AGENT - Proactive conversion engine
// Uses unified `leads` table (merged from leads + sales_leads)
// ═══════════════════════════════════════════════════════════════════

const OBJECTION_RESPONSES: Record<string, string> = {
  price: "I understand budget is a concern. Let me show you the ROI — our clients typically see 10x return within the first month. The starter plan at ₦5,000/month gives you access to AI agents that would cost ₦200,000/month to hire manually.",
  features: "Great question! Our platform includes 15 specialized AI agents, each an expert in their field. You get academic writing, business consulting, content creation, and more — all in one platform. Would you like to see a demo?",
  competitor: "We're the only platform offering 15 specialized AI agents with Nigerian market expertise. Our agents understand local business context, pricing in Naira, and Nigerian cultural nuances. No competitor offers this depth.",
  trust: "We have 1,000+ active clients and a 95% satisfaction rate. Every transaction is secured with bank-grade encryption. You also get a 30-day money-back guarantee. Try us risk-free!",
  timing: "I understand timing is important. The best time to start is now — our early adopter pricing won't last forever. Plus, you can start with our free trial to see the value before committing.",
};

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Create sales lead
// ═══════════════════════════════════════════════════════════════════
export const createLead = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(),
    interest: v.string(),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const scoreResult = scoreLead({
      email: args.email,
      phone: args.phone,
      name: args.name,
      source: "ai_sales",
      interest: args.interest,
    });
    return await ctx.db.insert("leads", {
      ...args,
      source: "ai_sales",
      status: "new",
      score: scoreResult.score,
      interest: args.interest,
      receivedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Update lead status
// ═══════════════════════════════════════════════════════════════════
export const updateLead = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.optional(v.union(
      v.literal("new"), v.literal("contacted"), v.literal("qualified"),
      v.literal("proposal"), v.literal("negotiation"),
      v.literal("closed_won"), v.literal("closed_lost")
    )),
    notes: v.optional(v.string()),
    assignedAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: any = { updatedAt: Date.now() };
    if (args.status) patch.status = args.status;
    if (args.notes) patch.notes = args.notes;
    if (args.assignedAgent) patch.assignedTo = args.assignedAgent;
    await ctx.db.patch(args.leadId, patch);
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Log sales conversation
// ═══════════════════════════════════════════════════════════════════
export const logConversation = mutation({
  args: {
    leadId: v.id("leads"),
    role: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sales_conversations")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .order("desc")
      .first();

    const newMessage = { role: args.role, content: args.content, timestamp: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: [...existing.messages, newMessage],
      });
    } else {
      await ctx.db.insert("sales_conversations", {
        leadId: args.leadId,
        messages: [newMessage],
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Create deal
// ═══════════════════════════════════════════════════════════════════
export const createDeal = mutation({
  args: {
    leadId: v.id("leads"),
    value: v.number(),
    stage: v.union(v.literal("prospect"), v.literal("qualification"), v.literal("proposal"), v.literal("negotiation"), v.literal("closed_won"), v.literal("closed_lost")),
    probability: v.number(),
    expectedClose: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("sales_deals"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("sales_deals", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get sales pipeline
// ═══════════════════════════════════════════════════════════════════
export const getSalesPipeline = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Query unified leads table, filter for AI sales agent leads
    const allLeads = await ctx.db.query("leads").collect();
    const leads = allLeads.filter(l => l.source === "ai_sales" || l.interest);
    const deals = await ctx.db.query("sales_deals").collect();

    const pipeline: Record<string, any[]> = {
      new: [], contacted: [], qualified: [], proposal: [], negotiation: [], closed_won: [], closed_lost: [],
    };

    for (const lead of leads) {
      if (pipeline[lead.status]) {
        pipeline[lead.status].push(lead);
      }
    }

    const totalValue = deals
      .filter((d) => d.stage === "closed_won")
      .reduce((sum, d) => sum + d.value, 0);

    const pipelineValue = deals
      .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
      .reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

    return {
      pipeline,
      totalLeads: leads.length,
      totalDeals: deals.length,
      totalValue,
      pipelineValue,
      conversionRate: leads.length > 0
        ? Math.round((leads.filter((l) => l.status === "closed_won").length / leads.length) * 100)
        : 0,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get sales analytics
// ═══════════════════════════════════════════════════════════════════
export const getSalesAnalytics = query({
  args: { days: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Query unified leads table, filter for AI sales agent leads
    const allLeads = await ctx.db.query("leads").collect();
    const leads = allLeads.filter(l => (l.source === "ai_sales" || l.interest) && (l.receivedAt || 0) >= cutoff);

    const deals = await ctx.db
      .query("sales_deals")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    const wonDeals = deals.filter((d) => d.stage === "closed_won");
    const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const avgDealSize = wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0;

    const bySource: Record<string, number> = {};
    for (const lead of leads) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    }

    const byStatus: Record<string, number> = {};
    for (const lead of leads) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    }

    return {
      totalLeads: leads.length,
      totalDeals: deals.length,
      wonDeals: wonDeals.length,
      totalRevenue,
      avgDealSize,
      conversionRate: leads.length > 0
        ? Math.round((wonDeals.length / leads.length) * 100)
        : 0,
      bySource,
      byStatus,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Handle sales objection
// ═══════════════════════════════════════════════════════════════════
export const handleObjection = action({
  args: {
    objectionType: v.string(),
    context: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const response = OBJECTION_RESPONSES[args.objectionType] || OBJECTION_RESPONSES.trust;
    return { response, type: args.objectionType };
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER: Calculate lead score (delegates to unified_scoring)
// ═══════════════════════════════════════════════════════════════════
