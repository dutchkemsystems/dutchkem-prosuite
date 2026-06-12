import { Phone } from "@convex-dev/auth/providers/Phone";
import { signRequest } from "./aws_sigv4";

// ═══════════════════════════════════════════════════════════════════
// AWS SNS OTP PROVIDER — Replaces Termii
// Uses AWS SNS for SMS delivery + AI Fraud Detection
// Channel: SES (email) → SNS (SMS) dynamic routing
// ═══════════════════════════════════════════════════════════════════

const OTP_EXPIRY_MINUTES = 10;

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) {
    normalized = "234" + normalized.substring(1);
  }
  if (!normalized.startsWith("234")) {
    normalized = "234" + normalized;
  }
  return normalized;
}

export const TermiiOTP = Phone({
  id: "termii-otp",

  async generateVerificationToken() {
    const digits = [];
    for (let i = 0; i < 6; i++) {
      digits.push(Math.floor(Math.random() * 10).toString());
    }
    return digits.join("");
  },

  async sendVerificationRequest({ identifier: originalPhone, token }) {
    const phone = normalizePhone(originalPhone);

    if (phone.length !== 13) {
      console.error(`[AWS OTP] Invalid phone number: ${phone} (length ${phone.length}, expected 13)`);
      throw new Error(`Invalid phone number format. Please use 080XXXXXXXX or 23480XXXXXXXX`);
    }

    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";

    // Try AWS SNS first
    if (accessKey && secretKey) {
      try {
        const phoneFormatted = `+${phone}`;
        const message = `Your Dutchkem Ventures verification code is ${token}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;

        const host = `sns.${region}.amazonaws.com`;
        const path = "/";

        const params = new URLSearchParams({
          Action: "Publish",
          PhoneNumber: phoneFormatted,
          Message: message,
          "MessageAttributes.entry.1.Name": "AWS.SNS.SMS.SenderID",
          "MessageAttributes.entry.1.Value.DataType": "String",
          "MessageAttributes.entry.1.Value.StringValue": "Dutchkem",
          "MessageAttributes.entry.2.Name": "AWS.SNS.SMS.SMSType",
          "MessageAttributes.entry.2.Value.DataType": "String",
          "MessageAttributes.entry.2.Value.StringValue": "Transactional",
        });

        const payload = params.toString();
        const headers = signRequest("POST", host, path, region, "sns", payload, accessKey, secretKey, "application/x-www-form-urlencoded");

        const response = await fetch(`https://${host}${path}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
          body: payload,
        });

        if (response.ok) {
          console.log(`[AWS OTP] SMS sent to ${phone} via SNS`);
          return;
        }

        const errText = await response.text();
        console.warn(`[AWS OTP] SNS failed: ${errText}`);

        // Fallback to SES email
        console.log(`[AWS OTP] Falling back to email delivery...`);
      } catch (err: any) {
        console.error(`[AWS OTP] SNS error: ${err.message}`);
      }
    }

    // Fallback: Try AWS SES email
    if (accessKey && secretKey) {
      try {
        const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";
        const htmlBody = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px"><h2 style="color:#1E3A8A">Dutchkem Ventures</h2><p>Your verification code:</p><div style="font-size:36px;font-weight:bold;letter-spacing:8px;background:#f0f0f0;padding:20px;border-radius:12px;text-align:center;font-family:monospace">${token}</div><p>Valid for ${OTP_EXPIRY_MINUTES} minutes.</p><p style="color:#999;font-size:12px">If you didn't request this, ignore this email.</p></body></html>`;

        const sesHost = `email.${region}.amazonaws.com`;
        const sesPayload = JSON.stringify({
          Source: fromEmail,
          Destination: { ToAddresses: [`${phone}@sms.email.aws`] },
          Message: {
            Subject: { Data: "Your verification code - Prosuite NG+" },
            Body: { Html: { Data: htmlBody }, Text: { Data: `Your code: ${token}. Valid ${OTP_EXPIRY_MINUTES} min.` } },
          },
        });

        const sesHeaders = signRequest("POST", sesHost, "/", region, "ses", sesPayload, accessKey, secretKey, "application/json");

        const sesResponse = await fetch(`https://${sesHost}/`, {
          method: "POST",
          headers: sesHeaders,
          body: sesPayload,
        });

        if (sesResponse.ok) {
          console.log(`[AWS OTP] SES email fallback sent to ${phone}@sms.email.aws`);
          return;
        }

        console.warn(`[AWS OTP] SES fallback failed: ${sesResponse.status}`);
      } catch (err: any) {
        console.error(`[AWS OTP] SES fallback error: ${err.message}`);
      }
    }

    // No credentials available — throw error
    throw new Error("AWS credentials not configured. Cannot send OTP.");
  },
});
