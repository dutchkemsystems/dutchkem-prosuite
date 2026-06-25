import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// BATCH AD SCHEDULING
// ═══════════════════════════════════════════════════════════════════

export const batchScheduleAds = action({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    ads: v.array(v.object({
      content: v.string(),
      platform: v.string(),
      imageUrl: v.optional(v.string()),
      scheduledFor: v.number(),
    })),
    useOptimalTimes: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    const results: Array<{ success: boolean; adId?: string; scheduledFor?: number; error?: string }> = [];

    for (const ad of args.ads) {
      let scheduledFor = ad.scheduledFor;

      // If useOptimalTimes is enabled, override with optimal time
      if (args.useOptimalTimes) {
        const optimalTimes = await ctx.runQuery(internal.ad_batch.getOptimalTimeForPlatform, {
          platform: ad.platform,
        });
        
        if (optimalTimes && optimalTimes.length > 0) {
          // Find the next optimal time slot
          const nextOptimal = findNextOptimalTime(optimalTimes, ad.scheduledFor);
          scheduledFor = nextOptimal;
        }
      }

      // Create the ad
      const adResult = await ctx.runMutation(internal.ad_batch.createScheduledAd, {
        campaignId: args.campaignId,
        content: ad.content,
        platform: ad.platform,
        imageUrl: ad.imageUrl,
        scheduledFor,
        createdBy: session._id,
      });

      if (adResult.success) {
        results.push({
          success: true,
          adId: adResult.adId,
          scheduledFor,
        });
      } else {
        results.push({
          success: false,
          error: adResult.error,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Log the batch operation
    await ctx.runMutation(internal.ad_batch.logBatchOperation, {
      campaignId: args.campaignId,
      totalAds: args.ads.length,
      successCount,
      failCount,
      results,
      operatedBy: session._id,
    });

    return {
      success: true,
      total: args.ads.length,
      successCount,
      failCount,
      results,
    };
  },
});

export const getOptimalTimeForPlatform = internalQuery({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rec = await ctx.db.query("ad_scheduling_recommendations")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
    
    return rec?.recommendations || [];
  },
});

function findNextOptimalTime(recommendations: Array<{ hour: number; day: number }>, afterTimestamp: number): number {
  const after = new Date(afterTimestamp);
  const afterDay = after.getDay();
  const afterHour = after.getHours();

  // Find the next optimal time slot
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const targetDay = (afterDay + daysAhead) % 7;
    
    for (const rec of recommendations) {
      if (rec.day === targetDay) {
        if (daysAhead === 0 && rec.hour <= afterHour) continue;
        
        const target = new Date(after);
        target.setDate(target.getDate() + daysAhead);
        target.setHours(rec.hour, 0, 0, 0);
        
        if (target > after) {
          return target.getTime();
        }
      }
    }
  }

  // Fallback: schedule for tomorrow at 9am
  const fallback = new Date(after);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback.getTime();
}

export const createScheduledAd = internalMutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    content: v.string(),
    platform: v.string(),
    imageUrl: v.optional(v.string()),
    scheduledFor: v.number(),
    createdBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const adId = await ctx.db.insert("ad_ads", {
        campaignId: args.campaignId,
        title: `Batch ad - ${args.platform}`,
        content: args.content,
        imageUrl: args.imageUrl,
        platform: args.platform,
        status: "scheduled",
        scheduledFor: args.scheduledFor,
        impressions: 0,
        clicks: 0,
        engagements: 0,
        createdAt: Date.now(),
      });

      return { success: true, adId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

export const logBatchOperation = internalMutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    totalAds: v.number(),
    successCount: v.number(),
    failCount: v.number(),
    results: v.array(v.any()),
    operatedBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_batch_operations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// IMPORT/EXPORT
// ═══════════════════════════════════════════════════════════════════

export const importCampaignsFromCSV = action({
  args: {
    adminToken: v.string(),
    csvData: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { authError: true };

    const lines = args.csvData.split("\n").filter(line => line.trim());
    if (lines.length < 2) return { error: "CSV must have a header row and at least one data row" };

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const results: Array<{ success: boolean; campaignId?: string; error?: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      const campaignResult = await ctx.runMutation(internal.ad_batch.importCampaign, {
        name: row.name || row.campaign_name || `Imported Campaign ${i}`,
        description: row.description || row.campaign_description,
        platform: row.platform || "x",
        budget: row.budget ? parseFloat(row.budget) : undefined,
        dailyBudget: row.daily_budget ? parseFloat(row.daily_budget) : undefined,
        goals: row.goals || row.objective,
        targetAudience: row.target_audience || row.audience,
        createdBy: session._id,
      });

      results.push(campaignResult);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: true,
      total: results.length,
      successCount,
      failCount,
      results,
    };
  },
});

export const importCampaign = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    platform: v.string(),
    budget: v.optional(v.number()),
    dailyBudget: v.optional(v.number()),
    goals: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    createdBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const campaignId = await ctx.db.insert("ad_campaigns", {
        name: args.name,
        description: args.description,
        platform: args.platform,
        status: "draft",
        budget: args.budget,
        dailyBudget: args.dailyBudget,
        spent: 0,
        startDate: Date.now(),
        goals: args.goals,
        targetAudience: args.targetAudience,
        createdBy: args.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, campaignId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

export const exportCampaignsToCSV = query({
  args: { adminToken: v.string(), campaignIds: v.optional(v.array(v.id("ad_campaigns"))) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    let campaigns;
    if (args.campaignIds && args.campaignIds.length > 0) {
      campaigns = [];
      for (const id of args.campaignIds) {
        const campaign = await ctx.db.get(id);
        if (campaign) campaigns.push(campaign);
      }
    } else {
      campaigns = await ctx.db.query("ad_campaigns").collect();
    }

    // Get analytics for each campaign
    const campaignData = [];
    for (const campaign of campaigns) {
      const analytics = await ctx.db.query("ad_analytics")
        .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
        .collect();

      const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
      const totalClicks = analytics.reduce((sum, a) => sum + a.clicks, 0);
      const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
      const totalSpend = analytics.reduce((sum, a) => sum + a.spend, 0);

      campaignData.push({
        name: campaign.name,
        description: campaign.description || "",
        platform: campaign.platform,
        status: campaign.status,
        budget: campaign.budget || "",
        dailyBudget: campaign.dailyBudget || "",
        goals: campaign.goals || "",
        targetAudience: campaign.targetAudience || "",
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00",
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00",
      });
    }

    // Convert to CSV
    const headers = ["name", "description", "platform", "status", "budget", "dailyBudget", "goals", "targetAudience", "impressions", "clicks", "conversions", "spend", "ctr", "conversionRate"];
    const csvRows = [headers.join(",")];
    
    for (const row of campaignData) {
      const values = headers.map(h => {
        const val = row[h as keyof typeof row];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      });
      csvRows.push(values.join(","));
    }

    return {
      success: true,
      csv: csvRows.join("\n"),
      campaignCount: campaignData.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getBatchOperations = query({
  args: { adminToken: v.string(), campaignId: v.optional(v.id("ad_campaigns")), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_batch_operations").order("desc");
    if (args.campaignId) {
      q = q.withIndex("by_campaign", (iq) => iq.eq("campaignId", args.campaignId));
    }

    return await q.take(args.limit || 20);
  },
});
