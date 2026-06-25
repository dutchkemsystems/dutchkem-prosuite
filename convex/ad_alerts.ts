import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// EMAIL/PUSH BUDGET ALERTS
// ═══════════════════════════════════════════════════════════════════

export const sendBudgetAlertEmail = internalAction({
  args: {
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    alertType: v.string(),
    message: v.string(),
    currentSpend: v.number(),
    budgetLimit: v.number(),
    percentUsed: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get campaign details
    const campaign = await ctx.runQuery(internal.ad_alerts.getCampaignForAlert, { campaignId: args.campaignId });
    if (!campaign) return { error: "Campaign not found" };

    // Get admin email
    const adminEmail = process.env.ALERT_EMAIL || "admin@dutchkem.com";
    
    // Format the email content
    const subject = `⚠️ Budget Alert: ${args.alertType.replace(/_/g, " ").toUpperCase()} - ${campaign.name || "Campaign"}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
          .alert-box { background: ${args.percentUsed >= 100 ? "#fee2e2" : "#fef3c7"}; border-left: 4px solid ${args.percentUsed >= 100 ? "#dc2626" : "#f59e0b"}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .metric:last-child { border-bottom: none; }
          .metric-label { color: #6b7280; }
          .metric-value { font-weight: 600; }
          .progress-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 10px 0; }
          .progress-fill { height: 100%; background: ${args.percentUsed >= 100 ? "#dc2626" : args.percentUsed >= 80 ? "#f59e0b" : "#10b981"}; width: ${Math.min(args.percentUsed, 100)}%; transition: width 0.3s; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 Budget Alert</h1>
          <p>${campaign.name || "Campaign"}</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>${args.alertType.replace(/_/g, " ").toUpperCase()}</strong>
            <p>${args.message}</p>
          </div>
          
          <div class="metric">
            <span class="metric-label">Platform</span>
            <span class="metric-value">${args.platform}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Current Spend</span>
            <span class="metric-value">₦${args.currentSpend.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Budget Limit</span>
            <span class="metric-value">₦${args.budgetLimit.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Usage</span>
            <span class="metric-value">${args.percentUsed.toFixed(1)}%</span>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://dutchkem-prosuite-app.vercel.app/admin/dashboard" class="btn">View Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated alert from DutchKem Prosuite Ad Engine</p>
          <p>To manage alert preferences, visit your dashboard settings</p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || "alerts@dutchkem.com",
            to: adminEmail,
            subject,
            html: htmlContent,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          
          // Log the email send
          await ctx.runMutation(internal.ad_alerts.logAlertEmail, {
            campaignId: args.campaignId,
            platform: args.platform,
            alertType: args.alertType,
            email: adminEmail,
            subject,
            resendId: result.id,
            sentAt: Date.now(),
          });

          return { success: true, emailId: result.id };
        } else {
          const error = await response.text();
          console.error("Failed to send email:", error);
          return { success: false, error };
        }
      } catch (error: any) {
        console.error("Email send error:", error);
        return { success: false, error: error.message };
      }
    }

    // Fallback: Log without sending
    await ctx.runMutation(internal.ad_alerts.logAlertEmail, {
      campaignId: args.campaignId,
      platform: args.platform,
      alertType: args.alertType,
      email: adminEmail,
      subject,
      resendId: null,
      sentAt: Date.now(),
    });

    return { success: true, note: "Email logged (Resend API key not configured)" };
  },
});

export const getCampaignForAlert = internalQuery({
  args: { campaignId: v.id("ad_campaigns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("ad_campaigns", args.campaignId);
  },
});

export const logAlertEmail = internalMutation({
  args: {
    campaignId: v.id("ad_campaigns"),
    platform: v.string(),
    alertType: v.string(),
    email: v.string(),
    subject: v.string(),
    resendId: v.optional(v.string()),
    sentAt: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("ad_alert_emails", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS (In-App)
// ═══════════════════════════════════════════════════════════════════

export const createPushNotification = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("budget_alert"), v.literal("campaign_update"), v.literal("system")),
    data: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      data: args.data,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const getUnreadNotifications = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), false))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ALERT PREFERENCES
// ═══════════════════════════════════════════════════════════════════

export const updateAlertPreferences = mutation({
  args: {
    adminToken: v.string(),
    emailEnabled: v.boolean(),
    pushEnabled: v.boolean(),
    thresholdPercent: v.number(),
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const existing = await ctx.db.query("ad_alert_preferences")
      .withIndex("by_user", (q) => q.eq("userId", identity._id))
      .first();

    const prefs = {
      emailEnabled: args.emailEnabled,
      pushEnabled: args.pushEnabled,
      thresholdPercent: args.thresholdPercent,
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, prefs);
    } else {
      await ctx.db.insert("ad_alert_preferences", {
        userId: identity._id,
        ...prefs,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getAlertPreferences = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    return await ctx.db.query("ad_alert_preferences")
      .withIndex("by_user", (q) => q.eq("userId", identity._id))
      .first();
  },
});

// ═══════════════════════════════════════════════════════════════════
// ALERT HISTORY
// ═══════════════════════════════════════════════════════════════════

export const getAlertHistory = query({
  args: { adminToken: v.string(), campaignId: v.optional(v.id("ad_campaigns")), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    let q = ctx.db.query("ad_alert_emails").order("desc");
    if (args.campaignId) {
      q = q.withIndex("by_campaign", (iq) => iq.eq("campaignId", args.campaignId));
    }

    return await q.take(args.limit || 50);
  },
});
