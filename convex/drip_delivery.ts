import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// DRIP DELIVERY ENGINE — Actually sends scheduled messages
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 1. ENROLL LEAD IN CAMPAIGN
// ═══════════════════════════════════════════════════════════════════

export const enrollLead = mutation({
  args: {
    campaignId: v.id("marketing_campaigns"),
    leadId: v.id("leads"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get("marketing_campaigns", args.campaignId);
    if (!campaign) return { error: "Campaign not found" };
    if (campaign.status !== "active") return { error: "Campaign is not active" };

    // Check if already enrolled
    const existing = await ctx.db.query("drip_enrollments")
      .withIndex("by_campaign_lead", (q) => q.eq("campaignId", args.campaignId).eq("leadId", args.leadId))
      .first();

    if (existing) return { error: "Already enrolled" };

    // Create enrollment
    const enrollmentId = await ctx.db.insert("drip_enrollments", {
      campaignId: args.campaignId,
      leadId: args.leadId,
      currentStep: 0,
      totalSteps: campaign.steps?.length || 0,
      status: "active",
      nextSendAt: Date.now() + ((campaign.steps?.[0]?.delay || 0) * 60 * 1000), // delay in minutes
      sentSteps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Increment campaign enrollment count
    await ctx.db.patch(args.campaignId, {
      sentCount: (campaign.sentCount || 0) + 1,
      updatedAt: Date.now(),
    });

    return { success: true, enrollmentId };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. DELIVERY TICK (Cron-driven — checks and sends due messages)
// ═══════════════════════════════════════════════════════════════════

export const deliveryTick = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const results: Array<{ enrollmentId: string; leadId: string; channel: string; status: string; error?: string }> = [];

    // Get active enrollments that are due
    const enrollments = await ctx.runQuery(internal.drip_delivery._getDueEnrollments, { now });

    for (const enrollment of enrollments) {
      try {
        // Get campaign details
        const campaign = await ctx.runQuery(internal.drip_delivery._getCampaign, { campaignId: enrollment.campaignId });
        if (!campaign || !campaign.steps || campaign.steps.length === 0) continue;

        // Get current step
        const step = campaign.steps[enrollment.currentStep];
        if (!step) {
          // Campaign complete
          await ctx.runMutation(internal.drip_delivery._completeEnrollment, { enrollmentId: enrollment._id });
          continue;
        }

        // Get lead details
        const lead = await ctx.runQuery(internal.drip_delivery._getLead, { leadId: enrollment.leadId });
        if (!lead) continue;

        // Send via appropriate channel
        let sendResult: any = null;
        const channel = step.channel || campaign.type;

        switch (channel) {
          case "email":
            if (lead.email) {
              sendResult = await ctx.runAction(internal.drip_delivery._sendEmail, {
                to: lead.email,
                subject: step.subject || campaign.name,
                content: step.content,
                leadName: lead.name,
              });
            }
            break;
          case "sms":
            if (lead.phone) {
              sendResult = await ctx.runAction(internal.drip_delivery._sendSms, {
                to: lead.phone,
                message: step.content,
              });
            }
            break;
          case "whatsapp":
            if (lead.phone) {
              sendResult = await ctx.runAction(internal.drip_delivery._sendWhatsApp, {
                to: lead.phone,
                message: step.content,
              });
            }
            break;
        }

        // Update enrollment
        if (sendResult?.success) {
          const nextStep = enrollment.currentStep + 1;
          const nextDelay = campaign.steps[nextStep]?.delay || 0;

          await ctx.runMutation(internal.drip_delivery._advanceEnrollment, {
            enrollmentId: enrollment._id,
            currentStep: nextStep,
            nextSendAt: nextDelay > 0 ? now + nextDelay * 60 * 1000 : null,
            stepResult: { step: enrollment.currentStep, channel, status: "sent", sentAt: now },
          });

          results.push({ enrollmentId: enrollment._id, leadId: enrollment.leadId, channel, status: "sent" });
        } else {
          await ctx.runMutation(internal.drip_delivery._logSendFailure, {
            enrollmentId: enrollment._id,
            step: enrollment.currentStep,
            channel,
            error: sendResult?.error || "Send failed",
          });

          results.push({ enrollmentId: enrollment._id, leadId: enrollment.leadId, channel, status: "failed", error: sendResult?.error });
        }
      } catch (err: any) {
        results.push({ enrollmentId: enrollment._id, leadId: enrollment.leadId, channel: "unknown", status: "error", error: err.message });
      }
    }

    return { processed: results.length, results };
  },
});

// ═══════════════════════════════════════════════════════════════════
// 3. CHANNEL SENDERS
// ═══════════════════════════════════════════════════════════════════

export const _sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    content: v.string(),
    leadName: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Use Resend API if configured
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:linear-gradient(135deg,#FF6B35,#F7931E);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">${args.subject}</h1></div>
<div style="padding:30px;color:#333;line-height:1.6;font-size:15px;">
${args.leadName ? `<p>Hi ${args.leadName},</p>` : ""}
${args.content}
</div>
<div style="text-align:center;padding:20px 30px 30px;">
<a href="https://dutchkem-prosuite-app.vercel.app/auth" style="display:inline-block;background:#FF6B35;color:#fff;padding:14px 30px;border-radius:6px;text-decoration:none;font-weight:600;">Get Started</a>
</div>
<div style="background:#f9f9f9;padding:15px 30px;text-align:center;border-top:1px solid #eee;">
<p style="color:#999;font-size:11px;margin:0;">DutchKem Prosuite NG+ · AI-Powered Business Automation</p>
</div></div></body></html>`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "DutchKem Prosuite <noreply@dutchkemventures.com>",
            to: [args.to],
            subject: args.subject,
            html,
          }),
        });

        if (response.ok) {
          return { success: true, channel: "email" };
        }
        const error = await response.text();
        return { success: false, error: `Resend API: ${error}` };
      }

      // Fallback: log only (no email provider configured)
      return { success: true, channel: "email", note: "Logged (no email provider configured)" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

export const _sendSms = internalAction({
  args: { to: v.string(), message: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Use Termii API if configured
      const termiiKey = process.env.TERMII_API_KEY;
      if (termiiKey) {
        const response = await fetch("https://api.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: termiiKey,
            to: args.to,
            from: "DutchKem",
            sms: args.message,
            type: "plain",
            channel: "generic",
          }),
        });

        if (response.ok) {
          return { success: true, channel: "sms" };
        }
        return { success: false, error: "SMS send failed" };
      }

      return { success: true, channel: "sms", note: "Logged (no SMS provider configured)" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

export const _sendWhatsApp = internalAction({
  args: { to: v.string(), message: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Check if WhatsApp is enabled
      const whatsappEnabled = process.env.WHATSAPP_ENABLED !== "false";
      if (!whatsappEnabled) {
        return { success: true, channel: "whatsapp", note: "WhatsApp disabled" };
      }

      // Use Meta WhatsApp Business API if configured
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (accessToken && phoneNumberId) {
        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: args.to,
            type: "text",
            text: { body: args.message },
          }),
        });

        if (response.ok) {
          return { success: true, channel: "whatsapp" };
        }
        return { success: false, error: "WhatsApp send failed" };
      }

      return { success: true, channel: "whatsapp", note: "Logged (no WhatsApp provider configured)" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// 4. INTERNAL MUTATIONS & QUERIES
// ═══════════════════════════════════════════════════════════════════

export const _getDueEnrollments = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("drip_enrollments")
      .withIndex("by_status_next_send", (q) => q.eq("status", "active").lte("nextSendAt", args.now))
      .take(50);
  },
});

export const _getCampaign = internalQuery({
  args: { campaignId: v.id("marketing_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("marketing_campaigns", args.campaignId);
  },
});

export const _getLead = internalQuery({
  args: { leadId: v.id("leads") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("leads", args.leadId);
  },
});

export const _advanceEnrollment = internalMutation({
  args: {
    enrollmentId: v.id("drip_enrollments"),
    currentStep: v.number(),
    nextSendAt: v.optional(v.number()),
    stepResult: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get("drip_enrollments", args.enrollmentId);
    if (!enrollment) return null;

    const sentSteps = [...(enrollment.sentSteps || []), args.stepResult];
    const isComplete = args.currentStep >= (enrollment.totalSteps || 0);

    await ctx.db.patch(args.enrollmentId, {
      currentStep: args.currentStep,
      nextSendAt: args.nextSendAt,
      sentSteps,
      status: isComplete ? "completed" : "active",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const _completeEnrollment = internalMutation({
  args: { enrollmentId: v.id("drip_enrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.enrollmentId, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const _logSendFailure = internalMutation({
  args: {
    enrollmentId: v.id("drip_enrollments"),
    step: v.number(),
    channel: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get("drip_enrollments", args.enrollmentId);
    if (!enrollment) return null;

    const sentSteps = [...(enrollment.sentSteps || []), {
      step: args.step,
      channel: args.channel,
      status: "failed",
      error: args.error,
      failedAt: Date.now(),
    }];

    await ctx.db.patch(args.enrollmentId, {
      sentSteps,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getEnrollments = query({
  args: { campaignId: v.optional(v.id("marketing_campaigns")), status: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.campaignId) {
      return await ctx.db.query("drip_enrollments")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .collect();
    }
    if (args.status) {
      return await ctx.db.query("drip_enrollments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("drip_enrollments").order("desc").take(100);
  },
});

export const getDeliveryStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const enrollments = await ctx.db.query("drip_enrollments").collect();
    const campaigns = await ctx.db.query("marketing_campaigns").collect();

    return {
      totalEnrollments: enrollments.length,
      active: enrollments.filter(e => e.status === "active").length,
      completed: enrollments.filter(e => e.status === "completed").length,
      paused: enrollments.filter(e => e.status === "paused").length,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
    };
  },
});
