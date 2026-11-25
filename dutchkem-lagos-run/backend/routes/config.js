/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Remote configuration.
 *
 *   GET /api/config/remote → live tuning knobs (ads, economy, announcements)
 *   GET /api/config/rules  → anticheat thresholds the client mirrors
 *
 * Both are plain JSON files under backend/data/, published with an HMAC so the
 * client can tell our config from anything a captive portal injects. The
 * signature uses the score secret: config and scores travel the same trust
 * boundary and a single rotation point is easier to operate.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const limiters = require('../middleware/rateLimit');
const { hmac } = require('../services/signature');

const DATA_DIR = path.join(__dirname, '..', 'data');
const router = express.Router();

router.use(limiters.configLimiter);

function publish(res, filename) {
  const file = path.join(DATA_DIR, filename);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return res.status(404).json({
      ok: false,
      error: 'not_found',
      message: filename + ' has not been published.',
    });
  }

  let signature;
  try {
    signature = hmac(config.secrets.score, JSON.stringify(data));
  } catch (error) {
    console.error('[config] cannot sign ' + filename + ': ' + error.message);
    return res.status(503).json({
      ok: false,
      error: 'signing_unavailable',
      message: 'Configuration signing is not available on this server.',
    });
  }

  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ data: data, signature: signature });
}

router.get('/remote', function (req, res) {
  return publish(res, 'remote-config.json');
});

router.get('/rules', function (req, res) {
  return publish(res, 'rules.json');
});

module.exports = {
  router: router,
  DATA_DIR: DATA_DIR,
};
