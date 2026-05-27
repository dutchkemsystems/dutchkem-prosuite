import { verifyAccessToken } from '../lib/auth.mjs';

const rateLimitStore = new Map();

function rateLimitKey(identifier, type) {
  return `${type}:${identifier}`;
}

function getRateLimit(key, windowMs, maxAttempts) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { remaining: maxAttempts, resetAt: now + windowMs };
  }

  if (now > entry.resetAt) {
    rateLimitStore.delete(key);
    return { remaining: maxAttempts, resetAt: now + windowMs };
  }

  return { remaining: Math.max(0, maxAttempts - entry.count), resetAt: entry.resetAt };
}

function incrementRateLimit(key, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
}

// Reusable rate limit factory
export function rateLimitMiddleware(maxAttempts, windowMs) {
  return (req, res, next) => {
    const key = rateLimitKey(req.ip, 'custom');
    const { remaining } = getRateLimit(key, windowMs, maxAttempts);
    incrementRateLimit(key, windowMs);
    res.set('X-RateLimit-Remaining', String(remaining));
    if (remaining <= 0) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    next();
  };
}

// General rate limit middleware (100 req / 15 min)
export function globalRateLimit(req, res, next) {
  const key = rateLimitKey(req.ip, 'global');
  const { remaining } = getRateLimit(key, 15 * 60 * 1000, 100);
  incrementRateLimit(key, 15 * 60 * 1000);
  res.set('X-RateLimit-Remaining', String(remaining));
  if (remaining <= 0) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  next();
}

// Login rate limit: 5 attempts / 15 min per IP+email
export function loginRateLimit(req, res, next) {
  const email = req.body?.email || 'unknown';
  const key = rateLimitKey(`${req.ip}:${email}`, 'login');
  const maxAttempts = req.path?.startsWith('/api/admin') ? 3 : 5;
  const windowMs = 15 * 60 * 1000;

  const { remaining } = getRateLimit(key, windowMs, maxAttempts);
  if (remaining <= 0) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
  incrementRateLimit(key, windowMs);
  res.set('X-Login-RateLimit-Remaining', String(remaining - 1));
  next();
}

// JWT authentication for protected routes
export function userAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  verifyAccessToken(token, 'client').then(payload => {
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = payload.sub;
    req.userType = payload.type || 'client';
    next();
  }).catch(() => {
    res.status(401).json({ error: 'Invalid token' });
  });
}

// Admin JWT authentication
export function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = header.slice(7);
  verifyAccessToken(token, 'admin').then(payload => {
    if (!payload || payload.type !== 'admin') {
      return res.status(401).json({ error: 'Invalid or expired admin token' });
    }
    req.adminId = payload.sub;
    req.userType = 'admin';
    next();
  }).catch(() => {
    res.status(401).json({ error: 'Invalid admin token' });
  });
}

// Admin IP whitelist check
export async function adminIpCheck(req, res, next) {
  try {
    const convex = req.app.locals.convex;
    const config = await convex.query('api.admin.getSystemConfig', {});
    const whitelistConfig = config?.find(c => c.key === 'ADMIN_ALLOWED_IPS');
    if (whitelistConfig?.value && Array.isArray(whitelistConfig.value) && whitelistConfig.value.length > 0) {
      const allowed = whitelistConfig.value.some(cidr => {
        if (cidr.includes('/')) {
          const [range, bits] = cidr.split('/');
          const mask = ~(2 ** (32 - parseInt(bits)) - 1);
          const ipNum = ipToInt(req.ip);
          const rangeNum = ipToInt(range);
          return (ipNum & mask) === (rangeNum & mask);
        }
        return req.ip === cidr;
      });
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied from this IP address' });
      }
    }
    next();
  } catch (err) {
    // On error, deny access rather than granting it
    console.error('[ADMIN_IP_CHECK] Error checking IP whitelist:', err.message);
    return res.status(403).json({ error: 'Unable to verify IP access' });
  }
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}
