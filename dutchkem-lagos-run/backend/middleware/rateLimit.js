/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Rate limiting.
 * Every limiter answers with the same JSON envelope the rest of the API uses,
 * so the client's `res.ok === false` path stays simple. Keys are per IP; when
 * a session is present the user id is used instead so one player cannot dodge
 * a limit by cycling networks.
 */

const rateLimit = require('express-rate-limit');

function keyFor(req) {
  if (req.user && req.user.id) return 'user:' + req.user.id;
  return 'ip:' + req.ip;
}

function factory(limits, message) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: limits,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor,
    handler: function (req, res, next, options) {
      res.status(options.statusCode).json({
        ok: false,
        error: 'rate_limited',
        message: message,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      });
    },
  });
}

/* 20 session issues/refreshes a minute — one per launch plus retries. */
const authLimiter = factory(20, 'Too many session requests. Please wait a minute.');

/* 10 score submissions a minute — a full run is one call, this allows retries. */
const scoreLimiter = factory(10, 'Too many score submissions. Please slow down.');

/* 5 purchase attempts a minute — checkout is expensive and rarely needs more. */
const purchaseLimiter = factory(5, 'Too many purchase attempts. Please wait a minute.');

/* 10 reward claims a minute — rewarded ads are watched one at a time. */
const rewardLimiter = factory(10, 'Too many reward claims. Please wait a minute.');

/* 30 config/version polls a minute. */
const configLimiter = factory(30, 'Too many configuration requests. Please wait a minute.');

/* 20 analytics batches a minute — the client flushes every 15s, so 4/min is the
 * real cadence and this leaves headroom for retries after a reconnect.
 */
const analyticsLimiter = factory(20, 'Too many analytics batches. Please slow down.');

module.exports = {
  authLimiter: authLimiter,
  scoreLimiter: scoreLimiter,
  purchaseLimiter: purchaseLimiter,
  rewardLimiter: rewardLimiter,
  configLimiter: configLimiter,
  analyticsLimiter: analyticsLimiter,
};
