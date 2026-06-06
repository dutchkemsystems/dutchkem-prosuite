import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function manualBase64(input: string): string {
  const utf8: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else if (c < 0x10000) utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
    else utf8.push((c >> 18) | 0xf0, ((c >> 12) & 0x3f) | 0x80, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
  }
  const data = new Uint8Array(utf8);
  let result = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < data.length ? data[i + 1] : 0;
    const b3 = i + 2 < data.length ? data[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < data.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < data.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

const DASHBOARD_URL = "https://dutchkem-prosuite-app.vercel.app/admin/dashboard";

// ═══════════════════════════════════════════════════════════════════
// OTP RATE LIMITING (5 requests per hour per phone number)
// ═══════════════════════════════════════════════════════════════════
const otpRateLimit = new Map<string, number[]>();
const OTP_MAX_REQUESTS = 5;
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

http.route({
  path: "/api/otp/send",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    try {
      const body = await req.json();
      let { phone } = body;
      if (!phone) return new Response(JSON.stringify({ success: false, message: 'Phone number is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '234' + phone.substring(1);
      if (!phone.startsWith('234')) phone = '234' + phone;
      if (phone.length !== 13) return new Response(JSON.stringify({ success: false, message: 'Invalid phone number format. Use 080XXXXXXXX or 23480XXXXXXXX' }), { status: 400, headers: { "Content-Type": "application/json" } });
      
      // Rate limiting: 5 requests per hour per phone number
      const rateCheck = checkOtpRateLimit(phone);
      if (!rateCheck.allowed) {
        return new Response(JSON.stringify({ success: false, message: `Too many OTP requests. Please try again in ${rateCheck.retryAfter} minutes.` }), { status: 429, headers: { "Content-Type": "application/json" } });
      }
      
      const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
      if (IS_DEVELOPMENT && !process.env.TERMII_API_KEY) return new Response(JSON.stringify({ success: true, pinId: 'demo_' + Date.now(), channel: 'demo', message: 'Demo OTP sent. Use any 6-digit code to verify.' }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (!process.env.TERMII_API_KEY) return new Response(JSON.stringify({ success: false, message: 'SMS service not configured' }), { status: 503, headers: { "Content-Type": "application/json" } });
      const requestBody = { api_key: process.env.TERMII_API_KEY, message_type: 'NUMERIC', to: phone, from: 'N-Alert', channel: 'dnd', pin_attempts: 3, pin_time_to_live: 10, pin_length: 6, pin_placeholder: '< 1234 >', message_text: 'Your Dutchkem Ventures verification code is < 1234 >. Valid for 10 minutes.', pin_type: 'NUMERIC' };
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const data = await response.json();
      if (data.pinId || data.pin_id) return new Response(JSON.stringify({ success: true, pinId: data.pinId || data.pin_id, channel: 'sms' }), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: false, message: data.message || 'Failed to send OTP', details: data }), { status: 502, headers: { "Content-Type": "application/json" } });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/api/otp/verify",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    try {
      const { pinId, pin } = await req.json();
      if (!pinId || !pin) return new Response(JSON.stringify({ success: false, verified: false, message: 'Pin ID and PIN are required' }), { status: 400, headers: { "Content-Type": "application/json" } });
      if (pinId.startsWith('demo_')) { const isValid = /^\d{6}$/.test(pin); return new Response(JSON.stringify({ success: true, verified: isValid, message: isValid ? 'Phone verified successfully' : 'Invalid OTP' }), { status: 200, headers: { "Content-Type": "application/json" } }); }
      if (!process.env.TERMII_API_KEY) return new Response(JSON.stringify({ success: false, verified: false, message: 'Verification service unavailable' }), { status: 503, headers: { "Content-Type": "application/json" } });
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, pin_id: pinId, pin }) });
      const data = await response.json();
      const isVerified = data.verified === true || data.verified === 'True';
      return new Response(JSON.stringify({ success: true, verified: isVerified, message: isVerified ? 'Phone verified successfully' : 'Invalid or expired OTP' }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, verified: false, message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

const agentHandler = (actionFn: any) => httpAction(async (ctx, req) => {
  const { prompt } = await req.json();
  if (!prompt) return new Response("Missing prompt", { status: 400 });
  const result = await ctx.runAction(actionFn, { prompt });
  return new Response(JSON.stringify({ response: result }), { status: 200, headers: { "Content-Type": "application/json" } });
});

http.route({ path: "/api/agents/a1/generate", method: "POST", handler: agentHandler(internal.academic_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a2/generate", method: "POST", handler: agentHandler(internal.business_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a3/generate", method: "POST", handler: agentHandler(internal.content_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a4/generate", method: "POST", handler: agentHandler(internal.career_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a5/generate", method: "POST", handler: agentHandler(internal.shopping_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a6/generate", method: "POST", handler: agentHandler(internal.certification_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a7/generate", method: "POST", handler: agentHandler(internal.finance_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a8/generate", method: "POST", handler: agentHandler(internal.video_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a9/generate", method: "POST", handler: agentHandler(internal.wellness_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a10/generate", method: "POST", handler: agentHandler(internal.home_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a11/generate", method: "POST", handler: agentHandler(internal.language_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a12/generate", method: "POST", handler: agentHandler(internal.travel_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a13/generate", method: "POST", handler: agentHandler(internal.exam_career_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a14/generate", method: "POST", handler: agentHandler(internal.translation_chat.generateSimpleResponse) });
http.route({ path: "/api/agents/a15/generate", method: "POST", handler: agentHandler(internal.event_chat.generateSimpleResponse) });

http.route({
  path: "/api/webhooks/kora",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("x-kora-signature") || "";
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const verification = await ctx.runMutation(internal.guardian.verifyPayment, { reference: body.reference, amount: body.amount, currency: body.currency, ip, userId: body.metadata?.userId || body.userId, signature, agentId: body.metadata?.agentId, service: body.metadata?.service });
    if (verification.status === "approved") { try { await ctx.runMutation(internal.abandonedCheckouts.completeCheckout, { reference: body.reference }); } catch { } }
    return new Response(JSON.stringify({ webhookStatus: "processed", ...verification }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

http.route({
  path: "/api/marketplace/jobs/approve",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const { transactionId, clientId } = body;
    if (!transactionId || !clientId) return new Response(JSON.stringify({ error: "Missing transactionId or clientId" }), { status: 400, headers: { "Content-Type": "application/json" } });
    await ctx.runMutation(api.marketplace.approveJob, { transactionId, clientId });
    return new Response(JSON.stringify({ success: true, message: "Work approved. Payout scheduled for Friday 2 PM." }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

async function verifyAdminToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try { const payload = JSON.parse(atob(token.split(".")[1])); if (payload.role !== "admin") return null; return payload.sub || null; } catch { return null; }
}

http.route({ path: "/api/admin/marketplace/escrow", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const balance = await ctx.runQuery(api.marketplace.getEscrowBalance); return new Response(JSON.stringify(balance), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
http.route({ path: "/api/admin/marketplace/pending-payout", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const pending = await ctx.runQuery(api.marketplace.getPendingFridayPayout); return new Response(JSON.stringify(pending), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
http.route({ path: "/api/admin/marketplace/payouts", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const url = new URL(req.url); const limit = Number(url.searchParams.get("limit")) || 50; const payouts = await ctx.runQuery(api.marketplace.getPayoutHistory, { limit }); return new Response(JSON.stringify(payouts), { status: 200, headers: { "Content-Type": "application/json" } }); }) });
http.route({ path: "/api/admin/marketplace/stats", method: "GET", handler: httpAction(async (ctx, req) => { const adminId = await verifyAdminToken(req); if (!adminId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); const stats = await ctx.runQuery(api.marketplace.getMarketplaceStats); return new Response(JSON.stringify(stats), { status: 200, headers: { "Content-Type": "application/json" } }); }) });

// ========== SOCIAL OAUTH CALLBACK ==========
http.route({
  path: "/api/social/callback/:platform",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const platform = (req as any).params?.platform || url.searchParams.get("platform") || "";
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const platformNames: Record<string, string> = { x: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", pinterest: "Pinterest", reddit: "Reddit", threads: "Threads", telegram: "Telegram", discord: "Discord", bluesky: "Bluesky" };
    const platformName = platformNames[platform] || platform;

    const successHtml = (username: string) => `<!DOCTYPE html><html><head><title>Connected to ${platformName}</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#059669,#047857);margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.icon{font-size:64px;margin-bottom:20px}h2{color:#065f46;margin:0 0 10px}p{color:#666;margin:0 0 20px}.badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;font-size:14px;display:inline-flex;align-items:center;gap:8px}button{background:#059669;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px;font-weight:600;margin-top:20px}</style></head><body><div class="c"><div class="icon">SUCCESS</div><h2>Connected Successfully!</h2><p><strong>${platformName}</strong> is now connected.</p><div class="badge">Ready for posting</div><br><button onclick="closeAndNotify()">Done</button></div><script>function closeAndNotify(){if(window.opener){window.opener.postMessage({type:'social_connection_success',platformId:'${platform}',username:'${username}'},'*');window.close();}else{window.location.href='${DASHBOARD_URL}?connected=${platform}';}}setTimeout(closeAndNotify,2500);</script></body></html>`;

    const errorHtml = (msg: string) => `<!DOCTYPE html><html><head><title>Connection Failed</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px;font-size:14px}button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}</style></head><body><div class="c"><h2>Connection Failed</h2><p>${msg}</p><button onclick="if(window.opener){window.close();}else{window.location.href='${DASHBOARD_URL}';}">Close</button></div></body></html>`;

    try {
      if (error) return new Response(errorHtml(error === "access_denied" ? "You denied access." : error), { status: 200, headers: { "Content-Type": "text/html" } });
      if (!code || !state || !platform) return new Response(errorHtml("Missing required parameters"), { status: 200, headers: { "Content-Type": "text/html" } });

      const storedState = await ctx.runQuery(internal.social.getOAuthState, { state });
      if (!storedState) return new Response(errorHtml("Invalid or expired OAuth state"), { status: 200, headers: { "Content-Type": "text/html" } });

      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || process.env[`${platform.toUpperCase()}_APP_ID`] || process.env[`${platform.toUpperCase()}_CLIENT_KEY`] || "";
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] || process.env[`${platform.toUpperCase()}_APP_SECRET`] || "";
      const appUrl = process.env.APP_URL || "https://dutchkem-prosuite-app.vercel.app";
      const redirectUri = `${appUrl}/api/social/callback/${platform}`;

      let tokenData: any = {};
      let username = "";

      if (platform === "x") {
        const res = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${manualBase64(`${clientId}:${clientSecret}`)}` }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, code_verifier: storedState.codeVerifier || "" }).toString() });
        tokenData = await res.json();
      } else if (platform === "linkedin") {
        const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString() });
        tokenData = await res.json();
      } else if (platform === "facebook" || platform === "instagram") {
        const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
        tokenData = await res.json();
      } else if (platform === "reddit") {
        const res = await fetch("https://www.reddit.com/api/v1/access_token", { method: "POST", headers: { "Authorization": `Basic ${manualBase64(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri }).toString() });
        tokenData = await res.json();
      } else if (platform === "discord") {
        const res = await fetch("https://discord.com/api/v10/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }).toString() });
        tokenData = await res.json();
      } else if (platform === "youtube") {
        const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString() });
        tokenData = await res.json();
      } else if (platform === "tiktok") {
        const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_key: clientId, client_secret: clientSecret }).toString() });
        tokenData = await res.json();
      } else if (platform === "pinterest") {
        const res = await fetch("https://api.pinterest.com/v5/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${manualBase64(`${clientId}:${clientSecret}`)}` }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri }).toString() });
        tokenData = await res.json();
      } else if (platform === "threads") {
        const res = await fetch("https://graph.threads.net/v1.0/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }).toString() });
        tokenData = await res.json();
      }

      const accessToken = tokenData.access_token;
      if (!accessToken) return new Response(errorHtml("No access token received"), { status: 200, headers: { "Content-Type": "text/html" } });

      try {
        if (platform === "x") { const r = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.data?.username || ""; }
        else if (platform === "linkedin") { const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.preferred_username || d.email || ""; }
        else if (platform === "facebook" || platform === "instagram") { const r = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`); const d = await r.json(); username = d.email || d.name || ""; }
        else if (platform === "reddit") { const r = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.name || ""; }
        else if (platform === "discord") { const r = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.username || ""; }
        else if (platform === "youtube") { const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.email || ""; }
        else if (platform === "tiktok") { const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.data?.user?.display_name || ""; }
        else if (platform === "pinterest") { const r = await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${accessToken}` } }); const d = await r.json(); username = d.username || ""; }
        else if (platform === "threads") { const r = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`); const d = await r.json(); username = d.username || ""; }
      } catch (_) {}

      await ctx.runMutation(internal.social.savePlatformConnection, { adminId: storedState.adminId, platform, platformName, accessToken, refreshToken: tokenData.refresh_token || "", platformUserId: tokenData.user_id || "", platformUsername: username, expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined, scopes: storedState.platform || "", anonymousByDefault: true });
      await ctx.runMutation(internal.social.deleteOAuthState, { stateId: storedState._id });

      return new Response(successHtml(username), { status: 200, headers: { "Content-Type": "text/html" } });
    } catch (error: any) {
      return new Response(errorHtml(error.message), { status: 200, headers: { "Content-Type": "text/html" } });
    }
  }),
});

http.route({
  path: "/api/social/callback",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") || "x";
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const error = url.searchParams.get("error") || "";
    const newUrl = `/api/social/callback/${platform}?code=${code}&state=${state}${error ? `&error=${error}` : ""}`;
    return new Response(null, { status: 302, headers: { Location: newUrl } });
  }),
});

// ========== TELEGRAM BOT WEBHOOK ==========

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, opts: any = {}): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...opts }) });
    if (!res.ok) { console.error("[telegram] sendMessage failed:", await res.text()); return false; }
    return true;
  } catch (err) { console.error("[telegram] sendMessage error:", err); return false; }
}

http.route({
  path: "/api/telegram/webhook",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return new Response(JSON.stringify({ ok: false, error: "bot_token_not_set" }), { status: 200, headers: { "Content-Type": "application/json" } });

    let update: any;
    try { update = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 200, headers: { "Content-Type": "application/json" } }); }

    const message = update?.message;
    if (!message) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    const chatId: number = message.chat?.id;
    const text: string = (message.text || "").trim();
    const firstName: string = message.from?.first_name || "there";
    if (!chatId || !text) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    const cmd = text.split(/\s+/)[0].toLowerCase();
    let reply = "";

    switch (cmd) {
      case "/start": reply = `Welcome to Dutchkem Marketing Bot, ${firstName}!\n\nCommands:\n/connect - Link social accounts\n/status - Check connections\n/post - Publish messages\n/disconnect - Unlink accounts\n/support - Get help\n\nDashboard: ${DASHBOARD_URL}`; break;
      case "/help": reply = `Available Commands:\n/start - Welcome\n/connect - Connect social accounts\n/status - Show linked platforms\n/post message - Broadcast a post\n/disconnect - Unlink accounts\n/support - Get help\n\nDashboard: ${DASHBOARD_URL}`; break;
      case "/connect": reply = `Connect Your Social Accounts:\n1. Open: ${DASHBOARD_URL}\n2. Go to Social Engine > Connected Platforms\n3. Click the platform you want to add\n4. Authorize the connection in the popup`; break;
      case "/status": reply = `Check your connections at: ${DASHBOARD_URL}\nLook at the Social Engine tab to see which platforms are linked.`; break;
      case "/post": {
        const postContent = text.replace(/^\/post\s*/i, "").trim();
        reply = postContent ? `Post queued: "${postContent.slice(0, 80)}${postContent.length > 80 ? "..." : ""}"\n\nFinal publishing happens in the dashboard.` : `Usage: /post Your message here\nExample: /post Just launched our new product!`;
        break;
      }
      case "/disconnect": reply = `To unlink a platform:\n${DASHBOARD_URL}\nGo to Social Engine > Connected Platforms and click Disconnect.`; break;
      case "/support": reply = `Need Help?\nEmail: support@dutchkem.com\nLive chat: ${DASHBOARD_URL}\nWhatsApp: +234 800 000 0000`; break;
      default: reply = text.startsWith("/") ? `Unknown command. Try /help to see what's available.` : `Hi ${firstName}! I'm the Dutchkem Marketing Bot.\n\nType /help to see what I can do, or /connect to link your social media accounts.`; break;
    }

    await sendTelegramMessage(botToken, chatId, reply);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

// ========== COMPOSIO OAUTH CALLBACK ==========
http.route({
  path: "/api/composio/callback",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const connectedAccountId = url.searchParams.get("connected_account_id") || url.searchParams.get("id") || "";
    const status = url.searchParams.get("status") || "INITIATED";
    const platform = url.searchParams.get("platform") || url.searchParams.get("toolkit") || "";

    const html = (ok: boolean, title: string, msg: string, badge?: string) => `<!DOCTYPE html><html><head><title>${title}</title><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:${ok ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#dc2626,#b91c1c)"};margin:0;color:#fff}.c{text-align:center;background:rgba(255,255,255,.95);padding:48px 56px;border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,.3);max-width:480px;color:#1e293b}.icon{font-size:72px;margin-bottom:16px}h2{margin:0 0 8px;font-size:24px;font-weight:800}p{color:#475569;margin:0 0 24px;line-height:1.5;font-size:15px}.badge{background:${ok ? "#d1fae5" : "#fee2e2"};color:${ok ? "#065f46" : "#991b1b"};padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;display:inline-block;margin-bottom:16px}button{background:${ok ? "#059669" : "#dc2626"};color:white;border:none;padding:14px 32px;border-radius:999px;cursor:pointer;font-size:15px;font-weight:700;margin-top:8px}</style></head><body><div class="c"><div class="icon">${ok ? "OK" : "ERROR"}</div><h2>${title}</h2><p>${msg}</p>${badge ? `<div class="badge">${badge}</div>` : ""}<br><button onclick="finish()">Close</button></div><script>function finish(){if(window.opener){window.opener.postMessage({type:'social_connection_success',provider:'composio',platformId:'${platform}',connectedAccountId:'${connectedAccountId}'},'*');window.opener.postMessage({type:'composio_connection_complete',connectedAccountId:'${connectedAccountId}',status:'${status}'},'*');window.close();}else{window.location.href='${DASHBOARD_URL}?connected=${platform}';}}setTimeout(finish,2000);</script></body></html>`;

    if (!connectedAccountId) return new Response(html(false, "Composio: Missing Account ID", "No connected_account_id was returned from Composio. Please try again."), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

    const title = status === "ACTIVE" ? "Connected via Composio" : "Composio: Finalizing...";
    const msg = status === "ACTIVE" ? "Your account is connected and ready for posting. Returning to dashboard..." : "Almost done - Composio is finalizing your connection. The dashboard will pick it up automatically.";
    const badge = status === "ACTIVE" ? "Managed by Composio" : "Polling status...";

    return new Response(html(true, title, msg, badge), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }),
});

export default http;
