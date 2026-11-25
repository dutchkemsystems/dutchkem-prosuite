/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Auth routes.
 *
 *   POST /api/auth/session   → trade a device uid (or none) for a 24h token
 *   POST /api/auth/refresh   → rotate an unexpired token into a fresh one
 *
 * The game is playable offline and without an account, so a session is always
 * granted: an anonymous uid is minted when the client has none yet. The uid is
 * the player's identity everywhere else — scores, wallet, purchases.
 */

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { requireSession } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { issueSessionKey } = require('../services/signature');

const TOKEN_TTL_SECONDS = 86400;
const UID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

const router = express.Router();
router.use(authLimiter);

function signToken(uid) {
  return jwt.sign(
    { uid: uid, iat: Math.floor(Date.now() / 1000) },
    config.secrets.session,
    { algorithm: 'HS256', expiresIn: '24h' }
  );
}

function newAnonymousUid() {
  return 'anon_' + crypto.randomBytes(6).toString('hex');
}

/* POST /session — body: { uid?: string } */
function postSession(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const supplied = body.uid;

  let uid;
  if (supplied === undefined || supplied === null || supplied === '') {
    uid = newAnonymousUid();
  } else if (typeof supplied !== 'string' || !UID_PATTERN.test(supplied)) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_uid',
      message: 'uid must be 6–64 characters of letters, numbers, underscore or hyphen.',
    });
  } else {
    uid = supplied;
  }

  const token = signToken(uid);

  return res.json({
    ok: true,
    token: token,
    sessionKey: issueSessionKey(uid),
    uid: uid,
    expiresIn: TOKEN_TTL_SECONDS,
    rewardedLimit: config.anticheat.maxRewardedAdsPerDay,
  });
}

/* POST /refresh — requires a valid, unexpired bearer token. */
function postRefresh(req, res) {
  const uid = req.user.id;
  const token = signToken(uid);

  return res.json({
    ok: true,
    token: token,
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

router.post('/session', postSession);
router.post('/refresh', requireSession, postRefresh);

module.exports = {
  router: router,
  postSession: postSession,
  postRefresh: postRefresh,
  TOKEN_TTL_SECONDS: TOKEN_TTL_SECONDS,
};
