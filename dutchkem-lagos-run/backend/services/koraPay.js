/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Kora Pay — the web/PWA checkout rail for Lagos Run kobo purchases.
 *
 * Two jobs only:
 *   1. initializeCharge() starts a hosted checkout and returns its URL.
 *   2. verifyWebhookSignature() proves a webhook really came from Kora Pay
 *      before any wallet is credited.
 *
 * The secret keys exist only here and only server-side. Nothing in this module
 * may be imported by client code.
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

/* Accept either the bare host or the host plus API prefix in KORAPAY_BASE_URL. */
const KORA_BASE = String(process.env.KORAPAY_BASE_URL || 'https://api.korapay.com')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/merchant\/api\/v1$/, '');

const SECRET = String(process.env.KORAPAY_SECRET_KEY || '').trim();
const PUBLIC = String(process.env.KORAPAY_PUBLIC_KEY || '').trim();
/* Kora does not issue a separate webhook secret: `x-korapay-signature` is an
 * HMAC-SHA256 of JSON.stringify(payload.data) keyed with the merchant SECRET
 * KEY. A dedicated KORAPAY_WEBHOOK_SECRET is honoured when present (so a key
 * rotation can accept both for a window), otherwise the secret key is used —
 * a live deploy holding only the two dashboard keys therefore still settles
 * payments instead of collecting money it never credits.
 */
const WEBHOOK_SECRET = String(process.env.KORAPAY_WEBHOOK_SECRET || '').trim() || SECRET;

const INITIALIZE_URL = KORA_BASE + '/merchant/api/v1/charges/initialize';
const TIMEOUT_MS = 15000;
const NARRATION = 'Dutchkem Ventures Lagos Run — Kobo purchase';

/* initializeCharge({ amount, currency, reference, customer, redirectUrl,
 *                    notificationUrl, metadata })
 * amount is in the smallest unit Kora expects (kobo for NGN).
 * Resolves { checkout_url, reference }; throws a descriptive Error otherwise.
 */
async function initializeCharge(params) {
  const input = params || {};

  if (!SECRET) throw new Error('KORAPAY_SECRET_KEY is not configured');
  if (!input.amount || Number(input.amount) <= 0) throw new Error('amount must be a positive integer');
  if (!input.reference) throw new Error('reference is required');
  if (!input.customer || !input.customer.email) throw new Error('customer.email is required');

  const body = {
    amount: Math.floor(Number(input.amount)),
    currency: input.currency || 'NGN',
    reference: String(input.reference),
    customer: input.customer,
    redirect_url: input.redirectUrl,
    notification_url: input.notificationUrl,
    narration: NARRATION,
    metadata: input.metadata || {},
    merchant_bears_cost: true,
  };

  let response;
  try {
    response = await fetch(INITIALIZE_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + SECRET,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      timeout: TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error('Kora Pay is unreachable: ' + error.message);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('Kora Pay returned a non-JSON response (HTTP ' + response.status + ')');
  }

  if (!response.ok || !payload || payload.status !== true || !payload.data) {
    const reason = (payload && (payload.message || payload.error)) || ('HTTP ' + response.status);
    throw new Error('Kora Pay rejected the charge: ' + reason);
  }

  const checkoutUrl = payload.data.checkout_url || payload.data.checkoutUrl;
  if (!checkoutUrl) throw new Error('Kora Pay returned no checkout_url');

  return {
    checkout_url: checkoutUrl,
    reference: payload.data.reference || body.reference,
  };
}

/* verifyWebhookSignature(rawBody, signature)
 * rawBody: the exact request bytes (express.raw), Buffer or string.
 * signature: the x-korapay-signature header.
 *
 * Kora signs JSON.stringify(payload.data), so we re-serialise that sub-object
 * rather than the whole envelope. Any malformed input is simply not trusted.
 */
function verifyWebhookSignature(rawBody, signature) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('[koraPay] no Kora signing key (KORAPAY_SECRET_KEY / KORAPAY_WEBHOOK_SECRET) — rejecting webhook');
      return false;
    }
    if (!signature || typeof signature !== 'string') return false;

    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    if (!text) return false;

    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return false;

    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(parsed.data), 'utf8')
      .digest('hex');

    const provided = signature.trim().replace(/^sha256=/i, '');

    const left = Buffer.from(expected, 'utf8');
    const right = Buffer.from(provided, 'utf8');
    if (left.length !== right.length) return false;

    return crypto.timingSafeEqual(left, right);
  } catch (error) {
    return false;
  }
}

/* signWebhookPayload(data) — test helper for local webhook simulations. */
function signWebhookPayload(data) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(data), 'utf8').digest('hex');
}

module.exports = {
  KORA_BASE: KORA_BASE,
  PUBLIC_KEY: PUBLIC,
  initializeCharge: initializeCharge,
  verifyWebhookSignature: verifyWebhookSignature,
  signWebhookPayload: signWebhookPayload,
};
