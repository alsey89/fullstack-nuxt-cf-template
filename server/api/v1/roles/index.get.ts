import { defineEventHandler, getQuery } from "h3";
import { getRBACService, requirePermission } from "../../../services/rbac";
import { createSuccessResponse } from "../../../lib/response";

// ========================================
// GET /api/v1/roles
// ========================================
// List all roles
// Requires authentication and roles:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  const query = getQuery(event);
  const includeSystem = query.includeSystem === "true";

  const rbacService = getRBACService(event);
  const roles = await rbacService.listRoles({ includeSystem });

  return createSuccessResponse("Roles retrieved successfully", roles);
});
