import { createIdentityService } from "#server/services/identity";
import { ValidationError } from "#server/error/errors";
import { createSuccessResponse } from "#server/lib/response";
import { emailConfirmSchema } from "#shared/validators/auth";

// ========================================
// POST /api/v1/auth/email/confirm
// ========================================
// Confirm email address with token
// Public route
// ========================================

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate with Zod schema
  const validated = emailConfirmSchema.parse(body);

  const identityService = createIdentityService(event);

  // Use validated token (no sanitization needed for tokens)
  await identityService.confirmEmail(validated.token);

  return createSuccessResponse("Email confirmed successfully");
});
