import { v } from "convex/values";
import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { sha256Hex } from "./aws_sigv4";

const WEBHOOK_SECRETS: Record<string, string> = {
  meta: process.env.META_WEBHOOK_SECRET || "",
  linkedin: process.env.LINKEDIN_WEBHOOK_SECRET || "",
  google: process.env.GOOGLE_WEBHOOK_SECRET || "",
};

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK REGISTRATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export const registerWebhook = async (ctx: any, args: {
  platform: string;
  campaignId: string;
  callbackUrl: string;
  events: string[];
}) => {
  const existing = await ctx.db.query("ad_webhook_configs")
    .withIndex("by_platform_campaign", (q: any) => 
      q.eq("platform", args.platform).eq("campaignId", args.campaignId)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      callbackUrl: args.callbackUrl,
      events: args.events,
      updatedAt: Date.now(),
    });
    return { success: true, updated: true };
  }

  const id = await ctx.db.insert("ad_webhook_configs", {
    platform: args.platform,
    campaignId: args.campaignId,
    callbackUrl: args.callbackUrl,
    events: args.events,
    secret: WEBHOOK_SECRETS[args.platform] || generateSecret(),
    isActive: true,
    lastReceivedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { success: true, id };
};

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK RECEIVERS
// ═══════════════════════════════════════════════════════════════════

export const handleMetaWebhook = httpAction(async (ctx, req) => {
  try {
    const body = await req.json();
    
    // Verify webhook signature
    const signature = req.headers.get("x-hub-signature-256");
    if (signature && WEBHOOK_SECRETS.meta) {
      const isValid = await verifyMetaSignature(body, signature, WEBHOOK_SECRETS.meta);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
      }
    }

    // Process webhook events
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        await processWebhookEvent(ctx, {
          platform: "meta",
          eventType: change.field,
          data: change.value,
          resourceId: entry.id,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Meta webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

export const handleLinkedInWebhook = httpAction(async (ctx, req) => {
  try {
    const body = await req.json();
    
    // Process LinkedIn marketing API webhook
    await processWebhookEvent(ctx, {
      platform: "linkedin",
      eventType: body.eventType || "unknown",
      data: body,
      resourceId: body.resourceId,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("LinkedIn webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

export const handleGoogleWebhook = httpAction(async (ctx, req) => {
  try {
    const body = await req.json();
    
    // Process Google Ads webhook
    await processWebhookEvent(ctx, {
      platform: "google",
      eventType: body.eventType || "unknown",
      data: body,
      resourceId: body.resourceName,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Google webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

export const handleGenericWebhook = httpAction(async (ctx, req) => {
  try {
    const platform = new URL(req.url).searchParams.get("platform") || "unknown";
    const body = await req.json();
    
    await processWebhookEvent(ctx, {
      platform,
      eventType: body.eventType || body.type || "unknown",
      data: body,
      resourceId: body.resourceId || body.id,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Generic webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK EVENT PROCESSING
// ═══════════════════════════════════════════════════════════════════

async function processWebhookEvent(ctx: any, event: {
  platform: string;
  eventType: string;
  data: any;
  resourceId?: string;
}) {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);

  // Store the webhook event
  await ctx.runMutation(internal.ad_webhooks.storeWebhookEvent, {
    platform: event.platform,
    eventType: event.eventType,
    data: event.data,
    resourceId: event.resourceId,
    processedAt: now,
  });

  // Extract metrics from webhook data
  const metrics = extractMetrics(event.platform, event.eventType, event.data);
  
  if (metrics.adId) {
    // Update ad metrics
    await ctx.runMutation(internal.ad_webhooks.updateAdMetrics, {
      adId: metrics.adId,
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      conversions: metrics.conversions || 0,
      spend: metrics.spend || 0,
    });

    // Update analytics
    await ctx.runMutation(internal.ad_webhooks.updateAnalytics, {
      adId: metrics.adId,
      campaignId: metrics.campaignId,
      platform: event.platform,
      date,
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      conversions: metrics.conversions || 0,
      spend: metrics.spend || 0,
    });
  }
}

function extractMetrics(platform: string, eventType: string, data: any): {
  adId?: string;
  campaignId?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
} {
  // Platform-specific metric extraction
  switch (platform) {
    case "meta":
      return {
        adId: data.ad_id || data.adset_id,
        campaignId: data.campaign_id,
        impressions: data.impressions || 0,
        clicks: data.clicks || data.inline_link_clicks || 0,
        conversions: data.conversions || data.purchase || 0,
        spend: data.spend || 0,
      };
    case "linkedin":
      return {
        adId: data.adId,
        campaignId: data.campaignId,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0,
        spend: data.costInLocalCurrency || 0,
      };
    case "google":
      return {
        adId: data.adId || data.adGroupId,
        campaignId: data.campaignId,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0,
        spend: data.costMicros ? data.costMicros / 1000000 : 0,
      };
    default:
      return {
        adId: data.adId || data.ad_id,
        campaignId: data.campaignId || data.campaign_id,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        conversions: data.conversions || 0,
        spend: data.spend || 0,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const storeWebhookEvent = async (ctx: any, args: {
  platform: string;
  eventType: string;
  data: any;
  resourceId?: string;
  processedAt: number;
}) => {
  return await ctx.db.insert("ad_webhook_events", {
    ...args,
    createdAt: Date.now(),
  });
};

export const updateAdMetrics = async (ctx: any, args: {
  adId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}) => {
  const ad = await ctx.db.get(args.adId);
  if (!ad) return;

  await ctx.db.patch(args.adId, {
    impressions: (ad.impressions || 0) + args.impressions,
    clicks: (ad.clicks || 0) + args.clicks,
    engagements: (ad.engagements || 0) + args.clicks + args.conversions,
  });
};

export const updateAnalytics = async (ctx: any, args: {
  adId: string;
  campaignId: string;
  platform: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}) => {
  const existing = await ctx.db.query("ad_analytics")
    .withIndex("by_ad_date", (q: any) => q.eq("adId", args.adId).eq("date", args.date))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      impressions: existing.impressions + args.impressions,
      clicks: existing.clicks + args.clicks,
      conversions: existing.conversions + args.conversions,
      spend: existing.spend + args.spend,
    });
  } else {
    await ctx.db.insert("ad_analytics", {
      adId: args.adId,
      campaignId: args.campaignId,
      platform: args.platform,
      date: args.date,
      impressions: args.impressions,
      clicks: args.clicks,
      engagements: args.clicks,
      conversions: args.conversions,
      spend: args.spend,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════════

async function verifyMetaSignature(body: any, signature: string, secret: string): Promise<boolean> {
  try {
    const expectedSignature = "sha256=" + await sha256Hex(JSON.stringify(body), secret);
    return signature === expectedSignature;
  } catch {
    return false;
  }
}
