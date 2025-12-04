import { SignJWT, jwtVerify } from "jose";
import type { H3Event } from "h3";
import { InvalidTokenError, TokenExpiredError } from "#server/error/errors";

// ========================================
// OAUTH LIBRARY
// ========================================
// Utilities for OAuth authentication flows
// ========================================

// ========================================
// CONFIGURATION
// ========================================

export const GOOGLE_OAUTH_CONFIG = {
  authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  scopes: ["openid", "email", "profile"],
};

const STATE_TOKEN_EXPIRES_IN = 10 * 60; // 10 minutes

// ========================================
// TYPES
// ========================================

export interface GoogleUser {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface OAuthStateTokenPayload {
  purpose: "oauth-state";
  nonce: string;
}

// ========================================
// STATE TOKEN MANAGEMENT (CSRF Protection)
// ========================================

/**
 * Get JWT secret from runtime config
 */
function getJWTSecret(event?: H3Event): Uint8Array {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  const secret = config.jwtSecret;

  if (!secret || secret === "overwrite-this-with-environment-in-production") {
    throw new Error(
      "JWT_SECRET is not configured. Set NUXT_JWT_SECRET environment variable."
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generate OAuth state token for CSRF protection
 * @param event - H3 event for config access
 * @returns Signed JWT state token
 */
export async function generateOAuthStateToken(event?: H3Event): Promise<string> {
  const secret = getJWTSecret(event);
  const now = Math.floor(Date.now() / 1000);

  // Generate random nonce for additional security
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  return await new SignJWT({
    purpose: "oauth-state",
    nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + STATE_TOKEN_EXPIRES_IN)
    .setIssuer("template")
    .setAudience("template-api")
    .sign(secret);
}

/**
 * Verify OAuth state token
 * @param token - State token to verify
 * @param event - H3 event for config access
 * @returns Decoded token payload
 */
export async function verifyOAuthStateToken(
  token: string,
  event?: H3Event
): Promise<OAuthStateTokenPayload> {
  try {
    const secret = getJWTSecret(event);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "template",
      audience: "template-api",
    });

    if (payload.purpose !== "oauth-state") {
      throw new InvalidTokenError("Invalid token purpose");
    }

    return payload as unknown as OAuthStateTokenPayload;
  } catch (error) {
    if ((error as any).code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError("OAuth state token expired");
    }
    throw new InvalidTokenError("Invalid OAuth state token");
  }
}

// ========================================
// GOOGLE OAUTH FLOW
// ========================================

/**
 * Build Google OAuth authorization URL
 * @param redirectUri - Callback URL after OAuth
 * @param state - CSRF protection token
 * @returns Full authorization URL
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: useRuntimeConfig().oauth?.google?.clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    state,
    access_type: "offline", // Request refresh token
    prompt: "consent", // Force consent screen to ensure refresh token
  });

  return `${GOOGLE_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Google
 * @param redirectUri - Same redirect URI used in authorization
 * @returns Access token response
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token: string; refresh_token?: string }> {
  const config = useRuntimeConfig();

  const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.oauth?.google?.clientId || "",
      client_secret: config.oauth?.google?.clientSecret || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return await response.json();
}

/**
 * Fetch user info from Google
 * @param accessToken - OAuth access token
 * @returns Google user info
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user info: ${error}`);
  }

  const userInfo = await response.json();

  // Validate required fields
  if (!userInfo.sub || !userInfo.email) {
    throw new Error("Missing required user info fields");
  }

  return userInfo;
}
