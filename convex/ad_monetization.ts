import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

const DEFAULT_PLANS = [
  {
    name: "basic", monthlyFeeNgn: 150000, successFeePercent: 10, maxPlatforms: 2,
    features: ["2 platforms", "Basic analytics", "Manual campaign setup", "Monthly reports"],
  },
  {
    name: "pro", monthlyFeeNgn: 400000, successFeePercent: 5, maxPlatforms: 5,
    features: ["5 platforms", "AI optimization", "A/B testing", "Weekly reports", "Priority support"],
  },
  {
    name: "enterprise", monthlyFeeNgn: 1250000, successFeePercent: 3, maxPlatforms: 8,
    features: ["All 8 platforms", "Dedicated account manager", "API access", "Custom reporting", "24/7 support", "White-label"],
  },
];

export const seedPlans = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let inserted = 0;
    for (const plan of DEFAULT_PLANS) {
      const existing = await ctx.db.query("ad_monetization_plans").withIndex("by_name", (q) => q.eq("name", plan.name)).first();
      if (!existing) {
        await ctx.db.insert("ad_monetization_plans", { ...plan, enabled: true, createdAt: Date.now() });
        inserted++;
      }
    }
    return { success: true, inserted };
  },
});

export const listPlans = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("ad_monetization_plans").collect();
  },
});

export const createInvoice = mutation({
  args: {
    adminToken: v.string(),
    companyId: v.string(),
    planName: v.string(),
    period: v.string(),
    adSpendTotalNgn: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const plan = await ctx.db.query("ad_monetization_plans").withIndex("by_name", (q) => q.eq("name", args.planName)).first();
    if (!plan) return { error: "Plan not found" };

    const successFeeNgn = Math.round(args.adSpendTotalNgn * plan.successFeePercent / 100);
    const totalNgn = plan.monthlyFeeNgn + successFeeNgn;

    const now = Date.now();
    const invoiceId = await ctx.db.insert("ad_monetization_invoices", {
      companyId: args.companyId,
      planName: args.planName,
      period: args.period,
      flatFeeNgn: plan.monthlyFeeNgn,
      adSpendTotalNgn: args.adSpendTotalNgn,
      successFeeNgn,
      totalNgn,
      status: "pending",
      dueAt: now + 30 * 24 * 60 * 60 * 1000,
      createdAt: now,
    });

    return { success: true, invoiceId, flatFee: plan.monthlyFeeNgn, successFee: successFeeNgn, total: totalNgn };
  },
});

export const markInvoicePaid = mutation({
  args: { adminToken: v.string(), invoiceId: v.id("ad_monetization_invoices") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    await ctx.db.patch(args.invoiceId, { status: "paid", paidAt: Date.now() });
    return { success: true };
  },
});

export const getInvoices = query({
  args: { companyId: v.optional(v.string()), status: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("ad_monetization_invoices").order("desc");
    if (args.companyId) q = q.withIndex("by_company", (iq) => iq.eq("companyId", args.companyId));
    else if (args.status) q = q.withIndex("by_status", (iq) => iq.eq("status", args.status as any));
    return await q.take(args.limit || 50);
  },
});

export const getRevenueStats = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const invoices = await ctx.db.query("ad_monetization_invoices").collect();
    const totalRevenue = invoices.reduce((sum, i) => sum + i.totalNgn, 0);
    const paidRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.totalNgn, 0);
    const pendingRevenue = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.totalNgn, 0);
    const overdueRevenue = invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.totalNgn, 0);

    return { totalRevenue, paidRevenue, pendingRevenue, overdueRevenue, totalInvoices: invoices.length, paidInvoices: invoices.filter((i) => i.status === "paid").length };
  },
});
