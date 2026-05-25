import { Router } from 'express';
import { adminAuth, adminIpCheck, loginRateLimit } from '../middleware/auth.mjs';
import { generateAccessToken, generateRefreshToken, generateTempToken, verifyAccessToken, verifyTempToken, hashToken, detectDevice, parseUserAgent } from '../lib/auth.mjs';
import { alertAdminLogin, alertAdminLockout, alert2FABypass, alertPasswordChange } from '../lib/email.mjs';
import { dualAuthGate } from '../middleware/dualAuth.mjs';

const router = Router();

function convex(req) { return req.app.locals.convex; }

// POST /api/admin/login — dual-auth gated
router.post('/login', loginRateLimit, adminIpCheck, dualAuthGate(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;

    // Rate limiting check (stricter: 3 attempts / 15 min)
    const recentFails = await convex(req).query('api.auth_helpers:countAdminFailedLogins', { email, ip, windowMs: 15 * 60 * 1000 });
    if (recentFails >= 5) {
      return res.status(429).json({ error: 'Account locked for 1 hour due to too many failed attempts' });
    }

    // Find admin
    const admin = await convex(req).query('api.auth_helpers:findAdminByEmail', { email });
    if (!admin) {
      await convex(req).mutation('api.auth_helpers:logAdminFailedLogin', { email, ip });
      await alertAdminLogin({ email, ip, userAgent, success: false });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Check if 2FA is enabled (required for admin)
    const twoFactor = await convex(req).query('api.auth_helpers:getAdmin2FA', { adminId: admin._id });
    if (!twoFactor || !twoFactor.isEnabled) {
      return res.status(403).json({ error: '2FA must be enabled. Contact super admin.' });
    }

    // Verify password
    const isValid = await convex(req).mutation('api.auth_helpers:verifyAdminPassword', { email, password });
    if (!isValid) {
      await convex(req).mutation('api.auth_helpers:logAdminFailedLogin', { email, ip });
      const failCount = await convex(req).query('api.auth_helpers:countAdminFailedLogins', { email, ip, windowMs: 15 * 60 * 1000 });
      if (failCount >= 5) {
        await convex(req).mutation('api.auth_helpers:lockAdminAccount', { adminId: admin._id, minutes: 60 });
        await alertAdminLockout({ email, ip, failCount });
      }
      await alertAdminLogin({ email, ip, userAgent, success: false });
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate temporary token for 2FA
    await alertAdminLogin({ email, ip, userAgent, success: true });
    const tempToken = await generateTempToken(admin._id, 5);

    res.json({ requires2FA: true, tempToken });
  } catch (err) {
    console.error('[ADMIN-AUTH] login error:', err);
    res.status(500).json({ error: 'Admin login failed' });
  }
}));

// POST /api/admin/login/2fa
router.post('/login/2fa', async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) return res.status(400).json({ error: 'Temp token and 2FA code required' });

    const payload = await verifyTempToken(tempToken);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired temp token' });

    const adminId = payload.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';

    // Verify TOTP
    const verified = await convex(req).mutation('api.auth_helpers:verifyAdminTOTP', { adminId, totpCode });
    if (!verified) {
      const adminUser = await convex(req).query('api.auth_helpers:getAdminById', { adminId });
      await convex(req).mutation('api.auth_helpers:logAdminAudit', {
        adminId,
        action: 'ADMIN_2FA_FAILED',
        ipAddress: ip,
        userAgent,
      });
      await alert2FABypass({ email: adminUser?.email || adminId, ip, userAgent });
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Check session limit (max 1 admin session)
    const activeSessions = await convex(req).query('api.auth_helpers:countActiveSessions', { userId: adminId, userType: 'admin' });
    if (activeSessions >= 1) {
      return res.status(403).json({ error: 'Only one admin session allowed. Terminate existing session first.' });
    }

    // Generate tokens (admin: 30 min access, 1 day refresh)
    const accessToken = await generateAccessToken(adminId, 'admin');
    const refreshToken = await generateRefreshToken(adminId, 'admin');

    // Save session
    await convex(req).mutation('api.auth_helpers:createSession', {
      userId: adminId,
      userType: 'admin',
      refreshToken: hashToken(refreshToken),
      deviceInfo: { userAgent, ...parseUserAgent(userAgent) },
      ip,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    });

    // Log successful login
    await convex(req).mutation('api.auth_helpers:logAdminAudit', {
      adminId,
      action: 'ADMIN_LOGIN_SUCCESS',
      ipAddress: ip,
      userAgent,
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 1800,
      admin: { _id: adminId, role: 'admin' },
    });
  } catch (err) {
    console.error('[ADMIN-AUTH] 2FA error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/admin/logout
router.post('/logout', adminAuth, async (req, res) => {
  try {
    await convex(req).mutation('api.auth_helpers:revokeUserSessions', { userId: req.adminId, userType: 'admin' });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// GET /api/admin/audit-log
router.get('/audit-log', adminAuth, async (req, res) => {
  try {
    const logs = await convex(req).query('api.auth_helpers:getAdminAuditLogs', { adminId: req.adminId, limit: 50 });
    res.json({ logs });
  } catch (err) {
    console.error('[ADMIN-AUTH] audit-log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/audit-log/all
router.get('/audit-log/all', adminAuth, async (req, res) => {
  try {
    const logs = await convex(req).query('api.auth_helpers:getAllAdminAuditLogs', { limit: 100 });
    res.json({ logs });
  } catch (err) {
    console.error('[ADMIN-AUTH] audit-log/all error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// POST /api/admin/ip-whitelist
router.post('/ip-whitelist', adminAuth, async (req, res) => {
  try {
    const { ips, description } = req.body;
    if (!Array.isArray(ips)) return res.status(400).json({ error: 'ips must be an array' });

    await convex(req).mutation('api.auth_helpers:updateIpWhitelist', {
      adminId: req.adminId,
      ipAddresses: ips,
      description: description || '',
    });

    res.json({ ips, message: 'IP whitelist updated' });
  } catch (err) {
    console.error('[ADMIN-AUTH] ip-whitelist error:', err);
    res.status(500).json({ error: 'Failed to update IP whitelist' });
  }
});

// GET /api/admin/sessions
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const sessions = await convex(req).query('api.auth_helpers:listActiveSessions', { userId: req.adminId, userType: 'admin' });
    res.json({ sessions });
  } catch (err) {
    console.error('[ADMIN-AUTH] sessions error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

export default router;
