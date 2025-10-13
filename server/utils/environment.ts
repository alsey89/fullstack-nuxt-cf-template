import type { H3Event } from "h3";

// ========================================
// ENVIRONMENT UTILITIES
// ========================================
// Type-safe environment detection helpers
// Prevents typos in environment string comparisons
// ========================================

/**
 * Valid environment values
 */
export type Environment = "development" | "staging" | "production";

/**
 * Environment constants (single source of truth)
 */
export const ENV = {
  DEVELOPMENT: "development" as const,
  STAGING: "staging" as const,
  PRODUCTION: "production" as const,
} as const;

/**
 * Check if current environment is development
 */
export function isDevelopment(event?: H3Event): boolean {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  return config.public.environment === ENV.DEVELOPMENT;
}

/**
 * Check if current environment is staging
 */
export function isStaging(event?: H3Event): boolean {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  return config.public.environment === ENV.STAGING;
}

/**
 * Check if current environment is production
 */
export function isProduction(event?: H3Event): boolean {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  return config.public.environment === ENV.PRODUCTION;
}

/**
 * Get current environment
 */
export function getEnvironment(event?: H3Event): string {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  return config.public.environment;
}

/**
 * Check if current environment is NOT production (dev or staging)
 */
export function isNonProduction(event?: H3Event): boolean {
  return !isProduction(event);
}
