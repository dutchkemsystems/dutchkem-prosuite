import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE BILLING SYSTEM
// Manages subscriptions, invoices, and payments for enterprise clients
// ═══════════════════════════════════════════════════════════════════

// ─── PLAN CONFIGURATIONS ───

const ENTERPRISE_PLANS = {
  basic: {
    name: "Basic",
    monthlyPrice: 150000,
    annualPrice: 1500000,
    successFeePercent: 10,
    maxPlatforms: 2,
    features: ["2 platforms", "Basic analytics", "Manual campaign setup", "Monthly reports"],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 400000,
    annualPrice: 4000000,
    successFeePercent: 5,
    maxPlatforms: 5,
    features: ["5 platforms", "AI optimization", "A/B testing", "Weekly reports", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 1250000,
    annualPrice: 12500000,
    successFeePercent: 3,
    maxPlatforms: 8,
    features: ["All 8 platforms", "Dedicated account manager", "API access", "Custom reporting", "24/7 support", "White-label"],
  },
};

const ADDON_PRICES = {
  api_access: { monthly: 200000, oneTime: 0 },
  custom_training: { monthly: 0, oneTime: 150000 },
  white_label: { monthly: 500000, oneTime: 0 },
  dedicated_support: { monthly: 100000, oneTime: 0 },
  custom_integration: { monthly: 0, oneTime: 250000 },
};

// ─── GET ENTERPRISE BILLING DASHBOARD ───

export const getBillingDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    // Get all enterprise organizations
    const orgs = await ctx.db.query("enterprise_organizations").collect();
    
    // Get all transactions
    const transactions = await ctx.db.query("enterprise_transactions").collect();
    
    // Calculate metrics
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const activeOrgs = orgs.filter((o: any) => o.status === "active").length;
    const trialOrgs = orgs.filter((o: any) => o.status === "trial").length;
    
    // Get plan distribution
    const planDistribution: Record<string, number> = {};
    orgs.forEach((org: any) => {
      planDistribution[org.plan] = (planDistribution[org.plan] || 0) + 1;
    });

    // Calculate MRR by plan
    const mrrByPlan: Record<string, number> = {};
    orgs.forEach((org: any) => {
      if (org.status === "active") {
        const plan = ENTERPRISE_PLANS[org.plan as keyof typeof ENTERPRISE_PLANS];
        if (plan) {
          mrrByPlan[org.plan] = (mrrByPlan[org.plan] || 0) + plan.monthlyPrice;
        }
      }
    });

    const totalMRR = Object.values(mrrByPlan).reduce((sum: number, v: number) => sum + v, 0);

    return {
      totalOrganizations: orgs.length,
      activeOrganizations: activeOrgs,
      trialOrganizations: trialOrgs,
      totalRevenue,
      totalMRR,
      mrrByPlan,
      planDistribution,
      recentTransactions: transactions.slice(0, 10),
    };
  },
});

// ─── CREATE ENTERPRISE INVOICE ───

export const createInvoice = mutation({
  args: {
    orgId: v.string(),
    planName: v.string(),
    period: v.string(),
    adSpendTotal: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const plan = ENTERPRISE_PLANS[args.planName as keyof typeof ENTERPRISE_PLANS];
    if (!plan) throw new Error("Invalid plan");

    const successFee = Math.round(args.adSpendTotal * plan.successFeePercent / 100);
    const total = plan.monthlyPrice + successFee;

    const invoiceId = await ctx.db.insert("enterprise_invoices", {
      orgId: args.orgId,
      planName: args.planName,
      period: args.period,
      flatFee: plan.monthlyPrice,
      adSpendTotal: args.adSpendTotal,
      successFee,
      total,
      status: "pending",
      dueAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });

    return { success: true, invoiceId, flatFee: plan.monthlyPrice, successFee, total };
  },
});

// ─── GET ENTERPRISE INVOICES ───

export const getInvoices = query({
  args: {
    orgId: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("enterprise_invoices").order("desc");
    if (args.orgId) q = q.filter((q2) => q2.eq(q2.field("orgId"), args.orgId));
    else if (args.status) q = q.filter((q2) => q2.eq(q2.field("status"), args.status));
    return await q.take(args.limit || 50);
  },
});

// ─── MARK INVOICE PAID ───

export const markInvoicePaid = mutation({
  args: {
    invoiceId: v.id("enterprise_invoices"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── GET ENTERPRISE REVENUE STATS ───

export const getRevenueStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const invoices = await ctx.db.query("enterprise_invoices").collect();
    const totalRevenue = invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    const paidRevenue = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    const pendingRevenue = invoices.filter((i: any) => i.status === "pending").reduce((sum: number, i: any) => sum + (i.total || 0), 0);

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i: any) => i.status === "paid").length,
    };
  },
});

// ─── GET AGENT REVENUE PROJECTIONS ───

export const getAgentRevenueProjections = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const agentProjections = [
      { agentId: "A1", name: "Academic Writer", dailyImpressions: 5000, cpm: 50 },
      { agentId: "A2", name: "Business Consultant", dailyImpressions: 4000, cpm: 75 },
      { agentId: "A3", name: "Content Strategist", dailyImpressions: 8000, cpm: 40 },
      { agentId: "A4", name: "Career Coach", dailyImpressions: 3500, cpm: 60 },
      { agentId: "A5", name: "Personal Shopper", dailyImpressions: 6000, cpm: 45 },
      { agentId: "A6", name: "Exam Specialist", dailyImpressions: 4500, cpm: 55 },
      { agentId: "A7", name: "Finance Advisor", dailyImpressions: 3000, cpm: 80 },
      { agentId: "A8", name: "MediaStudio Pro", dailyImpressions: 2500, cpm: 90 },
      { agentId: "A9", name: "Wellness Coach", dailyImpressions: 3500, cpm: 50 },
      { agentId: "A10", name: "Home Specialist", dailyImpressions: 2000, cpm: 40 },
      { agentId: "A11", name: "Language Coach", dailyImpressions: 2500, cpm: 45 },
      { agentId: "A12", name: "Travel Planner", dailyImpressions: 2000, cpm: 60 },
      { agentId: "A13", name: "Exam Success", dailyImpressions: 4000, cpm: 55 },
      { agentId: "A14", name: "Translation Hub", dailyImpressions: 1500, cpm: 40 },
      { agentId: "A15", name: "Event Planner", dailyImpressions: 1500, cpm: 50 },
    ];

    return agentProjections.map(agent => ({
      ...agent,
      dailyRevenue: Math.round((agent.dailyImpressions * agent.cpm) / 1000),
      weeklyRevenue: Math.round((agent.dailyImpressions * agent.cpm * 7) / 1000),
      monthlyRevenue: Math.round((agent.dailyImpressions * agent.cpm * 30) / 1000),
      yearlyRevenue: Math.round((agent.dailyImpressions * agent.cpm * 365) / 1000),
    }));
  },
});
