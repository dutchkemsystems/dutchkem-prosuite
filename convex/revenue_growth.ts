import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// REVENUE GROWTH ENGINE — Credit Expiration, Annual Plans, Premium
// Pricing, Enterprise Add-Ons, Usage Tiers, Overage, Freemium
// ═══════════════════════════════════════════════════════════════════

// ─── CREDIT EXPIRATION SYSTEM ───

export const getCreditExpiryConfig = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("credit_expiry_config")
      .withIndex("by_singleton", (q) => q.eq("enabled", true))
      .first();
    return config ?? { enabled: false, expiryDays: 30, warningDays: 7 };
  },
});

export const updateCreditExpiryConfig = mutation({
  args: {
    enabled: v.boolean(),
    expiryDays: v.number(),
    warningDays: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("credit_expiry_config")
      .withIndex("by_singleton", (q) => q.eq("enabled", true))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        expiryDays: args.expiryDays,
        warningDays: args.warningDays,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("credit_expiry_config", {
        enabled: args.enabled,
        expiryDays: args.expiryDays,
        warningDays: args.warningDays,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const getExpiringCredits = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.revenue_growth.getCreditExpiryConfigInternal);
    if (!config.enabled) return { expiring: [], totalExpiring: 0 };

    const cutoffDate = Date.now() + (config.warningDays * 24 * 60 * 60 * 1000);
    const transactions = await ctx.db
      .query("credit_transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("transactionType"), "purchase"))
      .order("desc")
      .take(50);

    const expiring = transactions.filter((t: any) => {
      const expiresAt = t.createdAt + (config.expiryDays * 24 * 60 * 60 * 1000);
      return expiresAt <= cutoffDate && expiresAt > Date.now();
    });

    const totalExpiring = expiring.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    return { expiring, totalExpiring };
  },
});

export const getCreditExpiryConfigInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("credit_expiry_config")
      .withIndex("by_singleton", (q) => q.eq("enabled", true))
      .first();
    return config ?? { enabled: false, expiryDays: 30, warningDays: 7 };
  },
});

// ─── SUBSCRIPTION PLANS (Annual Discounts + Usage Tiers) ───

export const getSubscriptionPlans = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("subscription_plans")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

export const seedSubscriptionPlans = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const plans = [
      {
        planId: "starter",
        name: "Starter Bundle",
        description: "Perfect for individuals getting started with AI agents",
        monthlyPriceNgn: 5000,
        annualPriceNgn: 48000, // 20% discount
        annualDiscountPercent: 20,
        creditsIncluded: 500,
        messageLimitMonthly: 100,
        features: ["3 Specialized Agents", "Standard Support", "Standard Latency", "Basic Analytics"],
        isActive: true,
      },
      {
        planId: "pro",
        name: "Pro Suite NG+",
        description: "Full access to all 15 expert agents with priority support",
        monthlyPriceNgn: 15000,
        annualPriceNgn: 144000, // 20% discount
        annualDiscountPercent: 20,
        creditsIncluded: 2500,
        messageLimitMonthly: 500,
        features: ["All 15 Specialized Expert Agents", "Priority Support", "NVIDIA NIM AI Latency", "Guardian AI Monitoring", "Bulk Exports"],
        isActive: true,
      },
      {
        planId: "enterprise",
        name: "Enterprise Elite",
        description: "Custom API access with dedicated success manager",
        monthlyPriceNgn: 50000,
        annualPriceNgn: 480000, // 20% discount
        annualDiscountPercent: 20,
        creditsIncluded: 20000,
        messageLimitMonthly: -1, // unlimited
        features: ["Custom API Access", "Dedicated Success Manager", "White-label Output", "Unlimited Revisions", "On-prem Options"],
        isActive: true,
      },
    ];

    let inserted = 0;
    for (const plan of plans) {
      const existing = await ctx.db
        .query("subscription_plans")
        .withIndex("by_plan_id", (q) => q.eq("planId", plan.planId))
        .first();
      if (!existing) {
        await ctx.db.insert("subscription_plans", {
          ...plan,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        inserted++;
      }
    }
    return { success: true, inserted };
  },
});

export const updateSubscriptionPlan = mutation({
  args: {
    planId: v.string(),
    monthlyPriceNgn: v.optional(v.number()),
    annualPriceNgn: v.optional(v.number()),
    annualDiscountPercent: v.optional(v.number()),
    creditsIncluded: v.optional(v.number()),
    messageLimitMonthly: v.optional(v.number()),
    features: v.optional(v.array(v.string())),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("subscription_plans")
      .withIndex("by_plan_id", (q) => q.eq("planId", args.planId))
      .first();
    if (!existing) throw new Error("Plan not found");

    const patch: any = { updatedAt: Date.now() };
    if (args.monthlyPriceNgn !== undefined) patch.monthlyPriceNgn = args.monthlyPriceNgn;
    if (args.annualPriceNgn !== undefined) patch.annualPriceNgn = args.annualPriceNgn;
    if (args.annualDiscountPercent !== undefined) patch.annualDiscountPercent = args.annualDiscountPercent;
    if (args.creditsIncluded !== undefined) patch.creditsIncluded = args.creditsIncluded;
    if (args.messageLimitMonthly !== undefined) patch.messageLimitMonthly = args.messageLimitMonthly;
    if (args.features !== undefined) patch.features = args.features;

    await ctx.db.patch(existing._id, patch);
    return { success: true };
  },
});

// ─── AGENT-SPECIFIC PREMIUM PRICING ───

export const getAgentPricingTiers = query({
  args: { agentId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.agentId) {
      return await ctx.db
        .query("agent_pricing_tiers")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .collect();
    }
    return await ctx.db
      .query("agent_pricing_tiers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const seedAgentPricingTiers = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const agents = [
      { agentId: "A1", agentName: "Academic Writer", standardPrice: 500, premiumPrice: 2000, enterprisePrice: 5000 },
      { agentId: "A2", agentName: "Business Advisor", standardPrice: 500, premiumPrice: 2500, enterprisePrice: 6000 },
      { agentId: "A3", agentName: "Content Strategist", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 4000 },
      { agentId: "A4", agentName: "Career Coach", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 3500 },
      { agentId: "A5", agentName: "Personal Shopper", standardPrice: 500, premiumPrice: 1000, enterprisePrice: 3000 },
      { agentId: "A6", agentName: "Exam Specialist", standardPrice: 500, premiumPrice: 2000, enterprisePrice: 5000 },
      { agentId: "A7", agentName: "Finance Advisor", standardPrice: 500, premiumPrice: 2500, enterprisePrice: 6000 },
      { agentId: "A8", agentName: "MediaStudio Pro", standardPrice: 500, premiumPrice: 3000, enterprisePrice: 8000 },
      { agentId: "A9", agentName: "Wellness Coach", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 3500 },
      { agentId: "A10", agentName: "Home Specialist", standardPrice: 500, premiumPrice: 1000, enterprisePrice: 2500 },
      { agentId: "A11", agentName: "Language Coach", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 4000 },
      { agentId: "A12", agentName: "Travel Planner", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 4000 },
      { agentId: "A13", agentName: "Exam Success", standardPrice: 500, premiumPrice: 2000, enterprisePrice: 5000 },
      { agentId: "A14", agentName: "Translation Hub", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 4000 },
      { agentId: "A15", agentName: "Event Planner", standardPrice: 500, premiumPrice: 1500, enterprisePrice: 4000 },
    ];

    const tiers = ["standard", "premium", "enterprise"] as const;
    let inserted = 0;

    for (const agent of agents) {
      for (const tier of tiers) {
        const existing = await ctx.db
          .query("agent_pricing_tiers")
          .withIndex("by_agent", (q) => q.eq("agentId", agent.agentId))
          .filter((q) => q.eq(q.field("tier"), tier))
          .first();
        if (!existing) {
          const price = tier === "standard" ? agent.standardPrice : tier === "premium" ? agent.premiumPrice : agent.enterprisePrice;
          await ctx.db.insert("agent_pricing_tiers", {
            agentId: agent.agentId,
            agentName: agent.agentName,
            tier,
            monthlyPriceNgn: price,
            creditsPerMessage: tier === "standard" ? 1 : tier === "premium" ? 2 : 5,
            features: tier === "standard"
              ? ["Basic AI responses", "Standard latency"]
              : tier === "premium"
              ? ["Enhanced AI responses", "Priority latency", "Advanced analytics", "Custom templates"]
              : ["Enterprise AI model", "Instant latency", "Full analytics suite", "Custom training", "Dedicated support", "API access"],
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          inserted++;
        }
      }
    }
    return { success: true, inserted };
  },
});

// ─── ENTERPRISE ADD-ONS ───

export const getEnterpriseAddons = query({
  args: { category: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("enterprise_addons")
      .withIndex("by_active", (q) => q.eq("isActive", true));
    if (args.category) {
      const results = await q.collect();
      return results.filter((a: any) => a.category === args.category);
    }
    return await q.collect();
  },
});

export const seedEnterpriseAddons = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const addons = [
      {
        addonId: "api_access",
        name: "Developer API Access",
        description: "Full REST API access with webhooks and custom integrations",
        category: "api_access" as const,
        priceNgn: 200000,
        billingCycle: "monthly" as const,
        features: ["REST API access", "Webhook support", "Custom integrations", "100K calls/month", "Priority rate limits"],
        isActive: true,
      },
      {
        addonId: "custom_training",
        name: "Custom Agent Training",
        description: "Train AI agents on your specific business data and workflows",
        category: "custom_training" as const,
        priceNgn: 150000,
        billingCycle: "one_time" as const,
        features: ["Custom knowledge base", "Business-specific training", "Workflow optimization", "Performance tuning", "30-day support"],
        isActive: true,
      },
      {
        addonId: "white_label",
        name: "White-Label License",
        description: "Rebrand the platform as your own with custom domain and branding",
        category: "white_label" as const,
        priceNgn: 500000,
        billingCycle: "monthly" as const,
        features: ["Custom domain", "Custom logo & branding", "Remove all Dutchkem references", "Custom email domain", "Priority support"],
        isActive: true,
      },
      {
        addonId: "dedicated_support",
        name: "Dedicated Success Manager",
        description: "Personal account manager for enterprise clients",
        category: "dedicated_support" as const,
        priceNgn: 100000,
        billingCycle: "monthly" as const,
        features: ["Personal account manager", "Weekly strategy calls", "Priority issue resolution", "Custom reporting", "On-site visits"],
        isActive: true,
      },
      {
        addonId: "custom_integration",
        name: "Custom Integration Service",
        description: "Build custom integrations with your existing tools and workflows",
        category: "custom_integration" as const,
        priceNgn: 250000,
        billingCycle: "one_time" as const,
        features: ["Custom API integration", "Data migration", "Workflow automation", "Testing & validation", "60-day support"],
        isActive: true,
      },
    ];

    let inserted = 0;
    for (const addon of addons) {
      const existing = await ctx.db
        .query("enterprise_addons")
        .withIndex("by_addon_id", (q) => q.eq("addonId", addon.addonId))
        .first();
      if (!existing) {
        await ctx.db.insert("enterprise_addons", {
          ...addon,
          createdAt: Date.now(),
        });
        inserted++;
      }
    }
    return { success: true, inserted };
  },
});

export const subscribeToAddon = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    addonId: v.string(),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const addon = await ctx.db
      .query("enterprise_addons")
      .withIndex("by_addon_id", (q) => q.eq("addonId", args.addonId))
      .first();
    if (!addon) throw new Error("Addon not found");

    const existing = await ctx.db
      .query("enterprise_addon_subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("addonId"), args.addonId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (existing) throw new Error("Already subscribed to this addon");

    const now = Date.now();
    const endDate = addon.billingCycle === "monthly"
      ? now + (30 * 24 * 60 * 60 * 1000)
      : addon.billingCycle === "annual"
      ? now + (365 * 24 * 60 * 60 * 1000)
      : undefined;

    const subscriptionId = await ctx.db.insert("enterprise_addon_subscriptions", {
      orgId: args.orgId,
      addonId: addon.addonId,
      addonName: addon.name,
      status: "active",
      startDate: now,
      endDate,
      lastBillingAt: now,
      nextBillingAt: addon.billingCycle !== "one_time" ? endDate : undefined,
      amountPaid: addon.priceNgn,
      createdAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "ADDON_SUBSCRIBED",
      actor: identity.email,
      action: "subscribe_addon",
      target: subscriptionId,
      details: { addonId: addon.addonId, addonName: addon.name, amount: addon.priceNgn },
      createdAt: now,
    });

    return { success: true, subscriptionId, amount: addon.priceNgn };
  },
});

export const cancelAddonSubscription = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    addonId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const subscription = await ctx.db
      .query("enterprise_addon_subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("addonId"), args.addonId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!subscription) throw new Error("No active subscription found");

    await ctx.db.patch(subscription._id, { status: "cancelled" });
    return { success: true };
  },
});

// ─── USAGE TRACKING & OVERAGE BILLING ───

export const getUsageTracking = query({
  args: { userId: v.string(), period: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const period = args.period || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const tracking = await ctx.db
      .query("user_usage_tracking")
      .withIndex("by_user_period", (q) => q.eq("userId", args.userId).eq("period", period))
      .first();
    return tracking || {
      userId: args.userId,
      period,
      agentMessagesUsed: 0,
      documentUploadsUsed: 0,
      voiceMinutesUsed: 0,
      flyerGenerationsUsed: 0,
      socialPostsUsed: 0,
      researchTasksUsed: 0,
      overageCharges: 0,
    };
  },
});

export const recordUsage = internalMutation({
  args: {
    userId: v.string(),
    usageType: v.string(), // "agent_messages", "document_uploads", etc.
    quantity: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const period = new Date().toISOString().slice(0, 7);
    const now = Date.now();

    const existing = await ctx.db
      .query("user_usage_tracking")
      .withIndex("by_user_period", (q) => q.eq("userId", args.userId).eq("period", period))
      .first();

    if (existing) {
      const field = `${args.usageType}Used` as keyof typeof existing;
      const currentValue = (existing as any)[field] || 0;
      await ctx.db.patch(existing._id, {
        [field]: currentValue + args.quantity,
        updatedAt: now,
      });
    } else {
      const usageData: any = {
        userId: args.userId,
        period,
        agentMessagesUsed: 0,
        documentUploadsUsed: 0,
        voiceMinutesUsed: 0,
        flyerGenerationsUsed: 0,
        socialPostsUsed: 0,
        researchTasksUsed: 0,
        overageCharges: 0,
        createdAt: now,
        updatedAt: now,
      };
      const field = `${args.usageType}Used`;
      usageData[field] = args.quantity;
      await ctx.db.insert("user_usage_tracking", usageData);
    }

    return { success: true };
  },
});

export const calculateOverage = query({
  args: { userId: v.string(), period: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const period = args.period || new Date().toISOString().slice(0, 7);

    const user = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "user"))
      .first();
    if (!user) return { overages: [], totalOverage: 0 };

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!sub) return { overages: [], totalOverage: 0 };

    const plan = await ctx.db
      .query("subscription_plans")
      .withIndex("by_plan_id", (q) => q.eq("planId", sub.plan))
      .first();
    if (!plan || plan.messageLimitMonthly === -1) return { overages: [], totalOverage: 0 };

    const usage = await ctx.db
      .query("user_usage_tracking")
      .withIndex("by_user_period", (q) => q.eq("userId", args.userId).eq("period", period))
      .first();
    if (!usage) return { overages: [], totalOverage: 0 };

    const overages: Array<{ type: string; used: number; limit: number; overage: number; charge: number }> = [];
    const overageRate = 2; // ₦2 per message over limit

    if (usage.agentMessagesUsed > plan.messageLimitMonthly) {
      const overage = usage.agentMessagesUsed - plan.messageLimitMonthly;
      overages.push({
        type: "agent_messages",
        used: usage.agentMessagesUsed,
        limit: plan.messageLimitMonthly,
        overage,
        charge: overage * overageRate,
      });
    }

    const totalOverage = overages.reduce((sum, o) => sum + o.charge, 0);
    return { overages, totalOverage };
  },
});

// ─── FREEMIUM CONVERSION TRACKING ───

export const trackConversionEvent = mutation({
  args: {
    userId: v.string(),
    eventType: v.union(
      v.literal("free_credit_granted"),
      v.literal("free_limit_reached"),
      v.literal("upgrade_prompt_shown"),
      v.literal("upgrade_prompt_clicked"),
      v.literal("conversion_completed"),
      v.literal("trial_started"),
      v.literal("trial_expired")
    ),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const eventId = await ctx.db.insert("freemium_conversion_events", {
      userId: args.userId,
      eventType: args.eventType,
      metadata: args.metadata,
      createdAt: now,
    });
    return { success: true, eventId };
  },
});

export const getConversionStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const events = await ctx.db.query("freemium_conversion_events").collect();
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter((e: any) => e.createdAt >= last30Days);

    const eventCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
    }

    const freeCreditsGranted = eventCounts["free_credit_granted"] || 0;
    const freeLimitReached = eventCounts["free_limit_reached"] || 0;
    const upgradePromptsShown = eventCounts["upgrade_prompt_shown"] || 0;
    const upgradePromptsClicked = eventCounts["upgrade_prompt_clicked"] || 0;
    const conversionsCompleted = eventCounts["conversion_completed"] || 0;

    const promptToClickRate = upgradePromptsShown > 0
      ? (upgradePromptsClicked / upgradePromptsShown) * 100
      : 0;
    const clickToConversionRate = upgradePromptsClicked > 0
      ? (conversionsCompleted / upgradePromptsClicked) * 100
      : 0;
    const overallConversionRate = freeLimitReached > 0
      ? (conversionsCompleted / freeLimitReached) * 100
      : 0;

    return {
      authError: false,
      totalEvents: events.length,
      recentEvents: recentEvents.length,
      eventCounts,
      metrics: {
        freeCreditsGranted,
        freeLimitReached,
        upgradePromptsShown,
        upgradePromptsClicked,
        conversionsCompleted,
        promptToClickRate: Math.round(promptToClickRate * 100) / 100,
        clickToConversionRate: Math.round(clickToConversionRate * 100) / 100,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      },
    };
  },
});

// ─── REVENUE ANALYTICS DASHBOARD ───

export const getRevenueDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    // Get today's snapshot
    const today = new Date().toISOString().slice(0, 10);
    const todaySnapshot = await ctx.db
      .query("revenue_daily_snapshots")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    // Get last 30 days
    const last30Days = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
      const snapshot = await ctx.db
        .query("revenue_daily_snapshots")
        .withIndex("by_date", (q) => q.eq("date", date))
        .first();
      if (snapshot) last30Days.push(snapshot);
    }

    // Calculate totals
    const totalRevenue30d = last30Days.reduce((sum: number, s: any) => sum + s.totalRevenueNgn, 0);
    const mrr = todaySnapshot?.mrr || 0;
    const arr = todaySnapshot?.arr || 0;
    const arpu = todaySnapshot?.arpu || 0;
    const ltv = todaySnapshot?.ltv || 0;
    const conversionRate = todaySnapshot?.conversionRate || 0;

    return {
      authError: false,
      today: todaySnapshot || {
        totalRevenueNgn: 0,
        subscriptionRevenue: 0,
        creditRevenue: 0,
        enterpriseRevenue: 0,
        marketplaceRevenue: 0,
        adRevenue: 0,
        addonRevenue: 0,
        overageRevenue: 0,
        newSubscriptions: 0,
        churnedSubscriptions: 0,
        activeUsers: 0,
        mrr: 0,
        arr: 0,
        arpu: 0,
        ltv: 0,
        conversionRate: 0,
      },
      last30Days: last30Days.reverse(),
      totalRevenue30d,
      mrr,
      arr,
      arpu,
      ltv,
      conversionRate,
    };
  },
});

export const recordDailySnapshot = internalMutation({
  args: {
    date: v.string(),
    totalRevenueNgn: v.number(),
    subscriptionRevenue: v.number(),
    creditRevenue: v.number(),
    enterpriseRevenue: v.number(),
    marketplaceRevenue: v.number(),
    adRevenue: v.number(),
    addonRevenue: v.number(),
    overageRevenue: v.number(),
    newSubscriptions: v.number(),
    churnedSubscriptions: v.number(),
    activeUsers: v.number(),
    mrr: v.number(),
    arr: v.number(),
    arpu: v.number(),
    ltv: v.number(),
    conversionRate: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("revenue_daily_snapshots")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("revenue_daily_snapshots", {
        ...args,
        createdAt: Date.now(),
      });
    }
    return { success: true };
  },
});

// ─── SUBSCRIPTION UPGRADE/DOWNGRADE ───

export const trackSubscriptionChange = mutation({
  args: {
    userId: v.string(),
    changeType: v.union(v.literal("upgrade"), v.literal("downgrade"), v.literal("renewal"), v.literal("cancellation")),
    fromPlan: v.string(),
    toPlan: v.string(),
    fromPriceNgn: v.number(),
    toPriceNgn: v.number(),
    proratedAmount: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const changeId = await ctx.db.insert("subscription_changes", {
      ...args,
      effectiveDate: now,
      createdAt: now,
    });
    return { success: true, changeId };
  },
});

export const getSubscriptionChangeStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const changes = await ctx.db.query("subscription_changes").collect();
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    const recentChanges = changes.filter((c: any) => c.createdAt >= last30Days);

    const upgrades = recentChanges.filter((c: any) => c.changeType === "upgrade");
    const downgrades = recentChanges.filter((c: any) => c.changeType === "downgrade");
    const cancellations = recentChanges.filter((c: any) => c.changeType === "cancellation");
    const renewals = recentChanges.filter((c: any) => c.changeType === "renewal");

    const upgradeRevenue = upgrades.reduce((sum: number, c: any) => sum + c.proratedAmount, 0);
    const downgradeLoss = downgrades.reduce((sum: number, c: any) => sum + c.proratedAmount, 0);

    return {
      authError: false,
      totalChanges: recentChanges.length,
      upgrades: upgrades.length,
      downgrades: downgrades.length,
      cancellations: cancellations.length,
      renewals: renewals.length,
      upgradeRevenue,
      downgradeLoss,
      netRevenueImpact: upgradeRevenue - downgradeLoss,
    };
  },
});

// ─── BULK OPERATIONS ───

export const bulkSeedAllRevenueGrowth = mutation({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    // Seed subscription plans
    await ctx.runMutation(internal.revenue_growth.seedSubscriptionPlansInternal, {});
    // Seed agent pricing tiers
    await ctx.runMutation(internal.revenue_growth.seedAgentPricingTiersInternal, {});
    // Seed enterprise addons
    await ctx.runMutation(internal.revenue_growth.seedEnterpriseAddonsInternal, {});
    // Enable credit expiry
    await ctx.runMutation(internal.revenue_growth.enableCreditExpiryInternal, {});

    return { success: true, message: "All revenue growth features seeded successfully" };
  },
});

export const seedSubscriptionPlansInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const plans = [
      { planId: "starter", name: "Starter Bundle", description: "Perfect for individuals getting started with AI agents", monthlyPriceNgn: 5000, annualPriceNgn: 48000, annualDiscountPercent: 20, creditsIncluded: 500, messageLimitMonthly: 100, features: ["3 Agents", "Standard Support", "Basic Analytics"], isActive: true },
      { planId: "pro", name: "Pro Suite NG+", description: "Full access to all 15 expert agents with priority support", monthlyPriceNgn: 15000, annualPriceNgn: 144000, annualDiscountPercent: 20, creditsIncluded: 2500, messageLimitMonthly: 500, features: ["All 15 Agents", "Priority Support", "NVIDIA NIM AI", "Guardian AI"], isActive: true },
      { planId: "enterprise", name: "Enterprise Elite", description: "Custom API access with dedicated success manager", monthlyPriceNgn: 50000, annualPriceNgn: 480000, annualDiscountPercent: 20, creditsIncluded: 20000, messageLimitMonthly: -1, features: ["Custom API", "Dedicated Manager", "White-label", "Unlimited"], isActive: true },
    ];
    for (const plan of plans) {
      const existing = await ctx.db.query("subscription_plans").withIndex("by_plan_id", (q) => q.eq("planId", plan.planId)).first();
      if (!existing) {
        await ctx.db.insert("subscription_plans", { ...plan, createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
  },
});

export const seedAgentPricingTiersInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const agents = [
      { agentId: "A1", agentName: "Academic Writer", standard: 500, premium: 2000, enterprise: 5000 },
      { agentId: "A2", agentName: "Business Advisor", standard: 500, premium: 2500, enterprise: 6000 },
      { agentId: "A3", agentName: "Content Strategist", standard: 500, premium: 1500, enterprise: 4000 },
      { agentId: "A8", agentName: "MediaStudio Pro", standard: 500, premium: 3000, enterprise: 8000 },
    ];
    for (const agent of agents) {
      for (const tier of ["standard", "premium", "enterprise"] as const) {
        const existing = await ctx.db.query("agent_pricing_tiers")
          .withIndex("by_agent", (q) => q.eq("agentId", agent.agentId))
          .filter((q) => q.eq(q.field("tier"), tier))
          .first();
        if (!existing) {
          await ctx.db.insert("agent_pricing_tiers", {
            agentId: agent.agentId, agentName: agent.agentName, tier,
            monthlyPriceNgn: agent[tier], creditsPerMessage: tier === "standard" ? 1 : tier === "premium" ? 2 : 5,
            features: tier === "standard" ? ["Basic AI"] : tier === "premium" ? ["Enhanced AI", "Analytics"] : ["Enterprise AI", "API Access"],
            isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

export const seedEnterpriseAddonsInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const addons = [
      { addonId: "api_access", name: "Developer API Access", category: "api_access" as const, priceNgn: 200000, billingCycle: "monthly" as const, features: ["REST API", "Webhooks", "100K calls/month"] },
      { addonId: "custom_training", name: "Custom Agent Training", category: "custom_training" as const, priceNgn: 150000, billingCycle: "one_time" as const, features: ["Custom knowledge base", "Business training"] },
      { addonId: "white_label", name: "White-Label License", category: "white_label" as const, priceNgn: 500000, billingCycle: "monthly" as const, features: ["Custom domain", "Custom branding"] },
      { addonId: "dedicated_support", name: "Dedicated Success Manager", category: "dedicated_support" as const, priceNgn: 100000, billingCycle: "monthly" as const, features: ["Personal manager", "Weekly calls"] },
    ];
    for (const addon of addons) {
      const existing = await ctx.db.query("enterprise_addons").withIndex("by_addon_id", (q) => q.eq("addonId", addon.addonId)).first();
      if (!existing) {
        await ctx.db.insert("enterprise_addons", { ...addon, description: addon.name, isActive: true, createdAt: Date.now() });
      }
    }
  },
});

export const enableCreditExpiryInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("credit_expiry_config").withIndex("by_singleton", (q) => q.eq("enabled", true)).first();
    if (!existing) {
      await ctx.db.insert("credit_expiry_config", {
        enabled: true, expiryDays: 30, warningDays: 7,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
  },
});
