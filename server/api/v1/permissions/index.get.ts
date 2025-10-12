import { defineEventHandler } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";

// ========================================
// GET /api/v1/permissions
// ========================================
// List all available permissions (registry)
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  const rbacService = getRBACService(event);
  const permissions = await rbacService.listPermissions();

  return createSuccessResponse("Permissions retrieved successfully", permissions);
});
