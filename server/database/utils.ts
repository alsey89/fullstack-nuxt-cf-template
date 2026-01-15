import type { H3Event } from "h3";

// ========================================
// DATABASE ACCESS UTILITIES
// ========================================
// Helper functions for accessing tenant databases and workspace context.
// Used by services and repositories to get the correct DB instance.
//
// Two isolation levels:
// 1. Tenant (infrastructure): Which D1 database to use (set by 01.tenant.ts)
// 2. Workspace (application): Which workspaceId to scope queries (set by 02.auth.ts)
// ========================================

/**
 * Check if multi-tenancy (per-database isolation) is enabled
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
 * Get the database from context
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
 * Get the tenant ID from context (infrastructure-level isolation)
 *
 * @returns The tenant ID (from X-Tenant-ID header) or "default" for single-tenant mode
 * @throws {Error} If tenant ID not in context and multitenancy is enabled
 */
export function getTenantId(event: H3Event): string {
  const tenantId = event.context.tenantId;

  if (!tenantId) {
    if (isSingleTenant(event)) {
      return "default";
    }
    throw new Error("Tenant ID not found in context and multitenancy is enabled");
  }

  return tenantId;
}

/**
 * Get the workspace ID from context (application-level isolation)
 *
 * WorkspaceId is set by auth middleware from the session.
 * Used for scoping queries within a database.
 *
 * @returns The workspace ID or "default" for single-workspace scenarios
 * @throws {Error} If workspace ID not in context when expected
 */
export function getWorkspaceId(event: H3Event): string {
  const workspaceId = event.context.workspaceId;

  if (!workspaceId) {
    // For routes that don't require workspace context (e.g., signup)
    return "default";
  }

  return workspaceId;
}

/**
 * Get isolation configuration details
 */
export function getIsolationConfig(event: H3Event) {
  return {
    // Infrastructure level (which database)
    multitenancyEnabled: isMultitenancyEnabled(event),
    tenantId: getTenantId(event),
    // Application level (which workspace within database)
    workspaceId: getWorkspaceId(event),
  };
}

// Backward compatibility alias
export const isSingleWorkspace = isSingleTenant;
export const getMultitenancyConfig = getIsolationConfig;
