const https = require('https');

const CONVEX_URL = 'https://warmhearted-aardvark-280.convex.cloud';
const COMPOSIO_KEY = 'ak_8LQNQkC-KUdL2ei52QK9';
const TELEGRAM_TOKEN = '8867377741:AAEgaGAezFRI8iTgbRr2dvBzWvJiP2McofE';

// Content for each platform
const POSTS = {
  telegram: {
    text: `🚀 *Dutchkem Ventures ProSuite NG+*

AI-Powered Business Platform for Nigeria

✅ 15 AI Agents — Academic, Business, Content, Finance & more
✅ WhatsApp Integration — customer support on autopilot
✅ Kora Pay — seamless Nigerian payments
✅ Multi-Model AI — reliable, fast, always available

Start free today → dutchkem-prosuite-app.vercel.app

#DutchkemVentures #ProSuiteNG #AI #Nigeria`,
    parse_mode: 'Markdown',
  },
  discord: {
    content: `🚀 **Dutchkem ProSuite NG+ is LIVE!**

AI-powered business platform with **15 specialized agents** working 24/7.

**What's included:**
• Academic Pro — thesis, research, citations
• Business Pro — plans, strategy, finance
• Content Pro — blogs, social media, copywriting
• Finance Pro — budgeting, investing, savings
• MediaStudio — video, animation, editing
• + 10 more AI specialists

**Try it free:** https://dutchkem-prosuite-app.vercel.app`,
  },
  x: {
    text: `AI Agents That Work For You 24/7

15 expert agents. Academic, Business, Content, Finance & more.

No coding. Start in minutes.

dutchkem-prosuite-app.vercel.app

#DutchkemVentures #ProSuiteNG #AI #Nigeria #Business`,
  },
  facebook: {
    message: `AI Agents That Work For You 24/7 

Meet Dutchkem ProSuite NG+ — the AI-powered business platform with 15 expert agents.

✅ Academic Pro — thesis, research, citations
✅ Business Pro — plans, strategy, finance
✅ Content Pro — blogs, social media, copywriting
✅ Finance Pro — budgeting, investing, savings
✅ MediaStudio — video, animation, editing

No coding required. Start in minutes.

dutchkem-prosuite-app.vercel.app

#DutchkemVentures #ProSuiteNG #AI #Nigeria`,
  },
  linkedin: {
    content: `Introducing Dutchkem Ventures ProSuite NG+ — the AI-powered business platform built for the Nigerian market.

What makes it different?

→ 15 specialized AI agents covering Academic, Business, Content, Career, Finance, and more
→ WhatsApp integration via OpenWA for seamless customer support
→ Kora Pay payment processing for Nigerian businesses
→ Multi-model AI routing (NVIDIA NIM, OpenRouter, Groq, MiMo)
→ Enterprise-grade security with custom admin auth

Whether you're a startup founder in Lagos, a consultant in Abuja, or an enterprise in Port Harcourt — ProSuite NG+ gives you the AI workforce you need, without the enterprise price tag.

Start free today: https://dutchkem-prosuite-app.vercel.app

#AI #BusinessAutomation #Nigeria #SME #DigitalTransformation #ProSuiteNG`,
  },
};

async function postToTelegram() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: '@DutchkemProsuite_bot',
      text: POSTS.telegram.text,
      parse_mode: 'Markdown',
    });
    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); resolve(j.ok ? 'OK' : j.description); }
        catch { resolve(d); }
      });
    });
    req.on('error', e => resolve(`ERROR: ${e.message}`));
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
    req.write(body);
    req.end();
  });
}

async function postToComposio(platform, connectionId, input) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ connected_account_id: connectionId, input });
    const req = https.request(`https://backend.composio.dev/api/v3.1/actions/${platform}/run`, {
      method: 'POST',
      headers: {
        'x-api-key': COMPOSIO_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(`HTTP ${res.statusCode}: ${d.slice(0, 200)}`));
    });
    req.on('error', e => resolve(`ERROR: ${e.message}`));
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting automated posting...\n');

  // Telegram
  console.log('📱 Posting to Telegram...');
  const tgResult = await postToTelegram();
  console.log(`   Telegram: ${tgResult}\n`);

  // Discord via Composio
  console.log('💬 Posting to Discord...');
  const dcResult = await postToComposio('discord_discord/send_message', 'ca_o--N_3RljiOJ', {
    content: POSTS.discord.content,
  });
  console.log(`   Discord: ${dcResult}\n`);

  // YouTube via Composio
  console.log('📺 Posting to YouTube (via Composio)...');
  const ytResult = await postToComposio('youtube_youtube/insert_video', 'ca_6uVunLvy4vnk', {
    snippet: {
      title: 'Dutchkem ProSuite NG+ — 15 AI Agents Working 24/7',
      description: 'AI-powered business platform for Nigeria with 15 specialized agents.',
      tags: ['AI', 'Nigeria', 'Business', 'Automation'],
    },
  });
  console.log(`   YouTube: ${ytResult}\n`);

  console.log('✅ Posting complete!');
}

main().catch(console.error);
