import { InternalServerError } from "#server/error/errors";

// ========================================
// DATABASE CONTEXT MIDDLEWARE
// ========================================
// Sets up database binding for all API requests.
// Uses single-database architecture with tenantId for isolation.
//
// Context variable set:
// - event.context.db: D1 database instance
//
// Note: tenantId is set by auth middleware (02) from session.
// This middleware only handles database binding.
//
// Runs before auth middleware (01 prefix)
// ========================================

/**
 * Database Context Middleware (Single-Database Architecture)
 *
 * Sets up D1 database binding for all API requests.
 * Tenant context (tenantId) is handled by auth middleware from session.
 */
export default defineEventHandler(async (event) => {
  // Only apply to API routes
  if (!event.path.startsWith("/api/")) {
    return;
  }

  // Set up database (single database for all tenants)
  const db = event.context.cloudflare?.env?.DB as D1Database;

  if (!db) {
    throw new InternalServerError(
      "Database not found. Ensure DB binding exists in wrangler.toml."
    );
  }

  event.context.db = db;
});
