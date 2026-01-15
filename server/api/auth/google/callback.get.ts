import {
  verifyOAuthStateToken,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
} from "#server/lib/oauth";
import { createIdentityService } from "#server/services";

// ========================================
// GOOGLE OAUTH: HANDLE CALLBACK
// ========================================
// Route: GET /api/auth/google/callback
// Public route - no authentication required
// ========================================

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event);
    const code = query.code as string;
    const state = query.state as string;
    const error = query.error as string;

    // Check for OAuth error from Google
    if (error) {
      console.error("OAuth error from Google:", error);
      return sendRedirect(
        event,
        `/auth/error?error=oauth_failed&message=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return sendRedirect(
        event,
        "/auth/error?error=invalid_callback&message=Missing code or state"
      );
    }

    // Verify state token (CSRF protection)
    try {
      await verifyOAuthStateToken(state, event);
    } catch (error) {
      console.error("State token verification failed:", error);
      return sendRedirect(
        event,
        "/auth/error?error=state_mismatch&message=Invalid state token"
      );
    }

    // Get redirect URI
    const headers = getRequestHeaders(event);
    const protocol = headers["x-forwarded-proto"] || "http";
    const host = headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    // Exchange authorization code for access token
    let tokens;
    try {
      tokens = await exchangeGoogleCode(code, redirectUri);
    } catch (error) {
      console.error("Failed to exchange code:", error);
      return sendRedirect(
        event,
        "/auth/error?error=exchange_failed&message=Failed to get access token"
      );
    }

    // Fetch user info from Google
    let googleUser;
    try {
      googleUser = await fetchGoogleUserInfo(tokens.access_token);
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      return sendRedirect(
        event,
        "/auth/error?error=userinfo_failed&message=Failed to get user info"
      );
    }

    // Find or create user
    const identityService = createIdentityService(event);
    let userData;
    try {
      const result = await identityService.findOrCreateOAuthUser({
        provider: "google",
        providerId: googleUser.sub,
        email: googleUser.email,
        emailVerified: googleUser.email_verified,
        firstName: googleUser.given_name || "",
        lastName: googleUser.family_name || "",
        picture: googleUser.picture,
      });
      userData = result.user;
    } catch (error) {
      console.error("Failed to find/create user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process user";
      return sendRedirect(
        event,
        `/auth/error?error=user_creation_failed&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Get user permissions
    const permissions = await identityService.getUserPermissions(userData.id);
    const permissionVersion = await identityService.getPermissionVersion(userData.id);

    // Set session using nuxt-auth-utils
    // NOTE: nuxt-auth-utils requires a 'user' key for loggedIn to work
    // IMPORTANT: workspaceId is bound to session to prevent cross-workspace access
    await setUserSession(event, {
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        role: userData.role,
        isEmailVerified: userData.isEmailVerified,
        picture: userData.picture,
      },
      workspaceId: event.context.workspaceId, // Bind session to workspace (prevents cross-workspace session reuse)
      permissions,
      permissionVersion,
      loggedInAt: Date.now(),
    });

    // Redirect to dashboard
    return sendRedirect(event, "/");
  } catch (error) {
    console.error("Unexpected error in OAuth callback:", error);
    return sendRedirect(
      event,
      "/auth/error?error=unknown&message=An unexpected error occurred"
    );
  }
});
