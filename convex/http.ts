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

// ========== SOCIAL OAUTH CALLBACK ==========
http.route({
  path: "/api/social/callback",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    try {
      const url = new URL(req.url);
      const platformId = url.searchParams.get("platform");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(`
          <!DOCTYPE html>
          <html><head><title>Connection Cancelled</title>
          <style>
            body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}
            .c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}
            h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px}
            button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}
          </style></head>
          <body><div class="c">
            <h2>Connection Cancelled</h2>
            <p>${error === 'access_denied' ? 'You denied access to this platform.' : error}</p>
            <button onclick="window.close()">Close</button>
          </div></body></html>
        `, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      if (!code || !state) {
        throw new Error("Missing code or state parameter");
      }
      if (!platformId) {
        throw new Error("Missing platform ID");
      }

      // Validate state via internal query
      const storedState = await ctx.runQuery(api.social.getOAuthStateInternal, {
        state,
        platform: platformId,
      });
      if (!storedState) {
        return new Response(`
          <!DOCTYPE html>
          <html><head><title>Connection Failed</title>
          <style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px}button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}</style></head>
          <body><div class="c"><h2>Connection Failed</h2><p>Invalid or expired OAuth state</p><button onclick="window.close()">Close</button></div></body></html>
        `, { status: 200, headers: { "Content-Type": "text/html" } });
      }

      // Exchange code for token
      const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY || "";
      const POSTIZ_CLIENT_ID = process.env.POSTIZ_CLIENT_ID || "";
      const POSTIZ_CLIENT_SECRET = process.env.POSTIZ_CLIENT_SECRET || "";
      const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
      const APP_URL = process.env.APP_URL || "";

      if (!POSTIZ_CLIENT_ID || !POSTIZ_CLIENT_SECRET) {
        throw new Error("Postiz OAuth credentials not configured");
      }

      const tokenRes = await fetch(`${POSTIZ_API_URL}/oauth/token`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${POSTIZ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platformId,
          code,
          redirect_uri: `${APP_URL}/api/postiz/callback/${platformId}`,
        }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Token exchange failed: ${err}`);
      }
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) throw new Error("No access token returned");

      // Register connection with Postiz
      let integrationId = tokenData.integration_id || "";
      let username = tokenData.platform_username || "";
      try {
        const connectRes = await fetch(`${POSTIZ_API_URL}/platforms/connect`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${POSTIZ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: platformId,
            access_token: accessToken,
            integration_id: integrationId,
          }),
        });
        if (connectRes.ok) {
          const connectData = await connectRes.json().catch(() => ({}));
          if (connectData.integration_id) integrationId = connectData.integration_id;
        }
      } catch (_) {}

      // Save connection via internal mutation
      const platformNames: Record<string, string> = {
        x: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook",
        instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
        pinterest: "Pinterest", reddit: "Reddit", threads: "Threads",
        telegram: "Telegram", discord: "Discord", bluesky: "Bluesky",
      };
      const platformName = platformNames[platformId] || platformId;

      await ctx.runMutation(api.social.saveConnectionMutation, {
        adminId: storedState.adminId,
        platformId,
        platformName,
        integrationId,
        accessToken,
        refreshToken: tokenData.refresh_token || "",
        platformUserId: tokenData.platform_user_id || "",
        platformUsername: username,
      });

      // Delete used OAuth state
      await ctx.runMutation(api.social.deleteOAuthStateMutation, {
        stateId: storedState._id,
      });

      return new Response(`
        <!DOCTYPE html>
        <html><head><title>Connected to ${platformName}</title>
        <style>
          body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#059669,#047857);margin:0}
          .c{text-align:center;background:white;padding:40px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
          .icon{font-size:64px;margin-bottom:20px}
          h2{color:#065f46;margin:0 0 10px}p{color:#666;margin:0 0 20px}
          .badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;font-size:14px;display:inline-flex;align-items:center;gap:8px}
          button{background:#059669;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px;font-weight:600;margin-top:20px}
        </style></head>
        <body><div class="c">
          <div class="icon">✅</div>
          <h2>Connected Successfully!</h2>
          <p style="text-transform:capitalize"><strong>${platformName}</strong> is now connected and ready for posting.</p>
          <div class="badge">🤖 Auto-posting enabled</div><br>
          <button onclick="closeAndNotify()">Done</button>
        </div>
        <script>
          function closeAndNotify(){
            if(window.opener){window.opener.postMessage({type:'social_connection_success',platformId:'${platformId}',username:'${username}'},'*')}
            window.close();
          }
          setTimeout(closeAndNotify,2500);
        </script>
        </body></html>
      `, { status: 200, headers: { "Content-Type": "text/html" } });

    } catch (error: any) {
      console.error("[OAUTH] Callback error:", error);
      return new Response(`
        <!DOCTYPE html>
        <html><head><title>Connection Error</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px;font-size:14px}button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}</style></head>
        <body><div class="c">
          <h2>Connection Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()">Close</button>
        </div></body></html>
      `, { status: 200, headers: { "Content-Type": "text/html" } });
    }
  }),
});

export default http;
