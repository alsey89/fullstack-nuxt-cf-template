import { defineEventHandler, getRouterParam, readBody } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { MissingFieldError, NotFoundError } from "#server/error/errors";
import { sanitizeHtml } from "#server/lib/sanitize";
import { z } from "zod";

// ========================================
// PUT /api/v1/roles/:id
// ========================================
// Update role
// Requires authentication and roles:update permission
// ========================================

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:update");

  const roleId = getRouterParam(event, "id");
  if (!roleId) {
    throw new MissingFieldError("id");
  }

  const body = await readBody(event);
  const validated = updateRoleSchema.parse(body);

  // Sanitize text inputs
  const sanitized = {
    name: validated.name ? sanitizeHtml(validated.name) : undefined,
    description: validated.description ? sanitizeHtml(validated.description) : undefined,
    permissions: validated.permissions, // Permission codes don't need sanitization (validated against registry)
  };

  const rbacService = getRBACService(event);
  const role = await rbacService.updateRole(roleId, {
    name: sanitized.name,
    description: sanitized.description,
    permissions: sanitized.permissions as any, // Type assertion for PermissionCode[]
  });

  if (!role) {
    throw new NotFoundError("Role");
  }

  return createSuccessResponse("Role updated successfully", role);
});
