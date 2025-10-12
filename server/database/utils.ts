import type { H3Event } from "h3";

// ========================================
// DATABASE ACCESS UTILITIES
// ========================================
// Helper functions for accessing tenant-specific databases
// Used by services and repositories to get the correct DB instance
// ========================================

/**
 * Check if multitenancy is enabled for the current request
 */
export function isMultitenancyEnabled(event: H3Event): boolean {
  const config = useRuntimeConfig(event);
  return config.multitenancy?.enabled ?? false;
}

/**
 * Check if the current context is in single-tenant mode
 */
export function isSingleTenant(event: H3Event): boolean {
  return !isMultitenancyEnabled(event);
}

/**
 * Get the database from context (Per-Tenant Database Architecture)
 *
 * The database is set by the tenant middleware (01.tenant.ts) which selects
 * the appropriate D1 database binding based on tenant ID or uses the default DB.
 *
 * @throws {Error} If database is not available in context (middleware didn't run)
 */
export function getDatabase(event: H3Event): D1Database {
  const db = event.context.db;

  if (!db) {
    throw new Error(
      "Database not available in context. " +
        "This usually means the tenant middleware didn't run or failed."
    );
  }

  return db;
}

/**
 * Get the tenant ID from context with fallback for single-tenant mode
 */
export function getTenantId(event: H3Event): string {
  const tenantId = event.context.tenantId;

  if (!tenantId) {
    // If no tenantId in context, check if we're in single-tenant mode
    if (isSingleTenant(event)) {
      return "default";
    }
    throw new Error("Tenant ID not found in context and multitenancy is enabled");
  }

  return tenantId;
}

/**
 * Get multitenancy configuration details
 */
export function getMultitenancyConfig(event: H3Event) {
  return {
    enabled: isMultitenancyEnabled(event),
    tenantId: getTenantId(event),
    mode: isMultitenancyEnabled(event) ? "multi-tenant" : "single-tenant",
  };
}
