/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Rewarded ads — AdMob server-side verification (SSV).
 *
 *   POST /api/ads/ssv-nonce    → hand the client a one-time nonce to put in
 *                                custom_data before it requests the ad
 *   GET  /api/ads/ssv-callback → Google calls this after the ad is watched
 *
 * The callback is what actually pays the player. It is authenticated by
 * Google's RSA signature over the sorted query string, so it can be trusted
 * even though the client triggered it. The nonce proves the callback belongs to
 * a session that asked for an ad, and is deleted on first use so a replayed URL
 * cannot pay twice; transaction_id is the second lock.
 */

const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const config = require('../config');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');
const { rewardLimiter } = require('../middleware/rateLimit');

const NONCE_TTL_MS = 10 * 60 * 1000;
const MAX_REWARD_COINS = 100000;
const REQUIRED_SSV_PARAMS = ['custom_data', 'transaction_id', 'reward_amount', 'signature', 'key_id'];

const router = express.Router();

/* In-memory: nonces live for ten minutes and are worthless afterwards, so they
 * do not need the durability of the wallet file. A restart simply forces the
 * player to request a new nonce.
 */
const nonces = new Map();

function pruneNonces() {
  const now = Date.now();
  nonces.forEach(function (value, key) {
    if (!value || value.expiresAt <= now) nonces.delete(key);
  });
}

/* POST /ssv-nonce */
router.post('/ssv-nonce', requireSession, rewardLimiter, function (req, res) {
  pruneNonces();

  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(nonce, { uid: req.user.id, expiresAt: Date.now() + NONCE_TTL_MS });

  res.set('Cache-Control', 'no-store');
  return res.json({
    nonce: nonce,
    ttl: Math.floor(NONCE_TTL_MS / 1000),
  });
});

/* ───────── AdMob signature verification ───────── */

/* Google signs the callback's query parameters in ASCII-sorted order, joined by
 * newlines, with signature and key_id excluded. Values are the decoded values,
 * not the URL-encoded ones.
 */
function buildSignatureMessage(params) {
  return Object.keys(params)
    .filter(function (key) { return key !== 'signature' && key !== 'key_id'; })
    .sort()
    .map(function (key) {
      const value = Array.isArray(params[key]) ? params[key][0] : params[key];
      return key + '=' + value;
    })
    .join('\n');
}

const keyCache = { keys: null, fetchedAt: 0 };

function toPem(base64) {
  const body = String(base64).replace(/\s+/g, '').match(/.{1,64}/g) || [];
  return '-----BEGIN PUBLIC KEY-----\n' + body.join('\n') + '\n-----END PUBLIC KEY-----\n';
}

/* Keys come from Google's verifier-keys.json and are cached for
 * ADMOB_SSV_KEY_CACHE_TTL_MS (6h by default). ADMOB_SSV_PUBLIC_KEY may hold a
 * PEM directly, which is how the offline/local builds and tests run without a
 * network round trip.
 */
async function loadVerifierKeys() {
  const now = Date.now();
  if (keyCache.keys && now - keyCache.fetchedAt < config.admob.ssvKeyCacheTtlMs) {
    return keyCache.keys;
  }

  const inline = String(process.env.ADMOB_SSV_PUBLIC_KEY || '').trim();
  if (inline) {
    keyCache.keys = { inline: inline.replace(/\\n/g, '\n') };
    keyCache.fetchedAt = now;
    return keyCache.keys;
  }

  const response = await fetch(config.admob.ssvPublicKeyUrl, {
    timeout: 5000,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('key fetch HTTP ' + response.status);

  const payload = await response.json();
  const keys = {};
  (payload.keys || []).forEach(function (entry) {
    if (!entry || !entry.keyId) return;
    if (entry.pem) keys[String(entry.keyId)] = entry.pem;
    else if (entry.base64) keys[String(entry.keyId)] = toPem(entry.base64);
  });

  keyCache.keys = keys;
  keyCache.fetchedAt = now;
  return keys;
}

/* verifyAdmobSignature(params, signature, keyId) → Promise<boolean>
 *
 * Reference implementation of Google's scheme:
 *   1. build the sorted "key=value" message (buildSignatureMessage),
 *   2. pick the public key matching key_id (or the only one we have),
 *   3. RSA-SHA256 verify the base64 `signature` parameter.
 *
 * TODO(production): pin the verifier-keys.json host, persist the key cache
 * across restarts, and alert if a callback arrives with an unknown key_id —
 * rotating keys is normal, but a burst of unknown ids is not.
 */
async function verifyAdmobSignature(params, signature, keyId) {
  try {
    if (!signature || !keyId) return false;

    const keys = await loadVerifierKeys();
    const pem = keys[String(keyId)] || keys.inline ||
      (Object.keys(keys).length === 1 ? keys[Object.keys(keys)[0]] : null);

    if (!pem) {
      console.warn('[ads] no AdMob public key for key_id ' + keyId);
      return false;
    }

    const message = buildSignatureMessage(params);
    const valid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(message, 'utf8'),
      pem,
      Buffer.from(String(signature), 'base64')
    );

    return Boolean(valid);
  } catch (error) {
    console.error('[ads] SSV verification error: ' + error.message);
    return false;
  }
}

/* GET /ssv-callback — Google's request. Never call this from the client. */
router.get('/ssv-callback', async function (req, res) {
  const params = req.query || {};

  const missing = REQUIRED_SSV_PARAMS.filter(function (key) {
    return params[key] === undefined || params[key] === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      ok: false,
      error: 'missing_params',
      message: 'SSV callback is missing: ' + missing.join(', '),
    });
  }

  const valid = await verifyAdmobSignature(
    params,
    String(params.signature),
    String(params.key_id)
  );

  if (!valid) {
    console.warn('[ads] SSV callback rejected: bad signature');
    return res.status(403).json({ ok: false, error: 'invalid_signature' });
  }

  const nonce = String(params.custom_data);
  const stored = nonces.get(nonce);

  if (!stored || stored.expiresAt <= Date.now()) {
    nonces.delete(nonce);
    console.warn('[ads] SSV callback for unknown or expired nonce');
    return res.status(410).json({ ok: false, error: 'nonce_expired' });
  }

  /* One-time use: consume before granting so a retried request cannot pay twice. */
  nonces.delete(nonce);

  const transactionId = String(params.transaction_id);

  if (db.getPurchase(transactionId)) {
    return res.status(200).json({ ok: true, status: 'duplicate' });
  }

  const reward = Math.floor(Number(params.reward_amount));
  if (!Number.isFinite(reward) || reward <= 0 || reward > MAX_REWARD_COINS) {
    return res.status(400).json({ ok: false, error: 'invalid_reward' });
  }

  const user = db.getUser(stored.uid);
  user.coins = (Number(user.coins) || 0) + reward;

  db.recordPurchase(transactionId, stored.uid, 'rewarded_ad', reward, true);
  db.persist();

  console.log('[ads] granted ' + reward + ' coins to ' + stored.uid + ' (txn ' + transactionId + ')');

  return res.status(200).json({ ok: true, status: 'ok', coins: user.coins });
});

module.exports = {
  router: router,
  verifyAdmobSignature: verifyAdmobSignature,
  buildSignatureMessage: buildSignatureMessage,
  NONCE_TTL_MS: NONCE_TTL_MS,
};
