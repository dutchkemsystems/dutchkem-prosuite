import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";
import { sha256Hex } from "../aws_sigv4";

const otpRateLimit = new Map<string, Array<number>>();
const OTP_MAX_REQUESTS = 5;
const OTP_WINDOW_MS = 60 * 60 * 1000;

function checkOtpRateLimit(phone: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = otpRateLimit.get(phone) || [];
  const recent = timestamps.filter(t => now - t < OTP_WINDOW_MS);
  if (recent.length >= OTP_MAX_REQUESTS) {
    const oldestInWindow = Math.min(...recent);
    const retryAfter = Math.ceil((oldestInWindow + OTP_WINDOW_MS - now) / 60000);
    return { allowed: false, retryAfter };
  }
  recent.push(now);
  otpRateLimit.set(phone, recent);
  return { allowed: true };
}

export function registerOtpRoutes(http: HttpRouter) {
  http.route({
    path: "/api/otp/send",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        if (!body || typeof body !== "object") return new Response(JSON.stringify({ success: false, message: "Request body must be a JSON object" }), { status: 400, headers: { "Content-Type": "application/json" } });
        let { phone } = body;
        if (!phone || typeof phone !== "string") return new Response(JSON.stringify({ success: false, message: 'Phone number is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
        phone = phone.trim();
        if (phone.length > 20) return new Response(JSON.stringify({ success: false, message: 'Phone number too long' }), { status: 400, headers: { "Content-Type": "application/json" } });
        phone = phone.replace(/\D/g, '');
        if (phone.length === 0) return new Response(JSON.stringify({ success: false, message: 'Phone number must contain digits' }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (phone.startsWith('0')) phone = '234' + phone.substring(1);
        if (!phone.startsWith('234')) phone = '234' + phone;
        if (phone.length !== 13) return new Response(JSON.stringify({ success: false, message: 'Invalid phone number format. Use 080XXXXXXXX or 23480XXXXXXXX' }), { status: 400, headers: { "Content-Type": "application/json" } });

        const rateCheck = checkOtpRateLimit(phone);
        if (!rateCheck.allowed) {
          return new Response(JSON.stringify({ success: false, message: `Too many OTP requests. Please try again in ${rateCheck.retryAfter} minutes.` }), { status: 429, headers: { "Content-Type": "application/json" } });
        }

        const accessKey = process.env.AWS_ACCESS_KEY_ID;
        const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

        if (!accessKey || !secretKey) {
          return new Response(JSON.stringify({ success: false, message: 'AWS SMS service not configured' }), { status: 503, headers: { "Content-Type": "application/json" } });
        }

        const otpArray = new Uint32Array(1);
        crypto.getRandomValues(otpArray);
        const otpCode = (100000 + (otpArray[0] % 900000)).toString();
        const phoneFormatted = `+${phone}`;
        const region = process.env.AWS_REGION || 'us-east-1';
        const host = `sns.${region}.amazonaws.com`;
        const path = '/';

        const message = `Your Dutchkem Ventures verification code is: ${otpCode}. Valid for 10 minutes.`;
        const params = new URLSearchParams({
          Action: 'Publish',
          PhoneNumber: phoneFormatted,
          Message: message,
          'MessageAttributes.entry.1.Name': 'AWS.SNS.SMS.SenderID',
          'MessageAttributes.entry.1.Value.DataType': 'String',
          'MessageAttributes.entry.1.Value.StringValue': 'Dutchkem',
          'MessageAttributes.entry.2.Name': 'AWS.SNS.SMS.SMSType',
          'MessageAttributes.entry.2.Value.DataType': 'String',
          'MessageAttributes.entry.2.Value.StringValue': 'Transactional',
        });

        const payload = params.toString();
        const { signRequest } = await import("../aws_sigv4");
        const headers = signRequest("POST", host, path, region, "sns", payload, accessKey, secretKey, "application/x-www-form-urlencoded");

        const response = await fetch(`https://${host}${path}`, {
          method: 'POST',
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
          body: payload,
        });

        const otpHash = sha256Hex(otpCode);
        const requestId = await ctx.runMutation(internal.aws_otp.storeOtpRequest, {
          identifier: phone,
          otpHash,
          purpose: "login",
          expiresAt: Date.now() + 10 * 60 * 1000,
          deliveryMethod: response.ok ? "sms" : "sms_failed",
          fraudScore: 0,
          riskLevel: "low",
        });

        if (response.ok) {
          const resultText = await response.text();
          const messageIdMatch = resultText.match(/<MessageId>(.*?)<\/MessageId>/);
          return new Response(JSON.stringify({ success: true, pinId: requestId, channel: 'sms', messageId: messageIdMatch?.[1] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        const errorText = await response.text();
        console.error(`[AWS SNS] Send failed: ${response.status} ${errorText}`);
        return new Response(JSON.stringify({ success: false, message: 'Failed to send OTP via SMS' }), { status: 500, headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });

  http.route({
    path: "/api/otp/verify",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      try {
        const body = await req.json();
        if (!body || typeof body !== "object") return new Response(JSON.stringify({ success: false, verified: false, message: "Request body must be a JSON object" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const { pinId, pin } = body;
        if (!pinId || typeof pinId !== "string") return new Response(JSON.stringify({ success: false, verified: false, message: 'Pin ID is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (!pin || typeof pin !== "string") return new Response(JSON.stringify({ success: false, verified: false, message: 'PIN is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (pinId.length > 100) return new Response(JSON.stringify({ success: false, verified: false, message: 'Pin ID too long' }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (!/^\d{4,8}$/.test(pin)) return new Response(JSON.stringify({ success: false, verified: false, message: 'PIN must be 4-8 digits' }), { status: 400, headers: { "Content-Type": "application/json" } });

        const otpRequest = await ctx.runQuery(internal.aws_otp.findValidOtp, {
          identifier: pinId,
          otpHash: sha256Hex(pin),
        });

        if (otpRequest) {
          await ctx.runMutation(internal.aws_otp.markVerified, { requestId: otpRequest._id });
          return new Response(JSON.stringify({ success: true, verified: true, message: 'Phone verified successfully' }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, verified: false, message: 'Invalid or expired OTP' }), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, verified: false, message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }),
  });
}
