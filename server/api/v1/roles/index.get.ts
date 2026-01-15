import { defineEventHandler } from "h3";
import { requirePermission, getRBACService } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";

// ========================================
// GET /api/v1/roles
// ========================================
// List all available roles (config-defined)
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:read");

  // Get config-defined roles from RBAC service
  const rbacService = getRBACService(event);
  const roles = rbacService.getAvailableRoles();

  // Transform to API response format
  const rolesData = roles.map(({ name, config }) => ({
    name,
    displayName: config.name,
    description: config.description,
    permissions: config.permissions,
    isSystem: true, // Config roles are considered system roles
  }));

  return createSuccessResponse("Roles retrieved successfully", rolesData);
});
