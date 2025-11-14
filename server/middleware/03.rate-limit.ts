// ========================================
// RATE LIMIT MIDDLEWARE (Cloudflare Native)
// ========================================
// Protects auth endpoints from brute force attacks
// Uses Cloudflare's Rate Limiting API for distributed rate limiting
// Note: Bindings are only available in staging/production, not local dev
// ========================================

import { RateLimitError } from "#server/error/errors";

// Rate limit configuration per endpoint
// Note: Cloudflare only supports period values of 10 or 60 seconds
const RATE_LIMIT_CONFIG = {
  // Email/Password Auth Endpoints
  "/api/v1/auth/signin": {
    binding: "AUTH_SIGNIN_LIMITER" as const,
    max: 5,
    window: 60, // 1 minute in seconds
  },
  "/api/v1/auth/signup": {
    binding: "AUTH_SIGNUP_LIMITER" as const,
    max: 1,
    window: 60, // 1 minute in seconds
  },
  "/api/v1/auth/password/reset/request": {
    binding: "AUTH_PASSWORD_RESET_LIMITER" as const,
    max: 1,
    window: 60, // 1 minute in seconds
  },
  // OAuth Endpoints
  "/api/v1/auth/google/authorize": {
    binding: "OAUTH_AUTHORIZE_LIMITER" as const,
    max: 10,
    window: 60, // 1 minute in seconds
  },
  "/api/v1/auth/google/callback": {
    binding: "OAUTH_CALLBACK_LIMITER" as const,
    max: 5,
    window: 60, // 1 minute in seconds
  },
} as const;

/**
 * Rate limit middleware
 * Only applies to configured auth endpoints
 * Blocks requests exceeding limits with 429 status
 */
export default defineEventHandler(async (event) => {
  const path = event.path;
  const ip = getRequestIP(event) || "unknown";

  // Only rate limit configured endpoints
  const config = RATE_LIMIT_CONFIG[path as keyof typeof RATE_LIMIT_CONFIG];
  if (!config) {
    return; // Skip rate limiting for non-configured paths
  }

  // Access Cloudflare bindings (only available in staging/production)
  const env = event.context.cloudflare?.env;

  // Fallback for local development - skip rate limiting but log a warning
  if (!env) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Rate Limit] Cloudflare bindings not available in local development for ${path}`
      );
    }
    return;
  }

  // Get the appropriate rate limiter binding
  const rateLimiter = env[config.binding];

  if (!rateLimiter) {
    console.error(
      `[Rate Limit] Binding ${config.binding} not found for ${path}`
    );
    return; // Don't block request if binding is missing
  }

  // Create unique key combining IP and path
  const key = `${ip}:${path}`;

  try {
    // Call Cloudflare's Rate Limiting API
    const { success } = await rateLimiter.limit({ key });

    if (!success) {
      // Rate limit exceeded
      const retryAfter = config.window;

      // Set rate limit headers
      setResponseHeader(event, "X-RateLimit-Limit", String(config.max));
      setResponseHeader(event, "X-RateLimit-Remaining", "0");
      setResponseHeader(
        event,
        "X-RateLimit-Reset",
        String(Math.floor((Date.now() + config.window * 1000) / 1000))
      );
      setResponseHeader(event, "Retry-After", retryAfter);

      throw new RateLimitError(
        `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }

    // Success - set informational headers
    // Note: Cloudflare's API doesn't provide remaining count,
    // so we only set the limit header
    setResponseHeader(event, "X-RateLimit-Limit", String(config.max));
  } catch (error) {
    // Re-throw RateLimitError
    if (error instanceof RateLimitError) {
      throw error;
    }

    // Log other errors but don't block request
    console.error("[Rate Limit] Error:", error);
  }
});
