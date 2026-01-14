import { AuthenticationError } from "#server/error/errors";

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
// Validates user session and sets context for downstream handlers.
//
// Context variables set:
// - event.context.userId: Authenticated user's ID
// - event.context.tenantId: Current tenant/workspace ID (from session)
//
// Runs after database middleware (02 prefix)
// ========================================

/**
 * Authentication Middleware
 *
 * Validates session and sets user + tenant context.
 * In single-database architecture, tenantId from session defines
 * which workspace the user is currently operating in.
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
    throw new AuthenticationError("Invalid or missing authentication session.");
  }

  // Set user and tenant context for downstream handlers
  // tenantId defines which workspace the user is operating in
  event.context.userId = session.user.id as string;
  event.context.tenantId = session.tenantId as string | undefined;
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
    "/api/_nuxt_icon/", // nuxt icon endpoint
    "/api/_auth/session", // nuxt-auth-utils session endpoint
    // OAuth routes
    "/api/auth/google/authorize",
    "/api/auth/google/callback",
  ];

  return publicRoutes.some((route) => path === route || path.startsWith(route));
}
