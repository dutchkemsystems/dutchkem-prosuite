import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// SMS MARKETING CAMPAIGNS
// Bulk SMS with scheduling, A/B testing, analytics
// ═══════════════════════════════════════════════════════════════════

export const createCampaign = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    messageVariantB: v.optional(v.string()),
    recipients: v.array(v.string()),
    scheduledTime: v.optional(v.string()),
    isAbTest: v.optional(v.boolean()),
    splitPercentage: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaignId = await ctx.db.insert("sms_campaigns", {
      name: args.name,
      message: args.message,
      messageVariantB: args.messageVariantB || "",
      recipients: args.recipients,
      recipientCount: args.recipients.length,
      scheduledTime: args.scheduledTime || "",
      status: args.scheduledTime ? "scheduled" : "draft",
      isAbTest: args.isAbTest || false,
      splitPercentage: args.splitPercentage || 50,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      clickCount: 0,
      createdAt: Date.now(),
    });
    return { success: true, campaignId };
  },
});

export const sendCampaign = action({
  args: {
    campaignId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaign = await ctx.runQuery(internal.sms_marketing.getCampaign, {
      campaignId: args.campaignId,
    });
    if (!campaign) return { success: false, error: "Campaign not found" };

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const phone of campaign.recipients) {
      try {
        const res = await ctx.runAction(internal.sms_notifications.sendSMS, {
          phoneNumber: phone,
          message: campaign.message,
          channel: "dnd",
          adminToken: args.adminToken,
        });
        if (res.success) results.sent++;
        else results.failed++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${phone}: ${e.message}`);
      }
    }

    await ctx.runMutation(internal.sms_marketing.updateCampaignStats, {
      campaignId: args.campaignId,
      sentCount: results.sent,
      failedCount: results.failed,
      status: "completed",
    });

    return { success: true, ...results };
  },
});

export const generateCampaignMessage = action({
  args: {
    product: v.string(),
    offer: v.string(),
    target: v.optional(v.string()),
    tone: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tone = args.tone || "professional";
    const target = args.target || "customers";

    const templates = {
      professional: `Hi! ${args.offer} on ${args.product}. Limited time offer. Visit https://dutchkem-prosuite-app.vercel.app/auth to learn more. Reply STOP to opt out.`,
      casual: `Hey there! 🎉 ${args.offer} on ${args.product} — you don't want to miss this! Check it out: https://dutchkem-prosuite-app.vercel.app/auth`,
      urgent: `⚡ LAST CHANCE: ${args.offer} on ${args.product} ends soon! Act now: https://dutchkem-prosuite-app.vercel.app/auth Reply STOP to opt out.`,
    };

    return {
      success: true,
      message: templates[tone as keyof typeof templates] || templates.professional,
      variantA: templates.professional,
      variantB: templates.casual,
      variantC: templates.urgent,
      target,
      tone,
    };
  },
});

export const getCampaigns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("sms_campaigns").order("desc").take(args.limit || 20);
  },
});

export const getCampaignStats = query({
  args: { campaignId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId as Id<"sms_campaigns">);
    if (!campaign) return null;
    return {
      name: campaign.name,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      clickCount: campaign.clickCount,
      recipientCount: campaign.recipientCount,
      deliveryRate: campaign.recipientCount > 0
        ? ((campaign.deliveredCount / campaign.recipientCount) * 100).toFixed(1) + "%"
        : "0%",
      status: campaign.status,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// EMAIL MARKETING
// Drip campaigns, newsletters, autoresponders
// ═══════════════════════════════════════════════════════════════════

export const createEmailCampaign = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    recipients: v.array(v.string()),
    scheduledTime: v.optional(v.string()),
    campaignType: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaignId = await ctx.db.insert("email_campaigns", {
      name: args.name,
      subject: args.subject,
      body: args.body,
      recipients: args.recipients,
      recipientCount: args.recipients.length,
      scheduledTime: args.scheduledTime || "",
      status: args.scheduledTime ? "scheduled" : "draft",
      campaignType: args.campaignType || "newsletter",
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      createdAt: Date.now(),
    });
    return { success: true, campaignId };
  },
});

export const generateEmailTemplate = action({
  args: {
    title: v.string(),
    content: v.string(),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ctaText = args.ctaText || "Learn More";
    const ctaUrl = args.ctaUrl || "https://dutchkem-prosuite-app.vercel.app/auth";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#FF6B35,#F7931E);padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${args.title}</h1>
  </div>
  <div style="padding:30px;color:#333;line-height:1.6;font-size:15px;">
    ${args.content}
  </div>
  <div style="text-align:center;padding:20px 30px 30px;">
    <a href="${ctaUrl}" style="display:inline-block;background:#FF6B35;color:#fff;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;">${ctaText}</a>
  </div>
  <div style="background:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#999;font-size:11px;margin:0;">DutchKem Prosuite · AI-Powered Business Automation</p>
    <p style="color:#999;font-size:11px;margin:5px 0 0;"><a href="https://dutchkem-prosuite-app.vercel.app/auth">Register</a></p>
  </div>
</div>
</body>
</html>`;

    return { success: true, html, subject: args.title, previewText: args.content.substring(0, 100) };
  },
});

export const createDripSequence = action({
  args: {
    name: v.string(),
    trigger: v.string(),
    emails: v.array(v.object({
      delayDays: v.number(),
      subject: v.string(),
      body: v.string(),
    })),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = new Date();
    const totalDelayDays = args.emails.reduce((max, e) => Math.max(max, e.delayDays), 0);

    const emails = args.emails.map((e, i) => {
      const sendDate = new Date(now.getTime() + e.delayDays * 86400000);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:linear-gradient(135deg,#FF6B35,#F7931E);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">${e.subject}</h1></div>
<div style="padding:30px;color:#333;line-height:1.6;font-size:15px;">${e.body}</div>
<div style="text-align:center;padding:20px 30px 30px;"><a href="https://dutchkem-prosuite-app.vercel.app/auth" style="display:inline-block;background:#FF6B35;color:#fff;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Get Started</a></div>
<div style="background:#f9f9f9;padding:15px 30px;text-align:center;border-top:1px solid #eee;">
<p style="color:#999;font-size:11px;margin:0;">DutchKem Prosuite · Step ${i + 1} of ${args.emails.length}</p></div></div></body></html>`;

      return {
        step: i + 1,
        delayDays: e.delayDays,
        subject: e.subject,
        bodyPreview: e.body.substring(0, 100),
        sendDate: sendDate.toLocaleDateString("en-NG"),
        html,
      };
    });

    return {
      success: true,
      sequenceName: args.name,
      trigger: args.trigger,
      emailCount: args.emails.length,
      totalDurationDays: totalDelayDays,
      emails,
      message: `Drip sequence "${args.name}" with ${args.emails.length} emails over ${totalDelayDays} days. First email: ${args.emails[0].subject}`,
    };
  },
});

export const getEmailCampaigns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("email_campaigns").order("desc").take(args.limit || 20);
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════

export const getCampaign = internalQuery({
  args: { campaignId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId as Id<"sms_campaigns">);
  },
});

export const updateCampaignStats = internalMutation({
  args: {
    campaignId: v.string(),
    sentCount: v.number(),
    failedCount: v.number(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId as Id<"sms_campaigns">, {
      sentCount: args.sentCount,
      failedCount: args.failedCount,
      deliveredCount: args.sentCount - args.failedCount,
      status: args.status,
      completedAt: Date.now(),
    });
  },
});
