// ========================================
// REPOSITORY INDEX
// ========================================
// Central export point for all repositories
// ========================================

// Base repositories
export * from "./base";

// Identity repositories
export {
  UserRepository,
  UserSettingsRepository,
  AuditLogRepository,
} from "./identity";

// Query condition helpers
export { Conditions, combineConditions } from "./helpers/conditions";

// Import for factory functions
import {
  UserRepository,
  UserSettingsRepository,
  AuditLogRepository,
} from "./identity";

// ========================================
// FACTORY FUNCTIONS
// ========================================

/**
 * Create all identity repositories
 */
export function createIdentityRepositories(db: D1Database) {
  return {
    userRepo: new UserRepository(db),
    userSettingsRepo: new UserSettingsRepository(db),
    auditLogRepo: new AuditLogRepository(db),
  };
}

/**
 * Create all repositories
 */
export function createRepositories(db: D1Database) {
  return createIdentityRepositories(db);
}

/**
 * Create all repositories from H3Event context
 * Convenience function for route handlers that need repository access
 */
export function createRepositoriesFromEvent(event: any) {
  const db = event.context.cloudflare?.env?.DB as D1Database;

  if (!db) {
    throw new Error("Database not available in context");
  }

  return createRepositories(db);
}
