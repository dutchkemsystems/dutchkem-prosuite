import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sha256Hex, signRequest } from "./aws_sigv4";

// ═══════════════════════════════════════════════════════════════════
// AWS OTP SERVICE — Replaces Termii with AWS SES + SNS
// Features: AI Fraud Detection, Device Fingerprinting, Dynamic Routing,
//           Rate Limiting, OTP Hashing (SHA-256), Single-use, Attempt Tracking
// ═══════════════════════════════════════════════════════════════════

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

// ═══════════════════════════════════════════════════════════════════
// CORE OTP ACTIONS
// ═══════════════════════════════════════════════════════════════════

export const sendOTP = action({
  args: {
    identifier: v.string(),
    purpose: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purpose = args.purpose || "login";
    const identifier = args.identifier.includes("@")
      ? args.identifier.toLowerCase()
      : normalizePhone(args.identifier);

    // 1. Rate limiting check
    const rateCheck = await ctx.runQuery(internal.aws_otp.checkRateLimit, {
      identifier,
      ipAddress: args.ipAddress,
    });
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.error,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateCheck.retryAfter,
      };
    }

    // 2. Fraud detection scoring
    const fraudResult = await ctx.runQuery(internal.aws_otp.calculateFraudScore, {
      identifier,
      ipAddress: args.ipAddress,
      deviceFingerprint: args.deviceFingerprint,
    });

    // 3. Dynamic routing based on fraud risk
    const isEmail = identifier.includes("@");
    let channel: string;
    if (fraudResult.riskLevel === "critical" || fraudResult.riskLevel === "high") {
      channel = "email"; // High risk → email only (more secure)
    } else if (isEmail) {
      channel = "email";
    } else {
      channel = "sms";
    }

    // 4. Generate OTP and hash
    const otpCode = generateOTP();
    const otpHash = sha256Hex(otpCode);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 5. Store OTP request
    const requestId = await ctx.runMutation(internal.aws_otp.storeOtpRequest, {
      identifier,
      otpHash,
      purpose,
      expiresAt,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      deviceFingerprint: args.deviceFingerprint,
      deliveryMethod: channel,
      fraudScore: fraudResult.score,
      riskLevel: fraudResult.riskLevel,
    });

    // 6. Send OTP via selected channel
    let sendResult: { success: boolean; messageId?: string; error?: string };
    if (channel === "email") {
      sendResult = await ctx.runAction(internal.aws_otp.sendViaSES, {
        email: identifier,
        otpCode,
        purpose,
        requestId,
      });
    } else {
      sendResult = await ctx.runAction(internal.aws_otp.sendViaSNS, {
        phone: identifier,
        otpCode,
        purpose,
        requestId,
      });
    }

    // 7. If primary channel fails, try fallback
    if (!sendResult.success && channel === "sms") {
      console.log(`[AWS OTP] SMS failed for ${identifier}, falling back to email...`);
      const fallbackResult = await ctx.runAction(internal.aws_otp.sendViaSES, {
        email: identifier,
        otpCode,
        purpose,
        requestId,
      });
      if (fallbackResult.success) {
        sendResult = fallbackResult;
      }
    }

    // 8. Log delivery
    await ctx.runMutation(internal.aws_otp.logDelivery, {
      requestId,
      channel: sendResult.success ? channel : `${channel}_failed`,
      success: sendResult.success,
      messageId: sendResult.messageId,
      errorMessage: sendResult.error,
    });

    return {
      success: sendResult.success,
      requestId,
      message: sendResult.success
        ? `OTP sent via ${channel}`
        : `Failed to send OTP: ${sendResult.error}`,
      expiresIn: "10 minutes",
      fraudRisk: fraudResult.riskLevel,
      deliveryMethod: channel,
    };
  },
});

export const verifyOTP = action({
  args: {
    identifier: v.string(),
    otpCode: v.string(),
    deviceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identifier = args.identifier.includes("@")
      ? args.identifier.toLowerCase()
      : normalizePhone(args.identifier);
    const otpHash = sha256Hex(args.otpCode);

    // 1. Find valid OTP request
    const otpRequest = await ctx.runQuery(internal.aws_otp.findValidOtp, {
      identifier,
      otpHash,
    });

    if (!otpRequest) {
      // Increment attempts
      await ctx.runMutation(internal.aws_otp.incrementAttempts, { identifier });

      return {
        success: false,
        error: "Invalid or expired OTP code",
      };
    }

    // 2. Mark as verified
    await ctx.runMutation(internal.aws_otp.markVerified, {
      requestId: otpRequest._id,
    });

    // 3. Trust device if fingerprint provided
    if (args.deviceFingerprint) {
      await ctx.runMutation(internal.aws_otp.trustDevice, {
        identifier,
        deviceFingerprint: args.deviceFingerprint,
      });
    }

    return {
      success: true,
      message: "OTP verified successfully",
      identifier,
    };
  },
});

export const sendOTPEmail = action({
  args: {
    email: v.string(),
    otpCode: v.string(),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.aws_otp.sendViaSES, {
      email: args.email,
      otpCode: args.otpCode,
      purpose: args.purpose || "verification",
      requestId: "inline",
    });
  },
});

export const sendOTPSMS = action({
  args: {
    phone: v.string(),
    otpCode: v.string(),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.aws_otp.sendViaSNS, {
      phone: args.phone,
      otpCode: args.otpCode,
      purpose: args.purpose || "verification",
      requestId: "inline",
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// AWS SES EMAIL SENDING
// ═══════════════════════════════════════════════════════════════════

export const sendViaSES = internalAction({
  args: {
    email: v.string(),
    otpCode: v.string(),
    purpose: v.string(),
    requestId: v.string(),
  },
  handler: async (_ctx, args) => {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";
    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@dutchkem.com";

    if (!accessKey || !secretKey) {
      console.warn("[AWS SES] Credentials not configured — simulating email send");
      console.log(`[AWS SES SIMULATION] To: ${args.email} | OTP: ${args.otpCode} | Purpose: ${args.purpose}`);
      return { success: true, messageId: `sim_${Date.now()}` };
    }

    const host = `email.${region}.amazonaws.com`;
    const path = "/";

    const htmlBody = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fb;padding:20px}.container{max-width:500px;margin:0 auto;background:white;border-radius:24px;padding:40px;box-shadow:0 20px 40px rgba(0,0,0,0.1)}.otp-code{font-size:36px;font-weight:bold;text-align:center;letter-spacing:8px;background:#f0f0f0;padding:20px;border-radius:12px;margin:20px 0;font-family:monospace}.security-badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;display:inline-block;font-size:12px;margin-top:16px}</style></head><body><div class="container"><h1 style="color:#1E3A8A">Dutchkem Ventures</h1><p>Prosuite NG+</p><h2>Your Verification Code</h2><p>Enter this code to ${args.purpose === "login" ? "log in to your account" : "verify your action"}:</p><div class="otp-code">${args.otpCode}</div><p>This code expires in <strong>10 minutes</strong>.</p><div class="security-badge">Protected by AI Fraud Detection</div><p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, please ignore this email.</p></div></body></html>`;
    const textBody = `Your Prosuite NG+ verification code is: ${args.otpCode}. Valid for 10 minutes.`;

    const payload = JSON.stringify({
      Source: fromEmail,
      Destination: { ToAddresses: [args.email] },
      Message: {
        Subject: { Data: `Your ${args.purpose} verification code - Prosuite NG+` },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: textBody },
        },
      },
    });

    const headers = signRequest("POST", host, path, region, "ses", payload, accessKey, secretKey, "application/json");

    try {
      const response = await fetch(`https://${host}${path}`, {
        method: "POST",
        headers,
        body: payload,
      });

      const result = await response.text();
      const messageIdMatch = result.match(/<MessageId>(.*?)<\/MessageId>/);

      if (response.ok && messageIdMatch) {
        return { success: true, messageId: messageIdMatch[1] };
      }

      console.error("[AWS SES] Error:", result);
      return { success: false, error: `SES error: ${response.status}` };
    } catch (err: any) {
      console.error("[AWS SES] Network error:", err.message);
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// AWS SNS SMS SENDING
// ═══════════════════════════════════════════════════════════════════

export const sendViaSNS = internalAction({
  args: {
    phone: v.string(),
    otpCode: v.string(),
    purpose: v.string(),
    requestId: v.string(),
  },
  handler: async (_ctx, args) => {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!accessKey || !secretKey) {
      console.warn("[AWS SNS] Credentials not configured — simulating SMS send");
      console.log(`[AWS SNS SIMULATION] To: ${args.phone} | OTP: ${args.otpCode}`);
      return { success: true, messageId: `sim_${Date.now()}` };
    }

    const phone = normalizePhone(args.phone);
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    const host = `sns.${region}.amazonaws.com`;
    const path = "/";

    const message = `Your Dutchkem Ventures verification code is: ${args.otpCode}. Valid for 10 minutes. Do not share this code.`;

    const params = new URLSearchParams({
      Action: "Publish",
      PhoneNumber: formattedPhone,
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

    try {
      const response = await fetch(`https://${host}${path}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });

      const result = await response.text();
      const messageIdMatch = result.match(/<MessageId>(.*?)<\/MessageId>/);

      if (response.ok && messageIdMatch) {
        return { success: true, messageId: messageIdMatch[1] };
      }

      console.error("[AWS SNS] Error:", result);
      return { success: false, error: `SNS error: ${response.status}` };
    } catch (err: any) {
      console.error("[AWS SNS] Network error:", err.message);
      return { success: false, error: err.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// DATABASE MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export const storeOtpRequest = internalMutation({
  args: {
    identifier: v.string(),
    otpHash: v.string(),
    purpose: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    deliveryMethod: v.string(),
    fraudScore: v.number(),
    riskLevel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aws_otp_requests", {
      identifier: args.identifier,
      otpHash: args.otpHash,
      purpose: args.purpose,
      isVerified: false,
      expiresAt: args.expiresAt,
      attempts: 0,
      deliveryMethod: args.deliveryMethod,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      deviceFingerprint: args.deviceFingerprint,
      fraudScore: args.fraudScore,
      riskLevel: args.riskLevel,
      createdAt: Date.now(),
    });
  },
});

export const findValidOtp = internalQuery({
  args: {
    identifier: v.string(),
    otpHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = await ctx.db
      .query("aws_otp_requests")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .collect();

    // Find the most recent valid OTP
    const valid = results
      .filter(
        (r) =>
          r.otpHash === args.otpHash &&
          !r.isVerified &&
          r.expiresAt > now &&
          r.attempts < 5
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    return valid[0] || null;
  },
});

export const incrementAttempts = internalMutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = await ctx.db
      .query("aws_otp_requests")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .collect();

    const pending = results
      .filter((r) => !r.isVerified && r.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (pending[0]) {
      await ctx.db.patch(pending[0]._id, {
        attempts: pending[0].attempts + 1,
      });
    }
  },
});

export const markVerified = internalMutation({
  args: { requestId: v.id("aws_otp_requests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      isVerified: true,
      verifiedAt: Date.now(),
    });
  },
});

export const logDelivery = internalMutation({
  args: {
    requestId: v.id("aws_otp_requests"),
    channel: v.string(),
    success: v.boolean(),
    messageId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aws_otp_delivery_logs", {
      otpRequestId: args.requestId,
      channel: args.channel,
      success: args.success,
      messageId: args.messageId,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════

export const checkRateLimit = internalQuery({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 5;
    const now = Date.now();
    const cutoff = now - windowMs;

    const recent = await ctx.db
      .query("aws_otp_requests")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .collect();

    const recentCount = recent.filter((r) => r.createdAt > cutoff).length;

    if (recentCount >= maxRequests) {
      const oldest = Math.min(...recent.filter((r) => r.createdAt > cutoff).map((r) => r.createdAt));
      const retryAfter = Math.ceil((oldest + windowMs - now) / 60000);
      return {
        allowed: false,
        error: `Too many requests. Please try again in ${retryAfter} minutes.`,
        retryAfter,
      };
    }

    return { allowed: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AI FRAUD DETECTION SCORING
// ═══════════════════════════════════════════════════════════════════

export const calculateFraudScore = internalQuery({
  args: {
    identifier: v.string(),
    ipAddress: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let score = 0;
    const reasons: string[] = [];
    const now = Date.now();

    // 1. Rapid requests (>3 in 5 minutes)
    const recentRequests = await ctx.db
      .query("aws_otp_requests")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .collect();
    const rapidCount = recentRequests.filter((r) => r.createdAt > now - 5 * 60 * 1000).length;
    if (rapidCount >= 3) {
      score += 30;
      reasons.push("Rapid requests detected");
    }

    // 2. Multiple identifiers from same IP
    if (args.ipAddress) {
      const ipRequests = await ctx.db
        .query("aws_rate_limit_events")
        .withIndex("by_identifier_ip", (q) =>
          q.eq("identifier", args.identifier).eq("ipAddress", args.ipAddress)
        )
        .collect();
      const recentIp = ipRequests.filter((r) => r.createdAt > now - 60 * 60 * 1000);
      if (recentIp.length > 3) {
        score += 25;
        reasons.push("Multiple identifiers from same IP");
      }
    }

    // 3. Untrusted device
    if (args.deviceFingerprint) {
      const trustedDevice = await ctx.db
        .query("aws_trusted_devices")
        .withIndex("by_fingerprint", (q) =>
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();
      if (!trustedDevice || trustedDevice.trustedUntil < now) {
        score += 15;
        reasons.push("New/untrusted device");
      }
    }

    // 4. Previous failed attempts
    const failedAttempts = recentRequests.filter((r) => r.attempts > 0 && !r.isVerified).length;
    if (failedAttempts > 3) {
      score += failedAttempts * 10;
      reasons.push(`${failedAttempts} failed attempts`);
    }

    // 5. Geolocation anomaly (simplified — check if IP changed from last successful login)
    const successfulLogins = recentRequests.filter((r) => r.isVerified && r.ipAddress);
    if (successfulLogins.length > 0 && args.ipAddress) {
      const lastIp = successfulLogins[successfulLogins.length - 1].ipAddress;
      if (lastIp !== args.ipAddress) {
        score += 20;
        reasons.push("IP address changed since last login");
      }
    }

    // Determine risk level
    let riskLevel = "low";
    if (score >= 70) riskLevel = "critical";
    else if (score >= 50) riskLevel = "high";
    else if (score >= 30) riskLevel = "medium";

    // Store fraud score
    await ctx.db.insert("aws_fraud_scores", {
      identifier: args.identifier,
      ipAddress: args.ipAddress,
      deviceFingerprint: args.deviceFingerprint,
      fraudScore: score,
      riskLevel,
      reason: reasons.join(", ") || "No issues detected",
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    return { score, riskLevel, reasons };
  },
});

// ═══════════════════════════════════════════════════════════════════
// DEVICE TRUST
// ═══════════════════════════════════════════════════════════════════

export const trustDevice = internalMutation({
  args: {
    identifier: v.string(),
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("aws_trusted_devices")
      .withIndex("by_fingerprint", (q) =>
        q.eq("deviceFingerprint", args.deviceFingerprint)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUsedAt: now,
        trustedUntil: now + 90 * 24 * 60 * 60 * 1000,
      });
    } else {
      await ctx.db.insert("aws_trusted_devices", {
        identifier: args.identifier,
        deviceFingerprint: args.deviceFingerprint,
        deviceName: "Trusted device",
        lastUsedAt: now,
        trustedUntil: now + 90 * 24 * 60 * 60 * 1000,
        createdAt: now,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getOtpStats = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("aws_otp_requests").collect();
    const fraudScores = await ctx.db.query("aws_fraud_scores").collect();
    const deliveryLogs = await ctx.db.query("aws_otp_delivery_logs").collect();

    const totalRequests = requests.length;
    const verifiedCount = requests.filter((r) => r.isVerified).length;
    const failedCount = requests.filter((r) => r.attempts >= 5).length;
    const highRiskCount = fraudScores.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical").length;
    const deliverySuccess = deliveryLogs.filter((l) => l.success).length;
    const deliveryTotal = deliveryLogs.length;

    return {
      totalRequests,
      verifiedCount,
      failedCount,
      highRiskCount,
      deliveryRate: deliveryTotal > 0 ? Math.round((deliverySuccess / deliveryTotal) * 100) : 100,
      recentRequests: requests.slice(-20).reverse(),
      recentFraud: fraudScores.slice(-10).reverse(),
    };
  },
});

export const getFraudScores = query({
  args: {
    identifier: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.identifier) {
      return await ctx.db
        .query("aws_fraud_scores")
        .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier!))
        .order("desc")
        .take(args.limit || 20);
    }
    return await ctx.db
      .query("aws_fraud_scores")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getTrustedDevices = query({
  args: {
    identifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.identifier) {
      return await ctx.db
        .query("aws_trusted_devices")
        .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier!))
        .collect();
    }
    return await ctx.db.query("aws_trusted_devices").collect();
  },
});
