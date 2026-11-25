/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Health route.
 *
 *   GET /health       → liveness probe for the host / uptime monitor
 *   GET /api/health   → same handler, for the game client
 *
 * The three fields the brief pins down (status, brand, service) come first so a
 * monitor can read them without caring about the extras.
 */

const express = require('express');
const pkg = require('../package.json');
const config = require('../config');

const router = express.Router();

router.get('/', function (req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    brand: 'Dutchkem Ventures',
    service: 'Lagos Run Backend',
    time: new Date().toISOString(),
    version: pkg.version,
    environment: config.env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

module.exports = {
  router: router,
};
