import { defineEventHandler, getRouterParam } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError } from "#server/error/errors";

// ========================================
// GET /api/v1/users/:userId/roles
// ========================================
// Get all roles for a user
// Requires authentication and users:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "users:view");

  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw new MissingFieldError("userId");
  }

  const rbacService = getRBACService(event);
  const roles = await rbacService.getUserRoles(userId);

  return createSuccessResponse("User roles retrieved successfully", roles);
});
