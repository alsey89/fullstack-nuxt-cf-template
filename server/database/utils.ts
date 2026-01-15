import type { H3Event } from "h3";

// ========================================
// DATABASE ACCESS UTILITIES
// ========================================
// Helper functions for accessing workspace-specific databases
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
 * Check if the current context is in single-workspace mode
 */
export function isSingleWorkspace(event: H3Event): boolean {
  return !isMultitenancyEnabled(event);
}

/**
 * Get the database from context (Per-Workspace Database Architecture)
 *
 * The database is set by the workspace middleware (01.workspace.ts) which selects
 * the appropriate D1 database binding based on workspace ID or uses the default DB.
 *
 * @throws {Error} If database is not available in context (middleware didn't run)
 */
export function getDatabase(event: H3Event): D1Database {
  const db = event.context.db;

  if (!db) {
    throw new Error(
      "Database not available in context. " +
        "This usually means the workspace middleware didn't run or failed."
    );
  }

  return db;
}

/**
 * Get the workspace ID from context with fallback for single-workspace mode
 */
export function getWorkspaceId(event: H3Event): string {
  const workspaceId = event.context.workspaceId;

  if (!workspaceId) {
    // If no workspaceId in context, check if we're in single-workspace mode
    if (isSingleWorkspace(event)) {
      return "default";
    }
    throw new Error("Workspace ID not found in context and multitenancy is enabled");
  }

  return workspaceId;
}

/**
 * Get multitenancy configuration details
 */
export function getMultitenancyConfig(event: H3Event) {
  return {
    enabled: isMultitenancyEnabled(event),
    workspaceId: getWorkspaceId(event),
    mode: isMultitenancyEnabled(event) ? "multi-workspace" : "single-workspace",
  };
}
