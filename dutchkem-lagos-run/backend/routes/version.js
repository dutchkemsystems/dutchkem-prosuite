/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Version route.
 *
 *   GET /api/version → what the client compares against to decide whether it
 *                      must reload (service worker update) or stop (below
 *                      minSupportedVersion).
 *
 * backend/data/version.json is the source of truth so a release can be flipped
 * without touching code. If the file is missing we still answer from
 * package.json rather than 404 — a client that cannot read the version would
 * otherwise never learn about a forced update.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const config = require('../config');

const VERSION_FILE = path.join(__dirname, '..', 'data', 'version.json');
const router = express.Router();

function readVersionFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (error) {
    console.warn('[version] could not read ' + VERSION_FILE + ' (' + error.message + ') — using package.json');
  }
  return null;
}

router.get('/', function (req, res) {
  const published = readVersionFile();

  res.set('Cache-Control', 'no-store');

  if (published) {
    return res.json(published);
  }

  return res.json({
    name: pkg.name,
    version: pkg.version,
    minSupportedVersion: pkg.version,
    channel: 'stable',
    environment: config.env.nodeEnv,
    source: 'package.json',
  });
});

module.exports = {
  router: router,
  VERSION_FILE: VERSION_FILE,
};
