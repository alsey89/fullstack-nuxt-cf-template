import { getHeader } from "h3";
import {
  AuthenticationError,
  InternalServerError,
  TenantMismatchError,
} from "#server/error/errors";
import { HdrKeyTenantID } from "#server/types/api";
import { isDevelopment } from "#server/utils/environment";

// ========================================
// DATABASE SELECTION MIDDLEWARE
// ========================================
// Conditionally selects database binding based on multitenancy configuration
// When enabled: Selects per-tenant database based on subdomain/header
// When disabled: Uses default DB binding for single-tenant mode
// Runs before auth middleware (01 prefix)
// ========================================

/**
 * Database selection middleware (Per-Tenant Database Architecture)
 *
 * Multitenancy Enabled:
 * - Development: Extracts tenant ID from x-tenant-id header OR subdomain
 * - Production: Extracts tenant ID from subdomain ONLY (secure)
 * - Selects database binding: DB_<TENANT_ID> (e.g., DB_ACME)
 *
 * Multitenancy Disabled:
 * - Uses default DB binding
 * - Sets tenantId = "default"
 */
export default defineEventHandler(async (event) => {
  // Only apply to API routes
  if (!event.path.startsWith("/api/")) {
    return;
  }

  // Skip for public routes (auth, health checks, etc.)
  if (isPublicRoute(event.path)) {
    return;
  }

  // Get configuration
  const config = useRuntimeConfig(event);
  const isMultitenancyEnabled = config.multitenancy?.enabled ?? false;

  // Single-tenant mode: Use default DB binding
  if (!isMultitenancyEnabled) {
    const db = event.context.cloudflare?.env?.DB as D1Database;

    if (!db) {
      throw new InternalServerError(
        "Default database not found. Ensure DB binding exists."
      );
    }

    event.context.db = db;
    event.context.tenantId = "default";
    return;
  }

  // Multi-tenant mode: Select tenant-specific database
  const host = getHeader(event, "host") || "";
  const hostWithoutPort = host.split(":")[0]; // "acme.domain.localhost:3000" → "acme.domain.localhost"
  const subdomain = hostWithoutPort.split(".")[0] || null; // "acme.domain.localhost" → "acme"

  const isDev = isDevelopment(event);
  const tenantId = isDev
    ? getHeader(event, HdrKeyTenantID) || subdomain
    : subdomain;

  if (!tenantId) {
    throw new TenantMismatchError(
      "Tenant ID required. Use subdomain (e.g., acme.example.com)" +
        (isDev ? " or x-tenant-id header" : "")
    );
  }

  // Select database binding for tenant
  // Convention: DB_<TENANT_ID> (e.g., "acme" → "DB_ACME")
  const dbBinding = `DB_${tenantId.toUpperCase().replace(/-/g, "_")}`;
  const cfEnv = event.context.cloudflare?.env as unknown as Record<
    string,
    unknown
  >;
  const db = cfEnv?.[dbBinding] as D1Database;

  if (!db) {
    throw new TenantMismatchError(
      `Database for tenant "${tenantId}" not found. ` +
        `Expected binding: ${dbBinding}`
    );
  }

  // Set database and tenant ID in context for downstream handlers
  event.context.db = db;
  event.context.tenantId = tenantId;
});

/**
 * Check if route is public (no tenant required)
 */
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    "/api/health",
    "/api/_auth", // nuxt-auth-utils internal endpoints
  ];

  return publicRoutes.some((route) => path.startsWith(route));
}
