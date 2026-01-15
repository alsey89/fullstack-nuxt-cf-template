import { AuthenticationError } from "#server/error/errors";
import { isPublicRoute } from "#server/config/routes";

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
// Validates user session and sets context for downstream handlers.
//
// Context variables set:
// - event.context.userId: Authenticated user's ID
// - event.context.tenantId: Current tenant/workspace ID (from session)
//
// Public routes are defined in server/config/routes.ts
// Runs after workspace middleware (01 prefix)
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

  // Skip for public routes (defined in server/config/routes.ts)
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
