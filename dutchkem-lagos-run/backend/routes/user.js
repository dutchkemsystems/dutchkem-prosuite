/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Player account routes.
 *
 *   GET    /api/user/me     → profile summary
 *   GET    /api/user/export → everything we hold about the player
 *   DELETE /api/user/me     → delete it all (NDPR/GDPR erasure)
 *
 * Export and deletion are deliberately self-service: a player should never need
 * to email support to see or wipe their data.
 */

const express = require('express');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');

const BRAND = 'Dutchkem Ventures';
const router = express.Router();

/* GET /me */
router.get('/me', requireSession, function (req, res) {
  const uid = req.user.id;
  const user = db.getUser(uid);

  res.set('Cache-Control', 'no-store');
  return res.json({
    uid: uid,
    coins: Number(user.coins) || 0,
    kobo: Number(user.kobo) || 0,
    subscription: user.subscription || 'free',
    banned: Boolean(user.banned),
  });
});

/* GET /export */
router.get('/export', requireSession, function (req, res) {
  const uid = req.user.id;
  const user = db.getUser(uid);

  const scores = db._state.scores
    .filter(function (row) { return row.uid === uid; })
    .sort(function (a, b) { return b.score - a.score; });

  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'application/json; charset=utf-8');
  return res.json({
    uid: uid,
    user: user,
    scores: scores,
    rewards: db.getRewardState(uid),
    exportedAt: new Date().toISOString(),
    brand: BRAND,
  });
});

/* DELETE /me */
router.delete('/me', requireSession, function (req, res) {
  const uid = req.user.id;

  db.deleteUser(uid);
  console.log('[user] deleted all data for ' + uid);

  return res.json({
    ok: true,
    message: 'All data deleted per Dutchkem Ventures privacy policy',
  });
});

module.exports = {
  router: router,
};
