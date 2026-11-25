/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Dutchkem Ventures Presents: Lagos Run — Hustle Empire
 * Backend configuration. Reads backend/.env once and exposes a frozen,
 * typed view of it. Nothing here may ever be imported by client code.
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

function str(value, fallback) {
  if (typeof value !== 'string') return fallback || '';
  const trimmed = value.trim();
  return trimmed === '' ? (fallback || '') : trimmed;
}

function int(value, fallback) {
  const parsed = parseInt(String(value === undefined ? '' : value).trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const env = {
  nodeEnv: str(process.env.NODE_ENV, 'development'),
  port: int(process.env.PORT, 4000),
};

const isProduction = env.nodeEnv === 'production';

/* Origins are compared exactly (scheme + host + port). Wildcards are
 * deliberately unsupported: this API handles wallets and receipts.
 */
const allowedOrigins = str(process.env.ALLOWED_ORIGINS, 'http://localhost:5173')
  .split(',')
  .map(function (origin) { return origin.trim().replace(/\/+$/, ''); })
  .filter(Boolean);

const secrets = {
  session: str(process.env.SESSION_SIGNING_SECRET),
  score: str(process.env.SCORE_SIGNING_SECRET),
  receipt: str(process.env.RECEIPT_SIGNING_SECRET),
};

const kora = {
  publicKey: str(process.env.KORAPAY_PUBLIC_KEY),
  secretKey: str(process.env.KORAPAY_SECRET_KEY),
  encryptionKey: str(process.env.KORAPAY_ENCRYPTION_KEY),
  webhookSecret: str(process.env.KORAPAY_WEBHOOK_SECRET),
  baseUrl: str(process.env.KORAPAY_BASE_URL, 'https://api.korapay.com/merchant/api/v1').replace(/\/+$/, ''),
  redirectUrl: str(process.env.KORA_REDIRECT_URL),
  webhookUrl: str(process.env.KORA_WEBHOOK_URL),
};

const anticheat = {
  /* Defaults mirror backend/data/rules.json and the client's own ceilings in
   * client/game.js (CONFIG.anticheat, CONFIG.ads) so a published rule can never
   * promise more than the server enforces.
   */
  maxScorePerRun: int(process.env.MAX_SCORE_PER_RUN, 500000),
  maxCoinsPerDay: int(process.env.MAX_COINS_PER_DAY, 100000),
  minHumanReactionMs: int(process.env.MIN_HUMAN_REACTION_MS, 150),
  maxRewardedAdsPerDay: int(process.env.MAX_REWARDED_ADS_PER_DAY, 5),
};

const rewards = {
  consolationCoins: int(process.env.REWARD_CONSOLATION_COINS, 50),
};

const purchase = {
  googlePackageName: str(process.env.GOOGLE_PLAY_PACKAGE_NAME),
  googleServiceAccountJson: str(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
  appleSharedSecret: str(process.env.APPLE_SHARED_SECRET),
  appleVerifyUrl: str(process.env.APPLE_VERIFY_URL, 'https://buy.itunes.apple.com/verifyReceipt'),
  appleSandboxUrl: str(process.env.APPLE_SANDBOX_URL, 'https://sandbox.itunes.apple.com/verifyReceipt'),
};

const adminWebhook = {
  url: str(process.env.ADMIN_WEBHOOK_URL),
};

const admob = {
  ssvPublicKeyUrl: str(process.env.ADMOB_SSV_PUBLIC_KEY_URL, 'https://www.gstatic.com/admob/reward/verifier-keys.json'),
  ssvKeyCacheTtlMs: int(process.env.ADMOB_SSV_KEY_CACHE_TTL_MS, 21600000),
};

const dbPath = path.isAbsolute(str(process.env.DB_PATH))
  ? str(process.env.DB_PATH)
  : path.join(__dirname, str(process.env.DB_PATH, './data/lagosrun.db'));

const config = {
  env: env,
  isProduction: isProduction,
  allowedOrigins: allowedOrigins,
  secrets: secrets,
  kora: kora,
  anticheat: anticheat,
  rewards: rewards,
  purchase: purchase,
  adminWebhook: adminWebhook,
  admob: admob,
  dbPath: dbPath,
};

/* Boot-time guard rails. A missing session secret is fatal in production
 * because every token would be signed with an empty key; in development we
 * only warn so the API can be exercised locally.
 */
const missingSecrets = Object.keys(secrets).filter(function (key) { return !secrets[key]; });

if (missingSecrets.length > 0) {
  const names = missingSecrets
    .map(function (key) { return key === 'session' ? 'SESSION_SIGNING_SECRET' : key === 'score' ? 'SCORE_SIGNING_SECRET' : 'RECEIPT_SIGNING_SECRET'; })
    .join(', ');

  if (isProduction) {
    throw new Error('[config] refusing to start in production without: ' + names);
  }

  console.warn('[config] WARNING: unsigned session/score/receipt secrets missing: ' + names);
}

if (isProduction && allowedOrigins.indexOf('http://localhost:5173') !== -1) {
  console.warn('[config] WARNING: ALLOWED_ORIGINS still contains a localhost development origin');
}

module.exports = Object.freeze(config);
