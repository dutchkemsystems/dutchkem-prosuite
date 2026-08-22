import { httpAction } from "../_generated/server";
import type { HttpRouter } from "convex/server";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dutchkem-prosuite-app.vercel.app/admin/dashboard";

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, opts: any = {}): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...opts }) });
    if (!res.ok) { console.error("[telegram] sendMessage failed:", await res.text()); return false; }
    return true;
  } catch (err) { console.error("[telegram] sendMessage error:", err); return false; }
}

export function registerTelegramRoutes(http: HttpRouter) {
  http.route({
    path: "/api/telegram/webhook",
    method: "POST",
    handler: httpAction(async (_ctx, req) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return new Response(JSON.stringify({ ok: false, error: "bot_token_not_set" }), { status: 200, headers: { "Content-Type": "application/json" } });

      let update: any;
      try { update = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 200, headers: { "Content-Type": "application/json" } }); }
      if (!update || typeof update !== "object") return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 200, headers: { "Content-Type": "application/json" } });

      const message = update?.message;
      if (!message) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

      const chatId: number = message.chat?.id;
      const text: string = (message.text || "").trim();
      const firstName: string = message.from?.first_name || "there";
      if (!chatId || typeof chatId !== "number") return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (!text || typeof text !== "string") return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (text.length > 4000) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

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
}
