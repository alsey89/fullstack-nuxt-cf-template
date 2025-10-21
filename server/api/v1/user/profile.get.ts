import { createIdentityService } from '#server/services/identity'
import { createSuccessResponse } from '#server/lib/response'

// ========================================
// GET /api/v1/user/profile
// ========================================
// Get current user profile with assignment
// Requires authentication
// ========================================

export default defineEventHandler(async (event) => {
  const identityService = createIdentityService(event)

  const user = await identityService.getCurrentUser()

  return createSuccessResponse('User profile retrieved successfully', user)
})
