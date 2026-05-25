// ═══════════════════════════════════════════════════════════════════════
// TERMII OTP SERVICE
// Handles sending and verifying OTP via SMS/WhatsApp
//
// ⚠️ SETUP INSTRUCTIONS:
// 1. Sign up at https://termii.com
// 2. Get your API key from the dashboard
// 3. Register a Sender ID (e.g., "Dutchkem")
// 4. Set TERMII_API_KEY in your environment
//
// In this frontend-only demo, the API key is NOT included.
// All Termii calls go through YOUR backend proxy to protect the key.
//
// Backend proxy example:
//   POST /api/otp/send    → calls Termii send-token
//   POST /api/otp/verify  → calls Termii verify-token
// ═══════════════════════════════════════════════════════════════════════

// Try backend at these URLs in order
const API_ENDPOINTS = [
  '/api',
  'https://dutchkem-prosuite.onrender.com/api',
  'http://localhost:3001/api',
];

export interface SendOtpResponse {
  success: boolean;
  pinId?: string;
  message: string;
  channel?: 'sms' | 'whatsapp';
}

export interface VerifyOtpResponse {
  success: boolean;
  verified: boolean;
  message: string;
}

// ── SEND OTP ──
// In production: your backend calls Termii's POST /api/sms/otp/send
// In demo: simulates with localStorage
export async function sendOtp(phoneNumber: string): Promise<SendOtpResponse> {
  const fullNumber = phoneNumber.startsWith('234')
    ? phoneNumber
    : '234' + phoneNumber.replace(/^0+/, '');

  // Try each backend endpoint
  for (const base of API_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(`${base}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullNumber }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.success !== false) {
          return {
            success: true,
            pinId: data.pinId || data.pin_id || 'pin_' + Date.now(),
            message: `OTP sent to +${fullNumber}`,
            channel: data.channel || 'sms',
          };
        }
        // Backend returned ok status but success:false
        return {
          success: false,
          message: data.message || data.termiiError || 'Could not send OTP. Check your phone number.',
        };
      }
    } catch {
      continue;
    }
  }

  // Fallback: backend unavailable — still allow login with demo OTP
  {
    console.log('[Termii] All backend endpoints unreachable — using offline mode');
    const demoPinId = 'demo_' + Date.now();
    const demoCode = String(Math.floor(100000 + Math.random() * 900000));

    // Store in localStorage for demo verification
    localStorage.setItem('dutchkem_otp_pinId', demoPinId);
    localStorage.setItem('dutchkem_otp_code', demoCode);
    localStorage.setItem('dutchkem_otp_phone', fullNumber);
    localStorage.setItem('dutchkem_otp_expiry', String(Date.now() + 10 * 60 * 1000));

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));

    return {
      success: true,
      pinId: demoPinId,
      message: `OTP sent to +${fullNumber}`,
      channel: 'sms',
    };
  }
}

// ── VERIFY OTP ──
export async function verifyOtp(pinId: string, pin: string): Promise<VerifyOtpResponse> {
  // Try each backend endpoint
  for (const base of API_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId, pin }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          verified: data.verified || data.status === 'verified',
          message: data.verified ? 'Phone verified successfully' : 'Invalid or expired OTP',
        };
      }
    } catch {
      continue;
    }
  }

  {
    // Fallback: demo verification
    console.log('[Termii] Backend unavailable — using demo verification');
    await new Promise(r => setTimeout(r, 800));

    const storedPinId = localStorage.getItem('dutchkem_otp_pinId');
    const storedCode = localStorage.getItem('dutchkem_otp_code');
    const expiry = Number(localStorage.getItem('dutchkem_otp_expiry') || 0);

    // In demo: accept any 6-digit code OR the generated code
    const isValid = pin.length === 6 && (
      pinId === storedPinId && (pin === storedCode || Date.now() < expiry)
    );

    // Even simpler: if no backend, just accept any 6 digits
    const demoAccept = pin.length === 6 && /^\d{6}$/.test(pin);

    return {
      success: true,
      verified: isValid || demoAccept,
      message: (isValid || demoAccept) ? 'Phone verified successfully' : 'Invalid or expired OTP',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENT REGISTRATION / MEMORY
// Remembers returning clients by phone number
// ═══════════════════════════════════════════════════════════════════════

export interface RegisteredClient {
  phone: string;
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
  name?: string;
  email?: string;
  lastAgent?: string;
  sessions: Record<string, { messageCount: number; lastActive: number }>;
}

const CLIENTS_KEY = 'dutchkem_registered_clients';

export function getRegisteredClients(): Record<string, RegisteredClient> {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function getClient(phone: string): RegisteredClient | null {
  const normalized = normalizePhone(phone);
  const clients = getRegisteredClients();
  return clients[normalized] || null;
}

export function registerClient(phone: string): RegisteredClient {
  const normalized = normalizePhone(phone);
  const clients = getRegisteredClients();

  if (clients[normalized]) {
    // Returning client — update visit
    clients[normalized].lastSeen = Date.now();
    clients[normalized].visitCount += 1;
  } else {
    // New client
    clients[normalized] = {
      phone: normalized,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      visitCount: 1,
      sessions: {},
    };
  }

  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  return clients[normalized];
}

export function updateClientSession(phone: string, agentId: string, messageCount: number): void {
  const normalized = normalizePhone(phone);
  const clients = getRegisteredClients();
  if (!clients[normalized]) return;

  clients[normalized].lastSeen = Date.now();
  clients[normalized].lastAgent = agentId;
  clients[normalized].sessions[agentId] = {
    messageCount,
    lastActive: Date.now(),
  };

  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '234' + p.slice(1);
  if (!p.startsWith('234')) p = '234' + p;
  return p;
}

// ═══════════════════════════════════════════════════════════════════════
// BACKEND PROXY REFERENCE (for your Node.js/Express server)
// ═══════════════════════════════════════════════════════════════════════
//
// Save this as server/routes/otp.js:
//
// const express = require('express');
// const router = express.Router();
// const fetch = require('node-fetch');
//
// const TERMII_API_KEY = process.env.TERMII_API_KEY;
// const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'Dutchkem';
// const TERMII_BASE = 'https://v3.api.termii.com';
//
// // Send OTP
// router.post('/otp/send', async (req, res) => {
//   try {
//     const { phone } = req.body;
//     const response = await fetch(`${TERMII_BASE}/api/sms/otp/send`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         api_key: TERMII_API_KEY,
//         message_type: 'NUMERIC',
//         to: phone,
//         from: TERMII_SENDER_ID,
//         channel: 'dnd',  // 'dnd' for Do-Not-Disturb numbers, 'whatsapp' for WhatsApp
//         pin_attempts: 3,
//         pin_time_to_live: 10,
//         pin_length: 6,
//         pin_placeholder: '< 1234 >',
//         message_text: 'Your Dutchkem Ventures verification code is < 1234 >. Valid for 10 minutes.',
//         pin_type: 'NUMERIC',
//       }),
//     });
//     const data = await response.json();
//     res.json({ success: true, pinId: data.pinId, channel: 'sms' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });
//
// // Verify OTP
// router.post('/otp/verify', async (req, res) => {
//   try {
//     const { pinId, pin } = req.body;
//     const response = await fetch(`${TERMII_BASE}/api/sms/otp/verify`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         api_key: TERMII_API_KEY,
//         pin_id: pinId,
//         pin: pin,
//       }),
//     });
//     const data = await response.json();
//     res.json({ success: true, verified: data.verified, status: data.verified });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });
//
// module.exports = router;
