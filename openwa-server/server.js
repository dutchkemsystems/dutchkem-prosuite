/**
 * Dutchkem OpenWA Cloud Server
 * 
 * Connects to WhatsApp via Baileys and polls Convex for pending messages.
 * Supports both admin and enterprise sessions.
 * 
 * Environment Variables:
 *   CONVEX_URL - Your Convex deployment URL
 *   SESSION_TYPE - "admin" or "enterprise" (default: "admin")
 *   POLL_INTERVAL_MS - How often to check for messages (default: 3000)
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { ConvexClient } = require('convex/browser');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const http = require('http');

// ─── CONFIG ───

const CONVEX_URL = process.env.CONVEX_URL || 'https://warmhearted-aardvark-280.convex.cloud';
const SESSION_TYPE = process.env.SESSION_TYPE || 'admin';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '3000');
const AUTH_DIR = `./auth_${SESSION_TYPE}`;

const logger = pino({ level: 'silent' });

// ─── CONVEX CLIENT ───

const convex = new ConvexClient(CONVEX_URL);

// ─── WHATSAPP SOCKET ───

let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
    browser: ['Dutchkem ProSuite', 'Chrome', '4.0.0'],
  });

  // ─── QR CODE ───
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`\n[${SESSION_TYPE.toUpperCase()}] Scan QR code:`);
      qrcode.generate(qr, { small: true });
      
      // Report QR to Convex
      await convex.mutation('whatsapp_openwa:reportQR', {
        sessionType: SESSION_TYPE,
        qr,
      });
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`[${SESSION_TYPE}] Connection closed. Reason: ${reason}`);
      
      isConnected = false;
      await convex.mutation('whatsapp_openwa:reportSessionStatus', {
        sessionType: SESSION_TYPE,
        status: 'disconnected',
        error: `Connection closed: ${reason}`,
      });

      // Reconnect unless logged out
      if (reason !== DisconnectReason.loggedOut) {
        console.log(`[${SESSION_TYPE}] Reconnecting in 5 seconds...`);
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log(`[${SESSION_TYPE}] Logged out. Delete ${AUTH_DIR} and restart.`);
      }
    }

    if (connection === 'open') {
      console.log(`[${SESSION_TYPE}] Connected to WhatsApp!`);
      isConnected = true;
      
      await convex.mutation('whatsapp_openwa:reportSessionStatus', {
        sessionType: SESSION_TYPE,
        status: 'connected',
      });
    }
  });

  // ─── SAVE CREDENTIALS ───
  sock.ev.on('creds.update', saveCreds);

  // ─── HANDLE INCOMING MESSAGES ───
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue; // Skip own messages
      
      const from = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      
      if (text) {
        console.log(`[${SESSION_TYPE}] Message from ${from}: ${text}`);
        
        // Log inbound message to Convex
        await convex.mutation('whatsapp_integration:logMessage', {
          phoneNumber: from,
          messageType: 'text',
          status: 'received',
          messageId: msg.key.id,
        });
      }
    }
  });
}

// ─── POLL CONVEX FOR PENDING MESSAGES ───

async function pollPendingMessages() {
  if (!isConnected || !sock) return;

  try {
    // Get pending messages from Convex
    const messages = await convex.query('whatsapp_openwa:getPendingMessages', {
      sessionType: SESSION_TYPE,
      limit: 5,
    });

    for (const msg of messages) {
      try {
        // Mark as sending
        await convex.mutation('whatsapp_openwa:markMessageSending', {
          messageId: msg._id,
        });

        let result;

        if (msg.to.startsWith('group:')) {
          // Group message
          const groupId = msg.to.replace('group:', '');
          if (msg.messageType === 'image' && msg.mediaUrl) {
            result = await sock.sendMessage(groupId, {
              image: { url: msg.mediaUrl },
              caption: msg.caption || msg.content,
            });
          } else {
            result = await sock.sendMessage(groupId, { text: msg.content });
          }
        } else {
          // Direct message
          if (msg.messageType === 'image' && msg.mediaUrl) {
            result = await sock.sendMessage(msg.to, {
              image: { url: msg.mediaUrl },
              caption: msg.caption || msg.content,
            });
          } else {
            result = await sock.sendMessage(msg.to, { text: msg.content });
          }
        }

        // Mark as sent
        await convex.mutation('whatsapp_openwa:markMessageSent', {
          messageId: msg._id,
          externalId: result.key.id || 'sent',
        });

        console.log(`[${SESSION_TYPE}] Sent to ${msg.to}`);

        // Small delay between messages
        await new Promise(r => setTimeout(r, 1000));

      } catch (sendErr) {
        console.error(`[${SESSION_TYPE}] Failed to send to ${msg.to}:`, sendErr.message);
        
        await convex.mutation('whatsapp_openwa:markMessageFailed', {
          messageId: msg._id,
          error: sendErr.message,
        });
      }
    }
  } catch (pollErr) {
    console.error(`[${SESSION_TYPE}] Poll error:`, pollErr.message);
  }
}

// ─── HEALTH CHECK HTTP SERVER ───

const HEALTH_PORT = 2785;

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const status = {
      ok: true,
      sessionType: SESSION_TYPE,
      connected: isConnected,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ─── MAIN ───

async function main() {
  console.log(`\n=== Dutchkem OpenWA Server ===`);
  console.log(`Session: ${SESSION_TYPE}`);
  console.log(`Convex: ${CONVEX_URL}`);
  console.log(`Poll interval: ${POLL_INTERVAL}ms\n`);

  // Start health check server
  healthServer.listen(HEALTH_PORT, () => {
    console.log(`[${SESSION_TYPE}] Health server listening on port ${HEALTH_PORT}`);
  });

  // Connect to WhatsApp
  await connectToWhatsApp();

  // Start polling for messages
  setInterval(pollPendingMessages, POLL_INTERVAL);

  // Health check every 30 seconds
  setInterval(async () => {
    if (isConnected) {
      await convex.mutation('whatsapp_openwa:reportSessionStatus', {
        sessionType: SESSION_TYPE,
        status: 'connected',
      });
    }
  }, 30000);
}

main().catch(console.error);
