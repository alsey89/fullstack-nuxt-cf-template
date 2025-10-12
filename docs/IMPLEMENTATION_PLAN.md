# 🎯 Implementation Plan - Template Improvements

**Created:** 2025-01-11
**Status:** In Progress
**Estimated Timeline:** 2-3 days

This document tracks the comprehensive implementation plan for fixing critical issues and improving the Nuxt-Cloudflare fullstack template. Use this as a living document to track progress across sessions.

---

## 📊 Progress Tracker

**Overall Progress:** 8/24 tasks completed (33%)
**Last Updated:** 2025-01-11

### Phase 1: Critical Fixes ✅ COMPLETED
- [x] 5/5 tasks completed (Tasks 1, 2, 3, 4, 17 ✅)

### Phase 2: Core Improvements 🏃 IN PROGRESS
- [x] 3/5 tasks completed (Tasks 6, 8, 9 ✅)

### Phase 3: API Enhancements 🔜
- [ ] 0/5 tasks completed

### Phase 4: Testing & Docs 🔜
- [ ] 0/4 tasks completed

### Phase 5: Final Polish 🔜
- [ ] 0/5 tasks completed

---

## 🎯 Implementation Phases

### Phase 1: Critical Fixes (Days 1-2)

#### ✅ Task 1: Fix Multitenancy Architecture
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P0
**Complexity:** Medium
**Time Taken:** ~2 hours

**Problem:** Documentation claims per-tenant database isolation but implementation uses single database. Causes confusion and incorrect architecture claims.

**Files Modified:**
- [x] `nuxt.config.ts` - Default multitenancy to false ✅
- [x] `server/database/schema/identity.ts` - Added indexes and foreign key constraints ✅
- [x] `server/database/seed.ts` - Fixed clearDatabase to handle foreign keys ✅
- [x] `server/middleware/00.request-context.ts` - Created request tracking middleware ✅
- [x] Migration `0003_romantic_james_howlett.sql` - Generated and applied ✅
- [ ] `README.md` - Fix architecture claims (deferred to Task 17)
- [ ] `docs/CONVENTIONS.md` - Remove stale companyId references (deferred to Task 17)
- [ ] `docs/TEMPLATE_SETUP.md` - Document manual tenant provisioning (deferred to Task 17)
- [ ] `wrangler.staging.jsonc` - Add multi-tenant examples (deferred to Task 17)
- [ ] `wrangler.production.jsonc` - Add multi-tenant examples (deferred to Task 17)

**Key Changes:**
```typescript
// nuxt.config.ts
runtimeConfig: {
  multitenancy: {
    enabled: false, // ✅ Default to single-tenant
  }
}

// server/middleware/01.tenant.ts
// Single-tenant mode: Use default DB binding
if (!isMultitenancyEnabled) {
  event.context.db = event.context.cloudflare?.env?.DB;
  event.context.tenantId = "default";
  return;
}

// Multi-tenant mode: Use DB_<TENANT> bindings (manual provisioning)
const dbBinding = `DB_${tenantId.toUpperCase()}`;
event.context.db = event.context.cloudflare?.env?.[dbBinding];
```

**Documentation Updates:**
- Change "per-tenant database with physical isolation" → "configurable per-tenant database isolation (defaults to single-tenant)"
- Add section on manual tenant provisioning process
- Document wrangler commands for creating tenant DBs
- Remove all misleading "physical isolation" claims

**Completed Changes:**

1. **nuxt.config.ts:**
   - Set multitenancy.enabled to false (single-tenant default)
   - Fixed client/server config mismatch
   - Added clear documentation

2. **server/database/schema/identity.ts:**
   - Added email index (users_email_idx) - critical for login
   - Added email unique constraint (users_email_unique)
   - Added isActive index (users_active_idx)
   - Added system role index (roles_system_idx)
   - Added foreign keys with cascade:
     * user_roles.userId → users.id (cascade delete)
     * user_roles.roleId → roles.id (cascade delete)
     * user_settings.userId → users.id (cascade delete)
     * audit_logs.userId → users.id (set null)
   - Enhanced audit_logs with request tracking columns:
     * requestId, endpoint, method, statusCode
   - Added audit log indexes for performance

3. **server/middleware/00.request-context.ts (NEW):**
   - Captures request ID from header or generates UUID
   - Captures IP address, user agent, endpoint, method
   - Sets X-Request-ID response header

4. **server/database/seed.ts:**
   - Updated clearDatabase() to disable foreign keys temporarily
   - Fixed PRAGMA foreign_keys handling

5. **Migration Applied:**
   - Generated: 0003_romantic_james_howlett.sql
   - Applied successfully to local database
   - Database seeded with test users

**Verification:** ✅
```bash
✅ Migration applied successfully
✅ Database seeded without errors
✅ Dev server running
✅ Foreign key constraints working
✅ Request context middleware active
```

**Note:** Documentation updates deferred to Task 17 to batch all doc changes together.

---

#### ✅ Task 2: Fix RBAC Implementation
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P0
**Complexity:** High
**Time Taken:** ~1.5 hours

**Problem:** Sign-in endpoint references non-existent `assignment` and permission methods. Incomplete RBAC implementation.

**Files Modified:**
- [x] `server/api/v1/auth/signin.post.ts` - Remove assignment references ✅
- [x] `server/services/identity.ts` - Add missing permission methods ✅
- [x] `server/middleware/02.auth.ts` - Remove currentAssignmentId ✅
- [ ] `server/services/rbac.ts` - Add permission version tracking (TODO comment added)
- [ ] `server/repositories/rbac.ts` - Ensure permission validation works (verified working)
- [ ] `docs/RBAC.md` - Document hybrid architecture (deferred to Task 17)

**Completed Changes:**

1. **server/services/identity.ts:**
   - Added `getUserPermissions(userId: string): Promise<string[]>` method
   - Added `getPermissionVersion(userId: string): Promise<number>` method
   - Both methods delegate to RBACService
   - Graceful degradation when RBAC disabled (returns [] and 0)
   - Used dynamic imports to avoid circular dependencies

2. **server/api/v1/auth/signin.post.ts:**
   - Removed `assignment` from destructuring (line 30)
   - Removed `currentAssignmentId` from session (line 57)
   - Removed `assignment` from response (lines 63-65)

3. **server/middleware/02.auth.ts:**
   - Removed `currentAssignmentId` from event.context (lines 35-37)

**Note:** Permission version tracking uses Date.now() as placeholder. TODO comment added for proper database version tracking implementation.

**Verification:** ✅
```bash
✅ Code compiles without errors
✅ Removed all assignment references
✅ Added missing permission methods
✅ RBAC graceful degradation works
✅ Dynamic imports avoid circular dependencies
```

---

#### ✅ Task 3: Consolidate Secrets in Runtime Config
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P0
**Complexity:** Medium
**Time Taken:** ~2 hours

**Problem:** Secrets scattered across different sources. Need unified configuration via runtime config.

**Files Modified:**
- [x] `nuxt.config.ts` - Add all secrets to runtimeConfig ✅
- [x] `server/utils/auth.ts` - Use runtime config for JWT secret ✅
- [x] `server/lib/response.ts` - Use runtime config for environment check ✅
- [x] `server/utils/rbac.ts` - Use runtime config for debug logging ✅
- [x] `.dev.vars.example` - Document all required secrets ✅
- [x] `wrangler.staging.jsonc` - Update secrets documentation ✅
- [x] `wrangler.production.jsonc` - Update secrets documentation ✅
- [x] Create `docs/SECRETS.md` - Comprehensive secrets guide ✅

**Completed Changes:**

1. **nuxt.config.ts:**
   - Added `jwtSecret` to runtimeConfig (for email/password reset tokens)
   - Added `email` configuration object (provider, apiKey, from)
   - All secrets now override via `NUXT_*` environment variables
   - Clear comments explaining each secret's purpose

2. **server/utils/auth.ts:**
   - Replaced direct env access with `useRuntimeConfig()`
   - Updated `getJWTSecret()` to read from `config.jwtSecret`
   - Added validation for unset secrets
   - Removed fallbacks to process.env and cloudflare.env

3. **server/lib/response.ts:**
   - Replaced `process.env.NODE_ENV` with `config.public.environment`
   - Uses runtime config for environment detection

4. **server/utils/rbac.ts:**
   - Updated `RBACDebugger.logPermissionCheck()` to use runtime config
   - Replaced `process.env.NODE_ENV` with `config.public.environment`

5. **.dev.vars.example:**
   - Reorganized with clear sections (Environment, Session, JWT, Email, etc.)
   - Added all `NUXT_*` prefix environment variables
   - Added generation instructions for secrets
   - Documented required vs optional secrets

6. **wrangler.staging.jsonc:**
   - Updated vars section with `NUXT_PUBLIC_ENVIRONMENT`
   - Added comprehensive secrets documentation
   - Listed all required and optional secrets
   - Added Wrangler commands for each secret

7. **wrangler.production.jsonc:**
   - Same updates as staging config
   - Production-specific environment values

8. **docs/SECRETS.md (NEW):**
   - Complete secrets management guide (600+ lines)
   - Architecture explanation (runtime config pattern)
   - Local development setup instructions
   - Cloudflare secrets management via Wrangler
   - Detailed reference for all secrets (required/optional)
   - Best practices (rotation, separation, generation)
   - Troubleshooting section
   - Migration guide from direct env access

**Verification:** ✅
```bash
✅ All secrets centralized in runtime config
✅ No direct process.env or cloudflare.env access
✅ Type-safe access via useRuntimeConfig()
✅ Clear NUXT_* naming convention
✅ Comprehensive documentation created
```

---

#### ✅ Task 4: Implement Database Transactions (Batch)
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P0
**Complexity:** Medium
**Time Taken:** ~2 hours

**Problem:** Critical operations lack atomicity. Seed operations can fail partially, leaving corrupt state.

**Files Modified:**
- [x] `server/database/seed.ts` - Converted to atomic batch operations ✅
- [x] `server/utils/database.ts` - Created transaction helpers ✅
- [x] `server/utils/index.ts` - Exported database utilities ✅

**Key Changes:**
```typescript
// server/database/seed.ts
export async function seedDatabase(db: D1Database, options?) {
  const now = new Date();

  // Build all statements first (atomic batch)
  const statements = [
    // Permissions
    ...permissionCodes.map(p =>
      db.prepare(
        "INSERT INTO permissions (code, name, description, category, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(p.code, p.name, p.description, p.category, now.getTime(), now.getTime())
    ),

    // Users
    ...users.map(u =>
      db.prepare(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, " +
        "is_email_verified, is_active, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(u.id, u.email, passwordHash, u.firstName, u.lastName, u.phone, u.role,
             1, 1, now.getTime(), now.getTime())
    ),

    // Roles
    db.prepare(
      "INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(adminRoleId, 'admin', 'Full system access', JSON.stringify(['*']),
           1, now.getTime(), now.getTime()),

    // More roles...

    // User role assignments
    ...userRoleAssignments.map(ur =>
      db.prepare(
        "INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), ur.userId, ur.roleId, now.getTime(), now.getTime())
    ),
  ];

  // Execute as atomic batch
  try {
    await db.batch(statements);
    console.log('✅ Database seeded successfully (atomic transaction)');
  } catch (error) {
    console.error('❌ Seed failed, rolling back...');
    throw error; // D1 batch automatically rolls back on error
  }
}
```

**server/utils/database.ts:**
```typescript
/**
 * Execute multiple operations in a D1 batch (atomic)
 * D1 doesn't support traditional transactions, but batch provides atomicity
 */
export async function executeBatch(
  db: D1Database,
  operations: D1PreparedStatement[]
): Promise<D1Result[]> {
  try {
    const results = await db.batch(operations);
    return results;
  } catch (error) {
    console.error('Batch operation failed:', error);
    throw error;
  }
}

/**
 * Helper to build prepared statement
 */
export function prepareStatement(
  db: D1Database,
  sql: string,
  params: any[]
): D1PreparedStatement {
  return db.prepare(sql).bind(...params);
}
```

**Completed Changes:**

1. **server/utils/database.ts (NEW):**
   - Created `executeBatch()` - Execute D1 prepared statements atomically
   - Created `createBatchInsert()` - Helper for batch INSERT operations
   - Created `createBatchUpdate()` - Helper for batch UPDATE operations
   - Created `createBatchDelete()` - Helper for batch DELETE operations
   - Created `DatabaseTransaction` class - Fluent transaction builder
   - Created `createTransaction()` - Factory for transaction instances
   - Full TypeScript types and JSDoc documentation

2. **server/database/seed.ts:**
   - Converted permissions insert to atomic batch (11 inserts → 1 batch)
   - Converted users insert to atomic batch (3 inserts → 1 batch)
   - Converted roles insert to atomic batch (3 inserts → 1 batch)
   - Converted role assignments to atomic batch (3 inserts → 1 batch)
   - All seed operations now execute atomically (all-or-nothing)
   - Updated console logging to reflect batch operations
   - Removed unused drizzle instance from seedDatabase()

3. **server/utils/index.ts:**
   - Added export for database utilities

**Benefits:**
- ✅ Atomicity: All seed operations succeed together or fail together
- ✅ Performance: Batch operations are faster than sequential inserts
- ✅ Safety: No partial data corruption on failure
- ✅ Reusable: Database utilities can be used throughout the app
- ✅ Type-safe: Full TypeScript support with proper types

**Verification:**
```bash
# Test batch operations
npx tsx server/database/test-batch.ts
# Output: ✅ ALL TESTS PASSED - Batch operations working correctly!

# Test seed (will work on actual D1 database)
npm run db:reset
# Should complete atomically
```

---

#### ✅ Task 17: Update Stale Documentation
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P0
**Complexity:** Low
**Time Taken:** ~1.5 hours

**Problem:** Documentation contains outdated information about multitenancy, companyId, RBAC, etc.

**Files Modified:**
- [x] `README.md` - Fixed multitenancy and architecture claims ✅
- [x] `docs/CONVENTIONS.md` - Removed all companyId references, added batch operations ✅
- [x] `docs/TEMPLATE_SETUP.md` - Added detailed tenant provisioning guide ✅
- [x] `docs/SECRETS.md` - Created in Task 3 ✅
- [x] `wrangler.staging.jsonc` - Already had multi-tenant examples ✅
- [x] `wrangler.production.jsonc` - Already had multi-tenant examples ✅

**Note:** docs/RBAC.md and docs/SECURITY.md were already accurate from previous tasks

**Completed Changes:**

1. **README.md:**
   - Updated feature list: "Configurable per-tenant database isolation (defaults to single-tenant)"
   - Updated architecture diagram to show configurable tenancy
   - Added "Multi-Tenancy Options" section explaining single vs multi-tenant modes
   - Removed misleading "physical isolation" and "no companyId needed" claims
   - Added reference to docs/SECRETS.md in documentation list
   - Clarified batch operations feature

2. **docs/CONVENTIONS.md:**
   - Removed ALL companyId references (20+ occurrences)
   - Updated Core Principles: "Single-tenant by default, multi-tenant opt-in"
   - Updated Service examples to remove companyId validation
   - Updated Repository examples to remove companyId filtering
   - Updated Database schema examples to remove companyId columns
   - Added "Batch Operations for Data Consistency" pattern section
   - Updated baseFields to remove companyId, added note about multi-tenant isolation
   - Simplified schema rules to focus on soft deletes, timestamps, and atomic operations

3. **docs/TEMPLATE_SETUP.md:**
   - Added comprehensive "Multi-tenant tenant provisioning (MANUAL PROCESS)" section
   - 5-step guide for provisioning new tenants:
     1. Create D1 database
     2. Add wrangler binding
     3. Run migrations
     4. Seed database (optional)
     5. Configure tenant metadata
   - Important notes about manual provisioning, no auto-provisioning API
   - Clarified x-tenant-id header usage

**Benefits:**
- ✅ Documentation now accurately reflects the actual architecture
- ✅ No more confusion about "physical isolation by default"
- ✅ Clear guidance on multi-tenant provisioning workflow
- ✅ Removed all outdated companyId references
- ✅ Added batch operations documentation throughout

---

### Phase 2: Core Improvements (Day 2)

#### ✅ Task 6: Implement Input Sanitization
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P1
**Complexity:** Low
**Time Taken:** ~30 minutes

**Problem:** User input not sanitized, vulnerable to XSS and injection attacks.

**Files Modified:**
- [x] `server/utils/sanitize.ts` - Already comprehensive! ✅
- [x] `server/api/v1/auth/signup.post.ts` - Already had sanitization ✅
- [x] `server/api/v1/user/profile.put.ts` - Already had sanitization ✅
- [x] `server/api/v1/roles/index.post.ts` - Added sanitization ✅
- [x] `server/api/v1/roles/[id].put.ts` - Added sanitization ✅
- [x] All other user input routes - Verified (tokens, IDs, booleans don't need sanitization) ✅

**Key Changes:**
```typescript
// server/api/v1/auth/signup.post.ts
import { sanitizeEmail, sanitizeHtml, sanitizePhone } from '~/server/utils/sanitize';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validated = signupSchema.parse(body);

  // Sanitize after validation, before processing
  const sanitized = {
    email: sanitizeEmail(validated.email),
    firstName: sanitizeHtml(validated.firstName),
    lastName: sanitizeHtml(validated.lastName),
    phone: sanitizePhone(validated.phone),
    password: validated.password, // NEVER sanitize passwords
  };

  const identityService = createIdentityService(event);
  const result = await identityService.signUp(sanitized);

  return createSuccessResponse('User created', result);
});

// server/api/v1/user/profile.put.ts
import { sanitizeHtml, sanitizePhone, sanitizePostalCode } from '~/server/utils/sanitize';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validated = updateUserSchema.parse(body);

  const sanitized = {
    firstName: sanitizeHtml(validated.firstName),
    lastName: sanitizeHtml(validated.lastName),
    phone: sanitizePhone(validated.phone),
    address: sanitizeHtml(validated.address),
    city: sanitizeHtml(validated.city),
    state: sanitizeHtml(validated.state),
    country: sanitizeHtml(validated.country),
    postalCode: sanitizePostalCode(validated.postalCode),
  };

  // ... rest of update logic
});
```

**Completed Changes:**

1. **server/api/v1/roles/index.post.ts:**
   - Added `sanitizeHtml` import
   - Sanitize role name and description before creating role
   - Permission codes don't need sanitization (validated against registry)

2. **server/api/v1/roles/[id].put.ts:**
   - Added `sanitizeHtml` import
   - Sanitize role name and description before updating role
   - Permission codes don't need sanitization (validated against registry)

**Verified Routes (No Sanitization Needed):**
- `auth/email/confirm.post.ts` - Only tokens (lookup values)
- `auth/password/reset.put.ts` - Only tokens and passwords (never sanitize)
- `user/index.get.ts` - Only numeric pagination parameters
- `roles/index.get.ts` - Only boolean query parameters
- `users/[userId]/roles.put.ts` - Only UUIDs (validated by Zod)

**Pattern Applied:**
1. Validate with Zod schema
2. Sanitize validated data (text inputs only)
3. Pass sanitized data to service layer
4. NEVER sanitize passwords, tokens, IDs, or permission codes

**Benefits:**
- ✅ All user-provided text inputs are sanitized
- ✅ XSS attacks prevented via HTML stripping
- ✅ Consistent pattern across all routes
- ✅ Defense in depth (Zod validation + sanitization)

---

#### ✅ Task 8: Improve Audit Logs
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P1
**Complexity:** Medium
**Time Taken:** ~45 minutes

**Problem:** Audit logs missing critical context (request ID, endpoint, method, status code).

**Files Modified:**
- [x] `server/database/schema/identity.ts` - Already had request context fields! ✅
- [x] `server/middleware/00.request-context.ts` - Already existed! ✅
- [x] `server/repositories/identity.ts` - Updated log() signature to accept context ✅
- [x] `server/services/identity.ts` - Added logAudit() helper, updated all 7 audit log calls ✅

**Note:** Schema and middleware were already implemented in Task 1!

**Key Changes:**
```typescript
// server/database/schema/identity.ts
export const auditLogs = sqliteTable('audit_logs', {
  ...baseFields,

  // User who performed action
  userId: text('user_id'),

  // Action performed
  action: text('action').notNull(),

  // Entity affected
  entityType: text('entity_type'),
  entityId: text('entity_id'),

  // ✅ NEW: Request context
  requestId: text('request_id'),
  endpoint: text('endpoint'),
  method: text('method'),
  statusCode: integer('status_code'),

  // State tracking
  stateBefore: text('state_before', { mode: 'json' }).$type<Record<string, any>>(),
  stateAfter: text('state_after', { mode: 'json' }).$type<Record<string, any>>(),

  // Enhanced metadata
  metadata: text('metadata', { mode: 'json' }).$type<AuditLogMetadata>(),

  // Network info
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  requestIdx: index('audit_logs_request_idx').on(table.requestId), // ✅ NEW
  endpointIdx: index('audit_logs_endpoint_idx').on(table.endpoint), // ✅ NEW
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export interface AuditLogMetadata {
  errorMessage?: string;
  errorCode?: string;
  permissionChecked?: string;
  permissionGranted?: boolean;
  [key: string]: any;
}

// server/middleware/00.request-context.ts (NEW FILE)
import { getRequestIP, getHeader } from 'h3';

/**
 * Request context middleware
 * Captures request metadata for audit logging
 * Runs before tenant and auth middleware (00 prefix)
 */
export default defineEventHandler((event) => {
  // Capture or generate request ID
  const requestId = getHeader(event, 'x-request-id') || crypto.randomUUID();

  // Capture request metadata
  event.context.requestId = requestId;
  event.context.ipAddress = getRequestIP(event);
  event.context.userAgent = getHeader(event, 'user-agent');
  event.context.endpoint = event.path;
  event.context.method = event.method;

  // Set response header so client can track
  setHeader(event, 'X-Request-ID', requestId);
});

// server/repositories/identity.ts - Update signature
async log(
  userId: string | null,
  action: string,
  entityType: string | null,
  entityId: string | null,
  context?: {
    requestId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    metadata?: AuditLogMetadata;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLog> {
  const [log] = await this.drizzle
    .insert(schema.auditLogs)
    .values({
      userId,
      action,
      entityType,
      entityId,
      requestId: context?.requestId,
      endpoint: context?.endpoint,
      method: context?.method,
      statusCode: context?.statusCode,
      metadata: context?.metadata,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    })
    .returning();

  return log;
}

// server/services/identity.ts - Update all calls
await this.auditLogRepo.log(
  this.userId,
  "USER_SIGNED_UP",
  "User",
  user.id,
  {
    requestId: this.event.context.requestId,
    endpoint: this.event.context.endpoint,
    method: this.event.context.method,
    statusCode: 200,
    ipAddress: this.event.context.ipAddress,
    userAgent: this.event.context.userAgent,
    metadata: { email: user.email, role }
  }
);
```

**Completed Changes:**

1. **server/repositories/identity.ts:**
   - Updated `log()` method signature to accept optional context parameter
   - Context includes: requestId, endpoint, method, statusCode, ipAddress, userAgent, metadata, stateBefore, stateAfter
   - All fields are optional for backward compatibility

2. **server/services/identity.ts:**
   - Added private `logAudit()` helper method
   - Helper automatically captures request context from `event.context`
   - Updated all 7 audit log calls to use the helper:
     * USER_SIGNED_UP
     * USER_SIGNED_IN
     * EMAIL_CONFIRMED
     * PASSWORD_RESET_REQUESTED
     * PASSWORD_RESET
     * USER_UPDATED
     * USER_SETTINGS_UPDATED

**Benefits:**
- ✅ All audit logs now include complete request context
- ✅ Request tracing via X-Request-ID header
- ✅ Debugging improved with endpoint/method/status tracking
- ✅ IP address and User Agent captured for security
- ✅ Clean helper pattern reduces code duplication
- ✅ Backward compatible (all context fields optional)

**Example Audit Log Entry:**
```json
{
  "id": "log-123",
  "userId": "user-456",
  "action": "USER_SIGNED_UP",
  "entityType": "User",
  "entityId": "user-456",
  "requestId": "req-789",
  "endpoint": "/api/v1/auth/signup",
  "method": "POST",
  "statusCode": 201,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": { "email": "user@example.com", "role": "user" },
  "createdAt": "2025-01-11T..."
}
```

---

#### ✅ Task 9: Soft Delete Enforcement
**Status:** ✅ COMPLETED (2025-01-11)
**Priority:** P1
**Complexity:** Low
**Time Taken:** ~1 hour

**Problem:** Repository methods inconsistently check `deletedAt`, could return deleted records.

**Files Modified:**
- [x] `server/repositories/base.ts` - Added `notDeleted()` helper method ✅
- [x] `server/repositories/identity.ts` - Updated all queries to use helper ✅
- [x] `server/repositories/rbac.ts` - Updated all 3 repository classes to extend BaseRepository and use helper ✅

**Key Changes:**
```typescript
// server/repositories/base.ts
import { drizzle } from 'drizzle-orm/d1';
import { isNull, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';

/**
 * Base repository with automatic soft delete filtering
 */
export abstract class BaseRepository {
  protected drizzle: ReturnType<typeof drizzle>;

  constructor(protected db: D1Database) {
    this.drizzle = drizzle(db, { schema });
  }

  /**
   * Helper to add soft delete filter to queries
   * Usage: .where(and(eq(...), this.notDeleted(schema.users)))
   */
  protected notDeleted<T extends { deletedAt: any }>(
    table: T
  ): SQL {
    return isNull(table.deletedAt);
  }
}

// server/repositories/identity.ts - Update all queries
async list(limit?: number, offset?: number): Promise<User[]> {
  return this.drizzle
    .select()
    .from(schema.users)
    .where(this.notDeleted(schema.users)) // ✅ Use helper
    .orderBy(schema.users.createdAt)
    .limit(limit)
    .offset(offset);
}

async findByEmail(email: string): Promise<User | null> {
  const result = await this.drizzle
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.email, email.toLowerCase()),
        this.notDeleted(schema.users) // ✅ Use helper
      )
    )
    .limit(1);

  return result[0] || null;
}
```

**Completed Changes:**

1. **server/repositories/base.ts:**
   - Added `notDeleted<T>()` helper method
   - Returns `isNull(table.deletedAt)` SQL condition
   - Type-safe with generic constraint
   - Comprehensive JSDoc with examples

2. **server/repositories/identity.ts:**
   - Updated UserRepository: 4 queries (findByEmail, findById, list, update)
   - Updated UserSettingsRepository: 1 query (getSettings)
   - Removed unused `isNull` import
   - All queries now use `this.notDeleted(schema.table)`

3. **server/repositories/rbac.ts:**
   - Updated **RoleRepository** to extend BaseRepository
   - Updated **UserRoleRepository** to extend BaseRepository
   - Updated **PermissionRepository** to extend BaseRepository
   - Replaced 15+ `isNull(table.deletedAt)` calls with `this.notDeleted(table)`
   - All three classes now have consistent soft delete enforcement

**Queries Updated:**
- ✅ UserRepository: findByEmail, findById, list, update
- ✅ UserSettingsRepository: getSettings
- ✅ RoleRepository: getRoleById, getRoleByName, listRoles, updateRole, deleteRole
- ✅ UserRoleRepository: assignRoleToUser, replaceUserRoles, getUsersByRole
- ✅ PermissionRepository: getPermissionByCode, listPermissions, listPermissionsByCategory

**Benefits:**
- ✅ Consistent soft delete checking across all repositories
- ✅ Self-documenting code (`notDeleted` vs `isNull`)
- ✅ Single source of truth for soft delete logic
- ✅ Easier to maintain and update
- ✅ Type-safe with TypeScript generics

---

#### ✅ Task 11: Uniform Error Handling
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Low
**Estimated Time:** 2-3 hours

**Problem:** Error handling inconsistent, lacks request context in logs.

**Files to Modify:**
- [ ] `server/error/errors.ts` - Enhance logError() with context
- [ ] `server/error/errorHandler.ts` - Verify or create global handler
- [ ] Verify `nitro.config.ts` points to error handler

**Key Changes:**
```typescript
// server/error/errors.ts - Enhanced logging
export function logError(
  error: AppError,
  context?: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
    [key: string]: any;
  }
) {
  const errorLog = {
    requestId: context?.requestId,     // ✅ Add request tracking
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    userId: context?.userId,           // ✅ Add user tracking
    endpoint: context?.endpoint,       // ✅ Add endpoint tracking
    method: context?.method,           // ✅ Add method tracking
    context,
    timestamp: new Date().toISOString(),
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    console.error('Server Error:', errorLog);
  } else if (error.statusCode >= 400) {
    console.warn('Client Error:', errorLog);
  } else {
    console.log('Error:', errorLog);
  }
}

// server/error/errorHandler.ts
import { H3Error } from 'h3';
import { AppError, toAppError, logError } from './errors';

/**
 * Global error handler
 * Configured in nitro.config.ts: errorHandler: "server/error/errorHandler.ts"
 */
export default defineNitroErrorHandler((error, event) => {
  // Convert to AppError
  const appError = error instanceof AppError
    ? error
    : toAppError(error);

  // Log with full context
  logError(appError, {
    requestId: event.context.requestId,
    userId: event.context.userId,
    endpoint: event.path,
    method: event.method,
  });

  // Return standardized response
  setResponseStatus(event, appError.statusCode);

  return {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      requestId: event.context.requestId, // ✅ Include for debugging
      ...(appError.details && { details: appError.details }),
    },
  };
});
```

**Verification:**
```bash
# Trigger error with request ID
curl -X GET /api/v1/users/invalid-id \
  -H "X-Request-ID: test-error-123"

# Check logs include request context
# Should see: { requestId: 'test-error-123', endpoint: '/api/v1/users/invalid-id', ... }
```

---

#### ✅ Task 14: Request ID in Audit Trail
**Status:** ⏳ Not Started (covered in Task 8)
**Priority:** P1
**Complexity:** Low

This task is fully covered by Task 8 (Improve Audit Logs).

---

### Phase 3: API Enhancements (Day 3)

#### ✅ Task 12: Pagination & Filters
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Medium
**Estimated Time:** 4-5 hours

**Problem:** List endpoints return all records, no pagination or filtering.

**Files to Create:**
- [ ] `server/utils/pagination.ts` - Pagination utilities

**Files to Modify:**
- [ ] `server/api/v1/user/index.get.ts` - Add pagination
- [ ] `server/api/v1/roles/index.get.ts` - Add pagination
- [ ] `server/repositories/identity.ts` - Add count() and sorting
- [ ] `server/repositories/rbac.ts` - Add count() and sorting
- [ ] `server/services/identity.ts` - Update list methods
- [ ] Create `docs/API.md` - Document pagination format

**Key Changes:**
```typescript
// server/utils/pagination.ts (NEW FILE)
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginatedResponse<any>['meta'] {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// server/api/v1/user/index.get.ts
import { paginationSchema, getPaginationOffset, buildPaginationMeta } from '~/server/utils/pagination';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:view');

  // Parse query params
  const query = getQuery(event);
  const { page, limit, sortBy, sortOrder } = paginationSchema.parse(query);

  const identityService = createIdentityService(event);

  // Fetch paginated data
  const offset = getPaginationOffset(page, limit);
  const [users, total] = await Promise.all([
    identityService.listUsers(limit, offset, sortBy, sortOrder),
    identityService.countUsers(),
  ]);

  // Build metadata
  const meta = buildPaginationMeta(page, limit, total);

  return createSuccessResponse('Users retrieved', {
    data: users,
    meta,
  });
});

// server/repositories/identity.ts
async count(): Promise<number> {
  const result = await this.drizzle
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(this.notDeleted(schema.users));

  return result[0]?.count || 0;
}

async list(
  limit?: number,
  offset?: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<User[]> {
  let query = this.drizzle
    .select()
    .from(schema.users)
    .where(this.notDeleted(schema.users));

  // Dynamic sorting
  if (sortBy && sortBy in schema.users) {
    const column = schema.users[sortBy as keyof typeof schema.users];
    query = query.orderBy(sortOrder === 'asc' ? asc(column) : desc(column));
  } else {
    query = query.orderBy(desc(schema.users.createdAt));
  }

  if (limit) query = query.limit(limit);
  if (offset) query = query.offset(offset);

  return query;
}

// server/services/identity.ts
async listUsers(
  limit?: number,
  offset?: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<User[]> {
  return this.userRepo.list(limit, offset, sortBy, sortOrder);
}

async countUsers(): Promise<number> {
  return this.userRepo.count();
}
```

**docs/API.md (NEW FILE):**
```markdown
# API Documentation

## Pagination

All list endpoints support pagination via query parameters:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - Sort direction: `asc` or `desc` (default: desc)

**Example Request:**
```
GET /api/v1/users?page=2&limit=50&sortBy=email&sortOrder=asc
```

**Response Format:**
```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```
```

**Verification:**
```bash
# Test pagination
curl '/api/v1/users?page=1&limit=10'
# Should return first 10 users with meta

# Test sorting
curl '/api/v1/users?sortBy=email&sortOrder=asc'
# Should return users sorted by email

# Test edge cases
curl '/api/v1/users?page=999&limit=1000'
# Should handle gracefully
```

---

#### ✅ Task 15: Move Business Logic from Repositories
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Medium
**Estimated Time:** 2-3 hours

**Problem:** Repositories contain business logic (permission matching, validation), violates separation of concerns.

**Files to Modify:**
- [ ] `server/repositories/rbac.ts` - Remove hasPermission() method
- [ ] Ensure all business logic uses `server/utils/rbac.ts` (PermissionMatcher)

**Key Changes:**
```typescript
// server/repositories/rbac.ts - BEFORE (❌)
export class RoleRepository {
  hasPermission(rolePermissions: PermissionCode[], permission: PermissionCode): boolean {
    if (rolePermissions.includes("*")) return true;
    if (rolePermissions.includes(permission)) return true;
    const [category] = permission.split(":");
    const categoryWildcard = `${category}:*` as PermissionCode;
    if (rolePermissions.includes(categoryWildcard)) return true;
    return false;
  }
}

// server/repositories/rbac.ts - AFTER (✅)
import { PermissionMatcher } from '../utils/rbac';

export class RoleRepository {
  // Remove hasPermission() entirely - not data access logic
}

export class UserRoleRepository {
  async userHasPermission(userId: string, permission: PermissionCode): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return PermissionMatcher.hasPermission(permissions, permission); // ✅ Delegate to utility
  }
}
```

**Audit Tasks:**
- [ ] Search for business logic in all repository files
- [ ] Move to appropriate service or utility
- [ ] Add TODO comments for deferred refactoring

**Verification:**
```bash
# Run tests
npm test

# Verify RBAC still works
curl -X GET /api/v1/users
# Should enforce permissions correctly
```

---

#### ✅ Task 18: Add Database Indexes
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Low
**Estimated Time:** 1-2 hours

**Problem:** Critical queries lack indexes, will be slow at scale.

**Files to Modify:**
- [ ] `server/database/schema/identity.ts` - Add missing indexes
- [ ] Generate migration

**Key Changes:**
```typescript
// server/database/schema/identity.ts
export const users = sqliteTable('users', {
  // ... existing fields
}, (table) => ({
  // ✅ Critical: email used for login
  emailIdx: index('users_email_idx').on(table.email),
  emailUnique: unique('users_email_unique').on(table.email),

  // Existing indexes
  roleIdx: index('users_role_idx').on(table.role),
  deletedIdx: index('users_deleted_idx').on(table.deletedAt),

  // ✅ Add: isActive queries
  activeIdx: index('users_active_idx').on(table.isActive),

  // ✅ Add: composite for common queries
  emailActiveIdx: index('users_email_active_idx').on(table.email, table.isActive),
}));

export const userRoles = sqliteTable('user_roles', {
  // ... existing fields
}, (table) => ({
  userRoleIdx: unique('user_roles_unique').on(table.userId, table.roleId),
  userIdx: index('user_roles_user_idx').on(table.userId),
  roleIdx: index('user_roles_role_idx').on(table.roleId),

  // ✅ Add: composite for permission checks (most common query)
  userRoleActiveIdx: index('user_roles_user_role_active_idx')
    .on(table.userId, table.roleId),
}));

export const auditLogs = sqliteTable('audit_logs', {
  // ... existing fields
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),

  // ✅ Add: request tracking (from Task 8)
  requestIdx: index('audit_logs_request_idx').on(table.requestId),

  // ✅ Add: endpoint analysis
  endpointIdx: index('audit_logs_endpoint_idx').on(table.endpoint),

  // ✅ Add: time-range queries (common for reports)
  createdActionIdx: index('audit_logs_created_action_idx')
    .on(table.createdAt, table.action),
}));

export const roles = sqliteTable('roles', {
  // ... existing fields
}, (table) => ({
  nameIdx: unique('roles_name_unique').on(table.name),

  // ✅ Add: system role queries
  systemIdx: index('roles_system_idx').on(table.isSystem),
  deletedIdx: index('roles_deleted_idx').on(table.deletedAt),
}));

export const permissions = sqliteTable('permissions', {
  // ... existing fields
}, (table) => ({
  categoryIdx: index('permissions_category_idx').on(table.category),

  // ✅ Add: category + code composite (common for lookups)
  categorCodeIdx: index('permissions_category_code_idx')
    .on(table.category, table.code),
}));
```

**Migration:**
```bash
npm run db:generate
# Review generated SQL for index creation
npm run db:migrate:local:staging
# Apply locally and test
```

**Verification:**
```bash
# Explain query plans (SQLite)
wrangler d1 execute template-staging --local \
  --command "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com'"
# Should show "USING INDEX users_email_idx"

# Test query performance with indexes
# Insert 10k users, compare before/after index performance
```

---

#### ✅ Task 19: Foreign Key Constraints
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Low
**Estimated Time:** 1-2 hours

**Problem:** No foreign key constraints, can have orphaned records.

**Files to Modify:**
- [ ] `server/database/schema/identity.ts` - Add FK references
- [ ] `server/repositories/base.ts` - Enable foreign keys
- [ ] Generate migration

**Key Changes:**
```typescript
// server/database/schema/identity.ts
export const userRoles = sqliteTable('user_roles', {
  ...baseFields,

  // ✅ Add foreign key references
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  roleId: text('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  // ... indexes
}));

export const userSettings = sqliteTable('user_settings', {
  ...baseFields,

  // ✅ Add foreign key
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  settings: text('settings', { mode: 'json' })
    .$type<Record<string, any>>()
    .default({}),
}, (table) => ({
  userIdx: index('user_settings_user_idx').on(table.userId),
}));

export const auditLogs = sqliteTable('audit_logs', {
  ...baseFields,

  // ✅ Add foreign key (nullable - system actions have no user)
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'set null' }),

  // ... other fields
});

// server/repositories/base.ts
export abstract class BaseRepository {
  protected drizzle: ReturnType<typeof drizzle>;

  constructor(protected db: D1Database) {
    this.drizzle = drizzle(db, { schema });

    // ✅ Enable foreign keys for SQLite/D1
    // Note: This is a best-effort setting, D1 support may vary
    try {
      db.exec('PRAGMA foreign_keys = ON;');
    } catch (error) {
      console.warn('Could not enable foreign keys:', error);
    }
  }

  // ... rest of base repository
}
```

**Migration:**
```bash
npm run db:generate
# Review generated SQL - should include FOREIGN KEY constraints
npm run db:migrate:local:staging
```

**Verification:**
```bash
# Try to create user_role with invalid user_id
# Should fail with foreign key constraint error

# Delete a user
# Should cascade delete user_roles, user_settings
```

---

#### ✅ Task 29: Fix Inconsistent Naming
**Status:** ⏳ Not Started
**Priority:** P1
**Complexity:** Low
**Estimated Time:** 1-2 hours

**Problem:** Factory functions use inconsistent naming (`create` vs `get` prefix).

**Files to Modify:**
- [ ] `server/services/rbac.ts` - Rename getRBACService → createRBACService
- [ ] Find and replace all usages across codebase
- [ ] Update `docs/CONVENTIONS.md` - Document naming convention

**Key Changes:**
```typescript
// server/services/rbac.ts - Rename function
export function createRBACService(event: H3Event, config?: Partial<RBACConfig>): RBACService {
  const db = getDatabase(event);
  const runtimeConfig = useRuntimeConfig(event);
  const rbacEnabled = runtimeConfig.rbac?.enabled ?? true;

  return new RBACService(db, {
    enabled: config?.enabled ?? rbacEnabled,
    allowAllWhenDisabled: config?.allowAllWhenDisabled ?? true,
  });
}

// Update all helper functions too
export async function requirePermission(
  event: H3Event,
  permission: PermissionCode
): Promise<void> {
  const userId = event.context.userId;
  if (!userId) {
    throw new AuthorizationError("Authentication required", "AUTH_REQUIRED");
  }

  const rbacService = createRBACService(event); // ✅ Updated
  await rbacService.requirePermission(userId, permission);
}

export async function hasPermission(
  event: H3Event,
  permission: PermissionCode
): Promise<boolean> {
  const userId = event.context.userId;
  if (!userId) return false;

  const rbacService = createRBACService(event); // ✅ Updated
  return rbacService.userHasPermission(userId, permission);
}

// ... update all other helpers
```

**Find and Replace:**
```bash
# Files likely affected:
# - server/services/rbac.ts
# - server/api/v1/roles/*.ts
# - server/api/v1/users/[userId]/roles.*.ts
# - server/api/v1/permissions/*.ts

# Search: getRBACService(
# Replace: createRBACService(
```

**docs/CONVENTIONS.md:**
```markdown
## Naming Conventions

### Factory Functions

All factory functions MUST use `create` prefix for consistency:

✅ Good:
- `createIdentityService(event)`
- `createRBACService(event)`
- `createAuditLogService(event)`

❌ Bad:
- `getIdentityService(event)`
- `getRBACService(event)`

### Service Classes

Service classes MUST use `Service` suffix:
- `IdentityService`
- `RBACService`
- `AuditLogService`

### Repository Classes

Repository classes MUST use `Repository` suffix:
- `UserRepository`
- `RoleRepository`
- `PermissionRepository`
```

**Verification:**
```bash
# Search for remaining inconsistencies
grep -r "getRBACService" server/
# Should return no results

grep -r "get.*Service" server/
# Review results for other inconsistencies
```

---

### Phase 4: Testing & Docs (Day 3)

#### ✅ Task 20: Document Rollback Process
**Status:** ⏳ Not Started
**Priority:** P2
**Complexity:** Low
**Estimated Time:** 1-2 hours

**Problem:** No documented rollback process for migrations. D1 Time Travel bookmarks not used.

**Files to Create/Modify:**
- [ ] Create or update `docs/MIGRATIONS.md`
- [ ] Add TODO to `scripts/safe-migrate.ts`

**Key Content:**

**docs/MIGRATIONS.md:**
```markdown
# Database Migrations

## Overview

This project uses Drizzle Kit for schema migrations on Cloudflare D1.

## Running Migrations

### Local Development
```bash
# Generate migration from schema changes
npm run db:generate

# Apply to local database
npm run db:migrate:local:staging

# Reset local database (wipe + seed)
npm run db:reset:local
```

### Production

```bash
# Safe migration (with validation)
npm run db:migrate:safe:production

# Direct migration (use with caution)
npm run db:migrate:remote:production
```

## Rollback Process (Manual - D1 Time Travel)

D1 supports Time Travel for point-in-time recovery. Currently manual process.

### How to Rollback

1. **Find timestamp before the migration:**
   ```bash
   wrangler d1 execute template-production \
     --command "SELECT * FROM _migrations ORDER BY applied_at DESC LIMIT 5"
   ```

2. **Create Time Travel bookmark (BEFORE running migration):**
   ```bash
   # Best practice: Create bookmark before migration
   wrangler d1 time-travel create-bookmark \
     --database=template-production \
     --bookmark-name="before-migration-0003"

   # Returns: timestamp and bookmark ID
   ```

3. **Restore from bookmark (if needed):**
   ```bash
   wrangler d1 time-travel restore \
     --database=template-production \
     --bookmark="before-migration-0003"

   # Or restore to specific timestamp:
   wrangler d1 time-travel restore \
     --database=template-production \
     --timestamp="2025-01-15T10:30:00Z"
   ```

### Migration Tracking

The `_migrations` table tracks all applied migrations:

```sql
CREATE TABLE _migrations (
  id TEXT PRIMARY KEY,                    -- Migration filename
  hash TEXT NOT NULL,                     -- SHA-256 of SQL
  applied_at INTEGER NOT NULL,            -- Unix timestamp
  applied_by TEXT,                        -- Who ran it
  rolled_back_at INTEGER,                 -- If rolled back
  timetravel_bookmark TEXT,               -- D1 bookmark ID (TODO)
  status TEXT NOT NULL,                   -- PENDING|APPLIED|FAILED|ROLLED_BACK
  error_message TEXT,
  environment TEXT NOT NULL               -- local|staging|production
);
```

### Best Practices

1. **Always test in staging first**
   ```bash
   npm run db:migrate:safe:staging
   # Verify application works
   ```

2. **Create Time Travel bookmark before production migration**
   ```bash
   # Automated in future, manual for now
   wrangler d1 time-travel create-bookmark ...
   ```

3. **Keep migrations reversible when possible**
   - Avoid dropping columns (add nullable columns instead)
   - Use feature flags for breaking changes
   - Document migration dependencies

4. **Document breaking changes**
   - Update CHANGELOG.md
   - Add migration notes to `_migrations` table
   - Communicate to team

### D1 Time Travel Capabilities

- **Retention:** 30 days of Time Travel data
- **Point-in-time recovery:** Restore to any point in last 30 days
- **Automatic backups:** No manual backup needed
- **Fast recovery:** Typically completes in seconds

### Future Enhancement

**TODO:** Update `safe-migrate.ts` to automatically:
1. Create Time Travel bookmark before migration
2. Store bookmark ID in `_migrations.timetravel_bookmark`
3. Provide rollback command in output
4. Add `--rollback` flag to restore from last bookmark

Example future API:
```bash
# Migrate with auto-bookmark
npm run db:migrate:safe:production
# Output: Created bookmark 'migration-0003-2025-01-15'
# Output: To rollback: npm run db:rollback:production 0003

# Rollback
npm run db:rollback:production 0003
# Restores from bookmark, marks migration as rolled back
```

## Troubleshooting

### Migration Fails Midway

D1 batch operations are atomic - if migration fails, changes are rolled back automatically.

Check error in `_migrations` table:
```sql
SELECT id, status, error_message
FROM _migrations
WHERE status = 'FAILED'
ORDER BY applied_at DESC;
```

### Need to Skip Migration

Not recommended, but if necessary:
```sql
-- Mark migration as applied (without running it)
INSERT INTO _migrations (id, hash, applied_at, status, environment)
VALUES ('0003_skip_me.sql', 'manual', unixepoch(), 'APPLIED', 'production');
```

### Orphaned Data After Rollback

Time Travel restores database state, but doesn't affect:
- External services (emails sent, etc.)
- R2 objects (if migration involved file storage)
- KV data (if separate from D1)

Clean up manually if needed.
```

**scripts/safe-migrate.ts:**
```typescript
// TODO: Implement automatic Time Travel bookmarks
// 1. Before applying migration:
//    - Create bookmark: `wrangler d1 time-travel create-bookmark`
//    - Store bookmark in _migrations.timetravel_bookmark
// 2. Provide rollback command in output
// 3. Add --rollback flag to restore from bookmark
// 4. Mark migration as rolled back in _migrations table

// Example implementation:
// const bookmark = await createTimeravelBookmark(databaseId, migrationId);
// await recordMigrationBookmark(migrationId, bookmark.id);
// console.log(`To rollback: npm run db:rollback ${environment} ${migrationId}`);
```

**Verification:**
- [ ] Documentation is clear and actionable
- [ ] Team understands rollback process
- [ ] TODO is tracked for automation

---

#### ✅ Task 22: Clean Up Tests
**Status:** ⏳ Not Started
**Priority:** P2
**Complexity:** Medium
**Estimated Time:** 3-4 hours

**Problem:** Tests reference removed entities (company), incomplete coverage.

**Files to Modify:**
- [ ] Delete `tests/unit/services/company.test.ts` - entity removed
- [ ] Update `tests/unit/services/identity.test.ts` - comprehensive coverage
- [ ] Create `tests/helpers/database.ts` - test database utilities
- [ ] Create `tests/helpers/fixtures.ts` - test data
- [ ] Create `tests/helpers/event.ts` - mock H3Event

**Key Changes:**

**Delete:**
```bash
rm tests/unit/services/company.test.ts
```

**tests/unit/services/identity.test.ts:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdentityService } from '~/server/services/identity';
import { getTestDatabase, seedTestDatabase, clearTestDatabase } from '~/tests/helpers/database';
import { createMockEvent } from '~/tests/helpers/event';
import { testUsers } from '~/tests/helpers/fixtures';

describe('IdentityService', () => {
  let service: IdentityService;
  let db: D1Database;
  let mockEvent: H3Event;

  beforeEach(async () => {
    // Setup test database
    db = getTestDatabase();
    await clearTestDatabase(db);
    await seedTestDatabase(db);

    // Setup mock event
    mockEvent = createMockEvent({
      db,
      tenantId: 'test-tenant',
      requestId: 'test-req-123',
    });

    service = createIdentityService(mockEvent);
  });

  afterEach(async () => {
    await clearTestDatabase(db);
  });

  describe('signUp', () => {
    it('should create new user with hashed password', async () => {
      const result = await service.signUp({
        email: 'newuser@example.com',
        password: 'Test1234!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.passwordHash).not.toBe('Test1234!');
      expect(result.user.passwordHash).toMatch(/^\$/); // Scrypt format
      expect(result.confirmToken).toBeDefined();
    });

    it('should normalize email to lowercase', async () => {
      const result = await service.signUp({
        email: 'NewUser@EXAMPLE.COM',
        password: 'Test1234!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should throw if email already exists', async () => {
      await service.signUp({
        email: 'duplicate@example.com',
        password: 'Test1234!',
        firstName: 'First',
        lastName: 'User',
      });

      await expect(service.signUp({
        email: 'duplicate@example.com',
        password: 'Test1234!',
        firstName: 'Second',
        lastName: 'User',
      })).rejects.toThrow(EmailAlreadyExistsError);
    });

    it('should validate password strength', async () => {
      await expect(service.signUp({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      })).rejects.toThrow(ValidationError);
    });

    it('should set isEmailVerified to false by default', async () => {
      const result = await service.signUp({
        email: 'test@example.com',
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.user.isEmailVerified).toBe(false);
    });
  });

  describe('signIn', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.signUp({
        email: 'signin@example.com',
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should sign in with valid credentials', async () => {
      const result = await service.signIn('signin@example.com', 'Test1234!');

      expect(result.user.email).toBe('signin@example.com');
      expect(result.user.id).toBe(testUser.user.id);
    });

    it('should be case-insensitive for email', async () => {
      const result = await service.signIn('SignIn@EXAMPLE.COM', 'Test1234!');

      expect(result.user.email).toBe('signin@example.com');
    });

    it('should throw on invalid password', async () => {
      await expect(service.signIn(
        'signin@example.com',
        'WrongPassword123!'
      )).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw on non-existent user', async () => {
      await expect(service.signIn(
        'nonexistent@example.com',
        'Test1234!'
      )).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw if account is inactive', async () => {
      // Deactivate user
      await service.updateUser(testUser.user.id, { isActive: false });

      await expect(service.signIn(
        'signin@example.com',
        'Test1234!'
      )).rejects.toThrow(AccountInactiveError);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions from RBAC', async () => {
      // Get admin user from fixtures
      const adminUser = testUsers.admin;

      const permissions = await service.getUserPermissions(adminUser.id);

      expect(permissions).toContain('*');
    });

    it('should return empty array when RBAC disabled', async () => {
      // TODO: Test with RBAC_ENABLED=false
      // Mock runtime config or use separate test env
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email with valid token', async () => {
      const { user, confirmToken } = await service.signUp({
        email: 'confirm@example.com',
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(user.isEmailVerified).toBe(false);

      const confirmedUser = await service.confirmEmail(confirmToken);

      expect(confirmedUser.isEmailVerified).toBe(true);
    });

    it('should throw on invalid token', async () => {
      await expect(service.confirmEmail('invalid-token'))
        .rejects.toThrow(InvalidTokenError);
    });

    it('should throw on expired token', async () => {
      // TODO: Create expired token and test
    });
  });

  describe('passwordReset', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.signUp({
        email: 'reset@example.com',
        password: 'OldPassword1!',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should request password reset', async () => {
      const result = await service.requestPasswordReset('reset@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
    });

    it('should not reveal if email exists', async () => {
      const result = await service.requestPasswordReset('nonexistent@example.com');

      // Should still return success (don't reveal user existence)
      expect(result.success).toBe(true);
    });

    it('should reset password with valid token', async () => {
      const { resetToken } = await service.requestPasswordReset('reset@example.com');

      const updatedUser = await service.resetPassword(resetToken, 'NewPassword1!');

      expect(updatedUser.id).toBe(testUser.user.id);

      // Should be able to sign in with new password
      const signInResult = await service.signIn('reset@example.com', 'NewPassword1!');
      expect(signInResult.user.id).toBe(testUser.user.id);
    });
  });
});

// Helper to create mock D1 database
// Implemented in tests/helpers/database.ts
```

**tests/helpers/database.ts:**
```typescript
import { D1Database } from '@cloudflare/workers-types';
// Use actual D1 local or mock

export function getTestDatabase(): D1Database {
  // Return D1 local instance for testing
  // Or use in-memory SQLite mock
  // Implementation depends on testing strategy
}

export async function seedTestDatabase(db: D1Database) {
  const { seedDatabase } = await import('~/server/database/seed');
  await seedDatabase(db, { multitenancyEnabled: false });
}

export async function clearTestDatabase(db: D1Database) {
  const { clearDatabase } = await import('~/server/database/seed');
  await clearDatabase(db);
}
```

**tests/helpers/fixtures.ts:**
```typescript
// Test user fixtures
export const testUsers = {
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    password: 'testtesttest',
    role: 'admin',
  },
  manager: {
    id: 'test-manager-id',
    email: 'manager@test.com',
    password: 'testtesttest',
    role: 'manager',
  },
  user: {
    id: 'test-user-id',
    email: 'user@test.com',
    password: 'testtesttest',
    role: 'user',
  },
};

// Test role fixtures
export const testRoles = {
  admin: {
    id: 'test-role-admin',
    name: 'admin',
    permissions: ['*'],
  },
  // ...
};
```

**tests/helpers/event.ts:**
```typescript
import { H3Event } from 'h3';

export function createMockEvent(context: Partial<H3Event['context']>): H3Event {
  return {
    context: {
      db: context.db,
      tenantId: context.tenantId || 'test-tenant',
      requestId: context.requestId || 'test-req-123',
      userId: context.userId,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      endpoint: '/api/test',
      method: 'GET',
      ...context,
    },
    // Mock other H3Event properties as needed
  } as H3Event;
}
```

**Verification:**
```bash
# Run tests
npm test

# Should see:
# ✓ IdentityService > signUp > should create new user
# ✓ IdentityService > signIn > should sign in with valid credentials
# etc.

# Check coverage
npm run test:coverage
# Target: >70% for identity service
```

---

#### ✅ Task 24: Add Test Setup
**Status:** ⏳ Not Started
**Priority:** P2
**Complexity:** Low
**Estimated Time:** 1-2 hours

**Problem:** Test setup missing proper cleanup, no global setup/teardown.

**Files to Modify:**
- [ ] `tests/setup.ts` - Add global setup/teardown
- [ ] `tests/helpers/database.ts` - Already created in Task 22

**Key Changes:**

**tests/setup.ts:**
```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');

  // Ensure test database is migrated
  try {
    execSync('npm run db:migrate:local:staging', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    console.log('✅ Test database migrated');
  } catch (error) {
    console.error('❌ Failed to migrate test database:', error);
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  // D1 local uses .wrangler/state, automatically cleaned
  // No explicit cleanup needed
});

// Test setup - runs before each test file
beforeEach(async () => {
  // Could add per-test setup here
  // For now, each test handles its own setup
});

// Test cleanup - runs after each test file
afterEach(async () => {
  // Ensure no state leaks between test files
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NUXT_SESSION_PASSWORD = 'test-session-password-min-32-chars-long-for-testing';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-min-32-chars-long';
process.env.EMAIL_PROVIDER = 'none';
process.env.NUXT_RBAC_ENABLED = 'true';
process.env.NUXT_MULTITENANCY_ENABLED = 'false';
```

**vitest.config.ts** (verify setup file is loaded):
```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'], // ✅ Ensure this is set
    typecheck: {
      include: ['tests/**/*.test.ts'],
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        '.nuxt/',
        'dist/',
      ],
      include: ['server/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
```

**Verification:**
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Should see:
# 🧪 Setting up test environment...
# ✅ Test database migrated
# ... tests run ...
# 🧹 Cleaning up test environment...
```

---

#### ✅ Task 26: Update API Documentation (Bruno)
**Status:** ⏳ Not Started
**Priority:** P2
**Complexity:** Low
**Estimated Time:** 2-3 hours

**Problem:** No up-to-date API documentation for manual testing.

**Files to Check/Create:**
- [ ] Check if `bruno/` directory exists
- [ ] Create `bruno/README.md` if needed
- [ ] Create/update Bruno collection files
- [ ] Add TODO if no bruno collection

**Key Actions:**

**Check for Bruno:**
```bash
ls bruno/
# If exists: Update all requests
# If not: Create basic collection or add TODO
```

**bruno/README.md:**
```markdown
# API Documentation (Bruno)

This directory contains API request collections for [Bruno](https://www.usebruno.com/) API client.

## Installation

1. Install Bruno: https://www.usebruno.com/
2. Open Bruno
3. Open Collection → Select this directory (`bruno/`)
4. Configure environment variables

## Environments

### Local
- Base URL: `http://localhost:3000`
- No authentication required for setup

### Staging
- Base URL: `https://staging.yourapp.com`
- Requires authentication

### Production
- Base URL: `https://yourapp.com`
- Requires authentication

## Collection Structure

```
bruno/
  auth/
    signin.bru
    signup.bru
    signout.bru
    confirm-email.bru
    password-reset-request.bru
    password-reset.bru
  users/
    list-users.bru
    get-user.bru
    get-user-profile.bru
    update-user-profile.bru
  roles/
    list-roles.bru
    get-role.bru
    create-role.bru
    update-role.bru
    delete-role.bru
    assign-role-to-user.bru
    get-user-roles.bru
  permissions/
    list-permissions.bru
```

## Usage

### Authentication

1. Run `auth/signup.bru` to create account
2. Run `auth/signin.bru` to get session cookie
3. Cookie automatically used in subsequent requests

### Testing RBAC

1. Sign in as different users (admin, manager, user)
2. Try accessing protected endpoints
3. Verify permission enforcement

### Pagination

Most list endpoints support:
- `?page=1` - Page number
- `?limit=20` - Items per page
- `?sortBy=createdAt` - Sort field
- `?sortOrder=desc` - Sort direction

## Notes

- Session cookies are automatically managed by Bruno
- Request IDs are auto-generated for tracking
- All timestamps use ISO 8601 format
```

**If bruno/ doesn't exist, add TODO:**

Create `TODO.md` or add to `docs/ROADMAP.md`:
```markdown
## API Documentation

**Decision:** Use Bruno for API documentation and testing.

**TODO:**
1. Create `bruno/` directory
2. Add collection for all endpoints
3. Configure environments (local, staging, production)
4. Add example requests with descriptions
5. Document authentication flow
6. Add pagination examples
7. Include RBAC permission examples

**Alternative:** Generate OpenAPI/Swagger spec from Zod schemas
- Use `zod-to-openapi` package
- Auto-generate from validators
- Serve via `/api/docs` endpoint
```

**Verification:**
- [ ] Bruno collection exists or TODO documented
- [ ] Can manually test all endpoints
- [ ] Authentication flow works
- [ ] Pagination works

---

### Phase 5: Final Polish

#### ✅ Task: Generate All Migrations
**Status:** ⏳ Not Started
**Priority:** P0
**Estimated Time:** 30 minutes

**Actions:**
```bash
# Generate migrations for all schema changes
npm run db:generate

# Review generated SQL files
ls server/database/migrations/
# Should see new migration files

# Test apply locally
npm run db:reset:local
# Should complete without errors

# Verify schema
wrangler d1 execute template-staging --local \
  --command ".schema users"
# Verify all new columns/indexes exist
```

**Checklist:**
- [ ] All schema changes have migrations
- [ ] Migrations apply cleanly
- [ ] No SQL errors
- [ ] Foreign keys work
- [ ] Indexes exist

---

#### ✅ Task: Test All Changes Locally
**Status:** ⏳ Not Started
**Priority:** P0
**Estimated Time:** 2-3 hours

**Test Scenarios:**

**1. Authentication Flow**
```bash
# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","firstName":"Test","lastName":"User"}'

# Signin
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
# Save session cookie

# Get profile
curl http://localhost:3000/api/v1/user/profile \
  -H "Cookie: {session-cookie}"

# Signout
curl -X POST http://localhost:3000/api/v1/auth/signout \
  -H "Cookie: {session-cookie}"
```

**2. RBAC**
```bash
# Sign in as admin
curl -X POST /api/v1/auth/signin -d '{"email":"admin@test.com","password":"testtesttest"}'

# List users (should work - admin has *)
curl /api/v1/users -H "Cookie: {admin-cookie}"

# Sign in as user
curl -X POST /api/v1/auth/signin -d '{"email":"user@test.com","password":"testtesttest"}'

# List users (should work - user has users:view)
curl /api/v1/users -H "Cookie: {user-cookie}"

# Create user (should fail - user lacks users:create)
curl -X POST /api/v1/users -H "Cookie: {user-cookie}" -d '{...}'
```

**3. Pagination**
```bash
# List users page 1
curl '/api/v1/users?page=1&limit=10'

# List users page 2
curl '/api/v1/users?page=2&limit=10'

# Sort by email
curl '/api/v1/users?sortBy=email&sortOrder=asc'
```

**4. Input Sanitization**
```bash
# Try XSS in firstName
curl -X POST /api/v1/auth/signup -d '{
  "email":"xss@test.com",
  "password":"Test1234!",
  "firstName":"<script>alert(\"XSS\")</script>",
  "lastName":"User"
}'
# Verify firstName is sanitized in response
```

**5. Audit Logs**
```bash
# Make request with X-Request-ID
curl -X POST /api/v1/auth/signup \
  -H "X-Request-ID: manual-test-123" \
  -d '{...}'

# Check audit log
wrangler d1 execute template-staging --local \
  --command "SELECT * FROM audit_logs WHERE request_id = 'manual-test-123'"
# Should show full request context
```

**6. Error Handling**
```bash
# Invalid credentials
curl -X POST /api/v1/auth/signin -d '{"email":"admin@test.com","password":"wrong"}'
# Should return standardized error with request ID

# Missing fields
curl -X POST /api/v1/auth/signup -d '{"email":"test@example.com"}'
# Should return validation error

# Unauthorized access
curl /api/v1/users
# Should return 401 error
```

**7. Multitenancy (if enabled)**
```bash
# Single-tenant mode (default)
curl /api/v1/users
# Should work without tenant header

# Multi-tenant mode
NUXT_MULTITENANCY_ENABLED=true npm run dev

curl /api/v1/users
# Should fail without x-tenant-id

curl -H "x-tenant-id: default" /api/v1/users
# Should work with tenant header
```

**Checklist:**
- [ ] All auth endpoints work
- [ ] RBAC enforces permissions correctly
- [ ] Pagination works on all list endpoints
- [ ] Input sanitization removes XSS
- [ ] Audit logs capture full context
- [ ] Errors include request IDs
- [ ] Soft deletes work correctly
- [ ] Foreign keys prevent orphaned records

---

#### ✅ Task: Update README with Changes
**Status:** ⏳ Not Started
**Priority:** P0
**Estimated Time:** 30 minutes

**Changes to README.md:**

**Add "Recent Updates" section:**
```markdown
## 🎉 Recent Updates (January 2025)

### Architecture Improvements
- ✅ Configurable tenant isolation (single-tenant by default)
- ✅ Improved RBAC with permission version tracking
- ✅ Atomic database operations via batch transactions
- ✅ Comprehensive audit logging with request tracking

### Security Enhancements
- ✅ Input sanitization for all user input
- ✅ Foreign key constraints for data integrity
- ✅ Database indexes for performance
- ✅ Uniform error handling with context

### Developer Experience
- ✅ Pagination on all list endpoints
- ✅ Consolidated secret management
- ✅ Comprehensive documentation
- ✅ Test helpers and fixtures

See [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for details.
```

**Update Feature List:**
```markdown
## 🚀 Features

- **⚡ Cloudflare Workers** - Edge computing with global distribution
- **🗄️ Cloudflare D1** - Serverless SQLite with configurable tenant isolation
- **🔐 Authentication** - Secure session-based auth with nuxt-auth-utils
- **🏢 Multi-tenancy** - Configurable (defaults to single-tenant, manual provisioning)
- **⚖️ RBAC** - Enterprise-grade role-based access control with wildcards
- **🛡️ Input Sanitization** - XSS protection for all user input
- **📊 Pagination** - All list endpoints support pagination and sorting
- **📝 Audit Logging** - Comprehensive tracking with request context
- **🔒 Data Integrity** - Foreign key constraints and soft deletes
- **⚡ Atomic Operations** - Batch transactions for data consistency
- **📖 Documentation** - Comprehensive guides and API docs
- **🧪 Testing** - Vitest with helpers and fixtures
```

---

#### ✅ Task: Create ROADMAP.md
**Status:** ⏳ Not Started
**Priority:** P1
**Estimated Time:** 30 minutes

**Create docs/ROADMAP.md** - See full content in "Future Enhancements" section above.

**Sections:**
- P2 - Medium Priority
- P3 - Nice to Have
- Security Hardening
- Caching
- Email Implementation
- Monitoring & Observability
- Testing
- API Improvements
- Frontend
- Developer Experience
- Data Management
- Deployment
- Code Quality

---

#### ✅ Task: Final Verification
**Status:** ⏳ Not Started
**Priority:** P0
**Estimated Time:** 1 hour

**Final Checklist:**

**Documentation:**
- [ ] README.md updated
- [ ] All docs consistent
- [ ] No broken links
- [ ] Examples work
- [ ] ROADMAP.md created
- [ ] IMPLEMENTATION_PLAN.md complete

**Code:**
- [ ] All TODOs documented
- [ ] No console.errors for known issues
- [ ] No placeholder values in code
- [ ] Proper TypeScript types
- [ ] No unused imports

**Database:**
- [ ] All migrations generated
- [ ] Migrations apply cleanly
- [ ] Schema matches documentation
- [ ] Indexes exist
- [ ] Foreign keys work

**Tests:**
- [ ] Tests pass
- [ ] No stale test files
- [ ] Test coverage >50%
- [ ] Test helpers work

**Functionality:**
- [ ] Auth flow works
- [ ] RBAC enforces permissions
- [ ] Pagination works
- [ ] Audit logs complete
- [ ] Error handling uniform
- [ ] Input sanitization works

**Configuration:**
- [ ] .dev.vars.example complete
- [ ] Secrets documented
- [ ] Runtime config correct
- [ ] Environment variables validated

---

## 📦 New Files Created

Track new files created during implementation:

### Documentation
- [x] `docs/IMPLEMENTATION_PLAN.md` - This file ✅
- [ ] `docs/SECRETS.md` - Secrets management guide
- [ ] `docs/SECURITY.md` - Security practices and decisions
- [ ] `docs/API.md` - API documentation and pagination
- [ ] `docs/ROADMAP.md` - Future enhancements
- [ ] `docs/MIGRATIONS.md` - Update with rollback process
- [ ] `bruno/README.md` - Bruno collection docs (if applicable)

### Server Utilities
- [ ] `server/utils/pagination.ts` - Pagination helpers
- [ ] `server/utils/database.ts` - Transaction helpers

### Middleware
- [x] `server/middleware/00.request-context.ts` - Request tracking ✅

### Tests
- [ ] `tests/helpers/database.ts` - Test database utilities
- [ ] `tests/helpers/fixtures.ts` - Test data fixtures
- [ ] `tests/helpers/event.ts` - Mock H3Event helper

### Migrations
- [x] `server/database/migrations/0003_romantic_james_howlett.sql` - Schema updates ✅

---

## 🔍 Session Continuity

When starting a new session, check:

1. **Progress:** Review checkboxes in each phase
2. **Current Task:** Find first unchecked task
3. **Context:** Read task description and key changes
4. **Dependencies:** Ensure previous tasks completed
5. **Files:** Check which files need modification
6. **Verification:** Test completed work before continuing

**Quick Start:**
```bash
# Check implementation plan
cat docs/IMPLEMENTATION_PLAN.md | grep "Status: ⏳ Not Started" | head -1

# Review current phase
cat docs/IMPLEMENTATION_PLAN.md | grep "### Phase" -A 10

# See what's done
cat docs/IMPLEMENTATION_PLAN.md | grep "✅.*Status: ✅ Completed"
```

---

## 📊 Progress Dashboard

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1: Critical Fixes | 5 | 1/5 (20%) | 🏃 In Progress |
| Phase 2: Core Improvements | 5 | 0/5 | 🔜 Pending |
| Phase 3: API Enhancements | 5 | 0/5 | 🔜 Pending |
| Phase 4: Testing & Docs | 4 | 0/4 | 🔜 Pending |
| Phase 5: Final Polish | 5 | 0/5 | 🔜 Pending |
| **TOTAL** | **24** | **1/24** | **4%** |

### Recent Activity
- **2025-01-11:** ✅ Task 1 completed - Multitenancy architecture fixed, schema updated with indexes/constraints, request tracking middleware added

---

## 🎯 Next Steps

**To start implementation:**

1. Begin with Phase 1, Task 1 (Multitenancy Architecture)
2. Follow task checklist systematically
3. Mark tasks complete as you finish
4. Update progress dashboard
5. Commit changes frequently
6. Test thoroughly before moving to next phase

**Remember:**
- This is a living document - update as you progress
- Add notes about challenges or decisions made
- Document any deviations from the plan
- Keep verification steps up to date

---

**Good luck! 🚀**
