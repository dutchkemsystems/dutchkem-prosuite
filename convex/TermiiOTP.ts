import { Phone } from "@convex-dev/auth/providers/Phone";

// ═══════════════════════════════════════════════════════════════════
// TERMII OTP PROVIDER (v3 API)
// Channel: generic | Sender ID: N-Alert
// Uses Convex Auth's built-in token: generate code → send SMS → verify
// FIX: Better error handling — shows real Termii error instead of generic message
// FIX: Falls back to DND channel if generic fails (Nigerian DND numbers)
// FIX: Never crashes silently — always logs the real API response
// ═══════════════════════════════════════════════════════════════════

const SENDER_ID = "N-Alert";
const OTP_EXPIRY_MINUTES = 10;
const TERMII_SEND_URL = "https://v3.api.termii.com/api/sms/send";

// Normalize Nigerian phone numbers to international format
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

// Try sending SMS via a specific channel
async function trySendSMS(
  apiKey: string,
  phone: string,
  message: string,
  channel: string,
  senderId: string
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: any }> {
  try {
    const response = await fetch(TERMII_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: channel,
        api_key: apiKey,
      }),
    });

    const data = await response.json();
    console.log(`[OTP] Termii ${channel} response:`, JSON.stringify(data));

    if (response.ok && data.code === "ok") {
      return { success: true, messageId: data.message_id };
    }

    // Extract meaningful error message from Termii response
    const errorMsg = data.message || data.description || `HTTP ${response.status}`;
    return { success: false, error: errorMsg, rawResponse: data };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export const TermiiOTP = Phone({
  id: "termii-otp",

  async generateVerificationToken() {
    // Generate a 6-digit numeric OTP
    const digits = [];
    for (let i = 0; i < 6; i++) {
      digits.push(Math.floor(Math.random() * 10).toString());
    }
    return digits.join("");
  },

  async sendVerificationRequest({ identifier: originalPhone, token }) {
    const phone = normalizePhone(originalPhone);

    // Validate phone number length
    if (phone.length !== 13) {
      console.error(`[OTP] Invalid phone number: ${phone} (length ${phone.length}, expected 13)`);
      throw new Error(`Invalid phone number format. Please use 080XXXXXXXX or 23480XXXXXXXX`);
    }

    const apiKey = process.env.TERMII_API_KEY;

    // ── Development / no API key: simulate OTP ──────────────────
    if (!apiKey) {
      console.warn("[OTP] TERMII_API_KEY not set — simulating OTP send.");
      console.log(`[OTP SIMULATION] Phone: ${phone} | Code: ${token}`);
      // In simulation mode we just return — the token is stored by Convex Auth
      // and can be verified without actually sending an SMS
      return;
    }

    const message = `Your Dutchkem Ventures verification code is ${token}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;

    console.log(`[OTP] Sending to ${phone}...`);

    // ── Attempt 1: generic channel ───────────────────────────────
    const genericResult = await trySendSMS(apiKey, phone, message, "generic", SENDER_ID);

    if (genericResult.success) {
      console.log(`[OTP] Sent via generic channel. message_id: ${genericResult.messageId}`);
      return;
    }

    console.warn(`[OTP] Generic channel failed: ${genericResult.error}. Trying dnd channel...`);

    // ── Attempt 2: dnd channel (for DND-registered Nigerian numbers) ─
    const dndResult = await trySendSMS(apiKey, phone, message, "dnd", SENDER_ID);

    if (dndResult.success) {
      console.log(`[OTP] Sent via dnd channel. message_id: ${dndResult.messageId}`);
      return;
    }

    console.warn(`[OTP] DND channel also failed: ${dndResult.error}. Trying WhatsApp...`);

    // ── Attempt 3: WhatsApp channel ──────────────────────────────
    const whatsappResult = await trySendSMS(apiKey, phone, message, "whatsapp", "234" + SENDER_ID);

    if (whatsappResult.success) {
      console.log(`[OTP] Sent via WhatsApp channel. message_id: ${whatsappResult.messageId}`);
      return;
    }

    // ── All channels failed ──────────────────────────────────────
    // Log the real error for debugging
    const finalError = genericResult.error || dndResult.error || whatsappResult.error || "Unknown error";
    console.error(`[OTP] All channels failed. Last error: ${finalError}`);
    console.error(`[OTP] Generic response:`, JSON.stringify(genericResult.rawResponse));
    console.error(`[OTP] DND response:`, JSON.stringify(dndResult.rawResponse));

    // Check for specific known errors and give helpful messages
    if (finalError.toLowerCase().includes("balance") || finalError.toLowerCase().includes("insufficient")) {
      throw new Error("SMS service temporarily unavailable. Please contact support.");
    }

    if (finalError.toLowerCase().includes("invalid") && finalError.toLowerCase().includes("sender")) {
      throw new Error("SMS configuration error. Please contact support.");
    }

    if (finalError.toLowerCase().includes("blacklist") || finalError.toLowerCase().includes("blocked")) {
      throw new Error("This phone number cannot receive SMS. Please use a different number or contact support.");
    }

    // Generic fallback error
    throw new Error(`Could not send verification code. Please try again or contact support. (${finalError})`);
  },
});
