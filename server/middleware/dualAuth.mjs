/**
 * Dual Auth Middleware — Phase 1 parallel rollout
 *
 * Controls whether the new JWT-based Express auth system handles a request
 * or whether the client should use the old Convex-based auth (adminLogin /
 * verifyAdmin2FA mutations).
 *
 * Env controls:
 *   NEW_AUTH_ENABLED=true|false        — master switch
 *   NEW_AUTH_WHITELIST=user@a.com,user@b.com  — gradual rollout email list
 */

const isNewAuthEnabled = () => process.env.NEW_AUTH_ENABLED === 'true';

function getWhitelist() {
  const raw = process.env.NEW_AUTH_WHITELIST || '';
  if (!raw) return [];
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function isWhitelisted(email) {
  if (!email) return false;
  const list = getWhitelist();
  // Empty whitelist = all users allowed (when master switch is on)
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}

/**
 * Wraps a new-auth route handler with feature-flag + whitelist gate.
 *
 * Usage:
 *   router.post('/login', dualAuthGate(async (req, res) => {
 *     // new auth logic here
 *   }));
 *
 * When the gate blocks or the new handler throws, the response includes
 * `useLegacy: true` so the client can fall back to the old Convex auth.
 */
export function dualAuthGate(handler) {
  return async (req, res) => {
    const email = req.body?.email || '';

    // 1. Master switch off → legacy only
    if (!isNewAuthEnabled()) {
      return res.status(200).json({
        useLegacy: true,
        message: 'New auth disabled. Use Convex mutations (adminLogin/verifyAdmin2FA).',
      });
    }

    // 2. User not whitelisted → legacy only
    if (!isWhitelisted(email)) {
      return res.status(200).json({
        useLegacy: true,
        message: `Account ${email} not enabled for new auth. Using legacy system.`,
      });
    }

    // 3. New auth is active for this user — run the handler
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[DUAL-AUTH] New auth failed, falling back:', err.message);
      // New auth failed → fall back to legacy
      if (!res.headersSent) {
        res.status(200).json({
          useLegacy: true,
          message: 'New auth unavailable. Falling back to legacy system.',
        });
      }
    }
  };
}
