import { defineEventHandler, getRouterParam } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError, NotFoundError } from "#server/error/errors";

// ========================================
// GET /api/v1/users/:userId/roles
// ========================================
// Get user's role (config-based single role per user)
// Requires authentication and users:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "users:read");

  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw new MissingFieldError("userId");
  }

  const rbacService = getRBACService(event);
  const roleName = await rbacService.getUserRole(userId);

  if (!roleName) {
    throw new NotFoundError("User");
  }

  // Get role config for additional details
  const roleConfig = rbacService.getRoleConfig(roleName);

  const roleData = {
    name: roleName,
    displayName: roleConfig?.name,
    description: roleConfig?.description,
    permissions: roleConfig?.permissions,
  };

  return createSuccessResponse("User role retrieved successfully", roleData);
});
