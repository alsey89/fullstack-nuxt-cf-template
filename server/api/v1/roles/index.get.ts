import { defineEventHandler, getQuery } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import {
  parseListQuery,
  validateSortField,
  validateFilters,
} from "#server/utils/query-parser";
import { calculateLimitOffset, buildPaginatedResponse } from "#server/utils/pagination";

// ========================================
// GET /api/v1/roles
// ========================================
// List all roles with pagination, filtering, and sorting
// Requires authentication and roles:view permission
// ========================================
// Query Parameters:
//   - page: Page number (default: 1)
//   - perPage: Items per page (default: 20, max: 100, -1 for all)
//   - sortBy: Field to sort by (name, createdAt, isSystem)
//   - sortOrder: Sort order (asc, desc)
//   - filter[field][operator]=value: Filters (e.g., filter[name][like]=%admin%)
//   - includeSystem: Include system roles (true/false, default: true)
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  // Parse query parameters
  const query = parseListQuery(event);
  const rawQuery = getQuery(event);
  const includeSystem = rawQuery.includeSystem !== "false";

  // Validate sort field
  const allowedSortFields = ["name", "createdAt", "isSystem", "description"];
  const sortBy = validateSortField(query.sortBy, allowedSortFields, "createdAt");
  const sortOrder = query.sortOrder || "desc";

  // Validate filter fields
  const allowedFilterFields = ["name", "isSystem"];
  const filters = validateFilters(query.filters || [], allowedFilterFields);

  // Calculate limit and offset
  const { limit, offset } = calculateLimitOffset(query.page || 1, query.perPage || 20);

  // Get roles and count
  const rbacService = getRBACService(event);
  const [roles, total] = await Promise.all([
    rbacService.listRoles(limit, offset, filters, sortBy, sortOrder, { includeSystem }),
    rbacService.countRoles(filters, { includeSystem }),
  ]);

  // Build paginated response
  const response = buildPaginatedResponse(
    roles,
    query.page || 1,
    query.perPage || 20,
    total
  );

  return createSuccessResponse(
    "Roles retrieved successfully",
    response.items,
    response.pagination
  );
});
