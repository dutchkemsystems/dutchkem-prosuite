import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => (b % 10).toString()).join("");
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const fromEmail = process.env.FROM_EMAIL || "security@dutchkem.com";
    const { error } = await resend.emails.send({
      from: `Dutchkem Ventures <${fromEmail}>`,
      to: [email],
      subject: "Your Dutchkem Ventures Sign-In Code",
      text: `Your verification code is: ${token}. Valid for 15 minutes.`,
    });
    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
