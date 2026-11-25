/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Session authentication.
 * The client trades a device uid for a short-lived JWT (POST /api/session or
 * /api/auth) and sends it as `Authorization: Bearer <token>` on every call that
 * touches score, wallet or profile data.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

function unauthorized(res, error, message) {
  return res.status(401).json({
    ok: false,
    error: error,
    message: message,
  });
}

function requireSession(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');

  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0]) || !parts[1]) {
    return unauthorized(res, 'missing_token', 'Authorization header must be "Bearer <token>".');
  }

  if (!config.secrets.session) {
    console.error('[auth] SESSION_SIGNING_SECRET is not set — refusing to verify tokens');
    return res.status(503).json({
      ok: false,
      error: 'auth_unavailable',
      message: 'Authentication is not configured on this server.',
    });
  }

  let payload;
  try {
    payload = jwt.verify(parts[1], config.secrets.session, {
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') {
      return unauthorized(res, 'token_expired', 'Your session has expired. Please sign in again.');
    }
    return unauthorized(res, 'invalid_token', 'Session token is invalid.');
  }

  const userId = payload.sub || payload.uid;
  if (!userId) {
    return unauthorized(res, 'invalid_token', 'Session token is missing a subject.');
  }

  req.user = {
    id: String(userId),
    sessionId: payload.jti || null,
    issuedAt: payload.iat || null,
    expiresAt: payload.exp || null,
    claims: payload,
  };

  return next();
}

module.exports = {
  requireSession: requireSession,
};
