/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Purchase routes — Kora Pay is the checkout rail for the web/PWA build.
 *
 *   POST /api/purchases/kora/initialize → create a hosted checkout
 *   GET  /api/purchases/kora/callback   → browser returns from checkout (no grant)
 *   POST /api/purchases/kora/webhook    → Kora confirms payment (grants kobo)
 *   GET  /api/purchases/kora/status     → client polls after returning (no grant)
 *   POST /api/purchases/verify          → DEPRECATED for web; native store
 *                                         billing only (Android / iOS builds)
 *
 * Money rule: kobo is granted in exactly one place — the signed webhook. The
 * callback and status routes only ever read. That way a player refreshing the
 * return URL cannot mint currency, and a lost webhook is recoverable from the
 * Kora dashboard (replay it) rather than from a client claim.
 */

const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');
const { purchaseLimiter } = require('../middleware/rateLimit');
const { initializeCharge, verifyWebhookSignature } = require('../services/koraPay');
const { signReceipt } = require('../services/signature');
const { validateGoogle, validateApple } = require('../services/receiptValidator');

/* Catalogue. `ngn` is what the player is charged, `kobo` is the wallet credit
 * in 1/100 naira. Prices are integer naira; the charge amount sent to Kora is
 * always naira × 100 (kobo), the unit Kora expects for NGN.
 */
const BUNDLES = {
  kobo_100: { sku: 'kobo_100', ngn: 100, kobo: 100, label: '100 Kobo' },
  kobo_500: { sku: 'kobo_500', ngn: 500, kobo: 500, label: '500 Kobo' },
  kobo_1200: { sku: 'kobo_1200', ngn: 1200, kobo: 1200, label: '1,200 Kobo' },
  kobo_2500: { sku: 'kobo_2500', ngn: 2500, kobo: 2500, label: '2,500 Kobo' },
  kobo_6500: { sku: 'kobo_6500', ngn: 6500, kobo: 6500, label: '6,500 Kobo' },
  starter_pack: { sku: 'starter_pack', ngn: 500, kobo: 500, label: 'Starter Pack' },
};

/* Native store product ids → wallet credit. Only POST /verify reads this. */
const SKU_MAP = {
  'com.dutchkem.lagosrun.kobo100': 100,
  'com.dutchkem.lagosrun.kobo500': 500,
  'com.dutchkem.lagosrun.kobo1200': 1200,
  'com.dutchkem.lagosrun.kobo2500': 2500,
  'com.dutchkem.lagosrun.kobo6500': 6500,
  'com.dutchkem.lagosrun.starterpack': 500,
  kobo_100: 100,
  kobo_500: 500,
  kobo_1200: 1200,
  kobo_2500: 2500,
  kobo_6500: 6500,
  starter_pack: 500,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const router = express.Router();

function originOf(req) {
  return req.protocol + '://' + req.get('host');
}

function failure(res, status, error, message) {
  return res.status(status).json({ ok: false, error: error, message: message });
}

/* POST /kora/initialize — body: { sku, email, name } */
router.post('/kora/initialize', requireSession, purchaseLimiter, async function (req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
  const bundle = BUNDLES[sku];

  if (!bundle) {
    return failure(res, 400, 'unknown_sku', 'That bundle does not exist.');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return failure(res, 400, 'invalid_email', 'A valid email address is required for the receipt.');
  }

  if (name.length < 2 || name.length > 80) {
    return failure(res, 400, 'invalid_name', 'Please provide the name for the receipt (2–80 characters).');
  }

  const uid = req.user.id;
  const reference = 'DKL-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const amount = bundle.ngn * 100; // kobo, the unit Kora charges in

  let charge;
  try {
    charge = await initializeCharge({
      amount: amount,
      currency: 'NGN',
      reference: reference,
      customer: { email: email, name: name },
      redirectUrl: config.kora.redirectUrl || originOf(req) + '/api/purchases/kora/callback',
      notificationUrl: config.kora.webhookUrl || originOf(req) + '/api/purchases/kora/webhook',
      metadata: { uid: uid, sku: sku, kobo: bundle.kobo },
    });
  } catch (error) {
    console.error('[purchases] Kora initialize failed for ' + uid + ': ' + error.message);
    return failure(res, 502, 'kora_init_failed', 'Could not start checkout. Please try again in a moment.');
  }

  db._state.purchases[reference] = {
    uid: uid,
    sku: sku,
    amount: amount,
    kobo: bundle.kobo,
    verified: false,
    ts: new Date().toISOString(),
  };
  db.persist();

  return res.json({
    ok: true,
    checkout_url: charge.checkout_url,
    reference: charge.reference || reference,
    sku: sku,
    amount: amount,
    currency: 'NGN',
    kobo: bundle.kobo,
  });
});

/* GET /kora/callback — the browser lands here after checkout.
 * Deliberately grants nothing: it forwards to the game, which polls /status.
 */
router.get('/kora/callback', function (req, res) {
  const reference = String(req.query.reference || req.query.ref || '').trim();
  const target = '/?kora_return=1' + (reference ? '&ref=' + encodeURIComponent(reference) : '');

  res.set('Cache-Control', 'no-store');
  return res.redirect(302, target);
});

/* POST /kora/webhook — mounted with express.raw() above the JSON parser.
 * Kora signs JSON.stringify(payload.data); see services/koraPay.js.
 */
router.post('/kora/webhook', function (req, res) {
  const signature = req.get('x-korapay-signature') || '';
  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn('[purchases] webhook rejected: bad or missing signature');
    return failure(res, 403, 'invalid_signature', 'Webhook signature could not be verified.');
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    return failure(res, 400, 'invalid_payload', 'Webhook body is not valid JSON.');
  }

  if (!payload || payload.event !== 'charge.success') {
    return res.status(200).json({ ok: true, status: 'ignored', event: payload && payload.event });
  }

  const data = payload.data || {};
  const reference = data.reference ? String(data.reference) : '';

  if (!reference) {
    return failure(res, 400, 'invalid_payload', 'Webhook is missing data.reference.');
  }

  const entry = db._state.purchases[reference];

  if (!entry) {
    console.warn('[purchases] webhook for unknown reference ' + reference);
    return failure(res, 404, 'unknown_reference', 'No purchase matches that reference.');
  }

  if (entry.verified) {
    return res.status(200).json({ ok: true, status: 'already granted' });
  }

  const paid = Number(data.amount);
  if (!Number.isFinite(paid) || paid < entry.amount) {
    console.warn('[purchases] underpaid ' + reference + ': paid ' + data.amount + ' expected ' + entry.amount);
    return failure(res, 400, 'amount_mismatch', 'The amount paid does not cover this bundle.');
  }

  const user = db.getUser(entry.uid);
  user.kobo = (Number(user.kobo) || 0) + entry.kobo;

  entry.verified = true;
  entry.txnId = data.transaction_reference ? String(data.transaction_reference) : reference;
  entry.paidAt = new Date().toISOString();
  entry.paidAmount = paid;
  entry.receipt = signReceipt(entry.uid, entry.sku, entry.txnId);

  db.persist();

  console.log('[purchases] granted ' + entry.kobo + ' kobo to ' + entry.uid + ' (' + entry.sku + ', ref ' + reference + ')');

  return res.status(200).json({ ok: true, status: 'ok', reference: reference, kobo: user.kobo });
});

/* GET /kora/status?reference=… — polled by the client after the redirect. */
router.get('/kora/status', requireSession, function (req, res) {
  const reference = String(req.query.reference || req.query.ref || '').trim();

  if (!reference) {
    return failure(res, 400, 'missing_reference', 'reference is required.');
  }

  const entry = db._state.purchases[reference];

  if (!entry || entry.uid !== req.user.id) {
    return failure(res, 404, 'not_found', 'No purchase matches that reference.');
  }

  const user = db.getUser(req.user.id);

  res.set('Cache-Control', 'no-store');
  return res.json({
    ok: true,
    verified: Boolean(entry.verified),
    kobo: Number(user.kobo) || 0,
    sku: entry.sku,
    amount: entry.amount,
    reference: reference,
  });
});

/* POST /verify — DEPRECATED for the web/PWA build.
 *
 * Store billing only: an Android build submits a Google Play purchase token, an
 * iOS build submits an App Store receipt. The PWA must use /kora/* above —
 * Kora is the only rail that can charge a Nigerian card or transfer without an
 * app-store account. Kept for the native shells and for old clients already
 * shipped, which is why it still verifies rather than 410s.
 */
router.post('/verify', requireSession, purchaseLimiter, async function (req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
  const receipt = body.receipt;

  if (platform !== 'google' && platform !== 'apple') {
    return failure(res, 400, 'invalid_platform', 'platform must be "google" or "apple".');
  }

  if (!receipt) {
    return failure(res, 400, 'missing_receipt', 'receipt is required.');
  }

  let result;
  try {
    result = platform === 'google'
      ? await validateGoogle(receipt)
      : await validateApple(receipt);
  } catch (error) {
    console.error('[purchases] receipt validation crashed: ' + error.message);
    return failure(res, 502, 'validation_failed', 'The store could not be reached.');
  }

  if (!result || !result.ok) {
    return failure(res, 400, 'receipt_invalid', 'That receipt could not be verified.');
  }

  if (db.getPurchase(result.txnId)) {
    return failure(res, 409, 'already_redeemed', 'This receipt has already been redeemed.');
  }

  const grant = SKU_MAP[result.sku];
  if (!grant) {
    console.warn('[purchases] unmapped store sku ' + result.sku);
    return failure(res, 422, 'unknown_product', 'That product is not part of Lagos Run.');
  }

  const uid = req.user.id;
  const user = db.getUser(uid);
  user.kobo = (Number(user.kobo) || 0) + grant;

  db.recordPurchase(result.txnId, uid, result.sku, 0, true);
  db.persist();

  const receiptSignature = signReceipt(uid, result.sku, result.txnId);

  return res.json({
    ok: true,
    kobo: user.kobo,
    sku: result.sku,
    txnId: result.txnId,
    receipt: receiptSignature,
  });
});

module.exports = {
  router: router,
  BUNDLES: BUNDLES,
  SKU_MAP: SKU_MAP,
};
