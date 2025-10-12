import { SignJWT, jwtVerify } from "jose";
import type { H3Event } from "h3";
import { InvalidTokenError, TokenExpiredError } from "../error/errors";

// ========================================
// AUTHENTICATION LIBRARY
// ========================================
// JWT token utilities for email confirmation & password reset
// Note: Session-based auth is handled by nuxt-auth-utils
// Note: Password validation is in server/validators/password.ts
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
  purpose: "email-confirm";
}

export interface PasswordResetTokenPayload {
  userId: string;
  email: string;
  purpose: "password-reset";
}

/**
 * Get JWT secret from runtime config
 */
function getJWTSecret(event?: H3Event): Uint8Array {
  // Get secret from runtime config
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  const secret = config.jwtSecret;

  if (!secret || secret === "overwrite-this-with-environment-in-production") {
    throw new Error("JWT_SECRET is not configured. Set NUXT_JWT_SECRET environment variable.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate email confirmation token (24 hours)
 */
export async function generateEmailConfirmToken(
  userId: string,
  email: string,
  event?: H3Event
): Promise<string> {
  const secret = getJWTSecret(event);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours

  return await new SignJWT({
    userId,
    email,
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
  event?: H3Event
): Promise<string> {
  const secret = getJWTSecret(event);
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 60 * 60; // 1 hour

  return await new SignJWT({
    userId,
    email,
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
 */
export async function verifyEmailConfirmToken(
  token: string,
  event?: H3Event
): Promise<EmailConfirmTokenPayload> {
  try {
    const secret = getJWTSecret(event);
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });

    if (payload.purpose !== "email-confirm") {
      throw new InvalidTokenError("Invalid token purpose");
    }

    return payload as unknown as EmailConfirmTokenPayload;
  } catch (error) {
    if ((error as any).code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  token: string,
  event?: H3Event
): Promise<PasswordResetTokenPayload> {
  try {
    const secret = getJWTSecret(event);
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });

    if (payload.purpose !== "password-reset") {
      throw new InvalidTokenError("Invalid token purpose");
    }

    return payload as unknown as PasswordResetTokenPayload;
  } catch (error) {
    if ((error as any).code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
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
