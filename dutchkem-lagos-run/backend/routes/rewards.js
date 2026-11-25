/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Reward routes.
 *
 *   POST /api/rewards/claim → claim today's rewarded-ad allowance slot
 *
 * ⚠️ The claim is PROVISIONAL. It reserves a slot and reports what is left, but
 * it grants no coins. The authoritative grant happens when AdMob's server-side
 * verification callback lands on /api/ads/ssv-callback and we verify Google's
 * signature. Without that split a modified client could call /claim in a loop.
 */

const express = require('express');
const config = require('../config');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');

const NONCE_MAX_LENGTH = 128;
const router = express.Router();

/* POST /claim — body: { nonce? } */
router.post('/claim', requireSession, function (req, res) {
  const uid = req.user.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  const user = db.getUser(uid);
  if (user.banned) {
    return res.status(403).json({
      ok: false,
      error: 'banned',
      message: 'This account is suspended. Rewards are not available.',
    });
  }

  const cap = config.anticheat.maxRewardedAdsPerDay;
  const state = db.getRewardState(uid);

  if (state.count >= cap) {
    return res.status(429).json({
      ok: false,
      error: 'daily_cap_reached',
      message: 'You have watched all ' + cap + ' rewarded ads available today. Come back tomorrow.',
      remainingToday: 0,
    });
  }

  const nonce = typeof body.nonce === 'string' ? body.nonce.trim().slice(0, NONCE_MAX_LENGTH) : null;
  const next = db.incrementReward(uid);
  const remainingToday = Math.max(0, cap - next.count);

  return res.json({
    ok: true,
    provisional: true,
    remainingToday: remainingToday,
    nonceUsed: nonce || null,
    cap: cap,
    date: next.date,
  });
});

module.exports = {
  router: router,
};
