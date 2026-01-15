// ========================================
// RATE LIMIT MIDDLEWARE (Cloudflare Native)
// ========================================
// Protects auth endpoints from brute force attacks
// Uses Cloudflare's Rate Limiting API for distributed rate limiting
// Note: Bindings are only available in staging/production, not local dev
//
// Rate limit configuration is centralized in server/config/routes.ts
// ========================================

import { RateLimitError } from "#server/error/errors";
import { getRateLimitConfig, type RateLimitBinding } from "#server/config/routes";

/**
 * Rate limit middleware
 * Only applies to configured auth endpoints
 * Blocks requests exceeding limits with 429 status
 */
export default defineEventHandler(async (event) => {
  const path = event.path;
  const ip = getRequestIP(event) || "unknown";

  // Get rate limit config from centralized routes config
  const config = getRateLimitConfig(path);
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
  const rateLimiter = env[config.binding as RateLimitBinding];

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
      const retryAfter = config.period;

      // Set rate limit headers
      setResponseHeader(event, "X-RateLimit-Limit", String(config.limit));
      setResponseHeader(event, "X-RateLimit-Remaining", "0");
      setResponseHeader(
        event,
        "X-RateLimit-Reset",
        String(Math.floor((Date.now() + config.period * 1000) / 1000))
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
    setResponseHeader(event, "X-RateLimit-Limit", String(config.limit));
  } catch (error) {
    // Re-throw RateLimitError
    if (error instanceof RateLimitError) {
      throw error;
    }

    // Log other errors but don't block request
    console.error("[Rate Limit] Error:", error);
  }
});
