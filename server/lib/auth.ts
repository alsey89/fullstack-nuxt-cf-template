import { SignJWT, jwtVerify } from "jose";
import type { H3Event } from "h3";
import { InvalidTokenError, TokenExpiredError, InvalidTokenPurposeError } from "#server/error/errors";
import { isDevelopment } from "#server/utils/environment";

// ========================================
// AUTHENTICATION LIBRARY
// ========================================
// JWT token utilities for email confirmation & password reset
// Note: Session-based auth is handled by nuxt-auth-utils
// Note: Password validation is in shared/validators/password.ts
// ========================================

// ========================================
// CONFIGURATION
// ========================================

const JWT_CONFIG = {
  EMAIL_CONFIRM_TOKEN_EXPIRES_IN: "24h", // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRES_IN: "1h", // 1 hour
  ISSUER: "template",
  AUDIENCE: "template-api",
};

// ========================================
// JWT TOKEN MANAGEMENT (Email/Password Reset Only)
// ========================================

export interface EmailConfirmTokenPayload {
  userId: string;
  email: string;
  tenantId: string; // Bind token to tenant (prevents cross-tenant token reuse)
  purpose: "email-confirm";
}

export interface PasswordResetTokenPayload {
  userId: string;
  email: string;
  tenantId: string; // Bind token to tenant (prevents cross-tenant token reuse)
  purpose: "password-reset";
}

/**
 * Get JWT secret from runtime config
 */
function getJWTSecret(event?: H3Event): Uint8Array {
  // Get secret from runtime config
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  const secret = config.jwtSecret;
  const isDev = isDevelopment(event);

  if (
    !secret ||
    (!isDev && secret === "overwrite-this-with-environment-in-production")
  ) {
    throw new Error(
      "JWT_SECRET is not configured. Set NUXT_JWT_SECRET environment variable."
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generate email confirmation token (24 hours)
 */
export async function generateEmailConfirmToken(
  userId: string,
  email: string,
  tenantId: string,
  event?: H3Event
): Promise<string> {
  const secret = getJWTSecret(event);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours

  return await new SignJWT({
    userId,
    email,
    tenantId, // Bind token to tenant
    purpose: "email-confirm",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(JWT_CONFIG.ISSUER)
    .setAudience(JWT_CONFIG.AUDIENCE)
    .sign(secret);
}

/**
 * Generate password reset token (1 hour)
 */
export async function generatePasswordResetToken(
  userId: string,
  email: string,
  tenantId: string,
  event?: H3Event
): Promise<string> {
  const secret = getJWTSecret(event);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 10 * 60; // 10 minutes

  return await new SignJWT({
    userId,
    email,
    tenantId, // Bind token to tenant
    purpose: "password-reset",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(JWT_CONFIG.ISSUER)
    .setAudience(JWT_CONFIG.AUDIENCE)
    .sign(secret);
}

/**
 * Verify email confirmation token
 * @param token - JWT token to verify
 * @param currentTenantId - Current tenant ID from context (for validation)
 * @param event - H3 event for config access
 */
export async function verifyEmailConfirmToken(
  token: string,
  currentTenantId: string,
  event?: H3Event
): Promise<EmailConfirmTokenPayload> {
  try {
    const secret = getJWTSecret(event);
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });

    if (payload.purpose !== "email-confirm") {
      throw new InvalidTokenPurposeError(undefined, {
        expectedPurpose: 'email-confirm',
        actualPurpose: payload.purpose
      });
    }

    // CRITICAL: Validate token is for current tenant
    if (payload.tenantId !== currentTenantId) {
      throw new InvalidTokenError("Token tenant mismatch", {
        tokenTenantId: payload.tenantId,
        currentTenantId: currentTenantId
      });
    }

    return payload as unknown as EmailConfirmTokenPayload;
  } catch (error) {
    if ((error as any).code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError(undefined, {
        tokenPurpose: 'email-confirm'
      });
    }
    throw new InvalidTokenError(undefined, {
      errorType: (error as any).code || 'unknown'
    });
  }
}

/**
 * Verify password reset token
 * @param token - JWT token to verify
 * @param currentTenantId - Current tenant ID from context (for validation)
 * @param event - H3 event for config access
 */
export async function verifyPasswordResetToken(
  token: string,
  currentTenantId: string,
  event?: H3Event
): Promise<PasswordResetTokenPayload> {
  try {
    const secret = getJWTSecret(event);
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });

    if (payload.purpose !== "password-reset") {
      throw new InvalidTokenPurposeError(undefined, {
        expectedPurpose: 'password-reset',
        actualPurpose: payload.purpose
      });
    }

    // CRITICAL: Validate token is for current tenant
    if (payload.tenantId !== currentTenantId) {
      throw new InvalidTokenError("Token tenant mismatch", {
        tokenTenantId: payload.tenantId,
        currentTenantId: currentTenantId
      });
    }

    return payload as unknown as PasswordResetTokenPayload;
  } catch (error) {
    if ((error as any).code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError(undefined, {
        tokenPurpose: 'password-reset'
      });
    }
    throw new InvalidTokenError(undefined, {
      errorType: (error as any).code || 'unknown'
    });
  }
}

// ========================================
// PASSWORD HASHING
// ========================================

// Note: hashPassword and verifyPassword are auto-imported from nuxt-auth-utils
// They use scrypt algorithm which is faster and more secure than bcrypt
// Available globally in Nuxt server context:
// - hashPassword(password: string): Promise<string>
// - verifyPassword(password: string, hash: string): Promise<boolean>
