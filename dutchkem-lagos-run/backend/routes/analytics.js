/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Analytics route.
 *
 *   POST /api/analytics → accept one consent-gated batch of client events
 *
 * The client (client/game.js, Analytics.flush) batches up to 50 events every
 * 15 seconds and only ever queues them when the player has granted analytics
 * consent, so this route is a sink, not a tracker: it stores aggregate counts
 * per event name and never the per-player stream.
 *
 * The batch envelope's `uid` is ignored. Identity comes from the verified
 * bearer token only, and it is not persisted — an aggregate counter cannot leak
 * who played. Nothing here is authoritative: a rejected batch costs the client
 * nothing because the call is fire-and-forget.
 */

const express = require('express');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');

const MAX_EVENTS_PER_BATCH = 50;
const MAX_PROP_KEYS = 12;
const MAX_PROP_LENGTH = 120;
const MAX_NAME_LENGTH = 48;
const EVENT_PATTERN = /^[a-z][a-z0-9_]{0,47}$/;

const router = express.Router();

/* Keep only scalar properties, short enough that a batch cannot be used as
 * free-form storage. Nested objects and arrays are dropped rather than walked.
 */
function sanitizeProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {};

  const clean = {};
  const keys = Object.keys(props).slice(0, MAX_PROP_KEYS);

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = props[key];

    if (!/^[A-Za-z0-9_]{1,32}$/.test(key)) continue;

    if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === 'boolean') {
      clean[key] = value;
    } else if (typeof value === 'string') {
      clean[key] = value.slice(0, MAX_PROP_LENGTH);
    }
  }

  return clean;
}

function sanitizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = typeof raw.event === 'string' ? raw.event.trim().toLowerCase() : '';
  if (!name || name.length > MAX_NAME_LENGTH || !EVENT_PATTERN.test(name)) return null;

  const ts = Number(raw.ts);

  return {
    event: name,
    props: sanitizeProps(raw.props),
    ts: Number.isFinite(ts) && ts > 0 ? Math.floor(ts) : Date.now(),
  };
}

/* POST / — body: { uid?, events: [{ event, props, ts }] } */
router.post('/', requireSession, function (req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const batch = body.events;

  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_events',
      message: 'events must be a non-empty array.',
    });
  }

  const events = [];
  for (let i = 0; i < batch.length && i < MAX_EVENTS_PER_BATCH; i += 1) {
    const event = sanitizeEvent(batch[i]);
    if (event) events.push(event);
  }

  if (events.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'no_valid_events',
      message: 'No event in the batch passed validation.',
    });
  }

  db.recordAnalytics(events);

  res.set('Cache-Control', 'no-store');
  return res.status(202).json({
    ok: true,
    received: events.length,
    dropped: Math.min(batch.length, MAX_EVENTS_PER_BATCH) - events.length,
    acceptedAt: new Date().toISOString(),
  });
});

/* GET / — a tiny liveness/shape probe for QA; returns no player data. */
router.get('/', function (req, res) {
  res.set('Cache-Control', 'no-store');
  return res.json({
    ok: true,
    endpoint: '/api/analytics',
    method: 'POST',
    maxEventsPerBatch: MAX_EVENTS_PER_BATCH,
  });
});

module.exports = {
  router: router,
  MAX_EVENTS_PER_BATCH: MAX_EVENTS_PER_BATCH,
};
