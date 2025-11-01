# AI Assistant Reference Guide

**Quick Reference for Claude Code** - Last Updated: 2025-10-21

This is the primary reference for AI-assisted development. For complete documentation, see [CONVENTIONS.md](CONVENTIONS.md).

---

## Table of Contents

1. [Architecture at a Glance](#architecture-at-a-glance)
2. [Import Conventions](#import-conventions)
3. [Service Pattern](#service-pattern)
4. [Repository Pattern](#repository-pattern)
5. [Error Handling](#error-handling)
6. [API Responses](#api-responses)
7. [Validation](#validation)
8. [Common Patterns](#common-patterns)
9. [Database Conventions](#database-conventions)
10. [Testing](#testing)
11. [Deep Dive Docs](#deep-dive-docs)

---

## Architecture at a Glance

### Tech Stack
- **Runtime:** Cloudflare Workers (Nuxt 4)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle
- **Auth:** nuxt-auth-utils (session-based)

### Layer Flow
```
API Routes (server/api/**/*.{get,post,put,delete}.ts)
    ↓ calls
Middleware (tenant resolution, auth)
    ↓ calls
Service Layer (business logic, request-scoped)
    ↓ calls
Repository Layer (data access, batch operations)
    ↓ queries
Database (Drizzle ORM → D1)
```

### Core Principles
1. **Single-tenant by default** - Multi-tenant opt-in via config
2. **Request-scoped services** - No singletons
3. **Fail-fast validation** - Validate in constructors
4. **Type-safe** - End-to-end TypeScript
5. **Atomic operations** - Batch operations for consistency
6. **Permission-based** - RBAC system (can be toggled off)

---

## Import Conventions

**Never use relative imports beyond one level** - Always use aliases:

| Alias | Points To | Use In | Example |
|-------|-----------|--------|---------|
| `#server` | `server/` | Backend code | `import { createIdentityService } from '#server/services/identity'` |
| `#shared` | `shared/` | Shared code | `import { signinSchema } from '#shared/validators/auth'` |
| `@` or `~` | `app/` | Frontend code | `import { Button } from '@/components/ui/button'` |
| `~~` | Project root | Cross-boundary | `import type { ApiResponse } from '~~/server/types/api'` |

**Rules:**
- Frontend: Always use `@` or `~`
- Backend: Always use `#server`
- Shared code: Always use `#shared` (except within `shared/` directory - use relative imports)
- Use `import type` for TypeScript types

**Examples:**
```typescript
// ✅ Backend imports
import { createIdentityService } from '#server/services/identity'
import { ValidationError } from '#server/error/errors'
import type { User } from '#server/database/schema/identity'

// ✅ Frontend imports
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'

// ❌ Don't use relative paths
import { ValidationError } from '../../error/errors'
```

---

## Service Pattern

Services encapsulate business logic and are **request-scoped**.

### Service Structure
```typescript
export class ExampleService {
  private readonly userId?: string
  private readonly tenantId?: string

  constructor(
    private readonly event: H3Event,
    private readonly db: D1Database,
    private readonly exampleRepo: ExampleRepository,
    private readonly auditLogRepo: AuditLogRepository
  ) {
    // Extract context once in constructor
    this.userId = event.context.userId
    this.tenantId = event.context.tenantId

    // Validate database context
    if (!this.db) {
      throw new InternalServerError('Database not found in event context')
    }
  }

  async createExample(data: CreateExampleRequest) {
    // Validate authentication
    if (!this.userId) {
      throw new AuthenticationError('User not authenticated')
    }

    // Business logic
    const example = await this.exampleRepo.create({
      ...data,
      userId: this.userId,
    })

    // Audit log
    await this.auditLogRepo.log(
      this.userId,
      'EXAMPLE_CREATED',
      'Example',
      example.id
    )

    return example
  }
}
```

### Factory Function Pattern
```typescript
export function createExampleService(event: H3Event): ExampleService {
  const db = event.context.cloudflare?.env?.DB as D1Database

  if (!db) {
    throw new InternalServerError('Database not available in context')
  }

  return new ExampleService(
    event,
    db,
    new ExampleRepository(db),
    new AuditLogRepository(db)
  )
}
```

**Service Rules:**
- Request-scoped instances (no singletons)
- Validate context in constructor
- Use factory functions for dependency injection
- Business logic only (no direct DB queries)
- Log significant actions with audit logs

---

## Repository Pattern

Repositories handle data access with tenant isolation using **QueryHelpers** for common operations.

### Repository Structure
```typescript
import { QueryHelpers } from '#server/repositories/helpers/query-builder'

export class ExampleRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db)
  }

  async findById(id: string): Promise<Example | null> {
    const result = await this.drizzle
      .select()
      .from(schema.examples)
      .where(QueryHelpers.notDeleted(schema.examples, eq(schema.examples.id, id)))
      .limit(1)

    return result[0] || null
  }

  async list(
    limit = 100,
    offset = 0,
    searchTerm?: string
  ): Promise<Example[]> {
    const conditions: (SQL | undefined)[] = [
      QueryHelpers.notDeleted(schema.examples),
    ]

    // Add search across multiple columns
    if (searchTerm) {
      conditions.push(
        QueryHelpers.search([schema.examples.name, schema.examples.description], searchTerm)
      )
    }

    const validConditions = conditions.filter((c): c is SQL => c !== undefined)
    return this.drizzle
      .select()
      .from(schema.examples)
      .where(and(...validConditions))
      .limit(limit)
      .offset(offset)
  }

  async create(data: NewExample): Promise<Example> {
    const [example] = await this.drizzle
      .insert(schema.examples)
      .values(data)
      .returning()

    return example
  }

  async softDelete(id: string): Promise<void> {
    await this.drizzle
      .update(schema.examples)
      .set({ deletedAt: new Date() })
      .where(eq(schema.examples.id, id))
  }
}
```

### QueryHelpers Quick Reference

**File:** `server/repositories/helpers/query-builder.ts`

```typescript
// Soft delete filtering
QueryHelpers.notDeleted(table, ...conditions)

// Multi-column search
QueryHelpers.search([table.name, table.email], searchTerm)

// Date range filtering
QueryHelpers.dateRange(table.createdAt, startDate, endDate)

// Pagination with metadata
QueryHelpers.paginated(baseQuery, totalCount, { page: 1, limit: 10 })

// Active records (isActive + notDeleted)
QueryHelpers.activeOnly(table, ...conditions)
```

**Why QueryHelpers?** Single source of truth for common patterns (search, pagination, filtering). Usable anywhere, not just repositories. See [CONVENTIONS.md](CONVENTIONS.md#queryhelpers-pattern) for full guide.

**Repository Rules:**
- **Use QueryHelpers** for soft deletes, search, pagination
- Extend `BaseRepository`
- Use Drizzle schema types
- No business logic (data access only)
- Use batch operations for multi-record operations (see [CONVENTIONS.md](CONVENTIONS.md#batch-operations-for-atomicity-d1))

---

## Error Handling

Use structured error classes with shared error codes. See [ERROR_HANDLING.md](ERROR_HANDLING.md) for complete guide.

### Backend: Throw Specific Errors
```typescript
import {
  ValidationError,
  AuthenticationError,
  EmailAlreadyExistsError,
  PasswordSameAsOldError,
} from '#server/error/errors'

// ✅ Specific error (FE can react specially)
throw new PasswordSameAsOldError(undefined, {
  field: 'password',
  userId: user.id
})

// ✅ Generic validation error
throw new ValidationError('Field X is invalid', {
  field: 'fieldX',
  value: value
})

// ✅ Email conflict
throw new EmailAlreadyExistsError(undefined, {
  field: 'email',
  email: 'user@example.com',
  existingUserId: 'user_456'
})
```

### Frontend: React to Error Codes
```typescript
import { ERROR_CODES } from '#shared/error/codes'

if (error.code === ERROR_CODES.PASSWORD_SAME_AS_OLD) {
  toast.error(t('errors.passwordSameAsOld'))
  highlightField('password')
}
else if (error.code === ERROR_CODES.EMAIL_EXISTS) {
  toast.error(t('errors.emailExists'))
  showLoginLink()
}
else {
  toast.error(error.message || t('errors.generic'))
}
```

**Error Details Convention:**
- ✅ Include: field names, resource IDs, conflicting values
- ❌ Don't include: tenantId, path, method, IP (already logged)
- Keep it flat (no nested `context` key)

---

## API Responses

All API responses use standardized format from `server/lib/response.ts`.

### Success Response
```typescript
import { createSuccessResponse } from '#server/lib/response'

// Simple success
return createSuccessResponse('User created', user)

// With pagination
return createSuccessResponse('Users retrieved', users, {
  page: 1,
  perPage: 20,
  total: 100,
})
```

**Format:**
```json
{
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "error": null,
  "pagination": { /* optional pagination */ }
}
```

### Error Response (auto-handled)
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "uuid-here",
    "code": "VALIDATION_ERROR",
    "message": "Error message",
    "details": { /* field-specific errors */ }
  }
}
```

Errors are automatically caught by `server/error/errorHandler.ts`.

---

## Validation

**All validation schemas live in `shared/validators/`** - single source of truth for FE and BE.

### Backend Usage
```typescript
import { signinSchema } from '#shared/validators/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = signinSchema.parse(body)  // ✅ Throws if invalid
  // ... use validated data
})
```

### Frontend Usage
```vue
<script setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { signupSchema } from '#shared/validators/auth'

const formSchema = toTypedSchema(signupSchema)
const { handleSubmit } = useForm({ validationSchema: formSchema })
</script>
```

### Available Schemas
- **Auth**: `signinSchema`, `signupSchema`, `passwordResetRequestSchema`, `passwordResetSchema`
- **Password**: `passwordSchema` (reusable with strength rules)
- **User**: `updateProfileSchema`
- **Query**: `paginationSchema`, `sortSchema`, `filterSchema`, `listQuerySchema`

### Shared Directory Rules
- ✅ **From outside shared/**: Use `#shared` alias
- ✅ **Within shared/**: Use relative imports (`./ or ../`)
- ✅ **What goes in shared/**: Validators, constants, types, pure utilities
- ❌ **Don't put in shared/**: Server-specific code, Vue components

**Example within shared/:**
```typescript
// shared/validators/auth.ts
import { passwordSchema } from './password'  // ✅ relative import

export const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,  // ✅ Reuse shared schema
  // ...
})
```

---

## Common Patterns

### Creating Entities
```typescript
// 1. Repository method
async create(data: NewExample): Promise<Example> {
  const [example] = await this.drizzle
    .insert(schema.examples)
    .values(data)
    .returning()
  return example
}

// 2. Service method
async createExample(data: CreateExampleRequest): Promise<Example> {
  if (!this.userId) {
    throw new AuthenticationError('User not authenticated')
  }

  const example = await this.exampleRepo.create({
    ...data,
    userId: this.userId,
  })

  await this.auditLogRepo.log(
    this.userId,
    'EXAMPLE_CREATED',
    'Example',
    example.id
  )

  return example
}

// 3. API route
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createExampleSchema.parse(body)

  const service = createExampleService(event)
  const example = await service.createExample(validated)

  return createSuccessResponse('Example created', example)
})
```

### Batch Operations (Atomic)
```typescript
import { executeBatch, createBatchInserts } from '#server/database/batch'

// Multiple related records - all succeed or all fail
async createUsersWithRoles(users: NewUser[], roles: NewUserRole[]) {
  const statements = [
    ...createBatchInserts(this.db, 'users', users),
    ...createBatchInserts(this.db, 'user_roles', roles),
  ]

  await executeBatch(this.db, statements) // Atomic
}
```

### Pagination & Filtering
```typescript
// API route with pagination
export default defineEventHandler(async (event) => {
  const query = parseListQuery(event)
  const { limit, offset } = calculateLimitOffset(query.page, query.perPage)

  const [items, total] = await Promise.all([
    service.listItems(limit, offset, query.filters, query.sortBy, query.sortOrder),
    service.countItems(query.filters),
  ])

  return buildPaginatedResponse('Items retrieved', items, query.page, query.perPage, total)
})
```

See [CONVENTIONS.md](CONVENTIONS.md#pagination) for full pagination guide.

### RBAC Permission Checks
```typescript
import { requirePermission } from '#server/services/rbac'

export default defineEventHandler(async (event) => {
  // Throws if user lacks permission (when RBAC enabled)
  await requirePermission(event, 'users:create')

  // Your logic here
})
```

RBAC can be toggled on/off via `NUXT_RBAC_ENABLED`. See [RBAC.md](RBAC.md) for complete guide.

---

## Database Conventions

### Schema Structure
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

export const examples = sqliteTable('examples', {
  // Base fields (include on all tables)
  id: text('id').primaryKey().$defaultFn(() => createId()),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete

  // Your fields
  name: text('name').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
})
```

**Conventions:**
- Snake_case for database columns
- CamelCase for TypeScript types
- Use `deletedAt` for soft deletes
- Include `createdAt` and `updatedAt` on all tables
- Use `createId()` for primary keys
- Foreign keys: CASCADE DELETE for dependent data
- **No tenantId column** - Multi-tenant uses separate databases

### Soft Delete Queries
```typescript
// ✅ Always check deletedAt
.where(and(
  eq(schema.examples.id, id),
  isNull(schema.examples.deletedAt)
))

// ✅ Soft delete
.update(schema.examples)
.set({ deletedAt: new Date() })
.where(eq(schema.examples.id, id))
```

---

## Testing

**Quick Commands:**
```bash
npm run test:unit        # Unit tests (services, middleware)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Critical Test Patterns

#### 1. Test Error Types, Not Messages
```typescript
import { UserNotFoundError, ValidationError } from '#server/error/errors'

// ✅ Test error class
await expect(service.getUser('invalid')).rejects.toThrow(UserNotFoundError)

// ❌ Don't test exact message (brittle, breaks on improvements)
await expect(service.getUser('invalid')).rejects.toThrow('User not found')
```

**Why?** Error messages are implementation details that change. Testing types ensures correct error handling while allowing message improvements.

#### 2. Use Constants, Not Magic Strings
```typescript
import { HdrKeyTenantID } from '#server/types/api'

// ✅ Use constant
vi.mocked(getHeader).mockImplementation((event, header) => {
  if (header === HdrKeyTenantID) return 'test-tenant'
  return undefined
})

// ❌ Hardcode string
if (header === 'X-Tenant-ID') return 'test-tenant'
```

**Why?** Constants keep tests in sync with production code. Header name changes automatically propagate to tests.

#### 3. Global Mock Signatures (nuxt-auth-utils)
```typescript
// IMPORTANT: Parameter order matters!
global.verifyPassword = vi.fn().mockImplementation(
  async (hash: string, password: string) => {
    return hash === `hashed_${password}`
  }
)
```

**Critical:** `verifyPassword` signature is `(hash, password)` - not `(password, hash)`.

### Test Configuration

Two config files work together:

**`tests/tsconfig.json`** - TypeScript/IDE support
- Extends `.nuxt/tsconfig.json` (inherits all Nuxt path mappings)
- Only needs `types: ["vitest/globals"]` for test function autocomplete

**`vitest.config.ts`** - Runtime module resolution
- **Must explicitly define path aliases** (`#server`, `#shared`)
- Vite doesn't read TypeScript path mappings
- This is where `Cannot find module '#server/...'` errors come from

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
```

**Full Testing Guide:** See [TESTING.md](TESTING.md) for complete patterns, mock utilities, and troubleshooting.

---

## Deep Dive Docs

For complete documentation, refer to:

- **[CONVENTIONS.md](CONVENTIONS.md)** - Complete architectural patterns and conventions (976 lines)
- **[ERROR_HANDLING.md](ERROR_HANDLING.md)** - Complete error system with all error classes and codes
- **[TESTING.md](TESTING.md)** - Complete testing guide: patterns, mocks, configuration, troubleshooting
- **[RBAC.md](RBAC.md)** - Enterprise RBAC system with API reference
- **[SECURITY.md](SECURITY.md)** - Security architecture and threat model
- **[TEMPLATE_SETUP.md](TEMPLATE_SETUP.md)** - Complete setup guide for new projects
- **[MIGRATIONS.md](MIGRATIONS.md)** - Database migration workflows
- **[SECRETS.md](SECRETS.md)** - Secrets management and environment variables

---

## Quick Reference Cards

### Environment Detection
```typescript
import { isDevelopment, isProduction, ENV } from '#server/utils/environment'

// Check environment
if (isDevelopment(event)) {
  console.log('[DEBUG] User authenticated')
}

// Get environment string
const env = getEnvironment(event) // "development" | "staging" | "production"
```

### Route Handler Template
```typescript
export default defineEventHandler(async (event) => {
  // 1. Parse and validate
  const body = await readBody(event)
  const validated = createExampleSchema.parse(body)

  // 2. Create service
  const exampleService = createExampleService(event)

  // 3. Execute business logic
  const example = await exampleService.createExample(validated)

  // 4. Return standardized response
  return createSuccessResponse('Example created', example)
})
```

### Adding New Features Checklist
1. **Schema**: Define tables in `server/database/schema/`
2. **Repository**: Create repository class for data access
3. **Service**: Implement business logic in service class
4. **Validation**: Add Zod schemas for request validation
5. **API**: Create route handlers in `server/api/`
6. **Tests**: Write unit and integration tests
7. **Frontend**: Implement UI components

---

**Last Updated:** 2025-10-13
**For Complete Docs:** See [CONVENTIONS.md](CONVENTIONS.md)
