import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

export const getOutcomeRules = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    return await ctx.db.query("outcome_pricing_rules").collect();
  },
});

export const getOutcomeEvents = query({
  args: {
    userId: v.optional(v.string()),
    outcomeType: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    let q = ctx.db.query("outcome_events");
    if (args.userId) q = q.filter((q) => q.eq(q.field("userId"), args.userId));
    if (args.outcomeType) q = q.filter((q) => q.eq(q.field("outcomeType"), args.outcomeType));
    return await q.collect();
  },
});

export const getOutcomeStats = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const events = await ctx.db.query("outcome_events").collect();
    const totalEvents = events.length;
    const totalRevenue = events.reduce((sum, e) => sum + (e.amountCharged || 0), 0);
    const pendingSettlements = events.filter((e) => e.status === "pending").length;

    const typeMap: Record<string, { count: number; revenue: number }> = {};
    for (const e of events) {
      if (!typeMap[e.outcomeType]) typeMap[e.outcomeType] = { count: 0, revenue: 0 };
      typeMap[e.outcomeType].count++;
      typeMap[e.outcomeType].revenue += e.amountCharged || 0;
    }
    const byType = Object.entries(typeMap).map(([type, data]) => ({ type, ...data }));

    return { totalEvents, totalRevenue, pendingSettlements, byType };
  },
});

export const addOutcomeRule = mutation({
  args: {
    outcomeType: v.string(),
    description: v.string(),
    priceNgN: v.number(),
    commissionPercentage: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const ruleId = await ctx.db.insert("outcome_pricing_rules", {
      outcomeType: args.outcomeType,
      description: args.description,
      priceNgN: args.priceNgN,
      commissionPercentage: args.commissionPercentage ?? 0,
      isActive: true,
      createdAt: Date.now(),
    });
    return ruleId;
  },
});

export const updateOutcomeRule = mutation({
  args: {
    ruleId: v.id("outcome_pricing_rules"),
    priceNgN: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const patch: Record<string, unknown> = {};
    if (args.priceNgN !== undefined) patch.priceNgN = args.priceNgN;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.ruleId, patch);
  },
});

export const recordOutcome = mutation({
  args: {
    userId: v.string(),
    outcomeType: v.string(),
    outcomeValue: v.any(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const rules = await ctx.db
      .query("outcome_pricing_rules")
      .filter((q) => q.eq(q.field("outcomeType"), args.outcomeType))
      .collect();
    const rule = rules.find((r) => r.isActive);
    if (!rule) return { success: false, charged: 0 };

    const charged = rule.priceNgN;
    await ctx.db.insert("outcome_events", {
      userId: args.userId,
      outcomeType: args.outcomeType,
      outcomeValue: args.outcomeValue,
      amountCharged: charged,
      status: "pending",
      reference: `OUT_${Date.now()}_${args.userId}`,
      createdAt: Date.now(),
    });
    return { success: true, charged };
  },
});

// ─── WHITE-LABEL ─────────────────────────────────────────────

export const getWhiteLabelCustomers = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    return await ctx.db.query("white_label_customers").collect();
  },
});

export const getWhiteLabelStats = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const customers = await ctx.db.query("white_label_customers").collect();
    const totalClients = customers.length;
    const activeClients = customers.filter((c) => c.status === "active").length;
    const totalSetupFees = customers.reduce((sum, c) => sum + (c.setupFeePaid || 0), 0);
    const totalMonthlyRevenue = customers
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
    return { totalClients, activeClients, totalSetupFees, totalMonthlyRevenue };
  },
});

export const createWhiteLabelCustomer = mutation({
  args: {
    companyName: v.string(),
    customDomain: v.optional(v.string()),
    customLogo: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    setupFeePaid: v.number(),
    monthlyFee: v.number(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const id = await ctx.db.insert("white_label_customers", {
      companyName: args.companyName,
      customDomain: args.customDomain,
      customLogo: args.customLogo,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      setupFeePaid: args.setupFeePaid,
      monthlyFee: args.monthlyFee,
      subscriptionEndDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const updateWhiteLabelCustomer = mutation({
  args: {
    customerId: v.id("white_label_customers"),
    status: v.optional(v.string()),
    monthlyFee: v.optional(v.number()),
    customDomain: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.monthlyFee !== undefined) patch.monthlyFee = args.monthlyFee;
    if (args.customDomain !== undefined) patch.customDomain = args.customDomain;
    patch.updatedAt = Date.now();
    await ctx.db.patch(args.customerId, patch);
  },
});

export const suspendWhiteLabel = mutation({
  args: {
    customerId: v.id("white_label_customers"),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    await ctx.db.patch(args.customerId, { status: "suspended", updatedAt: Date.now() });
  },
});

// ─── AGENT PERFORMANCE ANALYTICS ─────────────────────────────

export const getAgentMetrics = query({
  args: {
    agentId: v.string(),
    days: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const since = args.days ? Date.now() - args.days * 86400000 : 0;
    const metrics = await ctx.db
      .query("agent_performance_metrics")
      .filter((q) => q.eq(q.field("agentId"), args.agentId))
      .collect();
    return metrics.filter((m) => (m.date ? new Date(m.date).getTime() >= since : true));
  },
});

export const getAllAgentMetrics = query({
  args: {
    date: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    let metrics = await ctx.db.query("agent_performance_metrics").collect();
    if (args.date) {
      metrics = metrics.filter((m) => m.date === args.date);
    }
    return metrics;
  },
});

export const getAnalyticsOverview = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const metrics = await ctx.db.query("agent_performance_metrics").collect();
    const totalAgents = new Set(metrics.map((m) => m.agentId)).size;
    const totalQueries = metrics.reduce((sum, m) => sum + (m.totalQueries || 0), 0);
    const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenueGenerated || 0), 0);
    const avgSatisfaction =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.userSatisfaction || 0), 0) / metrics.length
        : 0;

    const agentRevenue: Record<string, number> = {};
    for (const m of metrics) {
      agentRevenue[m.agentId] = (agentRevenue[m.agentId] || 0) + (m.revenueGenerated || 0);
    }
    const topAgents = Object.entries(agentRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([agentId, revenue]) => ({ agentId, revenue }));

    return { totalAgents, totalQueries, totalRevenue, avgSatisfaction, topAgents };
  },
});

export const recordAgentMetric = mutation({
  args: {
    agentId: v.string(),
    date: v.string(),
    totalQueries: v.number(),
    successfulResolutions: v.number(),
    avgResponseTimeMs: v.number(),
    userSatisfaction: v.number(),
    revenueGenerated: v.number(),
    costSaved: v.number(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const existing = await ctx.db
      .query("agent_performance_metrics")
      .filter((q) =>
        q.and(
          q.eq(q.field("agentId"), args.agentId),
          q.eq(q.field("date"), args.date)
        )
      )
      .first();

    const data = {
      agentId: args.agentId,
      date: args.date,
      totalQueries: args.totalQueries,
      successfulResolutions: args.successfulResolutions,
      avgResponseTimeMs: args.avgResponseTimeMs,
      userSatisfaction: args.userSatisfaction,
      revenueGenerated: args.revenueGenerated,
      costSaved: args.costSaved,
      roiPercentage: 0,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("agent_performance_metrics", { ...data, createdAt: Date.now() });
  },
});

// ─── API ACCESS ──────────────────────────────────────────────

export const getApiKeys = query({
  args: {
    userId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    let q = ctx.db.query("developer_api_keys");
    if (args.userId) q = q.filter((q) => q.eq(q.field("userId"), args.userId));
    return await q.collect();
  },
});

export const getApiUsageStats = query({
  args: {
    apiKeyId: v.id("developer_api_keys"),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const logs = await ctx.db
      .query("developer_api_usage_logs")
      .filter((q) => q.eq(q.field("apiKeyId"), args.apiKeyId))
      .collect();
    const count = logs.length;
    const avgResponseTimeMs =
      count > 0 ? logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / count : 0;
    return { count, avgResponseTimeMs };
  },
});

export const createApiKey = mutation({
  args: {
    userId: v.string(),
    tier: v.union(
      v.literal("developer"),
      v.literal("professional"),
      v.literal("business"),
      v.literal("enterprise")
    ),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);

    const limits: Record<string, number> = {
      developer: 1000,
      professional: 10000,
      business: 100000,
      enterprise: 1000000,
    };

    const apiKey = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const apiSecret = Array.from({ length: 48 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

    const monthlyCallLimit = limits[args.tier];

    await ctx.db.insert("developer_api_keys", {
      userId: args.userId,
      apiKey,
      apiSecret,
      tier: args.tier,
      monthlyCallLimit,
      callsUsed: 0,
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return { apiKey, apiSecret, tier: args.tier, monthlyCallLimit };
  },
});

export const revokeApiKey = mutation({
  args: {
    keyId: v.id("developer_api_keys"),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    await ctx.db.patch(args.keyId, { isActive: false, revokedAt: Date.now() });
  },
});

export const logApiUsage = mutation({
  args: {
    apiKeyId: v.id("developer_api_keys"),
    endpoint: v.string(),
    method: v.string(),
    responseTimeMs: v.number(),
    statusCode: v.number(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    await ctx.db.insert("developer_api_usage_logs", {
      apiKeyId: args.apiKeyId,
      endpoint: args.endpoint,
      method: args.method,
      responseTimeMs: args.responseTimeMs,
      statusCode: args.statusCode,
      createdAt: Date.now(),
    });
    const key = await ctx.db.get(args.apiKeyId);
    if (key) {
      await ctx.db.patch(args.apiKeyId, { callsUsed: (key.callsUsed || 0) + 1 });
    }
  },
});

// ─── CONSULTING ──────────────────────────────────────────────

const CONSULTING_PRICES: Record<string, number> = {
  setup_configuration: 200000,
  custom_agent_development: 500000,
  team_training: 100000,
  monthly_retainer: 300000,
  strategy_consulting: 500000,
};

export const getConsultingBookings = query({
  args: {
    clientId: v.optional(v.string()),
    status: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    let q = ctx.db.query("consulting_bookings");
    if (args.clientId) q = q.filter((q) => q.eq(q.field("clientId"), args.clientId));
    if (args.status) q = q.filter((q) => q.eq(q.field("status"), args.status));
    return await q.collect();
  },
});

export const getConsultingStats = query({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const bookings = await ctx.db.query("consulting_bookings").collect();
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter((b) => b.status === "pending").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const totalRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (b.priceNgN || 0), 0);
    return { totalBookings, pendingBookings, completedBookings, totalRevenue };
  },
});

export const bookConsulting = mutation({
  args: {
    clientId: v.string(),
    serviceType: v.string(),
    description: v.string(),
    scheduledDate: v.number(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const priceNgN = CONSULTING_PRICES[args.serviceType] ?? 0;
    const id = await ctx.db.insert("consulting_bookings", {
      clientId: args.clientId,
      serviceType: args.serviceType,
      description: args.description,
      scheduledDate: args.scheduledDate,
      priceNgN,
      status: "pending",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("consulting_bookings"),
    status: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await tryGetAdminSession(ctx, args.adminToken);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "completed") patch.completedDate = Date.now();
    await ctx.db.patch(args.bookingId, patch);
  },
});
