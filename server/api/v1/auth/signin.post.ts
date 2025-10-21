import { ValidationError } from "#server/error/errors";
import { createSuccessResponse } from "#server/lib/response";
import { createIdentityService } from "#server/services/identity";
import { signinSchema } from "#shared/validators/auth";
import { sanitizeEmail } from "#server/lib/sanitize";

// ========================================
// POST /api/v1/auth/signin
// ========================================
// Sign in with email and password
// Public route (no auth required)
// Sets encrypted session cookie with permissions
// ========================================

export default defineEventHandler(async (event) => {
  // Parse request body
  const body = await readBody(event);

  // Validate with Zod schema
  const validated = signinSchema.parse(body);

  // Sanitize inputs
  const sanitized = {
    email: sanitizeEmail(validated.email),
    password: validated.password, // Never sanitize passwords - use as-is
  };

  // Sign in using service layer
  const identityService = createIdentityService(event);
  const { user } = await identityService.signIn(
    sanitized.email,
    sanitized.password
  );

  // Get user permissions (pass userId since context isn't set during sign-in)
  const permissions = await identityService.getUserPermissions(user.id);

  // Get permission version
  const permissionVersion = await identityService.getPermissionVersion(user.id);

  // Warn if permissions exceed 100 (session size concern)
  if (permissions.length > 100) {
    console.warn(
      `[WARN] User ${user.id} has ${permissions.length} permissions (>100). Consider refactoring permission model.`
    );
  }

  // Set session with user data and permissions
  // NOTE: nuxt-auth-utils requires a 'user' key for loggedIn to work
  // IMPORTANT: tenantId is bound to session to prevent cross-tenant access
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    tenantId: event.context.tenantId, // Bind session to tenant (prevents cross-tenant session reuse)
    permissions,
    permissionVersion,
    loggedInAt: Date.now(),
  });

  return createSuccessResponse("Signed in successfully", {
    user,
    permissions,
    permissionVersion,
  });
});
