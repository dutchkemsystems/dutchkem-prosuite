import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConvexHttpClient } from 'convex/browser';
import { MIGRATION_PHASE } from './config/authMigration.mjs';
import { validateEnv } from './config/env.mjs';
import { initRealtime, broadcast, getIO } from './lib/realtime.mjs';
import ebookRouter from './routes/ebook.mjs';
import adminRouter from './routes/admin.mjs';
import authRouter from './routes/auth.mjs';
import adminAuthRouter from './routes/admin_auth.mjs';
import unifiedAuthRouter from './routes/unifiedAuth.mjs';

// ── Validate environment variables ──
const env = validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

const AUTH_MIGRATION_PHASE = process.env.AUTH_MIGRATION_PHASE || MIGRATION_PHASE.DUAL_WRITE_LOG_ONLY;

// Trust proxy for correct IP detection behind reverse proxy (Nginx)
app.set('trust proxy', 1);

// Convex client
const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';
const convex = new ConvexHttpClient(CONVEX_URL);
app.locals.convex = convex;

// ── Per-IP rate limit: 30 requests per minute ──
const perIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. 30 req/min per IP. Try again later.' },
});
app.use(perIpLimiter);

// ── Security Middleware Chain (order matters) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://*.convex.cloud', 'https://integrate.api.nvidia.com', 'https://api.termii.com', 'https://api.korapay.com'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Input Sanitization ──
function sanitize(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '');
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else {
        obj[key] = sanitize(obj[key]);
      }
    }
  }
  return obj;
}
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) Object.assign(req.query, sanitize({ ...req.query }));
  if (req.params) Object.assign(req.params, sanitize({ ...req.params }));
  next();
});

// ── CSRF Token endpoint ──
import crypto from 'crypto';
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: token });
});

// ── OTP Routes ──
import otpRouter from './routes/otp.mjs';
app.use('/api/otp', otpRouter);

// ── Dual Auth Router ──
app.use('/api', unifiedAuthRouter);

// ── Legacy Routers ──
app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', adminRouter);

// ── Protected API routes ──
app.use('/api/a1/ebook', ebookRouter);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    convexUrl: CONVEX_URL,
    auth: {
      migrationPhase: AUTH_MIGRATION_PHASE,
      legacyConvexAuth: true,
      dualAuthMode: AUTH_MIGRATION_PHASE === MIGRATION_PHASE.CLEANUP ? 'new_only' : 'parallel',
    },
  });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.expose ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Rate limit: 30 req/min per IP`);
  broadcast('server:started', { port: PORT, timestamp: Date.now() });
});

// ── Graceful Shutdown ──
function shutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Shutting down gracefully...`);
  const io = getIO();
  if (io) io.close();
  httpServer.close(() => {
    console.log('[SERVER] Closed all connections.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  shutdown('uncaughtException');
});
