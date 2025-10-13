# 🔐 Security Guide

This document details the security architecture, best practices, and testing strategies for the Cloudflare Full-Stack Template.

> **Related Documentation:**
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
  tenantId: string,  // ⚠️ CRITICAL: Includes tenant context
  event?: H3Event
): Promise<string> {
  return await new SignJWT({
    userId,
    email,
    tenantId,  // Bound to tenant
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
  currentTenantId: string,  // From request context
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
await auditLogRepo.log(
  userId,
  "USER_UPDATED",
  "User",
  userId,
  {
    tenantId: event.context.tenantId, // ✅ Include tenant context
    metadata: { changes },
  }
);
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
permissionVersion: number // Incrementing version

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
describe('Cross-tenant session security', () => {
  it('rejects session from different tenant', async () => {
    // Sign in to Tenant A
    const sessionA = await fetch('http://acme.localhost:3000/api/v1/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@acme.com', password: 'password' })
    });

    const cookies = sessionA.headers.get('set-cookie');

    // Try to use Tenant A session on Tenant B
    const response = await fetch('http://globex.localhost:3000/api/v1/user/profile', {
      headers: { 'Cookie': cookies }
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('TENANT_MISMATCH');
  });
});
```

### Cross-Tenant Token Tests

```typescript
describe('Cross-tenant token security', () => {
  it('rejects password reset token from different tenant', async () => {
    // Request reset on Tenant A
    const resetResponse = await fetch('http://acme.localhost:3000/api/v1/auth/password/reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@acme.com' })
    });

    const { token } = await resetResponse.json();

    // Try to use token on Tenant B
    const response = await fetch('http://globex.localhost:3000/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: 'newpass123' })
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('Token tenant mismatch');
  });
});
```

### Permission Boundary Tests

```typescript
describe('Permission boundary tests', () => {
  it('prevents user from accessing different tenant data even with valid session', async () => {
    // User with valid session in Tenant A
    const session = await signinToTenant('acme');

    // Manually craft request to Tenant B endpoint
    const response = await fetch('http://globex.localhost:3000/api/v1/users', {
      headers: { 'Cookie': session.cookies }
    });

    // Should fail at tenant validation (before permission check)
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('TENANT_MISMATCH');
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

### Threats Not Fully Mitigated

⚠️ **Rate Limiting / Noisy Neighbor**
- **Threat**: One tenant's high traffic affecting others
- **Current State**: Not implemented
- **Planned**: Per-tenant rate limiting (see [ROADMAP.md](ROADMAP.md))

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
- [ ] Configured rate limiting (when implemented)
- [ ] Set up monitoring for security events
- [ ] Reviewed audit log configuration

### Regular Audits

- [ ] Review audit logs for suspicious cross-tenant access attempts
- [ ] Monitor session sizes (permissions array shouldn't exceed 100)
- [ ] Check for failed tenant validation attempts
- [ ] Review rate limit hits per tenant
- [ ] Update dependencies for security patches
- [ ] Test security with both single and multi-tenant modes

---

## Additional Resources

- [README.md](../README.md) - Template overview and features
- [TEMPLATE_SETUP.md](TEMPLATE_SETUP.md) - Setup guide with security notes
- [ROADMAP.md](ROADMAP.md) - Planned security enhancements
- [CONVENTIONS.md](CONVENTIONS.md) - Architecture patterns

---

**Last Updated**: 2025-01-12
**Security Contact**: See repository maintainers
