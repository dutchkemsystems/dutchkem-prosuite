/**
 * Unified Auth Router — Migrates between old (Convex) and new (Express JWT) auth
 *
 * Mounts all auth endpoints under /api/auth and /api/admin with
 * migration-aware routing controlled by AUTH_MIGRATION_PHASE.
 */

import { Router } from 'express';
import { AuthMigration } from '../middleware/authMigration.mjs';
import { config, MIGRATION_PHASE } from '../config/authMigration.mjs';
import { adminAuth, adminIpCheck, loginRateLimit } from '../middleware/auth.mjs';
import { generateAccessToken, generateRefreshToken, generateTempToken, verifyAccessToken, verifyTempToken, generateResetToken, verifyResetToken, hashToken, parseUserAgent } from '../lib/auth.mjs';
import { alertAdminLogin, alertAdminLockout, alert2FABypass, alertPasswordChange, alertPasswordReset } from '../lib/email.mjs';
import { dualAuthGate } from '../middleware/dualAuth.mjs';

const router = Router();
const migration = new AuthMigration();

function convex(req) { return req.app.locals.convex; }

// ── Migration Monitoring Endpoints (admin-key protected) ──

// GET /api/auth-migration/status
router.get('/auth-migration/status', async (req, res) => {
  if (req.headers['x-admin-key'] !== config.adminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const stats = {
    phase: config.phase,
    errorCount: migration.errorCount,
    testWhitelist: config.testWhitelist,
    timestamp: new Date().toISOString(),
  };

  res.json(stats);
});

// POST /api/auth-migration/rollback — emergency rollback
router.post('/auth-migration/rollback', async (req, res) => {
  if (req.headers['x-admin-key'] !== config.adminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  process.env.AUTH_MIGRATION_PHASE = MIGRATION_PHASE.DUAL_WRITE_LOG_ONLY;
  res.json({ success: true, message: 'Rollback initiated', phase: MIGRATION_PHASE.DUAL_WRITE_LOG_ONLY });
});

// POST /api/auth-migration/migrate-user — force migrate a user
router.post('/auth-migration/migrate-user', async (req, res) => {
  if (req.headers['x-admin-key'] !== config.adminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { adminId } = req.body;
  if (!adminId) return res.status(400).json({ error: 'adminId required' });

  const tokens = await migration.migrateUserToNewAuth(convex(req), adminId);
  res.json({ success: true, tokens });
});

// ── Token Upgrade (legacy → new JWT) ──

// POST /api/auth/upgrade-token
router.post('/auth/upgrade-token', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token required' });
    }

    const legacyToken = header.slice(7);
    const result = await migration.upgradeToken(convex(req), legacyToken);

    res.json(result);
  } catch (err) {
    console.error('[UPGRADE-TOKEN]', err.message);
    res.status(401).json({ error: 'Token upgrade failed' });
  }
});

// ── User Auth Endpoints ──

// POST /api/auth/login — migration-aware
router.post('/auth/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    await migration.login(email, password, req, res);
  } catch (err) {
    console.error('[AUTH] login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const { verifyRefreshToken } = await import('../lib/auth.mjs');
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ error: 'Invalid refresh token' });

    const hashedToken = hashToken(refreshToken);
    const session = await convex(req).query('api.auth_helpers:findSessionByRefreshToken', { refreshToken: hashedToken });
    if (!session || session.isRevoked || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    const inactiveMinutes = (Date.now() - session.lastActive) / 60000;
    const timeout = session.userType === 'admin' ? 30 : 120;
    if (inactiveMinutes > timeout) {
      await convex(req).mutation('api.auth_helpers:revokeSession', { sessionId: session._id });
      return res.status(401).json({ error: 'Session timed out due to inactivity' });
    }

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
router.post('/auth/logout', async (req, res) => {
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
router.post('/auth/logout-all', async (req, res) => {
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
router.get('/auth/sessions', async (req, res) => {
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
router.delete('/auth/sessions/:id', async (req, res) => {
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
router.post('/auth/change-password', async (req, res) => {
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
      userId: payload.sub, currentPassword, newPassword,
    });

    if (!result.success) return res.status(400).json({ error: result.error || 'Failed to change password' });

    await convex(req).mutation('api.auth_helpers:revokeAllUserSessions', { userId: payload.sub, userType: 'client' });
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    console.error('[AUTH] change-password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/forgot-password
router.post('/auth/forgot-password', loginRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

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

// POST /api/auth/reset-password
router.post('/auth/reset-password', loginRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain 1 uppercase, 1 number, and 1 special character' });
    }

    const payload = await verifyResetToken(token);
    if (!payload) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const email = payload.sub;
    const user = await convex(req).query('api.auth_helpers:findUserByEmail', { email });
    if (!user) return res.status(400).json({ error: 'Account not found' });

    await convex(req).mutation('api.auth_helpers:changePassword', { userId: user._id, currentPassword: '', newPassword });
    await convex(req).mutation('api.auth_helpers:revokeAllUserSessions', { userId: user._id, userType: 'client' });

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('[AUTH] reset-password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ── Admin Auth Endpoints ──

// POST /api/admin/login — migration-aware
router.post('/admin/login', loginRateLimit, adminIpCheck, dualAuthGate(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  await migration.login(email, password, req, res);
}));

// POST /api/admin/login/2fa
router.post('/admin/login/2fa', async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) return res.status(400).json({ error: 'Temp token and 2FA code required' });

    const payload = await verifyTempToken(tempToken);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired temp token' });

    const adminId = payload.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';

    const verified = await convex(req).mutation('api.auth_helpers:verifyAdminTOTP', { adminId, totpCode });
    if (!verified) {
      const adminUser = await convex(req).query('api.auth_helpers:getAdminById', { adminId });
      await convex(req).mutation('api.auth_helpers:logAdminAudit', { adminId, action: 'ADMIN_2FA_FAILED', ipAddress: ip, userAgent });
      await alert2FABypass({ email: adminUser?.email || adminId, ip, userAgent });
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    const activeSessions = await convex(req).query('api.auth_helpers:countActiveSessions', { userId: adminId, userType: 'admin' });
    if (activeSessions >= 1) {
      return res.status(403).json({ error: 'Only one admin session allowed. Terminate existing session first.' });
    }

    const accessToken = await generateAccessToken(adminId, 'admin');
    const refreshToken = await generateRefreshToken(adminId, 'admin');

    await convex(req).mutation('api.auth_helpers:createSession', {
      userId: adminId, userType: 'admin',
      refreshToken: hashToken(refreshToken),
      deviceInfo: { userAgent, ...parseUserAgent(userAgent) },
      ip, expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    });

    await convex(req).mutation('api.auth_helpers:logAdminAudit', {
      adminId, action: 'ADMIN_LOGIN_SUCCESS', ipAddress: ip, userAgent,
    });

    res.json({ accessToken, refreshToken, expiresIn: 1800, admin: { _id: adminId, role: 'admin' } });
  } catch (err) {
    console.error('[ADMIN-AUTH] 2FA error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/admin/logout
router.post('/admin/logout', adminAuth, async (req, res) => {
  try {
    await convex(req).mutation('api.auth_helpers:revokeUserSessions', { userId: req.adminId, userType: 'admin' });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// GET /api/admin/audit-log
router.get('/admin/audit-log', adminAuth, async (req, res) => {
  try {
    const logs = await convex(req).query('api.auth_helpers:getAdminAuditLogs', { adminId: req.adminId, limit: 50 });
    res.json({ logs });
  } catch (err) {
    console.error('[ADMIN-AUTH] audit-log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/audit-log/all
router.get('/admin/audit-log/all', adminAuth, async (req, res) => {
  try {
    const logs = await convex(req).query('api.auth_helpers:getAllAdminAuditLogs', { limit: 100 });
    res.json({ logs });
  } catch (err) {
    console.error('[ADMIN-AUTH] audit-log/all error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// POST /api/admin/ip-whitelist
router.post('/admin/ip-whitelist', adminAuth, async (req, res) => {
  try {
    const { ips, description } = req.body;
    if (!Array.isArray(ips)) return res.status(400).json({ error: 'ips must be an array' });

    await convex(req).mutation('api.auth_helpers:updateIpWhitelist', {
      adminId: req.adminId, ipAddresses: ips, description: description || '',
    });

    res.json({ ips, message: 'IP whitelist updated' });
  } catch (err) {
    console.error('[ADMIN-AUTH] ip-whitelist error:', err);
    res.status(500).json({ error: 'Failed to update IP whitelist' });
  }
});

// GET /api/admin/sessions
router.get('/admin/sessions', adminAuth, async (req, res) => {
  try {
    const sessions = await convex(req).query('api.auth_helpers:listActiveSessions', { userId: req.adminId, userType: 'admin' });
    res.json({ sessions });
  } catch (err) {
    console.error('[ADMIN-AUTH] sessions error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

export default router;
