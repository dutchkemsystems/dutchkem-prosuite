import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { signRequest } from "./aws_sigv4";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// UNIFIED EMAIL SERVICE — Resend (Primary) + AWS SES (Failover)
// Client never sees which provider was used
// ═══════════════════════════════════════════════════════════════════

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
}

// ─── Resend Send ─────────────────────────────────────────────────
async function sendViaResend(params: EmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text || params.subject,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Resend HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return { success: true, provider: "resend", messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Resend request failed" };
  }
}

// ─── AWS SES Send (SigV4 signed) ────────────────────────────────
async function sendViaSES(params: EmailParams): Promise<EmailResult> {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";

  if (!accessKey || !secretKey) {
    return { success: false, error: "AWS credentials not configured" };
  }

  const host = `email.${region}.amazonaws.com`;
  const path = "/";

  const payload = JSON.stringify({
    Source: fromEmail,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject },
      Body: {
        Html: { Data: params.html },
        Text: { Data: params.text || params.subject },
      },
    },
  });

  try {
    const headers = signRequest("POST", host, path, region, "ses", payload, accessKey, secretKey, "application/json");

    const response = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `SES HTTP ${response.status}: ${errText}` };
    }

    const result = await response.json();
    return { success: true, provider: "ses", messageId: result.MessageId };
  } catch (err: any) {
    return { success: false, error: err.message || "SES request failed" };
  }
}

// ─── Unified Send (Resend primary, SES failover) ─────────────────
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (_ctx, params): Promise<EmailResult> => {
    // Try Resend first
    const resendResult = await sendViaResend(params);
    if (resendResult.success) {
      console.log(`[EMAIL] Resend succeeded for ${params.to}: ${resendResult.messageId}`);
      return resendResult;
    }

    // Log Resend failure
    console.error(`[EMAIL] Resend failed for ${params.to}: ${resendResult.error}. Falling back to SES.`);

    // Automatic failover to AWS SES
    const sesResult = await sendViaSES(params);
    if (sesResult.success) {
      console.log(`[EMAIL] SES failover succeeded for ${params.to}: ${sesResult.messageId}`);
      return sesResult;
    }

    // Both failed
    console.error(`[EMAIL] Both providers failed for ${params.to}. Resend: ${resendResult.error}, SES: ${sesResult.error}`);
    return { success: false, error: "All email providers failed" };
  },
});

// ─── Send OTP Email ──────────────────────────────────────────────
export const sendOtpEmail = action({
  args: {
    email: v.string(),
    code: v.string(),
    purpose: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (_ctx, args): Promise<EmailResult> => {
    const purpose = args.purpose || "sign-in";
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fb; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .otp-code { font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; background: #f0f0f0; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: monospace; }
    .badge { background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 30px; display: inline-block; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #1E3A8A">Dutchkem Ventures</h1>
    <p>ProSuite NG+</p>
    <h2>Your ${purpose} Code</h2>
    <p>Enter this code to continue:</p>
    <div class="otp-code">${args.code}</div>
    <p>This code expires in <strong>15 minutes</strong>.</p>
    <div class="badge">Unified Email Service</div>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`;

    return sendViaResend({
      to: args.email,
      subject: `Your Dutchkem ${purpose} Code`,
      html,
      text: `Your ${purpose} code is: ${args.code}. Valid for 15 minutes.`,
    }).then(async (resendResult) => {
      if (resendResult.success) return resendResult;
      console.error(`[EMAIL] Resend failed for OTP: ${resendResult.error}. Falling back to SES.`);
      return sendViaSES({
        to: args.email,
        subject: `Your Dutchkem ${purpose} Code`,
        html,
        text: `Your ${purpose} code is: ${args.code}. Valid for 15 minutes.`,
      });
    });
  },
});

// ─── Send Payment Confirmation ───────────────────────────────────
export const sendPaymentConfirmation = action({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    amount: v.number(),
    invoiceNumber: v.string(),
    plan: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (_ctx, args): Promise<EmailResult> => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fb; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .amount { font-size: 32px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
    .badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 30px; display: inline-block; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #1E3A8A">Dutchkem Ventures</h1>
    <h2>Payment Confirmed</h2>
    <p>Dear ${args.customerName},</p>
    <p>Your payment has been successfully processed.</p>
    <div class="amount">₦${args.amount.toLocaleString()}</div>
    <p><strong>Invoice:</strong> ${args.invoiceNumber}</p>
    ${args.plan ? `<p><strong>Plan:</strong> ${args.plan}</p>` : ""}
    <p><strong>Date:</strong> ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
    <div class="badge">Payment Verified</div>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">Thank you for your business.</p>
  </div>
</body>
</html>`;

    // Try Resend first, failover to SES
    const resendResult = await sendViaResend({
      to: args.customerEmail,
      subject: `Payment Confirmation - Invoice #${args.invoiceNumber}`,
      html,
      text: `Payment of ₦${args.amount.toLocaleString()} confirmed. Invoice #${args.invoiceNumber}`,
    });

    if (resendResult.success) return resendResult;

    console.error(`[EMAIL] Resend failed for payment confirmation: ${resendResult.error}. Falling back to SES.`);
    return sendViaSES({
      to: args.customerEmail,
      subject: `Payment Confirmation - Invoice #${args.invoiceNumber}`,
      html,
      text: `Payment of ₦${args.amount.toLocaleString()} confirmed. Invoice #${args.invoiceNumber}`,
    });
  },
});

// ─── Email Health Check (Admin only) ─────────────────────────────
export const checkEmailHealth = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const resendKey = process.env.RESEND_API_KEY;
    const awsKey = process.env.AWS_ACCESS_KEY_ID;
    const fromEmail = process.env.AWS_SES_FROM_EMAIL;

    return {
      resend: {
        configured: !!resendKey,
        status: resendKey ? "available" : "not_configured",
      },
      ses: {
        configured: !!awsKey,
        status: awsKey ? "available" : "not_configured",
        region: process.env.AWS_REGION || "us-east-1",
        fromEmail: fromEmail || "not_configured",
      },
      fallback: "Resend (primary) → AWS SES (automatic failover)",
      lastChecked: Date.now(),
    };
  },
});
