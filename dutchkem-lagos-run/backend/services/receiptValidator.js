/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Store receipt validation — NATIVE ANDROID / iOS BUILDS ONLY.
 * The web/PWA build never calls this: Nigerian web checkout goes through
 * Kora Pay (services/koraPay.js, Phase 8.5). A receipt from Google Play or the
 * App Store is worthless until it is checked against the store itself, which
 * is what this module does.
 *
 * Both validators resolve to { ok: true, txnId, sku } or { ok: false, error }.
 * They never throw: callers decide how loudly to fail.
 */

const fetch = require('node-fetch');
const { google } = require('googleapis');
const config = require('../config');

const TIMEOUT_MS = 8000;
const ANDROID_PUBLISHER = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function failure(error) {
  return { ok: false, error: error };
}

/* ───────── Google Play ───────── */

/* TODO: cache this token until ~1 minute before expiry. Minting it per
 * request is correct but wasteful when a burst of purchases lands at once.
 */
async function googleAccessToken() {
  if (!config.purchase.googleServiceAccountJson) return null;

  let credentials;
  try {
    credentials = JSON.parse(config.purchase.googleServiceAccountJson);
  } catch (error) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  const auth = new google.auth.GoogleAuth({ credentials: credentials, scopes: [SCOPE] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  return token && token.token ? token.token : null;
}

/* validateGoogle({ productId, purchaseToken, packageName? }) */
async function validateGoogle(receipt) {
  const input = receipt || {};
  const productId = input.productId || input.sku;
  const purchaseToken = input.purchaseToken || input.token;
  const packageName = input.packageName || config.purchase.googlePackageName;

  if (!productId || !purchaseToken) return failure('missing_fields');
  if (!packageName) return failure('google_not_configured');

  let accessToken;
  try {
    accessToken = await googleAccessToken();
  } catch (error) {
    console.error('[receiptValidator] google auth failed: ' + error.message);
    return failure('google_auth_failed');
  }

  if (!accessToken) return failure('google_auth_not_configured');

  const url = ANDROID_PUBLISHER + '/' + encodeURIComponent(packageName) +
    '/purchases/products/' + encodeURIComponent(productId) +
    '/tokens/' + encodeURIComponent(purchaseToken);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
      timeout: TIMEOUT_MS,
    });
  } catch (error) {
    return failure('google_unreachable');
  }

  if (response.status === 404 || response.status === 410) return failure('google_purchase_not_found');
  if (!response.ok) return failure('google_http_' + response.status);

  let body;
  try {
    body = await response.json();
  } catch (error) {
    return failure('google_bad_response');
  }

  /* purchaseState: 0 purchased, 1 cancelled, 2 pending. */
  if (body.purchaseState !== 0) return failure('google_purchase_state_' + body.purchaseState);

  return {
    ok: true,
    txnId: body.orderId || purchaseToken,
    sku: productId,
    amountKobo: null,
    environment: 'google',
  };
}

/* ───────── Apple App Store ───────── */

async function postApple(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    timeout: TIMEOUT_MS,
  });

  if (!response.ok) throw new Error('apple_http_' + response.status);
  return response.json();
}

/* validateApple(receiptBase64) — accepts the raw receipt string or an object
 * with { receipt } / { receiptData }.
 */
async function validateApple(receipt) {
  const receiptData = typeof receipt === 'string'
    ? receipt
    : (receipt && (receipt.receipt || receipt.receiptData)) || null;

  if (!receiptData) return failure('missing_fields');
  if (!config.purchase.appleSharedSecret) return failure('apple_not_configured');

  const payload = {
    'receipt-data': receiptData,
    password: config.purchase.appleSharedSecret,
    'exclude-old-transactions': true,
  };

  let body;
  try {
    body = await postApple(config.purchase.appleVerifyUrl, payload);
  } catch (error) {
    return failure('apple_unreachable');
  }

  /* 21007 = sandbox receipt sent to production. Retry against sandbox. */
  if (body && body.status === 21007) {
    try {
      body = await postApple(config.purchase.appleSandboxUrl, payload);
    } catch (error) {
      return failure('apple_sandbox_unreachable');
    }
  }

  if (!body || body.status !== 0) return failure('apple_status_' + (body && body.status));

  const items = (body.receipt && body.receipt.in_app) || body.latest_receipt_info || [];
  const latest = items.length > 0 ? items[items.length - 1] : null;

  if (!latest || !latest.transaction_id) return failure('apple_no_transaction');

  return {
    ok: true,
    txnId: String(latest.transaction_id),
    sku: String(latest.product_id),
    amountKobo: null,
    environment: body.status === 0 && body.environment ? body.environment : 'apple',
  };
}

module.exports = {
  validateGoogle: validateGoogle,
  validateApple: validateApple,
};
