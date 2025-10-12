import { getHeader } from "h3";
import { createIdentityService } from "../../../../../services/identity";
import {
  ValidationError,
  AuthenticationError,
} from "../../../../../error/errors";
import { createSuccessResponse } from "../../../../../lib/response";
import { passwordResetRequestSchema } from "../../../../../validators/auth";
import { sanitizeEmail } from "../../../../../lib/sanitize";

// ========================================
// POST /api/v1/auth/password/reset/request
// ========================================
// Request password reset email
// Public route
// ========================================

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate with Zod schema
  const validated = passwordResetRequestSchema.parse(body);

  // Sanitize email
  const sanitizedEmail = sanitizeEmail(validated.email);

  const identityService = createIdentityService(event);

  const result = await identityService.requestPasswordReset(sanitizedEmail);

  return createSuccessResponse(
    "Password reset email will be sent if user exists",
    {
      //! TODO: Remove reset token from response in production
      token: result.resetToken,
    }
  );
});
