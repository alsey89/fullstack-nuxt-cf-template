# 🔐 Secrets Management Guide

Complete guide to managing secrets and environment variables in this Nuxt-Cloudflare template.

## 📋 Table of Contents

- [Overview](#overview)
- [Local Development](#local-development)
- [Cloudflare Secrets](#cloudflare-secrets)
- [Secret Reference](#secret-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

This template uses **Nuxt Runtime Config** as the single source of truth for all configuration values. This approach:

- ✅ Centralizes all secrets in `nuxt.config.ts`
- ✅ Provides type-safe access via `useRuntimeConfig()`
- ✅ Supports environment variable overrides via `NUXT_*` prefix
- ✅ Works seamlessly with Cloudflare Workers
- ✅ Avoids scattered environment variable access

### How It Works

```typescript
// nuxt.config.ts - Define defaults
export default defineNuxtConfig({
  runtimeConfig: {
    jwtSecret: 'default-value', // Private (server-only)
    public: {
      environment: 'development', // Public (client + server)
    },
  },
})

// Access in server code
const config = useRuntimeConfig()
console.log(config.jwtSecret) // Server-side only

// Access in client code
const config = useRuntimeConfig()
console.log(config.public.environment) // Available on client
```

### Environment Variable Override

All runtime config values can be overridden using environment variables:

- **Private config**: Prefix with `NUXT_`
  - `runtimeConfig.jwtSecret` → `NUXT_JWT_SECRET`
  - `runtimeConfig.email.provider` → `NUXT_EMAIL_PROVIDER`

- **Public config**: Prefix with `NUXT_PUBLIC_`
  - `runtimeConfig.public.environment` → `NUXT_PUBLIC_ENVIRONMENT`
  - `runtimeConfig.public.multitenancy.enabled` → `NUXT_PUBLIC_MULTITENANCY_ENABLED`

---

## Local Development

### Setup

1. **Copy the example file:**
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Generate secrets:**
   ```bash
   # Session password (minimum 32 characters)
   openssl rand -base64 64

   # JWT secret
   openssl rand -base64 64
   ```

3. **Update `.dev.vars`:**
   ```bash
   NUXT_SESSION_PASSWORD="your-generated-session-password"
   NUXT_JWT_SECRET="your-generated-jwt-secret"
   NUXT_PUBLIC_ENVIRONMENT="development"
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### .dev.vars File

The `.dev.vars` file is used by Wrangler during local development. It loads environment variables that override the defaults in `nuxt.config.ts`.

**Important:**
- ✅ DO add `.dev.vars` to `.gitignore`
- ❌ DO NOT commit `.dev.vars` to version control
- ✅ DO share `.dev.vars.example` with your team
- ❌ DO NOT put production secrets in `.dev.vars`

---

## Cloudflare Secrets

### Setting Secrets

Cloudflare Workers uses Wrangler to manage secrets in production.

#### Via Wrangler CLI (Recommended)

```bash
# Set a single secret
wrangler secret put NUXT_JWT_SECRET

# You'll be prompted to enter the secret value
# Paste your secret and press Enter

# Set multiple secrets
wrangler secret put NUXT_SESSION_PASSWORD
wrangler secret put NUXT_EMAIL_API_KEY
wrangler secret put NUXT_EMAIL_PROVIDER
```

#### Via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your Workers & Pages project
3. Go to Settings → Variables and Secrets
4. Click "Add variable"
5. Select "Encrypt" for sensitive values
6. Add your secret with the `NUXT_*` prefix

### Production Secrets

For production deployment, set these required secrets:

```bash
# Required secrets
wrangler secret put NUXT_SESSION_PASSWORD
wrangler secret put NUXT_JWT_SECRET

# Email configuration (if using email)
wrangler secret put NUXT_EMAIL_PROVIDER
wrangler secret put NUXT_EMAIL_API_KEY
wrangler secret put NUXT_EMAIL_FROM

# Optional: Turnstile (bot protection)
wrangler secret put NUXT_PUBLIC_TURNSTILE_SITE_KEY
wrangler secret put NUXT_TURNSTILE_SECRET_KEY

# Optional: Seed secret (for production database seeding)
wrangler secret put NUXT_SEED_SECRET

# Public configuration
wrangler secret put NUXT_PUBLIC_ENVIRONMENT  # Set to "production"
```

### Staging Secrets

For staging environment:

```bash
# Use --env flag to target staging
wrangler secret put NUXT_SESSION_PASSWORD --env staging
wrangler secret put NUXT_JWT_SECRET --env staging
wrangler secret put NUXT_PUBLIC_ENVIRONMENT --env staging
```

---

## Secret Reference

### Required Secrets

#### NUXT_SESSION_PASSWORD

- **Type:** Private
- **Required:** Yes
- **Description:** Encryption key for session cookies
- **Minimum Length:** 32 characters
- **Generate:** `openssl rand -base64 64`
- **Used by:** `nuxt-auth-utils` for session encryption
- **Config path:** `runtimeConfig.session.password`

#### NUXT_JWT_SECRET

- **Type:** Private
- **Required:** Yes
- **Description:** Secret for signing JWT tokens (email confirmation, password reset)
- **Minimum Length:** 32 characters
- **Generate:** `openssl rand -base64 64`
- **Used by:** `server/utils/auth.ts`
- **Config path:** `runtimeConfig.jwtSecret`

---

### Optional Secrets

#### NUXT_EMAIL_PROVIDER

- **Type:** Private
- **Required:** No
- **Description:** Email service provider
- **Values:** `"none"` | `"resend"` | `"postmark"`
- **Default:** `"none"`
- **Used by:** Email sending utilities
- **Config path:** `runtimeConfig.email.provider`

#### NUXT_EMAIL_API_KEY

- **Type:** Private
- **Required:** Only if email provider is not "none"
- **Description:** API key for email service provider
- **Default:** `""`
- **Used by:** Email sending utilities
- **Config path:** `runtimeConfig.email.apiKey`

#### NUXT_EMAIL_FROM

- **Type:** Private
- **Required:** Only if email provider is not "none"
- **Description:** From email address for outgoing emails
- **Default:** `"noreply@localhost"`
- **Used by:** Email sending utilities
- **Config path:** `runtimeConfig.email.from`

#### NUXT_SEED_SECRET

- **Type:** Private
- **Required:** No
- **Description:** Secret for production database seeding via API
- **Default:** `"overwrite-this-with-environment-in-production"`
- **Used by:** Database seeding endpoint (if implemented)
- **Config path:** `runtimeConfig.seedSecret`

#### NUXT_TURNSTILE_SECRET_KEY

- **Type:** Private
- **Required:** No
- **Description:** Cloudflare Turnstile secret key for bot protection
- **Get from:** [Cloudflare Dashboard](https://dash.cloudflare.com/turnstile)
- **Default:** `"overwrite-this-with-environment-in-production"`
- **Used by:** Turnstile verification (when implemented)
- **Config path:** `runtimeConfig.turnstileSecretKey`

---

### Configuration Variables

#### NUXT_PUBLIC_ENVIRONMENT

- **Type:** Public
- **Required:** Yes
- **Description:** Application environment
- **Values:** `"development"` | `"staging"` | `"production"`
- **Default:** `"development"`
- **Used by:** Error handling, logging, feature flags
- **Config path:** `runtimeConfig.public.environment`

#### NUXT_MULTITENANCY_ENABLED

- **Type:** Private
- **Required:** No
- **Description:** Enable multi-tenant mode with per-tenant DB isolation
- **Values:** `true` | `false`
- **Default:** `false` (single-tenant mode)
- **Used by:** Tenant middleware, database client
- **Config path:** `runtimeConfig.multitenancy.enabled`

#### NUXT_PUBLIC_MULTITENANCY_ENABLED

- **Type:** Public
- **Required:** No (must match server-side config)
- **Description:** Public multitenancy config for client-side routing
- **Values:** `true` | `false`
- **Default:** `false`
- **Used by:** Client-side routing, subdomain handling
- **Config path:** `runtimeConfig.public.multitenancy.enabled`

#### NUXT_RBAC_ENABLED

- **Type:** Private
- **Required:** No
- **Description:** Enable RBAC (Role-Based Access Control)
- **Values:** `true` | `false`
- **Default:** `true`
- **Used by:** Permission checks, authorization middleware
- **Config path:** `runtimeConfig.rbac.enabled`

#### NUXT_PUBLIC_TURNSTILE_SITE_KEY

- **Type:** Public
- **Required:** No
- **Description:** Cloudflare Turnstile site key (public)
- **Get from:** [Cloudflare Dashboard](https://dash.cloudflare.com/turnstile)
- **Default:** `"overwrite-this-with-environment-in-production"`
- **Used by:** Client-side Turnstile widget (when implemented)
- **Config path:** `runtimeConfig.public.turnstileSiteKey`

---

## Best Practices

### Secret Generation

✅ **Use cryptographically secure random generators:**
```bash
# Good: Using openssl
openssl rand -base64 64

# Good: Using Node.js crypto
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Bad: Using predictable strings
NUXT_SESSION_PASSWORD="password123"
```

### Secret Rotation

✅ **Rotate secrets regularly:**
- Session passwords: Every 90 days
- JWT secrets: Every 180 days
- Email API keys: When provider recommends

**How to rotate:**
1. Generate new secret
2. Update Cloudflare secret via Wrangler
3. Deploy new version
4. Monitor for issues
5. Remove old secret from local `.dev.vars`

### Environment Separation

✅ **Use different secrets for each environment:**
```bash
# Development (.dev.vars)
NUXT_SESSION_PASSWORD="dev-session-password-123"

# Staging (Cloudflare secrets --env staging)
wrangler secret put NUXT_SESSION_PASSWORD --env staging
# Enter: staging-session-password-456

# Production (Cloudflare secrets --env production)
wrangler secret put NUXT_SESSION_PASSWORD --env production
# Enter: prod-session-password-789
```

### Secret Management

✅ **DO:**
- Use a password manager to store production secrets
- Document which team members have access to production secrets
- Use Wrangler CLI for setting secrets (audit trail)
- Keep `.dev.vars.example` up to date
- Add `.dev.vars` to `.gitignore`

❌ **DON'T:**
- Commit secrets to version control
- Share secrets via Slack/email
- Use the same secret across environments
- Hardcode secrets in source code
- Store production secrets in `.dev.vars`

### Accessing Runtime Config

✅ **Correct usage:**
```typescript
// Server-side (API routes, middleware, server utils)
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const jwtSecret = config.jwtSecret // Private config
  const env = config.public.environment // Public config
})

// Server utils (pass event when available)
function myUtil(event?: H3Event) {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  return config.jwtSecret
}

// Client-side (only public config)
const config = useRuntimeConfig()
const env = config.public.environment // ✅ Works
// const jwt = config.jwtSecret // ❌ Runtime error (private config not available)
```

❌ **Incorrect usage:**
```typescript
// Don't access env vars directly
const secret = process.env.JWT_SECRET // ❌ Bad

// Don't access cloudflare.env directly
const secret = event.context.cloudflare?.env?.JWT_SECRET // ❌ Bad

// Use runtime config instead
const config = useRuntimeConfig(event)
const secret = config.jwtSecret // ✅ Good
```

---

## Troubleshooting

### Secret Not Found Error

**Error:**
```
JWT_SECRET is not configured. Set NUXT_JWT_SECRET environment variable.
```

**Solution:**
1. **Local development:** Add to `.dev.vars`:
   ```bash
   NUXT_JWT_SECRET="your-secret-here"
   ```

2. **Cloudflare production:**
   ```bash
   wrangler secret put NUXT_JWT_SECRET
   ```

### Secret Not Taking Effect

**Problem:** Updated secret in Cloudflare but still seeing old value

**Solution:**
1. Verify secret is set:
   ```bash
   wrangler secret list
   ```

2. Redeploy the worker:
   ```bash
   npm run deploy:production
   ```

3. Clear browser cache/cookies if testing session-related secrets

### Public Config Not Available on Client

**Error:**
```
Cannot read property 'jwtSecret' of undefined
```

**Solution:**
Private config is only available server-side. Move to `public` config if needed on client:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    jwtSecret: 'private', // Server-only
    public: {
      apiUrl: '/api', // Available on client
    },
  },
})
```

### Environment Variable Not Overriding

**Problem:** Set `NUXT_EMAIL_PROVIDER=resend` but still seeing `none`

**Solution:**
1. **Check naming:** Must use exact casing: `NUXT_EMAIL_PROVIDER` (not `NUXT_email_provider`)

2. **Check nesting:** For nested config, use underscore:
   - `runtimeConfig.email.provider` → `NUXT_EMAIL_PROVIDER`
   - `runtimeConfig.public.multitenancy.enabled` → `NUXT_PUBLIC_MULTITENANCY_ENABLED`

3. **Restart dev server:** Changes to `.dev.vars` require restart

### Wrangler Secret Command Not Working

**Error:**
```
Error: Not authenticated. Please run `wrangler login`
```

**Solution:**
1. Login to Wrangler:
   ```bash
   wrangler login
   ```

2. Verify authentication:
   ```bash
   wrangler whoami
   ```

3. Ensure you have access to the Cloudflare account

---

## Migration from Direct Environment Access

If you're migrating from code that directly accesses `process.env` or `cloudflare.env`:

### Before (Direct Access)
```typescript
// ❌ Old way
const secret = process.env.JWT_SECRET || event.context.cloudflare?.env?.JWT_SECRET
```

### After (Runtime Config)
```typescript
// ✅ New way
const config = useRuntimeConfig(event)
const secret = config.jwtSecret
```

### Migration Checklist

1. ✅ Add secret to `nuxt.config.ts` runtimeConfig
2. ✅ Update code to use `useRuntimeConfig()`
3. ✅ Add to `.dev.vars.example` with documentation
4. ✅ Update Cloudflare secrets via Wrangler
5. ✅ Test locally with `.dev.vars`
6. ✅ Deploy and verify in production

---

## Additional Resources

- **[Nuxt Runtime Config Docs](https://nuxt.com/docs/guide/going-further/runtime-config)** - Official Nuxt documentation
- **[Wrangler Secrets Docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret)** - Cloudflare Wrangler documentation
- **[CONVENTIONS.md](./CONVENTIONS.md)** - Architecture patterns
- **[TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md)** - Setup guide

---

**Need help?** Open an issue in the repository or check the troubleshooting section above.
