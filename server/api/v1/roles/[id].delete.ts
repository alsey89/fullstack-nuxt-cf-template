import { defineEventHandler, getRouterParam } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError } from "#server/error/errors";

// ========================================
// DELETE /api/v1/roles/:id
// ========================================
// Delete role (soft delete)
// Requires authentication and roles:delete permission
// Cannot delete system roles
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:delete");

  const roleId = getRouterParam(event, "id");
  if (!roleId) {
    throw new MissingFieldError("id");
  }

  const rbacService = getRBACService(event);
  const success = await rbacService.deleteRole(roleId);

  if (!success) {
    throw new Error("Failed to delete role");
  }

  return createSuccessResponse("Role deleted successfully", { deleted: true });
});
