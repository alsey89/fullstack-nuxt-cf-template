import { getRouterParam } from "h3";
import { createIdentityService } from "../../../services/identity";
import { createSuccessResponse } from "../../../lib/response";
import { MissingFieldError } from "../../../error/errors";
import { requirePermission } from "../../../services/rbac";

// ========================================
// GET /api/v1/user/:id
// ========================================
// Get user by ID
// Requires authentication and users:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "users:view");

  const userId = getRouterParam(event, "id");

  if (!userId) {
    throw new MissingFieldError("id");
  }

  const identityService = createIdentityService(event);

  const user = await identityService.getUser(userId);

  return createSuccessResponse("User retrieved successfully", user);
});
