import { Phone } from "@convex-dev/auth/providers/Phone";

// ═══════════════════════════════════════════════════════════════════
// TERMII OTP PROVIDER (v3 API)
// Channel: generic | Sender ID: N-Alert
// Uses Convex Auth's built-in token: generate code → send SMS → verify
// ═══════════════════════════════════════════════════════════════════

const SENDER_ID = "N-Alert";
const SMS_CHANNEL = "generic";
const OTP_EXPIRY_MINUTES = 10;
const TERMII_API_URL = "https://v3.api.termii.com/api/sms/send";

export const TermiiOTP = Phone({
  id: "termii-otp",
  async generateVerificationToken() {
    const bytes = new Uint8Array(6);
    for (let i = 0; i < 6; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => (b % 10).toString()).join("");
  },
  async sendVerificationRequest({ identifier: originalPhone, token }) {
    let phone = originalPhone.replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "234" + phone.substring(1);
    }
    if (!phone.startsWith("234")) {
      phone = "234" + phone;
    }

    const apiKey = process.env.TERMII_API_KEY;

    if (!apiKey) {
      console.warn("[OTP] TERMII_API_KEY not set. Simulating OTP send.");
      console.log(`[OTP Simulation] Code for ${phone}: ${token}`);
      return;
    }

    console.log(`[OTP] Sending code to ${phone} via Termii v3 (generic channel, N-Alert)...`);

    try {
      const response = await fetch(TERMII_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          from: SENDER_ID,
          sms: `Your Dutchkem Ventures verification code is ${token}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
          type: "plain",
          channel: SMS_CHANNEL,
          api_key: apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.code !== "ok") {
        const errMsg = data.message || `HTTP ${response.status}`;
        console.error(`[OTP] Termii API error: ${errMsg}`, data);
        throw new Error(`SMS delivery failed: ${errMsg}`);
      }

      console.log(`[OTP] SMS sent successfully. message_id: ${data.message_id}`);
    } catch (error) {
      console.error("[OTP] Failed to send OTP:", error);
      throw error;
    }
  },
});
