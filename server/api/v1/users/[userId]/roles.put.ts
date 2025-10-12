import { defineEventHandler, getRouterParam, readBody } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError } from "#server/error/errors";
import { z } from "zod";

// ========================================
// PUT /api/v1/users/:userId/roles
// ========================================
// Replace all roles for a user
// Requires authentication and users:update permission
// ========================================

const updateUserRolesSchema = z.object({
  roleIds: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "users:update");

  const userId = getRouterParam(event, "userId");
  if (!userId) {
    throw new MissingFieldError("userId");
  }

  const body = await readBody(event);
  const validated = updateUserRolesSchema.parse(body);

  const rbacService = getRBACService(event);
  const assignments = await rbacService.replaceUserRoles(userId, validated.roleIds);

  return createSuccessResponse("User roles updated successfully", assignments);
});
