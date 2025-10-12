import { defineEventHandler, getRouterParam } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError, NotFoundError } from "#server/error/errors";

// ========================================
// GET /api/v1/roles/:id
// ========================================
// Get role by ID
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  const roleId = getRouterParam(event, "id");
  if (!roleId) {
    throw new MissingFieldError("id");
  }

  const rbacService = getRBACService(event);
  const role = await rbacService.getRoleById(roleId);

  if (!role) {
    throw new NotFoundError("Role");
  }

  return createSuccessResponse("Role retrieved successfully", role);
});
