import { Phone } from "@convex-dev/auth/providers/Phone";

// ═══════════════════════════════════════════════════════════════════
// TERMII DND CHANNEL OTP PROVIDER
// Channel: DND | Sender ID: N-Alert
// Ensures OTP delivery even to DND-registered numbers
// ═══════════════════════════════════════════════════════════════════

const DND_SENDER_ID = "N-Alert";
const DND_CHANNEL = "dnd";
const OTP_EXPIRY_MINUTES = 10;

export const TermiiOTP = Phone({
  id: "termii-otp",
  async generateVerificationToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, (b) => (b % 10).toString()).join("");
  },
  async sendVerificationRequest({ identifier: originalPhone, token }) {
    const apiKey = process.env.TERMII_API_KEY;

    let phone = originalPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1);
    }
    if (!phone.startsWith('234')) {
      phone = '234' + phone;
    }

    const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

    if (!apiKey || (IS_DEVELOPMENT && phone.startsWith('234000'))) {
      console.warn("[OTP] TERMII_API_KEY not set or Demo number detected. Simulating OTP send.");
      console.log(`[OTP] Simulation for ${phone}: Your verification code is ${token}`);
      return;
    }

    console.log(`[OTP] Sending code to ${phone} via Termii DND channel (N-Alert)...`);
    
    try {
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          from: DND_SENDER_ID,
          sms: `Your Dutchkem Ventures verification code is ${token}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
          type: "plain",
          channel: DND_CHANNEL,
          api_key: apiKey,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Termii API error: ${JSON.stringify(data)}`);
      }
      
      console.log(`[OTP] Termii DND response: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error("[OTP] Failed to send OTP via Termii DND:", error);
      if (IS_DEVELOPMENT) {
        console.log(`[OTP Fallback] Code for ${phone}: ${token}`);
      }
      throw error;
    }
  },
});
