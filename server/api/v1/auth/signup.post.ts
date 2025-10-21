import { createIdentityService } from "#server/services/identity";
import { ValidationError } from "#server/error/errors";
import { createSuccessResponse } from "#server/lib/response";
import { signupSchema } from "#shared/validators/auth";
import { sanitizeEmail, sanitizeHtml } from "#server/lib/sanitize";

// ========================================
// POST /api/v1/auth/signup
// ========================================
// Register a new user account
// Public route (no auth required)
// ========================================

export default defineEventHandler(async (event) => {
  // Parse request body
  const body = await readBody(event);

  // Validate with Zod schema (includes password confirmation check)
  const validated = signupSchema.parse(body);

  // Sanitize inputs
  const sanitized = {
    email: sanitizeEmail(validated.email),
    password: validated.password, // Never sanitize passwords - use as-is
    firstName: sanitizeHtml(validated.firstName),
    lastName: sanitizeHtml(validated.lastName),
  };

  // Create identity service
  const identityService = createIdentityService(event);

  // Sign up user (database is already selected by tenant middleware)
  const result = await identityService.signUp({
    email: sanitized.email,
    password: sanitized.password,
    firstName: sanitized.firstName,
    lastName: sanitized.lastName,
  });

  // Return user and email confirmation token
  return createSuccessResponse(
    "Account created successfully. Please confirm your email."
  );
});
