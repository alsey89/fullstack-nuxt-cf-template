import { defineEventHandler, readBody } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import { sanitizeHtml } from "#server/lib/sanitize";
import { z } from "zod";

// ========================================
// POST /api/v1/roles
// ========================================
// Create a new role
// Requires authentication and roles:create permission
// ========================================

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:create");

  const body = await readBody(event);
  const validated = createRoleSchema.parse(body);

  // Sanitize text inputs
  const sanitized = {
    name: sanitizeHtml(validated.name),
    description: validated.description ? sanitizeHtml(validated.description) : undefined,
    permissions: validated.permissions, // Permission codes don't need sanitization (validated against registry)
  };

  const rbacService = getRBACService(event);
  const role = await rbacService.createRole({
    name: sanitized.name,
    description: sanitized.description,
    permissions: sanitized.permissions as any, // Type assertion for PermissionCode[]
    isSystem: false, // User-created roles are never system roles
  });

  return createSuccessResponse("Role created successfully", role);
});
