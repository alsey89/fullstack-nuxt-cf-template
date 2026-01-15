import { defineEventHandler } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";

// ========================================
// GET /api/v1/permissions
// ========================================
// List all available permissions (config-defined)
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:read");

  // Get config-defined permission definitions
  const rbacService = getRBACService(event);
  const definitions = rbacService.getPermissionDefinitions();

  // Transform to API response format
  const permissions = Object.entries(definitions).map(([code, description]) => {
    const [category, action] = code.split(":");
    return {
      code,
      category: category || "system",
      action: action || code,
      description,
    };
  });

  // Sort by category, then by code
  permissions.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.code.localeCompare(b.code);
  });

  return createSuccessResponse("Permissions retrieved successfully", permissions);
});
