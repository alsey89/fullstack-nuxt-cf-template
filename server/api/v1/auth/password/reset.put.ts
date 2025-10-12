import { createIdentityService } from "../../../../services/identity";
import { ValidationError } from "../../../../error/errors";
import { createSuccessResponse } from "../../../../lib/response";
import { passwordResetSchema } from "../../../../validators/auth";

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
