import { generateOAuthStateToken, buildGoogleAuthUrl } from "#server/lib/oauth";

// ========================================
// GOOGLE OAUTH: INITIATE AUTHORIZATION
// ========================================
// Route: GET /api/auth/google/authorize
// Public route - no authentication required
// ========================================

export default defineEventHandler(async (event) => {
  // Get runtime config
  const config = useRuntimeConfig(event);

  // Check if Google OAuth is configured
  if (!config.oauth?.google?.clientId || !config.oauth?.google?.clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Google OAuth is not configured",
    });
  }

  // Get the request origin for redirect URI
  const headers = getRequestHeaders(event);
  const protocol = headers["x-forwarded-proto"] || "http";
  const host = headers.host;
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  // Generate state token for CSRF protection
  const state = await generateOAuthStateToken(event);

  // Build Google authorization URL
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  // Redirect to Google
  return sendRedirect(event, authUrl);
});
