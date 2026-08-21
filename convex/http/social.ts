import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { HttpRouter } from "convex/server";

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function manualBase64(input: string): string {
  const utf8: Array<number> = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
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

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dutchkem-prosuite-app.vercel.app/admin/dashboard";
const LOCATION_ORIGIN = process.env.CONVEX_SITE_URL || "https://dutchkem-prosuite-app.vercel.app";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

export function registerSocialRoutes(http: HttpRouter) {
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

      const successHtml = (username: string) => {
        const safePlatform = escapeHtml(platform);
        const safeUsername = escapeHtml(username);
        const safePlatformName = escapeHtml(platformName);
        const safeDashboardUrl = escapeHtml(DASHBOARD_URL);
        return `<!DOCTYPE html><html><head><title>Connected to ${safePlatformName}</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#059669,#047857);margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.icon{font-size:64px;margin-bottom:20px}h2{color:#065f46;margin:0 0 10px}p{color:#666;margin:0 0 20px}.badge{background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:30px;font-size:14px;display:inline-flex;align-items:center;gap:8px}button{background:#059669;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px;font-weight:600;margin-top:20px}</style></head><body><div class="c"><div class="icon">SUCCESS</div><h2>Connected Successfully!</h2><p><strong>${safePlatformName}</strong> is now connected.</p><div class="badge">Ready for posting</div><br><button onclick="closeAndNotify()">Done</button></div><script>function closeAndNotify(){try{var r={type:'social_connection_success',platformId:'${safePlatform}',username:'${safeUsername}'};if(window.opener){window.opener.postMessage(r,LOCATION_ORIGIN);}try{localStorage.setItem('oauth_result',JSON.stringify(r));}catch(e){}try{window.close();}catch(e){}try{window.open('','_self').close();}catch(e){}setTimeout(function(){window.location.href='${safeDashboardUrl}?connected=${safePlatform}';},500);}catch(e){window.location.href='${safeDashboardUrl}?connected=${safePlatform}';}}setTimeout(closeAndNotify,2000);</script></body></html>`;
      };

      const errorHtml = (msg: string) => {
        const safeMsg = escapeHtml(msg);
        const safeDashboardUrl = escapeHtml(DASHBOARD_URL);
        return `<!DOCTYPE html><html><head><title>Connection Failed</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fee2e2;margin:0}.c{text-align:center;background:white;padding:40px;border-radius:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.15)}h2{color:#dc2626;margin:0 0 10px}p{color:#666;margin:0 0 20px;font-size:14px}button{background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:30px;cursor:pointer;font-size:16px}</style></head><body><div class="c"><h2>Connection Failed</h2><p>${safeMsg}</p><button onclick="if(window.opener){window.close();}else{window.location.href='${safeDashboardUrl}';}">Close</button></div></body></html>`;
      };

      try {
        if (error) return new Response(errorHtml(error === "access_denied" ? "You denied access." : error), { status: 200, headers: { "Content-Type": "text/html" } });
        if (!code || !state || !platform) return new Response(errorHtml("Missing required parameters"), { status: 200, headers: { "Content-Type": "text/html" } });

        const storedState = await ctx.runQuery(internal.social.getOAuthState, { state });
        if (!storedState) return new Response(errorHtml("Invalid or expired OAuth state"), { status: 200, headers: { "Content-Type": "text/html" } });

        const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`] || process.env[`${platform.toUpperCase()}_APP_ID`] || process.env[`${platform.toUpperCase()}_CLIENT_KEY`] || "";
        const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] || process.env[`${platform.toUpperCase()}_APP_SECRET`] || "";
        const siteUrl = process.env.CONVEX_SITE_URL || "https://warmhearted-aardvark-280.convex.site";
        const redirectUri = `${siteUrl}/api/social/callback/${platform}`;

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

  http.route({
    path: "/api/composio/callback",
    method: "GET",
    handler: httpAction(async (_ctx, req) => {
      const url = new URL(req.url);
      const connectedAccountId = url.searchParams.get("connected_account_id") || url.searchParams.get("id") || "";
      const status = url.searchParams.get("status") || "INITIATED";
      const platform = url.searchParams.get("platform") || url.searchParams.get("toolkit") || "";

      const html = (ok: boolean, title: string, msg: string, badge?: string) => {
        const safeTitle = escapeHtml(title);
        const safeMsg = escapeHtml(msg);
        const safeBadge = badge ? escapeHtml(badge) : undefined;
        const safePlatform = escapeHtml(platform);
        const safeConnectedAccountId = escapeHtml(connectedAccountId);
        const safeStatus = escapeHtml(status);
        const safeDashboardUrl = escapeHtml(DASHBOARD_URL);
        return `<!DOCTYPE html><html><head><title>${safeTitle}</title><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:${ok ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#dc2626,#b91c1c)"};margin:0;color:#fff}.c{text-align:center;background:rgba(255,255,255,.95);padding:48px 56px;border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,.3);max-width:480px;color:#1e293b}.icon{font-size:72px;margin-bottom:16px}h2{margin:0 0 8px;font-size:24px;font-weight:800}p{color:#475569;margin:0 0 24px;line-height:1.5;font-size:15px}.badge{background:${ok ? "#d1fae5" : "#fee2e2"};color:${ok ? "#065f46" : "#991b1b"};padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;display:inline-block;margin-bottom:16px}button{background:${ok ? "#059669" : "#dc2626"};color:white;border:none;padding:14px 32px;border-radius:999px;cursor:pointer;font-size:15px;font-weight:700;margin-top:8px}</style></head><body><div class="c"><div class="icon">${ok ? "OK" : "ERROR"}</div><h2>${safeTitle}</h2><p>${safeMsg}</p>${safeBadge ? `<div class="badge">${safeBadge}</div>` : ""}<br><button onclick="finish()">Close</button></div><script>function finish(){try{var r1={type:'social_connection_success',provider:'composio',platformId:'${safePlatform}',connectedAccountId:'${safeConnectedAccountId}'};var r2={type:'composio_connection_complete',connectedAccountId:'${safeConnectedAccountId}',status:'${safeStatus}'};if(window.opener){window.opener.postMessage(r1,LOCATION_ORIGIN);window.opener.postMessage(r2,LOCATION_ORIGIN);}try{localStorage.setItem('oauth_result',JSON.stringify(r1));localStorage.setItem('composio_result',JSON.stringify(r2));}catch(e){}try{window.close();}catch(e){}try{window.open('','_self').close();}catch(e){}setTimeout(function(){window.location.href='${safeDashboardUrl}?connected=${safePlatform}';},500);}catch(e){window.location.href='${safeDashboardUrl}?connected=${safePlatform}';}}setTimeout(finish,2000);</script></body></html>`;
      };

      if (!connectedAccountId) return new Response(html(false, "Composio: Missing Account ID", "No connected_account_id was returned from Composio. Please try again."), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

      const title = status === "ACTIVE" ? "Connected via Composio" : "Composio: Finalizing...";
      const msg = status === "ACTIVE" ? "Your account is connected and ready for posting. Returning to dashboard..." : "Almost done - Composio is finalizing your connection. The dashboard will pick it up automatically.";
      const badge = status === "ACTIVE" ? "Managed by Composio" : "Polling status...";

      return new Response(html(true, title, msg, badge), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }),
  });
}
