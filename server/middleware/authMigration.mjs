/**
 * Auth Migration Orchestrator
 *
 * Wraps old (Convex mutation) and new (Express JWT) auth services
 * and implements 4-phase parallel-run migration logic.
 */

import { MIGRATION_PHASE, config } from '../config/authMigration.mjs';
import { generateAccessToken, generateRefreshToken, generateTempToken, verifyAccessToken, verifyTempToken, hashToken } from '../lib/auth.mjs';
import { alertAdminLogin, alertAdminLockout } from '../lib/email.mjs';
import fs from 'fs';
import path from 'path';

export class AuthMigration {
  constructor() {
    this.errorCount = 0;
    this.errorWindowStart = Date.now();
    this._ensureLogDir();
  }

  // ── Public API ──

  /**
   * Login with migration-aware routing.
   * Delegates to the correct phase handler based on config.phase + whitelist.
   */
  async login(email, password, req, res) {
    const phase = config.phase;

    switch (phase) {
      case MIGRATION_PHASE.DUAL_WRITE_LOG_ONLY:
        return await this._phase1LogOnly(email, password, req, res);

      case MIGRATION_PHASE.DUAL_READ_NEW_FIRST:
        return await this._phase2NewFirst(email, password, req, res);

      case MIGRATION_PHASE.NEW_AUTH_ONLY:
        return await this._phase3NewOnly(email, password, req, res);

      default:
        return await this._fallbackOldAuth(email, password, req, res);
    }
  }

  /**
   * Sync a Convex user to the new JWT auth system.
   * Called during migration to create the new auth session.
   */
  async migrateUserToNewAuth(convex, adminId) {
    const accessToken = await generateAccessToken(adminId, 'admin');
    const refreshToken = await generateRefreshToken(adminId, 'admin');
    return { accessToken, refreshToken };
  }

  /**
   * Upgrade a legacy token (Convex sessionId) to new JWT tokens.
   */
  async upgradeToken(convex, sessionId) {
    const session = await convex.query('api.auth_helpers:getSessionById', { sessionId });
    if (!session || session.isRevoked) throw new Error('Invalid legacy session');

    const accessToken = await generateAccessToken(session.userId, session.userType || 'client');
    const refreshToken = await generateRefreshToken(session.userId, session.userType || 'client');

    await convex.mutation('api.auth_helpers:rotateRefreshToken', {
      sessionId: session._id,
      refreshToken: hashToken(refreshToken),
    });

    return { accessToken, refreshToken, expiresIn: session.userType === 'admin' ? 1800 : 900 };
  }

  // ── Phase 1: Log Only ──

  async _phase1LogOnly(email, password, req, res) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    const convex = req.app.locals.convex;

    // Old auth: attempt via Convex
    const user = await convex.query('api.auth_helpers:findUserByEmail', { email });
    if (!user) {
      await this._logComparison({ email, oldSuccess: false, oldError: 'User not found', phase: 'PHASE_1' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check role for admin flow vs user flow
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
      const isValid = await convex.mutation('api.auth_helpers:verifyAdminPassword', { email, password });
      if (!isValid) {
        await this._logComparison({ email, oldSuccess: false, oldError: 'Invalid password', phase: 'PHASE_1' });
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      // Fire-and-forget: try new auth in background
      this._tryNewAuthBackground(email, password, req, user, convex);

      // Return old auth result (legacy format)
      await this._logComparison({ email, oldSuccess: true, newSuccess: null, phase: 'PHASE_1' });
      return res.json({ useLegacy: true, message: 'Authenticated via legacy system', token: user._id });
    }

    // User flow
    const pwValid = await convex.mutation('api.auth_helpers:verifyUserPassword', { email, password });
    if (!pwValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    this._tryNewAuthBackground(email, password, req, user, convex);

    const accessToken = await generateAccessToken(user._id, 'client');
    const refreshToken = await generateRefreshToken(user._id, 'client');
    return res.json({ useLegacy: true, accessToken, refreshToken, expiresIn: 900 });
  }

  // ── Phase 2: New First with Fallback ──

  async _phase2NewFirst(email, password, req, res) {
    // Check whitelist
    if (!this._isWhitelisted(email)) {
      return await this._fallbackOldAuth(email, password, req, res);
    }

    // Check auto-rollback
    if (!this._shouldUseNewAuth()) {
      return await this._fallbackOldAuth(email, password, req, res);
    }

    const convex = req.app.locals.convex;

    try {
      // Try new auth flow (Express JWT)
      const result = await this._handleNewAuth(email, password, req, res, convex);
      if (result.handled) return; // Response already sent

      await this._logComparison({ email, oldSuccess: null, newSuccess: true, phase: 'PHASE_2' });
      return res.json(result);
    } catch (newErr) {
      await this._handleError(newErr, email);
      console.log(`[AUTH-MIGRATION] New auth failed for ${email}, falling back: ${newErr.message}`);

      // Fall back to old auth
      try {
        const oldResult = await this._handleOldAuth(email, password, req, res, convex);
        if (oldResult.handled) return;

        await this._logComparison({
          email, oldSuccess: true, newSuccess: false,
          newError: newErr.message, phase: 'PHASE_2_FALLBACK',
        });
        return res.json(oldResult);
      } catch (oldErr) {
        console.error(`[AUTH-MIGRATION] Both auth systems failed for ${email}`);
        return res.status(500).json({ error: 'Authentication unavailable' });
      }
    }
  }

  // ── Phase 3: New Auth Only ──

  async _phase3NewOnly(email, password, req, res) {
    const convex = req.app.locals.convex;
    const migrated = await this._isMigrated(convex, email);

    if (!migrated) {
      // User not migrated — use old auth once, then migrate
      const user = await convex.query('api.auth_helpers:findUserByEmail', { email });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isValid = user.role === 'admin'
        ? await convex.mutation('api.auth_helpers:verifyAdminPassword', { email, password })
        : await convex.mutation('api.auth_helpers:verifyUserPassword', { email, password });

      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

      // Migrate user to new auth
      const tokens = await this.migrateUserToNewAuth(convex, user._id);
      await this._markMigrated(convex, email);

      return res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: 900 });
    }

    // Migrated — pure new auth
    return await this._handleNewAuth(email, password, req, res, convex);
  }

  // ── Auth Handlers ──

  async _handleNewAuth(email, password, req, res, convex) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    const user = await convex.query('api.auth_helpers:findUserByEmail', { email });
    if (!user) return { handled: false, error: 'Invalid credentials' };

    const isAdmin = user.role === 'admin';

    if (isAdmin) {
      // Admin new auth flow (with 2FA)
      const recentFails = await convex.query('api.auth_helpers:countFailedLogins', { email, ip, windowMs: 15 * 60 * 1000 });
      if (recentFails >= 5) throw new Error('Account locked');

      const twoFactor = await convex.query('api.auth_helpers:getAdmin2FA', { adminId: user._id });
      if (!twoFactor || !twoFactor.isEnabled) throw new Error('2FA not configured');

      const isValid = await convex.mutation('api.auth_helpers:verifyAdminPassword', { email, password });
      if (!isValid) throw new Error('Invalid credentials');

      const tempToken = await generateTempToken(user._id, 5);
      return { handled: false, requires2FA: true, tempToken };
    }

    // User new auth flow
    const isValid = await convex.mutation('api.auth_helpers:verifyUserPassword', { email, password });
    if (!isValid) throw new Error('Invalid credentials');

    const accessToken = await generateAccessToken(user._id, 'client');
    const refreshToken = await generateRefreshToken(user._id, 'client');
    return { handled: false, accessToken, refreshToken, expiresIn: 900 };
  }

  async _handleOldAuth(email, password, req, res, convex) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    const user = await convex.query('api.auth_helpers:findUserByEmail', { email });
    if (!user) return { handled: false, error: 'Invalid credentials' };

    const isAdmin = user.role === 'admin';

    if (isAdmin) {
      const isValid = await convex.mutation('api.auth_helpers:verifyAdminPassword', { email, password });
      if (!isValid) return { handled: false, error: 'Invalid admin credentials' };

      const twoFactor = await convex.query('api.auth_helpers:getAdmin2FA', { adminId: user._id });
      if (twoFactor?.isEnabled) {
        const tempToken = await generateTempToken(user._id, 5);
        return { handled: false, requires2FA: true, tempToken, useLegacy: true };
      }
    } else {
      const isValid = await convex.mutation('api.auth_helpers:verifyUserPassword', { email, password });
      if (!isValid) return { handled: false, error: 'Invalid credentials' };
    }

    return { handled: false, useLegacy: true, message: 'Authenticated via legacy system' };
  }

  async _fallbackOldAuth(email, password, req, res) {
    const convex = req.app.locals.convex;
    return await this._handleOldAuth(email, password, req, res, convex);
  }

  // ── Background Testing (Phase 1) ──

  async _tryNewAuthBackground(email, password, req, user, convex) {
    try {
      const result = await this._handleNewAuth(email, password, req, null, convex);
      await this._logComparison({ email, oldSuccess: true, newSuccess: !result.error, phase: 'PHASE_1_BACKGROUND' });
    } catch (err) {
      await this._logComparison({
        email, oldSuccess: true, newSuccess: false,
        newError: err.message, phase: 'PHASE_1_BACKGROUND_ERROR',
      });
    }
  }

  // ── Whitelist & Rollback ──

  _isWhitelisted(email) {
    if (!email) return false;
    if (config.testWhitelist.length === 0) return true;
    return config.testWhitelist.includes(email.toLowerCase());
  }

  _shouldUseNewAuth() {
    if (this.errorCount >= config.rollbackOnErrorCount) {
      const elapsed = (Date.now() - this.errorWindowStart) / 1000 / 60;
      if (elapsed < config.errorWindowMinutes) {
        console.error(`[AUTH-MIGRATION] Error threshold (${config.rollbackOnErrorCount}) reached. Auto-rollback.`);
        return false;
      }
      this.errorCount = 0;
      this.errorWindowStart = Date.now();
    }
    return true;
  }

  // ── Migration Status ──

  async _isMigrated(convex, email) {
    const configEntry = await convex.query('api.auth_helpers:getSystemConfig', {});
    return true; // Simplified: trust token validation
  }

  async _markMigrated(convex, email) {
    // In production, store migration status in system_config or a dedicated table
  }

  // ── Error Handling ──

  async _handleError(error, email) {
    this.errorCount++;
    const msg = `[AUTH-MIGRATION] Error #${this.errorCount}: ${error.message} (${email})`;
    console.error(msg);

    if (config.alertOnFailure && this.errorCount % 5 === 0) {
      await this._sendAlert({
        type: 'AUTH_MIGRATION_ERROR',
        error: error.message,
        email,
        errorCount: this.errorCount,
        phase: config.phase,
      });
    }
  }

  // ── Logging ──

  async _logComparison(data) {
    const entry = { ...data, phase: config.phase, timestamp: new Date().toISOString() };

    if (config.logToFile) {
      const logDir = config.logDir;
      this._ensureLogDir(logDir);
      const logFile = path.join(logDir, 'auth_migration.log');
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    }

    if (config.logToDatabase) {
      // Would log to a `migration_logs` Convex table in production
    }
  }

  _ensureLogDir(dir) {
    const d = dir || config.logDir;
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  async _sendAlert(alertData) {
    console.error('[AUTH-MIGRATION-ALERT]', JSON.stringify(alertData));
    // In production: send to Sentry, Slack, etc.
  }
}

export default AuthMigration;
