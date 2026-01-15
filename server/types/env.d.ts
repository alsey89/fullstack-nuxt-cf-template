/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  KV?: KVNamespace; // Optional - only needed if using KV for caching
  R2?: R2Bucket; // Optional - only needed if using R2 for document storage

  // Rate Limiting bindings
  AUTH_SIGNIN_LIMITER?: RateLimiterBinding;
  AUTH_SIGNUP_LIMITER?: RateLimiterBinding;
  AUTH_PASSWORD_RESET_LIMITER?: RateLimiterBinding;
  OAUTH_AUTHORIZE_LIMITER?: RateLimiterBinding;
  OAUTH_CALLBACK_LIMITER?: RateLimiterBinding;

  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  NODE_ENV?: "development" | "production";
  ENVIRONMENT?: string;

  // Index signature for dynamic tenant database bindings (e.g., DB_ACME, DB_TENANT1)
  // Used in multi-tenant mode where each tenant has their own D1 database
  [key: string]: D1Database | KVNamespace | R2Bucket | RateLimiterBinding | string | undefined;
}

// Extend H3 event context with our custom properties
declare module "h3" {
  interface H3EventContext {
    cloudflare: {
      env: Env;
    };
    // Added by middleware
    db?: D1Database; // Selected database (per-workspace or default)
    workspaceId?: string;
    userId?: string;
    tokenPayload?: AccessTokenPayload;
  }
}

// JWT token payload types
export interface AccessTokenPayload {
  jti: string;
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  jti: string;
  userId: string;
  tokenType: "refresh";
  iat: number;
  exp: number;
}
