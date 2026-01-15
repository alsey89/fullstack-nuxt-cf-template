// ========================================
// CENTRALIZED ROUTE CONFIGURATION
// ========================================
// Single source of truth for route metadata:
// - Public routes (no auth required)
// - Rate limiting configuration
// - Permission requirements (for future use)
// ========================================

/**
 * Rate limit binding names (must match wrangler.jsonc)
 */
export type RateLimitBinding =
  | "AUTH_SIGNIN_LIMITER"
  | "AUTH_SIGNUP_LIMITER"
  | "AUTH_PASSWORD_RESET_LIMITER"
  | "OAUTH_AUTHORIZE_LIMITER"
  | "OAUTH_CALLBACK_LIMITER";

/**
 * Rate limit configuration
 * Note: Cloudflare only supports period values of 10 or 60 seconds
 */
export interface RateLimitConfig {
  binding: RateLimitBinding;
  limit: number;
  period: number; // seconds
}

/**
 * Route configuration interface
 */
export interface RouteConfig {
  path: string;
  /** If true, route does not require authentication */
  public?: boolean;
  /** Rate limiting configuration (must have matching binding in wrangler.jsonc) */
  rateLimit?: RateLimitConfig;
  /** Required permissions to access this route (for future use) */
  permissions?: string[];
}

/**
 * All route configurations
 * Add new routes here to configure auth, rate limiting, and permissions
 */
export const ROUTE_CONFIG: RouteConfig[] = [
  // ========================================
  // Health & System Routes
  // ========================================
  { path: "/api/health", public: true },
  { path: "/api/reset-and-seed", public: true },
  { path: "/api/test-db", public: true },

  // ========================================
  // Internal/Framework Routes
  // ========================================
  { path: "/api/_nuxt_icon/", public: true },
  { path: "/api/_auth/session", public: true },

  // ========================================
  // Auth Routes (Email/Password)
  // ========================================
  {
    path: "/api/v1/auth/signup",
    public: true,
    rateLimit: { binding: "AUTH_SIGNUP_LIMITER", limit: 1, period: 60 },
  },
  {
    path: "/api/v1/auth/signin",
    public: true,
    rateLimit: { binding: "AUTH_SIGNIN_LIMITER", limit: 5, period: 60 },
  },
  { path: "/api/v1/auth/email/confirm", public: true },
  {
    path: "/api/v1/auth/password/reset/request",
    public: true,
    rateLimit: { binding: "AUTH_PASSWORD_RESET_LIMITER", limit: 1, period: 60 },
  },
  { path: "/api/v1/auth/password/reset", public: true },

  // ========================================
  // OAuth Routes
  // ========================================
  {
    path: "/api/auth/google/authorize",
    public: true,
    rateLimit: { binding: "OAUTH_AUTHORIZE_LIMITER", limit: 10, period: 60 },
  },
  {
    path: "/api/auth/google/callback",
    public: true,
    rateLimit: { binding: "OAUTH_CALLBACK_LIMITER", limit: 5, period: 60 },
  },
];

// ========================================
// Helper Functions
// ========================================

/**
 * Check if a route is public (no auth required)
 * Supports both exact matches and prefix matches
 */
export function isPublicRoute(path: string): boolean {
  return ROUTE_CONFIG.some(
    (route) =>
      route.public && (path === route.path || path.startsWith(route.path))
  );
}

/**
 * Get rate limit configuration for a route
 * Returns undefined if route has no rate limiting
 */
export function getRateLimitConfig(path: string): RateLimitConfig | undefined {
  const route = ROUTE_CONFIG.find((r) => r.path === path);
  return route?.rateLimit;
}

/**
 * Get required permissions for a route
 * Returns undefined if route has no permission requirements
 */
export function getRoutePermissions(path: string): string[] | undefined {
  const route = ROUTE_CONFIG.find((r) => r.path === path);
  return route?.permissions;
}
