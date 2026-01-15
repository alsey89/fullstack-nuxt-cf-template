import { getHeader } from "h3";
import { InternalServerError, AuthorizationError } from "#server/error/errors";
import { HdrKeyTenantID } from "#server/types/api";

// ========================================
// TENANT DATABASE MIDDLEWARE
// ========================================
// Selects the appropriate D1 database based on tenant context.
//
// Two modes:
// 1. Single-Tenant Mode (default): Uses the default DB binding
// 2. Multi-Tenant Mode: Resolves tenant from subdomain/header
//
// Tenant Resolution (multi-tenant mode):
// - Production: Subdomain required, header must match if provided (defense in depth)
// - Development: Subdomain preferred, falls back to header (for API tools)
//
// Context variables set:
// - event.context.db: D1 database instance
// - event.context.tenantId: Tenant ID (from subdomain/header or "default")
//
// Note: workspaceId (for in-database isolation) is set by auth middleware
// from the session. This middleware only handles database selection.
//
// Runs before auth middleware (01 prefix)
// ========================================

const DEFAULT_TENANT_ID = "default";

/**
 * Extract tenant ID from Host header subdomain
 * e.g., "acme.myapp.com" → "acme"
 * e.g., "myapp.com" → null (no subdomain)
 * e.g., "localhost:3000" → null (local dev without subdomain)
 */
function extractSubdomainTenant(host: string | undefined, baseDomain: string | undefined): string | null {
  if (!host || !baseDomain) {
    return null;
  }

  // Remove port if present
  const hostWithoutPort = host.split(":")[0];
  const baseWithoutPort = baseDomain.split(":")[0];

  // Check if host ends with base domain
  if (!hostWithoutPort.endsWith(baseWithoutPort)) {
    return null;
  }

  // Extract subdomain
  // e.g., "acme.myapp.com" with base "myapp.com" → "acme"
  const subdomain = hostWithoutPort.slice(0, -(baseWithoutPort.length + 1)); // +1 for the dot

  // No subdomain (e.g., "myapp.com" === base domain)
  if (!subdomain || subdomain.includes(".")) {
    // Multi-level subdomains not supported (e.g., "foo.acme.myapp.com")
    return null;
  }

  return subdomain.toLowerCase();
}

/**
 * Tenant Database Middleware
 *
 * Selects the appropriate D1 database binding based on tenant context.
 *
 * Production: Requires subdomain, validates header matches if provided
 * Development: Subdomain preferred, falls back to X-Tenant-ID header
 */
export default defineEventHandler(async (event) => {
  // Only apply to API routes
  if (!event.path.startsWith("/api/")) {
    return;
  }

  const config = useRuntimeConfig(event);
  const isMultitenancyEnabled = config.multitenancy?.enabled ?? false;
  const isProduction = config.public?.environment === "production";
  const baseDomain = config.multitenancy?.baseDomain as string | undefined;

  let db: D1Database | undefined;
  let tenantId: string;

  if (isMultitenancyEnabled) {
    // Multi-tenant mode: Resolve tenant from subdomain and/or header
    const host = getHeader(event, "host");
    const headerTenantId = getHeader(event, HdrKeyTenantID)?.toLowerCase();
    const subdomainTenantId = extractSubdomainTenant(host, baseDomain);

    if (isProduction) {
      // PRODUCTION: Subdomain required, header must match if provided
      if (!subdomainTenantId) {
        throw new AuthorizationError(
          "Multi-tenancy requires subdomain access. " +
            `Use <tenant>.${baseDomain || "your-domain.com"} to access your tenant.`
        );
      }

      // If header is provided, it must match subdomain (defense in depth)
      if (headerTenantId && headerTenantId !== subdomainTenantId) {
        throw new AuthorizationError(
          `Tenant mismatch: subdomain '${subdomainTenantId}' does not match header '${headerTenantId}'.`
        );
      }

      tenantId = subdomainTenantId;
    } else {
      // DEVELOPMENT: Subdomain preferred, fall back to header (for API tools like Bruno/Postman)
      if (subdomainTenantId) {
        // If both provided, they should match
        if (headerTenantId && headerTenantId !== subdomainTenantId) {
          throw new AuthorizationError(
            `Tenant mismatch: subdomain '${subdomainTenantId}' does not match header '${headerTenantId}'.`
          );
        }
        tenantId = subdomainTenantId;
      } else if (headerTenantId) {
        // No subdomain, use header (typical for local dev with API tools)
        tenantId = headerTenantId;
      } else {
        throw new InternalServerError(
          `Multi-tenancy is enabled but no tenant specified. ` +
            `Either use subdomain (<tenant>.${baseDomain || "localhost"}) or include ${HdrKeyTenantID} header.`
        );
      }
    }

    // Construct binding name: DB_<TENANT_UPPERCASE>
    // e.g., tenant "acme" → DB_ACME
    const bindingName = `DB_${tenantId.toUpperCase()}`;
    db = event.context.cloudflare?.env?.[bindingName] as D1Database | undefined;

    if (!db) {
      throw new InternalServerError(
        `Database binding '${bindingName}' not found for tenant '${tenantId}'. ` +
          "Ensure the binding exists in wrangler.jsonc."
      );
    }
  } else {
    // Single-tenant mode: Use default DB binding
    tenantId = DEFAULT_TENANT_ID;
    db = event.context.cloudflare?.env?.DB as D1Database | undefined;

    if (!db) {
      throw new InternalServerError(
        "Database not found. Ensure DB binding exists in wrangler.jsonc."
      );
    }
  }

  event.context.db = db;
  event.context.tenantId = tenantId;
});
