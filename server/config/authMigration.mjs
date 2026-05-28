/**
 * Auth Migration Config — Controls parallel-run phase
 *
 * PHASE 1 (dual_write_log_only):
 *   Old auth (Convex mutations) is primary. New Express JWT auth logs in background.
 *   Zero user impact. Validates new auth produces same results.
 *
 * PHASE 2 (dual_read_new_first):
 *   New auth tries first. Falls back to old auth on failure.
 *   Whitelist controls which users are tested. Auto-rollback on error threshold.
 *
 * PHASE 3 (new_auth_only):
 *   New auth only. Old auth disabled. Un-migrated users trigger on-demand migration.
 *
 * PHASE 4 (cleanup):
 *   Old auth code removed from codebase.
 */

export const MIGRATION_PHASE = {
  DUAL_WRITE_LOG_ONLY: 'dual_write_log_only',
  DUAL_READ_NEW_FIRST: 'dual_read_new_first',
  NEW_AUTH_ONLY: 'new_auth_only',
  CLEANUP: 'cleanup',
};

const CURRENT_PHASE = process.env.AUTH_MIGRATION_PHASE || MIGRATION_PHASE.DUAL_WRITE_LOG_ONLY;

const TEST_USER_WHITELIST = process.env.AUTH_TEST_WHITELIST
  ? process.env.AUTH_TEST_WHITELIST.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  : [];

export const config = {
  phase: CURRENT_PHASE,

  // Whitelist controls gradual rollout (empty = all users when phase allows)
  testWhitelist: TEST_USER_WHITELIST,

  // Logging
  logToFile: true,
  logToDatabase: true,
  alertOnFailure: true,
  logDir: process.env.AUTH_MIGRATION_LOG_DIR || './logs',

  // Auto-rollback settings
  rollbackOnErrorCount: 10,
  errorWindowMinutes: 5,

  // Batch migration
  batchSize: 100,
  pauseBetweenBatches: 1000,

  // Admin key for monitoring endpoints (optional in cleanup phase)
  adminKey: process.env.AUTH_MIGRATION_ADMIN_KEY || 'dev-migration-key',
};
