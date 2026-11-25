/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Dutchkem Ventures Presents: Lagos Run — Hustle Empire
 * Backend entry point.
 *
 *   npm start        → node server.js
 *   npm run dev      → nodemon server.js
 *
 * Route modules live in routes/ and are mounted when present. Until a later
 * phase ships one it answers 501 with the shared JSON envelope, so the surface
 * of the API is visible (and testable) from day one.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pkg = require('./package.json');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const limiters = require('./middleware/rateLimit');

const app = express();

app.disable('x-powered-by');

/* Behind a load balancer the client IP arrives in X-Forwarded-For; trust one
 * hop so rate limiting keys on the player, not the balancer.
 */
app.set('trust proxy', 1);

/* ───────── security headers ───────── */

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"].concat(config.allowedOrigins),
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ───────── CORS allowlist ───────── */

const corsOptions = {
  origin: function (origin, callback) {
    // No Origin header: same-origin fetch, curl, or a native WebView.
    if (!origin) return callback(null, true);

    const normalised = String(origin).replace(/\/+$/, '');
    if (config.allowedOrigins.indexOf(normalised) !== -1) return callback(null, true);

    // Return false rather than an error: the browser blocks the response and
    // the request is still answered normally for legitimate same-origin calls.
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
  credentials: false,
  maxAge: 86400,
};

app.use(cors(corsOptions));

/* The Kora Pay webhook must be verified over the exact bytes Kora signed, so it
 * is parsed as a raw Buffer BEFORE the JSON parser runs. express.json() skips a
 * body it finds already parsed, so the rest of the API is unaffected.
 */
app.use(
  '/api/purchases/kora/webhook',
  express.raw({ type: '*/*', limit: '256kb' })
);

app.use(express.json({ limit: '16kb', strict: true }));

/* ───────── health, config, version ───────── */

const healthRoutes = require('./routes/health');
const configRoutes = require('./routes/config');
const versionRoutes = require('./routes/version');

/* /health is the host/monitor probe; /api/health is the game client's alias. */
app.use('/health', healthRoutes.router);
app.use('/api/health', healthRoutes.router);
app.use('/api/version', versionRoutes.router);

app.get('/api/config', limiters.configLimiter, function (req, res) {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    ok: true,
    version: pkg.version,
    config: {
      maxRewardedAdsPerDay: config.anticheat.maxRewardedAdsPerDay,
      consolationCoins: config.rewards.consolationCoins,
      maxScorePerRun: config.anticheat.maxScorePerRun,
      maxCoinsPerDay: config.anticheat.maxCoinsPerDay,
      minHumanReactionMs: config.anticheat.minHumanReactionMs,
      koraPublicKey: config.kora.publicKey,
      admobSsvEnabled: Boolean(config.admob.ssvPublicKeyUrl),
    },
    serverTime: new Date().toISOString(),
  });
});

/* /remote and /rules live in routes/config.js; the exact /api/config path above
 * still serves the client's original summary payload.
 */
app.use('/api/config', configRoutes.router);

/* ───────── feature routers ───────── */

/* Auth is mounted explicitly because the shipped client still posts to the
 * bare /api/session path; both entry points share one handler and one limiter.
 */
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes.router);
app.post('/api/session', limiters.authLimiter, authRoutes.postSession);

/* Routers may apply their own limiter to individual routes: the Kora webhook
 * and the AdMob SSV callback arrive from providers, not players, and must never
 * be throttled as if they were one client.
 */
const MOUNTS = [
  { prefix: '/api/scores', module: './routes/scores', limiter: limiters.scoreLimiter },
  { prefix: '/api/purchases', module: './routes/purchases' },
  { prefix: '/api/rewards', module: './routes/rewards', limiter: limiters.rewardLimiter },
  { prefix: '/api/user', module: './routes/user' },
  { prefix: '/api/ads', module: './routes/ads' },
  { prefix: '/api/analytics', module: './routes/analytics', limiter: limiters.analyticsLimiter },
];

const pendingModules = [];

function loadRouter(modulePath) {
  let resolved;
  try {
    resolved = require.resolve(modulePath);
  } catch (error) {
    return null;
  }
  const loaded = require(resolved);
  return loaded && loaded.router ? loaded.router : loaded;
}

function notImplemented(prefix) {
  const router = express.Router();
  router.use(function (req, res) {
    res.status(501).json({
      ok: false,
      error: 'not_implemented',
      message: 'This endpoint is not available yet.',
      endpoint: prefix,
    });
  });
  return router;
}

MOUNTS.forEach(function (mount) {
  const handlers = mount.limiter ? [mount.limiter] : [];
  const router = loadRouter(mount.module);

  if (router) {
    app.use(mount.prefix, handlers.concat([router]));
  } else {
    pendingModules.push(mount.prefix);
    app.use(mount.prefix, handlers.concat([notImplemented(mount.prefix)]));
  }
});

/* ───────── 404 + errors ───────── */

app.use(function (req, res) {
  res.status(404).json({
    ok: false,
    error: 'not_found',
    message: 'No route for ' + req.method + ' ' + req.originalUrl,
  });
});

app.use(errorHandler);

/* ───────── lifecycle ───────── */

function start() {
  const server = app.listen(config.env.port, function () {
    console.log('[Dutchkem Ventures] Lagos Run backend listening on :' + config.env.port);
    console.log('[Dutchkem Ventures] environment: ' + config.env.nodeEnv);
    console.log('[Dutchkem Ventures] allowed origins: ' + (config.allowedOrigins.join(', ') || 'none'));
    if (pendingModules.length > 0) {
      console.log('[Dutchkem Ventures] endpoints awaiting a later phase: ' + pendingModules.join(', '));
    }
  });

  server.on('error', function (error) {
    if (error.code === 'EADDRINUSE') {
      console.error('[Dutchkem Ventures] port ' + config.env.port + ' is already in use');
    } else {
      console.error('[Dutchkem Ventures] server error: ' + error.message);
    }
    process.exit(1);
  });

  function shutdown(signal) {
    console.log('[Dutchkem Ventures] ' + signal + ' received — closing server');
    server.close(function () {
      process.exit(0);
    });
    setTimeout(function () { process.exit(0); }, 5000).unref();
  }

  process.on('SIGTERM', function () { shutdown('SIGTERM'); });
  process.on('SIGINT', function () { shutdown('SIGINT'); });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
