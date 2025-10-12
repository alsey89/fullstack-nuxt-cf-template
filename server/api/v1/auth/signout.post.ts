import { createSuccessResponse } from "#server/lib/response";

// ========================================
// POST /api/v1/auth/signout
// ========================================
// Sign out user and clear session
// Requires authentication
// ========================================

export default defineEventHandler(async (event) => {
  // Clear user session using nuxt-auth-utils
  await clearUserSession(event);

  return createSuccessResponse("Signed out successfully");
});
