import { createIdentityService } from '#server/services/identity'
import { createSuccessResponse } from '#server/lib/response'
import { requirePermission } from '#server/services/rbac'
import {
  parseListQuery,
  validateSortField,
  validateFilters,
} from '#server/utils/query-parser'
import { calculateLimitOffset, buildPaginatedResponse } from '#server/utils/pagination'

// ========================================
// GET /api/v1/user
// ========================================
// List users with pagination, filtering, and sorting
// Requires authentication and users:view permission
// ========================================
// Query Parameters:
//   - page: Page number (default: 1)
//   - perPage: Items per page (default: 20, max: 100, -1 for all)
//   - sortBy: Field to sort by (email, firstName, lastName, createdAt, role, isActive)
//   - sortOrder: Sort order (asc, desc)
//   - filter[field][operator]=value: Filters (e.g., filter[email][like]=%@example.com)
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users:view')

  // Parse query parameters
  const query = parseListQuery(event)

  // Validate sort field
  const allowedSortFields = [
    'email',
    'firstName',
    'lastName',
    'createdAt',
    'role',
    'isActive',
    'isEmailVerified',
  ]
  const sortBy = validateSortField(query.sortBy, allowedSortFields, 'createdAt')
  const sortOrder = query.sortOrder || 'desc'

  // Validate filter fields
  const allowedFilterFields = [
    'email',
    'firstName',
    'lastName',
    'role',
    'isActive',
    'isEmailVerified',
  ]
  const filters = validateFilters(query.filters || [], allowedFilterFields)

  // Calculate limit and offset
  const { limit, offset } = calculateLimitOffset(query.page || 1, query.perPage || 20)

  // Get users and count
  const identityService = createIdentityService(event)
  const [users, total] = await Promise.all([
    identityService.listUsers(limit, offset, filters, sortBy, sortOrder),
    identityService.countUsers(filters),
  ])

  // Build paginated response
  const response = buildPaginatedResponse(
    users,
    query.page || 1,
    query.perPage || 20,
    total
  )

  return createSuccessResponse(
    'Users retrieved successfully',
    response.items,
    response.pagination
  )
})
