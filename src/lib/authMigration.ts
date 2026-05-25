/**
 * Auth Migration Helper — Seamless frontend token migration
 *
 * Handles the transition from legacy Convex sessionId tokens to
 * new JWT access/refresh token pairs without forcing logout.
 */

const LEGACY_TOKEN_KEY = 'admin_session_token';
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const MIGRATION_NEEDED_KEY = 'auth_migration_needed';

class AuthMigrationHelper {
  private migrationInProgress = false;

  /**
   * Call on app boot. Silently upgrades legacy tokens to JWT.
   * Returns the active token (legacy or upgraded).
   */
  async checkAndMigrate(): Promise<string | null> {
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    const jwtToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    // Already on JWT
    if (jwtToken) return jwtToken;

    // No legacy token — not authenticated
    if (!legacyToken) return null;

    // Has legacy token — try to upgrade silently
    const needsMigration = localStorage.getItem(MIGRATION_NEEDED_KEY) === 'true';
    if (!needsMigration) {
      await this.upgradeToken(legacyToken);
    }

    // Return whatever we have after upgrade attempt
    return localStorage.getItem(ACCESS_TOKEN_KEY) || legacyToken;
  }

  /**
   * Exchange a legacy Convex sessionId token for JWT access/refresh tokens.
   */
  async upgradeToken(legacyToken: string): Promise<boolean> {
    if (this.migrationInProgress) return false;
    this.migrationInProgress = true;

    try {
      const res = await fetch('/api/auth/upgrade-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${legacyToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        localStorage.removeItem(MIGRATION_NEEDED_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        return true;
      }

      // Upgrade failed — mark for later retry
      localStorage.setItem(MIGRATION_NEEDED_KEY, 'true');
      return false;
    } catch {
      localStorage.setItem(MIGRATION_NEEDED_KEY, 'true');
      return false;
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Get the best available token (JWT > legacy).
   */
  getActiveToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
      || localStorage.getItem(LEGACY_TOKEN_KEY);
  }

  /**
   * Clear all auth tokens.
   */
  clearTokens(): void {
    [LEGACY_TOKEN_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, MIGRATION_NEEDED_KEY]
      .forEach(key => localStorage.removeItem(key));
  }

  /**
   * Check if we're in legacy mode (helps components decide which API to call).
   */
  isLegacyMode(): boolean {
    return !localStorage.getItem(ACCESS_TOKEN_KEY)
      && !!localStorage.getItem(LEGACY_TOKEN_KEY);
  }

  /**
   * Check if we're in JWT mode.
   */
  isJwtMode(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}

export const authMigration = new AuthMigrationHelper();
export default authMigration;
