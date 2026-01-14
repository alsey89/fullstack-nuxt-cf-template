import { defineEventHandler, getRouterParam } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError, NotFoundError } from "#server/error/errors";
import type { RoleName } from "#server/config/rbac";

// ========================================
// GET /api/v1/roles/:id
// ========================================
// Get role by name (config-defined)
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  const roleName = getRouterParam(event, "id");
  if (!roleName) {
    throw new MissingFieldError("id");
  }

  const rbacService = getRBACService(event);

  // Validate role exists in config
  if (!rbacService.isValidRole(roleName)) {
    throw new NotFoundError("Role");
  }

  const roleConfig = rbacService.getRoleConfig(roleName as RoleName);

  const roleData = {
    name: roleName,
    displayName: roleConfig?.name,
    description: roleConfig?.description,
    permissions: roleConfig?.permissions,
    isSystem: true,
  };

  return createSuccessResponse("Role retrieved successfully", roleData);
});
