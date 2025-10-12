# 🗺️ Roadmap - Future Enhancements

This document tracks planned features and improvements that are not yet implemented but have architectural support in place.

---

## 🔜 Planned Features

### Rate Limiting (Medium Priority)

**Status**: Not Implemented
**Category**: Security
**Effort**: Medium

Rate limiting infrastructure to prevent abuse and DDoS attacks.

**Implementation Tasks**:
- [ ] Implement rate limiting middleware using Cloudflare KV
- [ ] Add per-IP rate limits (10 req/min for auth endpoints)
- [ ] Add per-user rate limits (100 req/min for API)
- [ ] **Add per-tenant rate limits (prevent one tenant from affecting others)**
- [ ] Make limits configurable via runtime config
- [ ] Add rate limit headers to responses (`X-RateLimit-Remaining`, etc.)
- [ ] Create bypass mechanism for trusted IPs/services

**Technical Details**:
- Error class already exists: `RateLimitError` in [server/error/errors.ts:185-189](server/error/errors.ts#L185-L189)
- Use Cloudflare KV for distributed rate limit tracking
- Consider using sliding window algorithm for accuracy

**Multi-Tenant Considerations**:
- Implement per-tenant rate limiting to prevent noisy neighbor issues
- Track rate limits with tenant namespace: `ratelimit:${tenantId}:${endpoint}`
- Set tenant-specific quotas (e.g., free tier: 100 req/min, paid: 1000 req/min)
- Monitor per-tenant usage for billing/analytics

**Example Implementation**:
```typescript
// server/middleware/03.rate-limit.ts
export default defineEventHandler(async (event) => {
  const kv = event.context.cloudflare?.env?.KV
  const tenantId = event.context.tenantId || 'default'
  const ip = event.context.ipAddress

  if (event.path.startsWith('/api/v1/auth/')) {
    // Per-IP rate limit for auth endpoints
    const ipKey = `ratelimit:${ip}:auth`
    const ipCount = await kv.get(ipKey)

    if (ipCount && parseInt(ipCount) > 10) {
      throw new RateLimitError('Too many authentication attempts', 60)
    }

    await kv.put(ipKey, String((parseInt(ipCount || '0') + 1)), {
      expirationTtl: 60
    })
  }

  // Per-tenant rate limit for all API endpoints
  const tenantKey = `ratelimit:${tenantId}:api`
  const tenantCount = await kv.get(tenantKey)
  const tenantLimit = getTenantRateLimit(tenantId) // 100 for free, 1000 for paid

  if (tenantCount && parseInt(tenantCount) > tenantLimit) {
    throw new RateLimitError('Tenant rate limit exceeded', 60)
  }

  await kv.put(tenantKey, String((parseInt(tenantCount || '0') + 1)), {
    expirationTtl: 60
  })
})
```

---

### Email Service (Low Priority)

**Status**: Abstraction Ready, Implementation Pending
**Category**: Communication
**Effort**: Low

Email service for transactional emails (confirmations, password resets, notifications).

**Implementation Tasks**:
- [ ] Create email service abstraction: `server/services/email.ts`
- [ ] Implement Resend provider
- [ ] Implement Postmark provider
- [ ] Add email templates (confirmation, password reset, welcome)
- [ ] Add email queueing for batch sends
- [ ] Implement email preview in development mode

**Technical Details**:
- Configuration already in place: [nuxt.config.ts:22-26](nuxt.config.ts#L22-L26)
- TODOs marked in code:
  - [server/services/identity.ts:128](server/services/identity.ts#L128) - Send confirmation email
  - [server/services/identity.ts:201](server/services/identity.ts#L201) - Send password reset email

**Provider Setup**:
```bash
# Resend
NUXT_EMAIL_PROVIDER=resend
NUXT_EMAIL_API_KEY=re_xxxxx
NUXT_EMAIL_FROM=noreply@yourdomain.com

# Postmark
NUXT_EMAIL_PROVIDER=postmark
NUXT_EMAIL_API_KEY=pm_xxxxx
NUXT_EMAIL_FROM=noreply@yourdomain.com
```

---

### Cloudflare Turnstile Bot Protection (Low Priority)

**Status**: Schema Ready, Validation Pending
**Category**: Security
**Effort**: Low

Integrate Cloudflare Turnstile for bot protection on sensitive endpoints.

**Implementation Tasks**:
- [ ] Implement Turnstile validation utility
- [ ] Add middleware for bot protection on auth endpoints
- [ ] Make `turnstileToken` required when enabled
- [ ] Add frontend Turnstile widget integration guide
- [ ] Add bypass mechanism for testing/development

**Technical Details**:
- Schema fields already present:
  - [server/validators/auth.ts:26](server/validators/auth.ts#L26) - Signin schema
  - [server/validators/auth.ts:48](server/validators/auth.ts#L48) - Signup schema
  - [server/validators/auth.ts:60](server/validators/auth.ts#L60) - Password reset request
- Configuration keys in [nuxt.config.ts:32-33](nuxt.config.ts#L32-L33)

**Validation Example**:
```typescript
// server/utils/turnstile.ts
export async function validateTurnstile(
  token: string,
  event: H3Event
): Promise<boolean> {
  const config = useRuntimeConfig(event)
  const secretKey = config.turnstileSecretKey

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    }
  )

  const data = await response.json()
  return data.success
}
```

---

## 📊 Nice to Have

### Observability & Monitoring

**Status**: Partial (Trace IDs in place)
**Effort**: Medium

- [ ] Structured logging with JSON format
- [ ] Request tracing visualization (integrate with Cloudflare Analytics)
- [ ] Performance monitoring and alerts
- [ ] Error rate tracking and alerts
- [ ] Database query performance tracking

### Developer Experience

**Status**: Not Started
**Effort**: Low-Medium

- [ ] API route generator CLI tool
- [ ] More example implementations (file uploads, webhooks)
- [ ] TypeScript strict mode checks
- [ ] Automated API documentation generation

### Data & Storage

**Status**: Documented, Not Implemented
**Effort**: Medium

- [ ] R2 file storage integration
- [ ] File upload service with virus scanning
- [ ] Image optimization and CDN integration
- [ ] Backup and restore utilities

### Advanced Features

**Status**: Future Consideration
**Effort**: High

- [ ] Webhook system with retry logic
- [ ] Background job processing (Cloudflare Queues)
- [ ] Real-time features (WebSockets via Durable Objects)
- [ ] Advanced analytics and reporting
- [ ] Multi-region deployment support

---

## ✅ Recently Completed

### Security Enhancements (2025-01-12)
- [x] **Session-Tenant Binding** - Sessions are now cryptographically bound to tenant context
  - Prevents cross-tenant session reuse
  - Works in both single and multi-tenant modes
  - Implementation: [server/middleware/02.auth.ts:33-40](../server/middleware/02.auth.ts#L33-L40)
- [x] **JWT Token Tenant Validation** - Email/password reset tokens include tenant validation
  - Tokens include `tenantId` in payload
  - Automatic validation on token verification
  - Prevents cross-tenant token replay attacks
  - Implementation: [server/lib/auth.ts](../server/lib/auth.ts)
- [x] **UserSession Type Updates** - Added `tenantId` to session type definitions
  - Updated [server/types/auth.d.ts](../server/types/auth.d.ts)
  - TypeScript enforces tenant binding at compile time

## 🔧 Technical Debt

### High Priority
- [ ] Add integration tests for cross-tenant security validation
- [ ] Add integration tests for auth flow
- [ ] Add integration tests for RBAC permission resolution
- [ ] Test multi-tenancy database switching
- [ ] Implement permission version tracking in database (for cache invalidation)

### Medium Priority
- [ ] Add health check with DB connectivity test
- [ ] Implement graceful degradation for KV/R2 failures
- [ ] Add monitoring for session size (permissions array)
- [ ] Optimize audit log storage (consider log rotation)

### Low Priority
- [ ] Consider moving to TypeScript strict mode
- [ ] Evaluate database migration rollback strategy
- [ ] Review and optimize database indexes based on query patterns

---

## 📝 Notes

- **Priority Levels**: High (blocking), Medium (important), Low (enhancement)
- **Effort Estimates**: Low (<4 hours), Medium (4-16 hours), High (>16 hours)
- **Status Indicators**:
  - ✅ Completed
  - 🚧 In Progress
  - 📋 Planned
  - 💡 Under Consideration

---

## 🤝 Contributing

When implementing features from this roadmap:

1. Create a feature branch: `feature/rate-limiting`
2. Update this file to mark items as "In Progress"
3. Implement the feature following architectural patterns
4. Write tests for new functionality
5. Update relevant documentation
6. Mark items as completed with PR link

---

**Last Updated**: 2025-10-12
**Maintained By**: Development Team
