/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Signature service.
 * Every trust boundary in Lagos Run is an HMAC over a canonical string:
 *   - session keys   SESSION_SIGNING_SECRET
 *   - run scores     SCORE_SIGNING_SECRET
 *   - receipts       RECEIPT_SIGNING_SECRET
 * Nothing here ever leaves the server except the digest itself, so a client
 * holding a signature can prove a value came from us but cannot mint one.
 */

const crypto = require('crypto');
const config = require('../config');

/* Canonical encoding: every field is length-prefixed before joining, so a
 * value that itself contains the separator cannot shift the field boundaries
 * ("a:b" + "c" must never hash the same as "a" + "b:c").
 */
function canonical(fields) {
  return fields
    .map(function (value) {
      const text = String(value);
      return text.length + ':' + text;
    })
    .join('|');
}

function hmac(secret, data) {
  if (!secret) {
    throw new Error('[signature] missing signing secret');
  }
  return crypto.createHmac('sha256', secret).update(String(data), 'utf8').digest('hex');
}

/* Constant-time comparison of two hex digests. */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  if (left.length !== right.length) return false;

  try {
    return crypto.timingSafeEqual(left, right);
  } catch (error) {
    return false;
  }
}

/* ───────── scores ───────── */

function scorePayload(uid, score, runId) {
  return canonical([uid, score, runId]);
}

function signScore(uid, score, runId) {
  return hmac(config.secrets.score, scorePayload(uid, score, runId));
}

function verifyScore(uid, score, runId, signature) {
  if (!signature) return false;
  try {
    return timingSafeEqual(signScore(uid, score, runId), signature);
  } catch (error) {
    return false;
  }
}

/* ───────── receipts ───────── */

function receiptPayload(uid, sku, txnId) {
  return canonical([uid, sku, txnId]);
}

function signReceipt(uid, sku, txnId) {
  return hmac(config.secrets.receipt, receiptPayload(uid, sku, txnId));
}

function verifyReceipt(uid, sku, txnId, signature) {
  if (!signature) return false;
  try {
    return timingSafeEqual(signReceipt(uid, sku, txnId), signature);
  } catch (error) {
    return false;
  }
}

/* ───────── session keys ───────── */

/* issueSessionKey(uid) → a per-launch bearer value the client may cache.
 * Bound to the uid and the moment it was issued; useful for de-duplicating
 * offline queue entries once they sync.
 */
function issueSessionKey(uid) {
  /* Per spec: hmac(sessionSecret, `${uid}:${Date.now()}`). uid is validated to
   * [A-Za-z0-9_-] before it ever reaches here, so it cannot contain a colon.
   */
  return hmac(config.secrets.session, String(uid) + ':' + Date.now());
}

module.exports = {
  hmac: hmac,
  timingSafeEqual: timingSafeEqual,
  signScore: signScore,
  verifyScore: verifyScore,
  signReceipt: signReceipt,
  verifyReceipt: verifyReceipt,
  issueSessionKey: issueSessionKey,
};
