# 🔐 Security Guide

This document details the security architecture, best practices, and testing strategies for the Cloudflare Full-Stack Template.

> **Related Documentation:**
>
> - [CLAUDE.md](CLAUDE.md) - Quick reference
> - [CONVENTIONS.md](CONVENTIONS.md) - Architectural patterns
> - [RBAC.md](RBAC.md) - Access control system
> - [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling security
> - [SECRETS.md](SECRETS.md) - Secrets management

---

## Table of Contents

1. [Multi-Tenant Security](#multi-tenant-security)
2. [Session Management](#session-management)
3. [JWT Token Security](#jwt-token-security)
4. [Cross-Tenant Protection](#cross-tenant-protection)
5. [Mode Migration Security](#mode-migration-security)
6. [Best Practices](#best-practices)
7. [Testing Security](#testing-security)
8. [Threat Model](#threat-model)

---

## Multi-Tenant Security

### Architecture Overview

The template implements **physical data isolation** through separate databases per tenant:

```
Single-Tenant Mode:
└─ DB (default binding) → All data

Multi-Tenant Mode:
├─ DB_ACME → ACME's data
├─ DB_GLOBEX → GLOBEX's data
└─ DB_INITECH → INITECH's data
```

### Security Guarantees

✅ **Database Isolation**: Each tenant's data is in a separate D1 database
✅ **Session Binding**: Sessions are cryptographically bound to tenant context
✅ **Token Validation**: JWT tokens include and validate tenant ID
✅ **Middleware Enforcement**: Automatic validation on every request
✅ **Mode-Agnostic**: Security works identically in single and multi-tenant modes

---

## Session Management

### How Sessions Work

Sessions are managed by [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) with encrypted, signed cookies.

**Session Structure:**

```typescript
{
  user: {
    id: string,
    email: string,
    firstName?: string,
    lastName?: string
  },
  tenantId: string,        // ⚠️ CRITICAL: Bound to tenant
  permissions: string[],
  permissionVersion: number,
  loggedInAt: number
}
```

### Session-Tenant Binding

**Implementation:** [server/api/v1/auth/signin.post.ts:58](../server/api/v1/auth/signin.post.ts#L58)

```typescript
await setUserSession(event, {
  user: { ... },
  tenantId: event.context.tenantId, // Bound to current tenant
  permissions,
  permissionVersion,
  loggedInAt: Date.now(),
});
```

**Validation:** [server/middleware/02.auth.ts:33-40](../server/middleware/02.auth.ts#L33-L40)

```typescript
const session = await getUserSession(event);

// CRITICAL: Validate session tenant matches current tenant
if (session.tenantId !== event.context.tenantId) {
  throw new AuthenticationError(
    "Session tenant mismatch. Please sign in again.",
    "TENANT_MISMATCH"
  );
}
```

### Attack Prevention

**Scenario 1: Cross-Tenant Session Reuse**

```typescript
// ❌ Attack: User signs in to Tenant A, tries to access Tenant B
// 1. User authenticates to acme.example.com (tenantId: "acme")
// 2. Session created with tenantId: "acme"
// 3. User tries to access globex.example.com with same session
// 4. Middleware validates: session.tenantId ("acme") !== context.tenantId ("globex")
// 5. ✅ Request REJECTED with "Session tenant mismatch"
```

**Scenario 2: Session Hijacking Across Tenants**

```typescript
// ❌ Attack: Attacker steals session cookie from Tenant A, uses on Tenant B
// Even if attacker has valid session cookie:
// 1. Session tenantId is "acme" (embedded in encrypted cookie)
// 2. Request to Tenant B has context.tenantId = "globex"
// 3. Middleware validation fails
// 4. ✅ Attack BLOCKED
```

---

## JWT Token Security

### Email Confirmation Tokens

**Generation:** [server/lib/auth.ts:59-81](../server/lib/auth.ts#L59-L81)

```typescript
export async function generateEmailConfirmToken(
  userId: string,
  email: string,
  tenantId: string, // ⚠️ CRITICAL: Includes tenant context
  event?: H3Event
): Promise<string> {
  return await new SignJWT({
    userId,
    email,
    tenantId, // Bound to tenant
    purpose: "email-confirm",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);
}
```

**Verification:** [server/lib/auth.ts:116-144](../server/lib/auth.ts#L116-L144)

```typescript
export async function verifyEmailConfirmToken(
  token: string,
  currentTenantId: string, // From request context
  event?: H3Event
): Promise<EmailConfirmTokenPayload> {
  const { payload } = await jwtVerify(token, secret);

  // CRITICAL: Validate token is for current tenant
  if (payload.tenantId !== currentTenantId) {
    throw new InvalidTokenError("Token tenant mismatch");
  }

  return payload;
}
```

### Password Reset Tokens

Same security model as email confirmation:

- **Generation:** Includes `tenantId` in payload ([server/lib/auth.ts:86-108](../server/lib/auth.ts#L86-L108))
- **Verification:** Validates tenant match ([server/lib/auth.ts:152-180](../server/lib/auth.ts#L152-L180))
- **Expiration:** 1 hour (shorter window for password-sensitive operations)

### Token Attack Prevention

**Scenario 1: Cross-Tenant Token Replay**

```typescript
// ❌ Attack: User requests password reset for Tenant A, uses token on Tenant B
// 1. User requests reset on acme.example.com
// 2. Token generated: { userId, email, tenantId: "acme", purpose: "password-reset" }
// 3. Attacker tries to use token on globex.example.com
// 4. Verification checks: payload.tenantId ("acme") !== context.tenantId ("globex")
// 5. ✅ Token REJECTED with "Token tenant mismatch"
```

**Scenario 2: Token Forwarding Attack**

```typescript
// ❌ Attack: Malicious user forwards their reset token to another tenant
// Even if user has valid email address in both tenants:
// 1. Token was generated for Tenant A with tenantId="acme"
// 2. Token verification on Tenant B fails tenant validation
// 3. ✅ Attack BLOCKED
```

---

## Cross-Tenant Protection

### Middleware Chain

```
Request Flow:
┌─────────────────────────────────────────┐
│ 1. Tenant Middleware (01.tenant.ts)    │
│    - Extracts tenant from subdomain     │
│    - Sets event.context.tenantId        │
│    - Selects correct DB binding         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 2. Auth Middleware (02.auth.ts)        │
│    - Gets user session                  │
│    - Validates session.tenantId ===    │
│      event.context.tenantId            │
│    - Sets event.context.userId         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 3. Service Layer                        │
│    - Access tenant-specific database   │
│    - No manual tenant filtering needed │
└─────────────────────────────────────────┘
```

### Protection Layers

**Layer 1: Database Isolation (Physical)**

- Each tenant has separate D1 database
- No shared tables or data
- Database-level security

**Layer 2: Session Binding (Application)**

- Sessions include tenant context
- Automatic validation in middleware
- Cannot reuse sessions across tenants

**Layer 3: Token Validation (Application)**

- JWT tokens include tenant ID
- Verification validates tenant match
- Prevents token replay attacks

**Layer 4: Context Validation (Service)**

- Services validate tenant context exists
- Fail-fast on missing context
- No queries execute without tenant context

**Layer 5: RBAC Permissions (Application)**

- Organization-level permission checks
- Required for creating projects, org channels, cross-project operations
- Enforced via `getRBACService().requirePermission()`
- 31 granular permissions across 6 categories
- See [RBAC.md](RBAC.md) for complete permission list

**Layer 6: Resource Roles (Application)**

- Project/channel-specific role checks
- Hierarchical roles: owner > admin > member > viewer
- Enforced via `verifyAccess()` with minimum role
- Role hierarchy prevents privilege escalation
- See [RBAC.md](RBAC.md#resource-roles) for role system details

**Layer 7: Rate Limiting (Application)**

- Cloudflare Native Rate Limiting API on all auth endpoints (email + OAuth)
- 60-second windows: signin (5/min), signup (1/min), OAuth callback (5/min)
- Prevents brute force attacks and CPU exhaustion
- Distributed across all worker instances
- Automatic blocking with 429 status and `Retry-After` headers
- See [Rate Limiting](#rate-limiting) section below

📖 **Full permission architecture:** [RBAC.md](RBAC.md)

---

## Rate Limiting

### Implementation

Rate limiting is implemented using **Cloudflare's native Rate Limiting API** to protect authentication endpoints from brute force attacks and API abuse.

**Middleware:** [server/middleware/03.rate-limit.ts](../server/middleware/03.rate-limit.ts)

**Configuration:**

- **Staging:** [wrangler.staging.jsonc](../wrangler.staging.jsonc)
- **Production:** [wrangler.production.jsonc](../wrangler.production.jsonc)

**Protected Endpoints:**

- `/api/v1/auth/signin` - 5 requests per minute per IP
- `/api/v1/auth/signup` - 1 request per minute per IP
- `/api/v1/auth/password/reset/request` - 1 request per minute per IP
- `/api/v1/auth/google/authorize` - 10 requests per minute per IP
- `/api/v1/auth/google/callback` - 5 requests per minute per IP

### Architecture

**Cloudflare Native vs In-Memory:**

| Feature        | Cloudflare Native (Current) | In-Memory (Old)      |
| -------------- | --------------------------- | -------------------- |
| Storage        | Cloudflare infrastructure   | Per-worker Map       |
| Multi-instance | ✅ Shared across workers    | ❌ Per-instance only |
| Memory leaks   | ✅ Impossible               | ⚠️ Requires cleanup  |
| Accuracy       | Eventually consistent       | Precise              |
| Local dev      | ❌ Not available            | ✅ Works locally     |
| CPU overhead   | Minimal (async)             | Minimal              |
| Configuration  | Wrangler config             | Code-based           |

### How It Works

```typescript
// Request flow with Cloudflare Rate Limiting API
┌─────────────────────────────────────────┐
│ 1. Request arrives at auth endpoint     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 2. Rate Limit Middleware                │
│    - Extracts IP address                │
│    - Gets appropriate binding           │
│    - Calls rateLimiter.limit()          │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │ Success?    │
        └──────┬──────┘
         Yes   │   No
               │    └─────> 429 RateLimitError
               │
┌──────────────▼──────────────────────────┐
│ 3. Continue to auth logic               │
└─────────────────────────────────────────┘
```

**Binding Configuration (wrangler.jsonc):**

```jsonc
"ratelimits": [
  {
    "name": "AUTH_SIGNIN_LIMITER",
    "namespace_id": "1001",
    "simple": {
      "limit": 5,
      "period": 60  // Cloudflare only supports 10 or 60 seconds
    }
  }
]
```

### Response Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0  (always 0 - Cloudflare API doesn't provide count)
X-RateLimit-Reset: 1234567890
Retry-After: 60  (only when blocked)
```

**Note:** The Cloudflare Rate Limiting API does not provide a remaining count, so `X-RateLimit-Remaining` is always "0" when rate limited.

### Error Response

When rate limit is exceeded:

```json
{
  "error": {
    "message": "Too many requests. Please try again in 60 seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "details": {
      "retryAfter": 60
    }
  }
}
```

### Attack Prevention

**Scenario: Brute Force Login Attack**

```typescript
// ❌ Attack: Attacker tries to guess passwords
// 1. Attacker makes 5 signin attempts with wrong passwords in one minute
// 2. Cloudflare Rate Limiting API tracks: IP 1.2.3.4 → 5 requests to signin endpoint
// 3. 6th attempt within the minute triggers rate limit
// 4. Middleware throws RateLimitError with 429 status
// 5. ✅ Attack BLOCKED for 60 seconds
```

**Scenario: Account Enumeration via Signup**

```typescript
// ❌ Attack: Attacker tries to discover registered emails
// 1. Attacker rapidly submits signup forms with different emails
// 2. Rate limit: 1 request per minute from single IP
// 3. 2nd attempt within minute blocked with 429 status
// 4. ✅ Attack SEVERELY LIMITED (max 1 attempt/minute)
```

**Scenario: OAuth Flow Abuse**

```typescript
// ❌ Attack: Attacker spams OAuth callback to exhaust CPU
// 1. Attacker makes repeated OAuth callback requests (CPU-intensive: token verification, DB queries, API calls)
// 2. Rate limit: 5 requests per minute from single IP
// 3. 6th attempt blocked with 429 status
// 4. ✅ Attack BLOCKED - Prevents CPU time limit exhaustion
```

### Cloudflare Limitations

**Period Constraints:**

- Cloudflare only supports `period` values of **10 or 60 seconds**
- Cannot configure arbitrary time windows (15 minutes, 1 hour, etc.)
- This is why all limits use 60-second (1 minute) windows

**Trade-offs:**

- ✅ **Distributed**: Works across all Cloudflare locations and worker instances
- ✅ **No memory management**: No cleanup needed, no memory leaks
- ✅ **Automatic**: Managed by Cloudflare infrastructure
- ⚠️ **Eventually consistent**: Not real-time precise (acceptable for rate limiting)
- ⚠️ **Local dev**: Not available in local development (graceful fallback)
- ⚠️ **No remaining count**: API doesn't provide accurate remaining request count

### Local Development

Rate limiting **does not work in local development**:

```typescript
// Local dev behavior
if (!env) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[Rate Limit] Cloudflare bindings not available in local development for ${path}`
    );
  }
  return; // Request continues without rate limiting
}
```

To test rate limiting, deploy to **staging** environment.

### Testing Rate Limits

**In Staging/Production:**

```typescript
// Test signin rate limit (5 per minute)
for (let i = 0; i < 6; i++) {
  const response = await fetch(
    "https://staging.example.com/api/v1/auth/signin",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
    }
  );

  if (i < 5) {
    expect(response.status).toBe(401); // Invalid credentials
  } else {
    expect(response.status).toBe(429); // Rate limit exceeded
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.error.details.retryAfter).toBe(60);
  }
}
```

**OAuth Callback Rate Limit:**

```typescript
// Test OAuth callback rate limit (5 per minute)
// This protects against CPU exhaustion from repeated token verification + DB queries
for (let i = 0; i < 6; i++) {
  const response = await fetch(
    "https://staging.example.com/api/v1/auth/google/callback?code=test&state=test",
    {
      method: "GET",
    }
  );

  if (i < 5) {
    // May succeed or fail based on token validity
  } else {
    expect(response.status).toBe(429); // Rate limit exceeded
  }
}
```

---

## Mode Migration Security

### Single-Tenant to Multi-Tenant

**Security Implications:**

```typescript
// Before (Single-Tenant):
// - All sessions have tenantId: "default"
// - All tokens have tenantId: "default"
// - One database: DB

// After (Multi-Tenant):
// - Sessions need tenant-specific tenantId
// - Tokens need tenant-specific tenantId
// - Multiple databases: DB_ACME, DB_GLOBEX, etc.
```

**⚠️ Required Steps:**

1. **Data Migration**: Move data from `DB` to `DB_TENANT`
2. **Session Invalidation**: All users must sign out and sign in again
3. **Token Invalidation**: All pending email/reset tokens become invalid
4. **Configuration Update**: Set `NUXT_MULTITENANCY_ENABLED=true`

**Security Risk if Not Properly Migrated:**

- Old sessions with `tenantId="default"` won't work
- Old tokens with `tenantId="default"` will fail validation
- Users will be unable to authenticate until they sign in again

### Multi-Tenant to Single-Tenant

**Security Implications:**

```typescript
// Before (Multi-Tenant):
// - Sessions have tenant-specific IDs
// - Tokens have tenant-specific IDs
// - Multiple databases with isolated data

// After (Single-Tenant):
// - All tenantId should be "default"
// - One merged database
```

**⚠️ Required Steps:**

1. **Data Consolidation**: Merge all tenant DBs into single DB
2. **Add tenantId Column**: If merging, add tenant identifier to data
3. **Session Invalidation**: All users must sign in again
4. **Token Invalidation**: All pending tokens become invalid

**⚠️ CRITICAL:** There is no automatic migration. Plan your mode before production.

---

## Best Practices

### 1. Never Bypass Tenant Validation

**❌ BAD:**

```typescript
// DON'T: Manually override tenant context
event.context.tenantId = "admin-override"; // SECURITY RISK!
```

**✅ GOOD:**

```typescript
// Let middleware handle tenant resolution
// Validate in service constructors
if (!event.context.tenantId) {
  throw new InternalServerError("Tenant context missing");
}
```

### 2. Always Include Tenant in Audit Logs

**✅ GOOD:**

```typescript
await auditLogRepo.log(userId, "USER_UPDATED", "User", userId, {
  tenantId: event.context.tenantId, // ✅ Include tenant context
  metadata: { changes },
});
```

### 3. Rate Limit Per-Tenant

**✅ GOOD:**

```typescript
// Prevent one tenant from exhausting shared resources
const rateLimitKey = `ratelimit:${tenantId}:${endpoint}`;
const count = await kv.get(rateLimitKey);

if (count && parseInt(count) > getTenantLimit(tenantId)) {
  throw new RateLimitError("Tenant rate limit exceeded");
}
```

### 4. Sanitize Cross-Tenant Error Messages

**❌ BAD:**

```typescript
throw new Error(`Database for tenant "${tenantId}" not found`); // Leaks tenant info
```

**✅ GOOD:**

```typescript
// Generic message to user
throw new AuthenticationError("Invalid tenant configuration");
// Detailed log server-side
console.error(`[Tenant: ${tenantId}] DB not found`);
```

### 5. Implement Permission Version Tracking

**✅ GOOD:**

```typescript
// In session
permissionVersion: number; // Incrementing version

// On permission change
await updatePermissionVersion(userId); // Invalidates cache

// On request validation
if (session.permissionVersion < currentVersion) {
  // Force re-fetch permissions
}
```

---

## Testing Security

### Cross-Tenant Session Tests

```typescript
describe("Cross-tenant session security", () => {
  it("rejects session from different tenant", async () => {
    // Sign in to Tenant A
    const sessionA = await fetch(
      "http://acme.localhost:3000/api/v1/auth/signin",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@acme.com", password: "password" }),
      }
    );

    const cookies = sessionA.headers.get("set-cookie");

    // Try to use Tenant A session on Tenant B
    const response = await fetch(
      "http://globex.localhost:3000/api/v1/user/profile",
      {
        headers: { Cookie: cookies },
      }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("TENANT_MISMATCH");
  });
});
```

### Cross-Tenant Token Tests

```typescript
describe("Cross-tenant token security", () => {
  it("rejects password reset token from different tenant", async () => {
    // Request reset on Tenant A
    const resetResponse = await fetch(
      "http://acme.localhost:3000/api/v1/auth/password/reset/request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@acme.com" }),
      }
    );

    const { token } = await resetResponse.json();

    // Try to use token on Tenant B
    const response = await fetch(
      "http://globex.localhost:3000/api/v1/auth/password/reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: "newpass123" }),
      }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain("Token tenant mismatch");
  });
});
```

### Permission Boundary Tests

```typescript
describe("Permission boundary tests", () => {
  it("prevents user from accessing different tenant data even with valid session", async () => {
    // User with valid session in Tenant A
    const session = await signinToTenant("acme");

    // Manually craft request to Tenant B endpoint
    const response = await fetch("http://globex.localhost:3000/api/v1/users", {
      headers: { Cookie: session.cookies },
    });

    // Should fail at tenant validation (before permission check)
    expect(response.status).toBe(401);
    expect(body.error.code).toBe("TENANT_MISMATCH");
  });
});
```

---

## Threat Model

### Threats Mitigated

✅ **Cross-Tenant Data Access**

- **Threat**: User from Tenant A accessing Tenant B's data
- **Mitigation**: Session tenant binding + middleware validation
- **Status**: Fully mitigated

✅ **Session Hijacking Across Tenants**

- **Threat**: Stolen session cookie used on different tenant
- **Mitigation**: Session includes tenant ID, validated on every request
- **Status**: Fully mitigated

✅ **Token Replay Attacks**

- **Threat**: Email/reset token from Tenant A used on Tenant B
- **Mitigation**: Tokens include tenant ID, validated on verification
- **Status**: Fully mitigated

✅ **Database Query Injection**

- **Threat**: Malicious tenant ID in query to access wrong database
- **Mitigation**: Tenant resolution in middleware, DB binding from context
- **Status**: Fully mitigated

✅ **Brute Force Attacks on Authentication**

- **Threat**: Attackers attempting to guess credentials through repeated login attempts
- **Mitigation**: Cloudflare Native Rate Limiting API on all auth endpoints
- **Implementation**: `server/middleware/03.rate-limit.ts` + wrangler configs
- **Limits:**
  - Signin: 5 requests per minute per IP
  - Signup: 1 request per minute per IP
  - Password Reset: 1 request per minute per IP
  - OAuth Authorize: 10 requests per minute per IP
  - OAuth Callback: 5 requests per minute per IP
- **Status**: Fully mitigated

✅ **CPU Time Exhaustion via API Abuse**

- **Threat**: Attackers spamming CPU-intensive endpoints to exhaust Cloudflare Workers CPU limits
- **Mitigation**: Rate limiting on OAuth callback (token verification, DB queries, external API calls)
- **Implementation**: OAuth callback limited to 5 requests per minute per IP
- **Status**: Fully mitigated

### Threats Not Fully Mitigated

⚠️ **Per-Tenant Rate Limiting**

- **Threat**: One tenant's high traffic affecting others
- **Current State**: Per-IP rate limiting on all auth endpoints (email + OAuth)
- **Recommendation**: Implement per-tenant rate limits for API operations beyond authentication

⚠️ **Database Size Limits**

- **Threat**: One tenant exhausting D1 database size limit
- **Current State**: No limits enforced
- **Recommendation**: Monitor per-tenant DB size, implement quotas

⚠️ **Shared Worker Resource Exhaustion**

- **Threat**: One tenant's compute-heavy requests affecting others
- **Current State**: Shared Worker CPU/memory
- **Mitigation**: Cloudflare Workers isolates requests, has built-in limits

### Out of Scope

🔒 **DDoS Protection**

- Handled by Cloudflare's edge network
- Automatic rate limiting at edge
- Not application-level concern

🔒 **TLS/SSL**

- Handled by Cloudflare
- Automatic HTTPS, certificate management
- Not application-level concern

---

## Security Checklist

### Before Production

- [ ] Changed all default passwords and secrets
- [ ] Generated new `NUXT_SESSION_PASSWORD` for production
- [ ] Generated new `NUXT_JWT_SECRET` for production
- [ ] Enabled multi-tenancy if needed (`NUXT_MULTITENANCY_ENABLED`)
- [ ] Tested cross-tenant session validation
- [ ] Tested cross-tenant token validation
- [ ] Reviewed and tested RBAC permissions
- [ ] Verified organization channel creation requires `channels:create_organization` permission
- [ ] Tested project creation requires `projects:create` RBAC permission
- [ ] Validated role hierarchy enforcement prevents privilege escalation
- [ ] Confirmed message edit/delete authorization checks (ownership + RBAC fallback)
- [ ] Tested all 31 permission codes are properly enforced
- [x] Configured rate limiting on auth endpoints
- [ ] Set up monitoring for security events
- [ ] Reviewed audit log configuration

### Regular Audits

- [ ] Review audit logs for suspicious cross-tenant access attempts
- [ ] Monitor session sizes (permissions array shouldn't exceed 100)
- [ ] Check for failed tenant validation attempts
- [ ] Review rate limit hits on auth endpoints
- [ ] Update dependencies for security patches
- [ ] Test security with both single and multi-tenant modes

---

## Additional Resources

- [README.md](../README.md) - Template overview and features
- [TEMPLATE_SETUP.md](TEMPLATE_SETUP.md) - Setup guide with security notes
- [ROADMAP.md](ROADMAP.md) - Planned security enhancements
- [CONVENTIONS.md](CONVENTIONS.md) - Architecture patterns

---

**Last Updated**: 2025-11-15
**Security Contact**: See repository maintainers
