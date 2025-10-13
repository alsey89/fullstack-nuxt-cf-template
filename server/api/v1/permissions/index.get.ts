import { defineEventHandler } from "h3";
import { getRBACService, requirePermission } from "#server/services/rbac";
import { createSuccessResponse } from "#server/lib/response";
import {
  parseListQuery,
  validateSortField,
  validateFilters,
} from "#server/utils/query-parser";
import { calculateLimitOffset, buildPaginatedResponse } from "#server/utils/pagination";

// ========================================
// GET /api/v1/permissions
// ========================================
// List all available permissions with pagination, filtering, and sorting
// Requires authentication and roles:view permission
// ========================================
// Query Parameters:
//   - page: Page number (default: 1)
//   - perPage: Items per page (default: 20, max: 100, -1 for all)
//   - sortBy: Field to sort by (code, category, description)
//   - sortOrder: Sort order (asc, desc)
//   - filter[field][operator]=value: Filters (e.g., filter[category][eq]=users)
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "roles:view");

  // Parse query parameters
  const query = parseListQuery(event);

  // Validate sort field
  const allowedSortFields = ["code", "category", "description"];
  const sortBy = validateSortField(query.sortBy, allowedSortFields, "category");
  const sortOrder = query.sortOrder || "asc";

  // Validate filter fields
  const allowedFilterFields = ["code", "category"];
  const filters = validateFilters(query.filters || [], allowedFilterFields);

  // Calculate limit and offset
  const { limit, offset } = calculateLimitOffset(query.page || 1, query.perPage || 20);

  // Get permissions and count
  const rbacService = getRBACService(event);
  const [permissions, total] = await Promise.all([
    rbacService.listPermissions(limit, offset, filters, sortBy, sortOrder),
    rbacService.countPermissions(filters),
  ]);

  // Build paginated response
  const response = buildPaginatedResponse(
    permissions,
    query.page || 1,
    query.perPage || 20,
    total
  );

  return createSuccessResponse(
    "Permissions retrieved successfully",
    response.items,
    response.pagination
  );
});
