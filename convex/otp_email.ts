import { v } from "convex/values";
import { action } from "./_generated/server";
import { signRequest } from "./aws_sigv4";

// ═══════════════════════════════════════════════════════════════════
// AWS SES OTP Email — Replaces Termii Email OTP
// Sends verification codes via AWS SES with proper SigV4 signing
// Falls back to returning OTP on screen if SES fails
// ═══════════════════════════════════════════════════════════════════

export const sendOtpEmail = action({
  args: {
    otp: v.string(),
    email: v.string(),
    purpose: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";
    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";

    if (accessKey && secretKey) {
      try {
        const host = `email.${region}.amazonaws.com`;
        const path = "/";

        const amountText = args.amount ? ` for ₦${args.amount.toLocaleString()}` : "";
        const htmlBody = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fb;padding:20px}.container{max-width:500px;margin:0 auto;background:white;border-radius:24px;padding:40px;box-shadow:0 20px 40px rgba(0,0,0,0.1)}.otp-code{font-size:36px;font-weight:bold;text-align:center;letter-spacing:8px;background:#f0f0f0;padding:20px;border-radius:12px;margin:20px 0;font-family:monospace}.security-badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;display:inline-block;font-size:12px;margin-top:16px}</style></head><body><div class="container"><h1 style="color:#1E3A8A">Dutchkem Ventures</h1><p>Prosuite NG+</p><h2>Your Transfer Verification Code${amountText}</h2><p>Enter this code to confirm your transfer:</p><div class="otp-code">${args.otp}</div><p>This code expires in <strong>10 minutes</strong>.</p><div class="security-badge">Protected by AI Fraud Detection</div><p style="color:#999;font-size:12px;margin-top:24px">If you didn't initiate this transfer, contact support immediately.</p></div></body></html>`;

        const payload = JSON.stringify({
          Source: fromEmail,
          Destination: { ToAddresses: [args.email] },
          Message: {
            Subject: { Data: `Transfer Verification Code${amountText} - Prosuite NG+` },
            Body: {
              Html: { Data: htmlBody },
              Text: { Data: `Your transfer verification code is: ${args.otp}. Valid for 10 minutes.` },
            },
          },
        });

        const headers = signRequest("POST", host, path, region, "ses", payload, accessKey, secretKey, "application/json");

        const response = await fetch(`https://${host}${path}`, {
          method: "POST",
          headers,
          body: payload,
        });

        if (response.ok) {
          const result = await response.text();
          const messageIdMatch = result.match(/<MessageId>(.*?)<\/MessageId>/);
          console.log(`[AWS SES] OTP email sent to ${args.email}, MessageId: ${messageIdMatch?.[1]}`);
          return { success: true, sent: true, messageId: messageIdMatch?.[1] };
        }

        console.warn(`[AWS SES] Email failed: ${response.status}`);
      } catch (err: any) {
        console.error("[AWS SES] Error:", err.message);
      }
    }

    // Always return OTP for display on screen
    console.log(`[OTP] For ${args.email}: ${args.otp}`);
    return { success: true, sent: false, otp: args.otp, message: "OTP ready - check screen" };
  },
});
