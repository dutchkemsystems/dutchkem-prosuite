import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// EMAIL PROCESSOR
// Picks up pending emails from email_notifications table and sends them
// Configure RESEND_API_KEY or AWS_SES_* env vars to enable sending
// ═══════════════════════════════════════════════════════════════════

/**
 * Process pending email notifications
 * Call this via cron or manually to send queued emails
 */
export const processPendingEmails = action({
  args: {
    batchSize: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.object({
    processed: v.number(),
    sent: v.number(),
    failed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;

    // Get pending emails
    const pendingEmails = await ctx.runQuery(internal.email_processor.getPendingEmails, {
      limit: batchSize,
    });

    if (pendingEmails.length === 0) {
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const email of pendingEmails) {
      try {
        // Skip if no recipient
        if (!email.to || email.to.includes("@telegram.dutchkem")) {
          await ctx.runMutation(internal.email_processor.markEmailSkipped, {
            emailId: email._id,
            reason: "No valid recipient",
          });
          skipped++;
          continue;
        }

        // Try to send via available email service
        const result = await sendEmail(email.to, email.subject, email.body);

        if (result.success) {
          await ctx.runMutation(internal.email_processor.markEmailSent, {
            emailId: email._id,
          });
          sent++;
        } else {
          await ctx.runMutation(internal.email_processor.markEmailFailed, {
            emailId: email._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (err: any) {
        await ctx.runMutation(internal.email_processor.markEmailFailed, {
          emailId: email._id,
          error: err.message || "Processing error",
        });
        failed++;
      }
    }

    return {
      processed: pendingEmails.length,
      sent,
      failed,
      skipped,
    };
  },
});

/**
 * Get pending emails
 */
export const getPendingEmails = internalQuery({
  args: { limit: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("email_notifications")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("asc")
      .take(args.limit);
  },
});

/**
 * Mark email as sent
 */
export const markEmailSent = internalMutation({
  args: { emailId: v.id("email_notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "sent",
      sentAt: Date.now(),
    });
    return null;
  },
});

/**
 * Mark email as failed
 */
export const markEmailFailed = internalMutation({
  args: { emailId: v.id("email_notifications"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "failed",
      error: args.error,
      failedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Mark email as skipped
 */
export const markEmailSkipped = internalMutation({
  args: { emailId: v.id("email_notifications"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "skipped",
      error: args.reason,
    });
    return null;
  },
});

/**
 * Get email processing stats
 */
export const getEmailStats = internalQuery({
  args: {},
  returns: v.object({
    pending: v.number(),
    sent: v.number(),
    failed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("email_notifications").take(1000);
    return {
      pending: all.filter((e: any) => e.status === "pending").length,
      sent: all.filter((e: any) => e.status === "sent").length,
      failed: all.filter((e: any) => e.status === "failed").length,
      skipped: all.filter((e: any) => e.status === "skipped").length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// EMAIL SENDING - Configure your preferred service below
// ═══════════════════════════════════════════════════════════════════

async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  // Option 1: Resend (recommended - simple API)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Dutchkem Ventures <noreply@dutchkem.com>",
          to: [to],
          subject,
          text: body,
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const error = await response.text();
      return { success: false, error: `Resend API error: ${error}` };
    } catch (err: any) {
      return { success: false, error: `Resend request failed: ${err.message}` };
    }
  }

  // Option 2: AWS SES (via API)
  const sesAccessKey = process.env.AWS_SES_ACCESS_KEY;
  if (sesAccessKey) {
    // AWS SES requires SDK or signed requests
    // For now, log that SES is configured but not implemented
    return { success: false, error: "AWS SES integration not yet implemented - use Resend instead" };
  }

  // No email service configured
  return { success: false, error: "No email service configured (set RESEND_API_KEY)" };
}
