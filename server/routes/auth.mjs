import { Router } from 'express';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken, generateResetToken, verifyResetToken, hashToken, detectDevice, parseUserAgent } from '../lib/auth.mjs';
import { loginRateLimit, rateLimitMiddleware } from '../middleware/auth.mjs';
import { dualAuthGate } from '../middleware/dualAuth.mjs';
import { alertPasswordReset } from '../lib/email.mjs';

const router = Router();

// Tighter rate limit for token operations: 20 per 15 min
const tokenRateLimit = rateLimitMiddleware(20, 15 * 60 * 1000);

function convex(req) { return req.app.locals.convex; }

// POST /api/auth/login — dual-auth gated
router.post('/login', loginRateLimit, dualAuthGate(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    const deviceInfo = { userAgent, ...parseUserAgent(userAgent) };

    // Rate limiting check
    const recentFails = await convex(req).query('api.auth_helpers:countFailedLogins', { email, ip, windowMs: 15 * 60 * 1000 });
    if (recentFails >= 10) {
      return res.status(429).json({ error: 'Account locked for 30 minutes due to too many failed attempts' });
    }

    // Find user via Convex auth
    const user = await convex(req).query('api.auth_helpers:findUserByEmail', { email });
    if (!user) {
      await convex(req).mutation('api.auth_helpers:logFailedAttempt', { email, ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email verified
    if (!user.emailVerificationTime) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    // Verify password via Convex auth
    const isValid = await convex(req).mutation('api.auth_helpers:verifyUserPassword', { email, password });
    if (!isValid) {
      await convex(req).mutation('api.auth_helpers:logFailedAttempt', { email, ip });
      const failCount = await convex(req).query('api.auth_helpers:countFailedLogins', { email, ip, windowMs: 15 * 60 * 1000 });
      if (failCount >= 10) {
        await convex(req).mutation('api.auth_helpers:lockUserAccount', { userId: user._id, minutes: 30 });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check session limit (max 3)
    const activeSessions = await convex(req).query('api.auth_helpers:countActiveSessions', { userId: user._id, userType: 'client' });
    if (activeSessions >= 3) {
      return res.status(403).json({ error: 'Maximum 3 concurrent sessions reached' });
    }

    // Generate tokens
    const accessToken = await generateAccessToken(user._id, 'client');
    const refreshToken = await generateRefreshToken(user._id, 'client');

    // Save session
    await convex(req).mutation('api.auth_helpers:createSession', {
      userId: user._id,
      userType: 'client',
      refreshToken: hashToken(refreshToken),
      deviceInfo,
      ip,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    });

    // Clear failed attempts
    await convex(req).mutation('api.auth_helpers:clearFailedLogins', { email, ip });

    // Update last login
    await convex(req).mutation('api.auth_helpers:updateLastLogin', { userId: user._id, ip });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}));

// POST /api/auth/refresh
router.post('/refresh', tokenRateLimit, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ error: 'Invalid refresh token' });

    const hashedToken = hashToken(refreshToken);
    const session = await convex(req).query('api.auth_helpers:findSessionByRefreshToken', { refreshToken: hashedToken });
    if (!session || session.isRevoked || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    // Check inactivity timeout (2 hours for client)
    const inactiveMinutes = (Date.now() - session.lastActive) / 60000;
    if (inactiveMinutes > 120) {
      await convex(req).mutation('api.auth_helpers:revokeSession', { sessionId: session._id });
      return res.status(401).json({ error: 'Session timed out due to inactivity' });
    }

    // Rotate tokens
    const newAccessToken = await generateAccessToken(payload.sub, payload.type || 'client');
    const newRefreshToken = await generateRefreshToken(payload.sub, payload.type || 'client');

    await convex(req).mutation('api.auth_helpers:rotateRefreshToken', {
      sessionId: session._id,
      refreshToken: hashToken(newRefreshToken),
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900 });
  } catch (err) {
    console.error('[AUTH] refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', tokenRateLimit, async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authentication required' });

    const token = header.slice(7);
    const payload = await verifyAccessToken(token, 'client');
    if (payload) {
      await convex(req).mutation('api.auth_helpers:revokeUserSessions', { userId: payload.sub, userType: 'client' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.json({ success: true });
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', tokenRateLimit, async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authentication required' });

    const token = header.slice(7);
    const payload = await verifyAccessToken(token, 'client');
    if (payload) {
      await convex(req).mutation('api.auth_helpers:revokeAllUserSessions', { userId: payload.sub, userType: 'client' });
    }
    res.json({ success: true, message: 'All sessions revoked' });
  } catch {
    res.json({ success: true });
  }
});

// GET /api/auth/sessions
router.get('/sessions', tokenRateLimit, async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authentication required' });

    const token = header.slice(7);
    const payload = await verifyAccessToken(token, 'client');
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const sessions = await convex(req).query('api.auth_helpers:listActiveSessions', { userId: payload.sub, userType: 'client' });
    res.json({ sessions });
  } catch (err) {
    console.error('[AUTH] sessions error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// DELETE /api/auth/sessions/:id
router.delete('/sessions/:id', tokenRateLimit, async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authentication required' });

    const token = header.slice(7);
    const payload = await verifyAccessToken(token, 'client');
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    await convex(req).mutation('api.auth_helpers:revokeSessionById', { sessionId: req.params.id, userId: payload.sub });
    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] delete session error:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', tokenRateLimit, async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Authentication required' });
    const token = header.slice(7);
    const payload = await verifyAccessToken(token, 'client');
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain 1 uppercase, 1 number, and 1 special character' });
    }

    const result = await convex(req).mutation('api.auth_helpers:changePassword', {
      userId: payload.sub,
      currentPassword,
      newPassword,
    });

    if (!result.success) return res.status(400).json({ error: result.error || 'Failed to change password' });

    // Revoke all sessions except current (password changed)
    await convex(req).mutation('api.auth_helpers:revokeAllUserSessions', { userId: payload.sub, userType: 'client' });

    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    console.error('[AUTH] change-password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', loginRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Always return success to prevent email enumeration
    const user = await convex(req).query('api.auth_helpers:findUserByEmail', { email });
    if (user) {
      const resetToken = await generateResetToken(email, 15);
      await alertPasswordReset({ email, token: resetToken });
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch {
    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  }
});

// POST /api/auth/reset-password — rate-limited: 3 attempts / 15 min per IP
router.post('/reset-password', loginRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain 1 uppercase, 1 number, and 1 special character' });
    }

    const payload = await verifyResetToken(token);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const email = payload.sub;
    const user = await convex(req).query('api.auth_helpers:findUserByEmail', { email });
    if (!user) {
      return res.status(400).json({ error: 'Account not found' });
    }

    await convex(req).mutation('api.auth_helpers:changePassword', {
      userId: user._id,
      currentPassword: '',
      newPassword,
    });

    await convex(req).mutation('api.auth_helpers:revokeAllUserSessions', {
      userId: user._id,
      userType: 'client',
    });

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('[AUTH] reset-password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// POST /api/auth/verify-email/:token
router.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    const result = await convex(req).mutation('api.auth_helpers:verifyEmail', { token });
    if (!result.success) return res.status(400).json({ error: result.error || 'Invalid or expired token' });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[AUTH] verify-email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
