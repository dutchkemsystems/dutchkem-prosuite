import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// --- OTP Endpoints (Standalone) ---

http.route({
  path: "/api/otp/send",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      let { phone } = body;
      
      if (!phone) {
        return new Response(JSON.stringify({ success: false, message: 'Phone number is required' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Normalize phone number
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '234' + phone.substring(1);
      }
      if (!phone.startsWith('234')) {
        phone = '234' + phone;
      }
      
      if (phone.length !== 13) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid phone number format. Use 080XXXXXXXX or 23480XXXXXXXX' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
      if (IS_DEVELOPMENT && !process.env.TERMII_API_KEY) {
        console.log('[OTP] Development mode: Simulating OTP send');
        return new Response(JSON.stringify({ 
          success: true, 
          pinId: 'demo_' + Date.now(),
          channel: 'demo',
          message: 'Demo OTP sent. Use any 6-digit code to verify.'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (!process.env.TERMII_API_KEY) {
        return new Response(JSON.stringify({ success: false, message: 'SMS service not configured' }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const requestBody = {
        api_key: process.env.TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: process.env.TERMII_SENDER_ID || 'Dutchkem',
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 10,
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your Dutchkem Ventures verification code is < 1234 >. Valid for 10 minutes.',
        pin_type: 'NUMERIC'
      };
      
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      if (data.pinId || data.pin_id) {
        return new Response(JSON.stringify({ success: true, pinId: data.pinId || data.pin_id, channel: 'sms' }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ success: false, message: data.message || 'Failed to send OTP', details: data }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/otp/verify",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const { pinId, pin } = await req.json();
      
      if (!pinId || !pin) {
        return new Response(JSON.stringify({ success: false, verified: false, message: 'Pin ID and PIN are required' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (pinId.startsWith('demo_')) {
        const isValid = /^\d{6}$/.test(pin);
        return new Response(JSON.stringify({ 
          success: true, 
          verified: isValid,
          message: isValid ? 'Phone verified successfully' : 'Invalid OTP'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (!process.env.TERMII_API_KEY) {
        return new Response(JSON.stringify({ success: false, verified: false, message: 'Verification service unavailable' }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TERMII_API_KEY,
          pin_id: pinId,
          pin: pin
        })
      });
      
      const data = await response.json();
      const isVerified = data.verified === true || data.verified === 'True';
      
      return new Response(JSON.stringify({ 
        success: true, 
        verified: isVerified,
        message: isVerified ? 'Phone verified successfully' : 'Invalid or expired OTP'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, verified: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// --- Agent Endpoints ---

http.route({
  path: "/api/agents/a1/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.academic_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});



http.route({
  path: "/api/agents/a2/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.business_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a3/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.content_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a4/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.career_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a5/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.shopping_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a6/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.certification_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a7/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.finance_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a8/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.video_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a9/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.wellness_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a10/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.home_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a11/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.language_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a12/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.travel_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a13/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.exam_career_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a14/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.translation_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a15/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.event_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/webhooks/kora",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("x-kora-signature") || "";
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    const verification = await ctx.runMutation(internal.guardian.verifyPayment, {
      reference: body.reference,
      amount: body.amount,
      currency: body.currency,
      ip,
      userId: body.metadata?.userId || body.userId,
      signature,
      agentId: body.metadata?.agentId,
      service: body.metadata?.service,
    });

    return new Response(JSON.stringify({ webhookStatus: "processed", ...verification }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ─── Freelancer Marketplace API ───

// POST /api/marketplace/jobs/:id/approve
http.route({
  path: "/api/marketplace/jobs/approve",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const { transactionId, clientId } = body;

    if (!transactionId || !clientId) {
      return new Response(JSON.stringify({ error: "Missing transactionId or clientId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(api.marketplace.approveJob, {
      transactionId: transactionId,
      clientId: clientId,
    });

    return new Response(JSON.stringify({ success: true, message: "Work approved. Payout scheduled for Friday 2 PM." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Helper: verify admin session from bearer token
async function verifyAdminToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role !== "admin") return null;
    return payload.sub || null;
  } catch {
    return null;
  }
}

// GET /api/admin/marketplace/escrow
http.route({
  path: "/api/admin/marketplace/escrow",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const adminId = await verifyAdminToken(req);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const balance = await ctx.runQuery(api.marketplace.getEscrowBalance);
    return new Response(JSON.stringify(balance), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET /api/admin/marketplace/pending-payout
http.route({
  path: "/api/admin/marketplace/pending-payout",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const adminId = await verifyAdminToken(req);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const pending = await ctx.runQuery(api.marketplace.getPendingFridayPayout);
    return new Response(JSON.stringify(pending), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET /api/admin/marketplace/payouts
http.route({
  path: "/api/admin/marketplace/payouts",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const adminId = await verifyAdminToken(req);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 50;
    const payouts = await ctx.runQuery(api.marketplace.getPayoutHistory, { limit });
    return new Response(JSON.stringify(payouts), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// GET /api/admin/marketplace/stats
http.route({
  path: "/api/admin/marketplace/stats",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const adminId = await verifyAdminToken(req);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const stats = await ctx.runQuery(api.marketplace.getMarketplaceStats);
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ========== SOCIAL OAUTH CALLBACK — Direct Platform OAuth ==========
http.route({
  path: "/api/social/callback/:platform",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const platform = (req as any).params?.platform || url.searchParams.get("platform") || "";
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const platformNames: Record<string, string> = {
      x: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook",
      instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
      pinterest: "Pinterest", reddit: "Reddit", threads: "Threads",
      telegram: "Telegram", discord: "Discord", bluesky: "Bluesky",
    };
    const platformName = platformNames[platform] || platform;

    const successHtml = (username: string) => `<!DOCTYPE html><html><head><title>Connected to ${platformName}</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#059669,#047857);margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.icon{font-size:64px;margin-bottom:20px}h2{color:#065f46;margin:0 0 10px}p{color:#666;margin:0 0 20px}.badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;font-size:14px;display:inline-flex;align-items:center;gap:8px}button{background:#059669;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px;font-weight:600;margin-top:20px}</style></head><body><div class="c"><div class="icon">✅</div><h2>Connected Successfully!</h2><p><strong>${platformName}</strong> is now connected.</p><div class="badge">🤖 Ready for posting</div><br><button onclick="closeAndNotify()">Done</button></div><script>function closeAndNotify(){if(window.opener){window.opener.postMessage({type:'social_connection_success',platformId:'${platform}',username:'${username}'},'*')}window.close()}setTimeout(closeAndNotify,2500)</script></body></html>`;

    const errorHtml = (msg: string) => `<!DOCTYPE html><html><head><title>Connection Failed</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px;font-size:14px}button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}</style></head><body><div class="c"><h2>Connection Failed</h2><p>${msg}</p><button onclick="window.close()">Close</button></div></body></html>`;

    try {
      if (error) return new Response(errorHtml(error === "access_denied" ? "You denied access." : error), { status: 200, headers: { "Content-Type": "text/html" } });
      if (!code || !state || !platform) return new Response(errorHtml("Missing required parameters"), { status: 200, headers: { "Content-Type": "text/html" } });

      // Validate state
      const storedState = await ctx.runQuery(api.social.getOAuthState, { state });
      if (!storedState) return new Response(errorHtml("Invalid or expired OAuth state"), { status: 200, headers: { "Content-Type": "text/html" } });

      // Platform-specific token exchange
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || process.env[`${platform.toUpperCase()}_APP_ID`] || process.env[`${platform.toUpperCase()}_CLIENT_KEY`] || "";
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] || process.env[`${platform.toUpperCase()}_APP_SECRET`] || "";
      const redirectUri = `${process.env.APP_URL || "https://prosuite.dutchkemventures.com"}/api/social/callback/${platform}`;

      let tokenData: any = {};
      let username = "";

      if (platform === "x") {
        const res = await fetch("https://api.twitter.com/2/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
          body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, code_verifier: storedState.codeVerifier || "" }).toString(),
        });
        tokenData = await res.json();
      } else if (platform === "linkedin") {
        const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString(),
        });
        tokenData = await res.json();
      } else if (platform === "facebook" || platform === "instagram") {
        const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
        tokenData = await res.json();
      } else if (platform === "reddit") {
        const res = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: { "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri }).toString(),
        });
        tokenData = await res.json();
      } else if (platform === "discord") {
        const res = await fetch("https://discord.com/api/v10/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }).toString(),
        });
        tokenData = await res.json();
      } else {
        // Generic OAuth 2.0
        const res = await fetch(process.env[`${platform.toUpperCase()}_TOKEN_URL`] || "", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString(),
        });
        tokenData = await res.json();
      }

      const accessToken = tokenData.access_token;
      if (!accessToken) return new Response(errorHtml("No access token received"), { status: 200, headers: { "Content-Type": "text/html" } });

      // Fetch user info
      try {
        if (platform === "x") { const r = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.data?.username || ""; }
        else if (platform === "linkedin") { const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.preferred_username || d.email || ""; }
        else if (platform === "facebook" || platform === "instagram") { const r = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`); const d = await r.json(); username = d.email || d.name || ""; }
        else if (platform === "reddit") { const r = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.name || ""; }
        else if (platform === "discord") { const r = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.username || ""; }
      } catch (_) {}

      // Save connection
      await ctx.runMutation(api.social.savePlatformConnection, {
        adminId: storedState.adminId, platform, platformName,
        accessToken, refreshToken: tokenData.refresh_token || "",
        platformUserId: tokenData.user_id || "", platformUsername: username,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
        scopes: storedState.platform || "",
        anonymousByDefault: true,
      });

      // Delete used state
      await ctx.runMutation(api.social.deleteOAuthState, { stateId: storedState._id });

      return new Response(successHtml(username), { status: 200, headers: { "Content-Type": "text/html" } });
    } catch (error: any) {
      return new Response(errorHtml(error.message), { status: 200, headers: { "Content-Type": "text/html" } });
    }
  }),
});

// Legacy callback route (redirect to new format)
http.route({
  path: "/api/social/callback",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") || "x";
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const error = url.searchParams.get("error") || "";
    const newUrl = `/api/social/callback/${platform}?code=${code}&state=${state}${error ? `&error=${error}` : ""}`;
    return new Response(null, { status: 302, headers: { Location: newUrl } });
  }),
});

export default http;
