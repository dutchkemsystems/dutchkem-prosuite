import { Email } from "@convex-dev/auth/providers/Email";
import { signRequest } from "./aws_sigv4";

// ═══════════════════════════════════════════════════════════════════
// AWS SES EMAIL OTP PROVIDER — Replaces Resend OTP
// Sends verification codes via AWS SES with proper SigV4 signing
// ═══════════════════════════════════════════════════════════════════

export const AwsEmailOTP = Email({
  id: "aws-email-otp",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => (b % 10).toString()).join("");
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";
    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";

    if (!accessKey || !secretKey) {
      throw new Error("AWS credentials not configured. Cannot send OTP email.");
    }

    const host = `email.${region}.amazonaws.com`;
    const path = "/";

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fb; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .otp-code { font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; background: #f0f0f0; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: monospace; }
    .security-badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 30px; display: inline-block; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #1E3A8A">Dutchkem Ventures</h1>
    <p>ProSuite NG+</p>
    <h2>Your Sign-In Code</h2>
    <p>Enter this code to log in to your account:</p>
    <div class="otp-code">${token}</div>
    <p>This code expires in <strong>15 minutes</strong>.</p>
    <div class="security-badge">Protected by AWS SES</div>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`;

    const payload = JSON.stringify({
      Source: fromEmail,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Your Dutchkem Ventures Sign-In Code" },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: `Your verification code is: ${token}. Valid for 15 minutes.` },
        },
      },
    });

    const headers = signRequest("POST", host, path, region, "ses", payload, accessKey, secretKey, "application/json");

    const response = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AWS SES OTP] Email failed: ${response.status} - ${errText}`);
      throw new Error(`Failed to send OTP email via AWS SES: ${response.status}`);
    }

    const result = await response.text();
    const messageIdMatch = result.match(/<MessageId>(.*?)<\/MessageId>/);
    console.log(`[AWS SES OTP] Email sent to ${email}, MessageId: ${messageIdMatch?.[1]}`);
  },
});
