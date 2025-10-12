import { getQuery } from 'h3'
import { createIdentityService } from '../../../services/identity'
import { createSuccessResponse } from '../../../lib/response'
import { requirePermission } from '../../../services/rbac'

// ========================================
// GET /api/v1/user
// ========================================
// List users
// Requires authentication and users:view permission
// ========================================

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users:view')

  const query = getQuery(event)

  // Parse pagination parameters (page and perPage)
  const page = query.page ? Math.max(1, parseInt(query.page as string)) : 1
  const perPage = query.perPage ? parseInt(query.perPage as string) : 20

  // Convert page/perPage to limit/offset for service layer
  const limit = perPage > 0 ? perPage : 20
  const offset = perPage > 0 ? (page - 1) * perPage : 0

  const identityService = createIdentityService(event)
  const users = await identityService.listUsers(limit, offset)

  return createSuccessResponse(
    'Users retrieved successfully',
    users,
    {
      page,
      perPage,
    }
  )
})
