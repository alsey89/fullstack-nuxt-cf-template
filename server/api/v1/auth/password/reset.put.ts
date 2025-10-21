import { createIdentityService } from "#server/services/identity";
import { ValidationError } from "#server/error/errors";
import { createSuccessResponse } from "#server/lib/response";
import { passwordResetSchema } from "#shared/validators/auth";

// ========================================
// PUT /api/v1/auth/password/reset
// ========================================
// Reset password with token
// Public route
// ========================================

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate with Zod schema (includes password confirmation check)
  const validated = passwordResetSchema.parse(body);

  const identityService = createIdentityService(event);

  // Use validated data (no sanitization for token/password)
  await identityService.resetPassword(validated.token, validated.newPassword);

  return createSuccessResponse("Password reset successfully");
});
