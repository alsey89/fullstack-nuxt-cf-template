import { createIdentityService } from "#server/services/identity";
import { createSuccessResponse } from "#server/lib/response";
import { AuthenticationError } from "#server/error/errors";
import { updateProfileSchema } from "#shared/validators/user";
import { sanitizeHtml, sanitizeEmail, sanitizePhone, sanitizePostalCode } from "#server/lib/sanitize";

// ========================================
// PUT /api/v1/user/profile
// ========================================
// Update current user profile
// Requires authentication
// ========================================

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate with Zod schema
  const validated = updateProfileSchema.parse(body);

  const identityService = createIdentityService(event);

  // Get current user ID from context (stored in service)
  if (!event.context.userId) {
    throw new AuthenticationError("User not authenticated");
  }

  // Sanitize inputs
  const sanitized = {
    firstName: validated.firstName ? sanitizeHtml(validated.firstName) : undefined,
    lastName: validated.lastName ? sanitizeHtml(validated.lastName) : undefined,
    dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined,
    phone: validated.phone ? sanitizePhone(validated.phone) : undefined,
    address: validated.address ? sanitizeHtml(validated.address) : undefined,
    city: validated.city ? sanitizeHtml(validated.city) : undefined,
    state: validated.state ? sanitizeHtml(validated.state) : undefined,
    country: validated.country ? sanitizeHtml(validated.country) : undefined,
    postalCode: validated.postalCode ? sanitizePostalCode(validated.postalCode) : undefined,
    ecFirstName: validated.ecFirstName ? sanitizeHtml(validated.ecFirstName) : undefined,
    ecLastName: validated.ecLastName ? sanitizeHtml(validated.ecLastName) : undefined,
    ecRelationship: validated.ecRelationship ? sanitizeHtml(validated.ecRelationship) : undefined,
    ecEmail: validated.ecEmail ? sanitizeEmail(validated.ecEmail) : undefined,
    ecPhone: validated.ecPhone ? sanitizePhone(validated.ecPhone) : undefined,
    ecAddress: validated.ecAddress ? sanitizeHtml(validated.ecAddress) : undefined,
    ecCity: validated.ecCity ? sanitizeHtml(validated.ecCity) : undefined,
    ecState: validated.ecState ? sanitizeHtml(validated.ecState) : undefined,
    ecCountry: validated.ecCountry ? sanitizeHtml(validated.ecCountry) : undefined,
    ecPostalCode: validated.ecPostalCode ? sanitizePostalCode(validated.ecPostalCode) : undefined,
  };

  const user = await identityService.updateUser(event.context.userId, sanitized);

  return createSuccessResponse("User profile updated successfully", { user });
});
