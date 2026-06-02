import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send OTP via Termii Email OTP API
 * Falls back to returning OTP on screen if email fails
 */
export const sendOtpEmail = action({
  args: {
    otp: v.string(),
    email: v.string(),
    purpose: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const apiKey = process.env.TERMII_API_KEY;
    const configId = process.env.TERMII_EMAIL_CONFIG_ID;

    // Try Termii email if config ID is available
    if (apiKey && configId) {
      try {
        const response = await fetch("https://api.termii.com/api/email/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            email_address: args.email,
            code: args.otp,
            email_configuration_id: configId,
          }),
        });

        const result = await response.json();
        if (result.code === "ok") {
          console.log(`[OTP EMAIL] Sent to ${args.email}`);
          return { success: true, sent: true, result };
        }
        console.log(`[OTP EMAIL] Termii returned:`, result);
      } catch (err: any) {
        console.error("[OTP EMAIL] Termii failed:", err.message);
      }
    }

    // Always return OTP for display on screen
    console.log(`[OTP] For ${args.email}: ${args.otp}`);
    return { success: true, sent: false, otp: args.otp, message: "OTP ready - check screen" };
  },
});
