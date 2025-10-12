import { AuthenticationError } from "../error/errors";

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
// Validates user session
// Sets user context from session
// Runs after tenant middleware (02 prefix)
// ========================================

/**
 * Authentication middleware
 * Validates session and sets user context
 */
export default defineEventHandler(async (event) => {
  // Only apply to API routes
  if (!event.path.startsWith("/api/")) {
    return;
  }

  // Skip for public routes
  if (isPublicRoute(event.path)) {
    return;
  }

  // Get user session from nuxt-auth-utils
  const session = await getUserSession(event);

  if (!session || !session.user?.id) {
    throw new AuthenticationError("Authentication required", "AUTH_REQUIRED");
  }

  // CRITICAL: Validate session is bound to current tenant
  // This prevents cross-tenant access by reusing session tokens
  if (session.tenantId !== event.context.tenantId) {
    throw new AuthenticationError(
      "Session tenant mismatch. Please sign in again.",
      "TENANT_MISMATCH"
    );
  }

  // Set user context for downstream handlers
  event.context.userId = session.user.id as string;
});

/**
 * Check if route is public (no auth required)
 */
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    "/api/health",
    "/api/reset-and-seed",
    "/api/test-db",
    "/api/v1/auth/signup",
    "/api/v1/auth/signin",
    "/api/v1/auth/email/confirm",
    "/api/v1/auth/password/reset/request",
    "/api/v1/auth/password/reset",
    "/api/_auth/session", // nuxt-auth-utils session endpoint
  ];

  return publicRoutes.some((route) => path === route || path.startsWith(route));
}
