import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

const NIM_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function callNvidiaNim(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(NIM_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: "system", content: "You are an expert digital advertising strategist. Generate high-converting ad campaigns with specific, actionable content." }, { role: "user", content: prompt }],
      temperature: 0.7, max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`NIM API ${res.status}`);
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

export const generateAdCampaign = action({
  args: {
    adminToken: v.string(),
    industry: v.string(),
    budgetNgn: v.number(),
    targetAudience: v.string(),
    platforms: v.array(v.string()),
    campaignGoal: v.string(),
    brandVoice: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const nimKey = process.env.NVIDIA_NIM_API_KEY || "";
    if (!nimKey) return { error: "NVIDIA NIM API key not configured" };

    const platformList = args.platforms.join(", ");
    const prompt = `Generate a complete ad campaign for the ${args.industry} industry.

Budget: ₦${args.budgetNgn.toLocaleString()}/month
Target Audience: ${args.targetAudience}
Platforms: ${platformList}
Goal: ${args.campaignGoal}
Brand Voice: ${args.brandVoice || "Professional, trustworthy, innovative"}

Return a JSON object with this EXACT structure (no markdown, just JSON):
{
  "campaignName": "...",
  "campaignDescription": "...",
  "platformStrategies": {
    "<platform>": {
      "adCopy": { "headline": "...", "description": "...", "cta": "..." },
      "targeting": { "ageRange": "...", "interests": [...], "behaviors": [...] },
      "budgetPercent": <number>,
      "biddingStrategy": "...",
      "bestPostTimes": ["..."]
    }
  },
  "overallStrategy": { "keyMessage": "...", "uniqueSellingProp": "...", "toneOfVoice": "..." },
  "estimatedMetrics": { "expectedCTR": "...", "expectedCPC": "...", "expectedROAS": "..." }
}`;

    const content = await callNvidiaNim(prompt, nimKey);
    let campaign: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      campaign = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      campaign = { raw: content, campaignName: `${args.industry} Campaign`, platformStrategies: {} };
    }

    return { success: true, campaign };
  },
});

export const generateAdVariants = action({
  args: {
    adminToken: v.string(),
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    count: v.optional(v.number()),
    style: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const nimKey = process.env.NVIDIA_NIM_API_KEY || "";
    if (!nimKey) return { error: "NVIDIA NIM API key not configured" };

    const variantCount = args.count || 3;
    const prompt = `Generate ${variantCount} ad creative variants for a ${args.platform} campaign.

Style: ${args.style || "professional"}

Return a JSON array of objects (no markdown, just JSON):
[
  {
    "headline": "...",
    "body": "...",
    "cta": "...",
    "targetAudience": "...",
    "tone": "..."
  }
]`;

    const content = await callNvidiaNim(prompt, nimKey);
    let variants: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      variants = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      variants = [{ headline: "AI Generated Ad", body: content.substring(0, 200), cta: "Learn More", targetAudience: args.platform, tone: "professional" }];
    }

    return { success: true, variants };
  },
});

export const saveCampaignFromAI = mutation({
  args: {
    adminToken: v.string(),
    campaignData: v.any(),
    industry: v.string(),
    budgetNgn: v.number(),
    targetAudience: v.string(),
    platforms: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const now = Date.now();
    const campaignId = await ctx.db.insert("ad_campaigns", {
      name: args.campaignData.campaignName || `${args.industry} Campaign`,
      description: args.campaignData.campaignDescription || "",
      platform: args.platforms[0] || "linkedin",
      status: "draft",
      budget: args.budgetNgn,
      dailyBudget: Math.round(args.budgetNgn / 30),
      spent: 0,
      startDate: now,
      goals: args.campaignData.overallStrategy?.keyMessage || "Awareness",
      targetAudience: args.targetAudience,
      createdBy: identity.name || "admin",
      createdAt: now,
      updatedAt: now,
    });

    for (const platform of args.platforms) {
      const strategy = args.campaignData.platformStrategies?.[platform];
      if (strategy) {
        await ctx.db.insert("ad_budget_rules", {
          campaignId,
          platform,
          minDailyBudget: 1000,
          maxDailyBudget: Math.round(args.budgetNgn / 30),
          currentDailyBudget: Math.round((strategy.budgetPercent || (100 / args.platforms.length)) * args.budgetNgn / 30 / 100),
          priority: 1,
          autoOptimize: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, campaignId };
  },
});

export const listAICampaigns = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const campaigns = await ctx.db.query("ad_campaigns").order("desc").collect();
    return campaigns;
  },
});
