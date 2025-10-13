# Development Conventions & Guidelines

**Project:** Cloudflare Full-Stack Template
**Last Updated:** 2025-10-13

This document consolidates all coding conventions, architectural patterns, and best practices for the Cloudflare Full-Stack Template.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Import Aliases](#import-aliases)
3. [Environment Detection](#environment-detection)
4. [Service Layer Pattern](#service-layer-pattern)
5. [Repository Layer](#repository-layer)
6. [API Response Format](#api-response-format)
7. [Error Handling](#error-handling)
8. [Pagination](#pagination)
9. [Route Handlers](#route-handlers)
10. [Testing](#testing)
11. [Database Access](#database-access)
12. [Field Naming](#field-naming)

---

## Architecture Overview

### Tech Stack

- **Runtime:** Cloudflare Workers (Nitro preset: `cloudflare-module`)
- **Database:** Cloudflare D1 (SQLite via Drizzle ORM)
- **ORM:** Drizzle ORM
- **Cache:** Cloudflare KV (optional)
- **Storage:** Cloudflare R2 (optional, for files)
- **Auth:** nuxt-auth-utils (session-based, encrypted cookies)
- **Framework:** Nuxt 4 / H3

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  API Layer (Route Handlers)                             │
│  - server/api/**/*.{get,post,put,delete}.ts             │
│  - Request validation & parsing                         │
│  - Response formatting                                  │
│  - Session management (nuxt-auth-utils)                 │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Middleware Layer                                       │
│  - server/middleware/01.tenant.ts (tenant resolution)   │
│  - server/middleware/02.auth.ts (authentication)        │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Service Layer (Business Logic)                         │
│  - server/services/*.ts                                 │
│  - Request-scoped instances (no singletons)             │
│  - Context validation in constructors                   │
│  - Factory functions for dependency injection           │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Repository Layer (Data Access)                         │
│  - server/repositories/*.ts                             │
│  - Database-scoped queries with batch operations        │
│  - No business logic (data access only)                 │
│  - Type-safe Drizzle ORM operations                     │
└──────────────────┬──────────────────────────────────────┘
                   │ queries ↓
┌──────────────────▼──────────────────────────────────────┐
│  Database Layer (Cloudflare D1)                         │
│  - Drizzle schema definitions                           │
│  - Type-safe SQL generation                             │
│  - Multi-tenant data isolation                          │
└─────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Single-tenant by default**: Simplified architecture, multi-tenant opt-in via configuration
2. **Request-scoped services**: No singletons, fresh instances per request
3. **Fail-fast validation**: Context validation in service constructors
4. **Type-safe**: End-to-end TypeScript with Drizzle schema
5. **Atomic operations**: Batch operations for data consistency
6. **Permission-based**: Enterprise-grade role-based access control

---

## Import Aliases

This project uses TypeScript path aliases to simplify imports and avoid deeply nested relative paths.

### Alias Configuration

| Alias              | Points To      | Use In                                            | Example                                                  |
| ------------------ | -------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `~` or `@`         | `app/`         | Frontend code (components, pages, composables)    | `import Button from '@/components/ui/Button.vue'`        |
| `#server`          | `server/`      | Backend code (services, repositories, middleware) | `import { getRBACService } from '#server/services/rbac'` |
| `~~` or `@@`       | Project root   | Cross-boundary imports (rare)                     | `import type { ApiResponse } from '~~/server/types/api'` |
| `#app`, `#imports` | Nuxt internals | Framework auto-imports                            | `import { useAsyncData } from '#app'`                    |

### Import Conventions

#### Frontend (app/) Code

Use `~` or `@` for all imports within the frontend:

```typescript
// ✅ GOOD: Use @ alias
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { formatDate } from "@/lib/utils";

// ❌ BAD: Relative imports
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../composables/useAuth";
```

#### Backend (server/) Code

Use `#server` for all imports within the backend:

```typescript
// ✅ GOOD: Use #server alias
import { createIdentityService } from "#server/services/identity";
import { ValidationError } from "#server/error/errors";
import { createSuccessResponse } from "#server/lib/response";
import type { PermissionCode } from "#server/database/schema/identity";

// ❌ BAD: Relative imports
import { createIdentityService } from "../../../services/identity";
import { ValidationError } from "../../error/errors";
```

#### Cross-Boundary Imports

Use `~~` (project root) when importing across app/server boundaries:

```typescript
// Frontend importing shared server types
import type { ApiResponse } from "~~/server/types/api";
import { ERROR_CODES } from "~~/server/error/codes";

// Server importing from project root (rare)
import { someUtil } from "~~/utils/shared";
```

### Rules & Best Practices

1. **Never use `../` beyond one level**: If you need `../../` or more, use an alias instead
2. **Be consistent with aliases**:
   - Frontend: Always use `@` or `~`
   - Backend: Always use `#server`
   - Cross-boundary: Use `~~`
3. **Prefer aliases over relative imports**: Even for single-level imports, aliases are clearer
4. **Type imports**: Use `import type` for TypeScript types when possible to optimize bundling

### Configuration Files

Aliases are configured in:

- **nuxt.config.ts**: Main alias configuration (`alias` option)
- **tsconfig.app.json**: Frontend TypeScript paths (auto-generated by Nuxt)
- **tsconfig.server.json**: Backend TypeScript paths (auto-generated by Nuxt)
- **app/components.json**: shadcn-vue component aliases (separate from project aliases)

### VS Code Integration

VS Code automatically recognizes these aliases for:

- IntelliSense auto-completion
- Go to Definition (Cmd/Ctrl + Click)
- Auto-imports

If aliases aren't working in your IDE:

1. Restart the TypeScript server: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
2. Restart the dev server: `npm run dev`
3. Check that `.nuxt/tsconfig.*.json` files exist

### Examples by File Type

#### Service Files

```typescript
// server/services/identity.ts
import { UserRepository } from "#server/repositories/identity";
import { Hash } from "@adonisjs/hash";
import type { NewUser } from "#server/database/schema/identity";
```

#### API Routes

```typescript
// server/api/v1/auth/signin.post.ts
import { createIdentityService } from "#server/services/identity";
import { createSuccessResponse } from "#server/lib/response";
import { ValidationError } from "#server/error/errors";
import { signinSchema } from "#server/validators/auth";
```

#### Repository Files

```typescript
// server/repositories/identity.ts
import { BaseRepository } from "#server/repositories/base";
import * as schema from "#server/database/schema";
import type { User, NewUser } from "#server/database/schema/identity";
```

#### Frontend Components

```typescript
// app/components/auth/LoginForm.vue
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/composables/useAuth";
import type { ApiResponse } from "~~/server/types/api";
```

---

## Environment Detection

Always use the centralized environment utilities from [server/utils/environment.ts](server/utils/environment.ts) to check the current environment. This prevents typos and provides type-safe environment detection.

### Available Utilities

```typescript
import {
  isDevelopment,
  isProduction,
  isStaging,
  isNonProduction,
  getEnvironment,
  ENV
} from "#server/utils/environment";
```

### Environment Check Functions

```typescript
// Check if current environment is development
if (isDevelopment(event)) {
  console.log("Debug info");
}

// Check if production
if (isProduction(event)) {
  // Production-only logic
}

// Check if staging
if (isStaging(event)) {
  // Staging-only logic
}

// Check if NOT production (dev or staging)
if (isNonProduction(event)) {
  // Non-production logic
}

// Get environment string directly
const env = getEnvironment(event); // "development" | "staging" | "production"
```

### Environment Constants

Use constants instead of hardcoded strings:

```typescript
// ✅ GOOD: Use constants
if (config.public.environment === ENV.DEVELOPMENT) {
  // ...
}

// ❌ BAD: Hardcoded strings (prone to typos)
if (config.public.environment === "development") {
  // What if you type "developmentt"?
}
```

### When to Assign vs. Inline

**Assign to variable when:**
- Used 2+ times in the same scope
- Makes complex logic clearer
- Avoids repeated function calls

**Use inline when:**
- Used only once
- Already in a clear conditional
- The function name is self-documenting

#### Examples

```typescript
// ✅ GOOD: Assign when used multiple times
const isDev = isDevelopment(event);
const tenantId = isDev ? getHeader(event, "x-tenant-id") || subdomain : subdomain;
if (!tenantId) {
  throw new Error("Tenant required" + (isDev ? " or x-tenant-id header" : ""));
}

// ✅ GOOD: Inline for single use
if (isDevelopment()) {
  console.log("[RBAC] Permission Check:", { userId, permission });
}

// ✅ GOOD: Assign for readability in complex conditions
const isDev = isDevelopment(event);
if (!secret || (!isDev && secret === "overwrite-this-with-environment-in-production")) {
  throw new Error("JWT_SECRET not configured");
}
```

### Rules & Best Practices

1. **Never use hardcoded environment strings**: Always use `isDevelopment()`, `isProduction()`, etc.
2. **Pass the event when available**: Most functions accept an optional `event: H3Event` parameter
3. **Use constants for comparisons**: When you need the raw string, use `ENV.DEVELOPMENT` instead of `"development"`
4. **Assign to variable for reuse**: If checking the same environment 2+ times, assign to `const isDev`
5. **Keep it simple**: For single checks, use inline `if (isDevelopment())`

### Common Use Cases

#### Debug Logging (Development Only)

```typescript
if (isDevelopment()) {
  console.log("[DEBUG] User authenticated:", userId);
}
```

#### Environment-Specific Configuration

```typescript
const isDev = isDevelopment(event);
if (!secret || (!isDev && secret === "default-secret")) {
  throw new Error("Secret not configured for production");
}
```

#### Conditional Error Details

```typescript
const isDev = isDevelopment(event);
return {
  message: isClientError || isDev ? error.message : "Internal server error",
  ...(isDev && { debug: { stack: error.stack } })
};
```

#### Development-Only Features

```typescript
// Allow x-tenant-id header in development only
const isDev = isDevelopment(event);
const tenantId = isDev
  ? getHeader(event, "x-tenant-id") || subdomain
  : subdomain;
```

---

## Service Layer Pattern

Services encapsulate business logic and are request-scoped.

### Service Structure

```typescript
export class ExampleService {
  private readonly userId?: string;
  private readonly tenantId?: string;

  constructor(
    private readonly event: H3Event,
    private readonly db: D1Database,
    private readonly exampleRepo: ExampleRepository,
    private readonly auditLogRepo: AuditLogRepository
  ) {
    // Extract context values once in constructor
    this.userId = event.context.userId;
    this.tenantId = event.context.tenantId; // Only relevant in multi-tenant mode

    // Validate database context
    if (!this.db) {
      throw new InternalServerError("Database not found in event context");
    }
  }

  async createExample(data: CreateExampleRequest) {
    if (!this.userId) {
      throw new AuthenticationError("User not authenticated");
    }

    const example = await this.exampleRepo.create({
      ...data,
      userId: this.userId,
    });

    // Log the action
    await this.auditLogRepo.log(
      this.userId,
      "EXAMPLE_CREATED",
      "Example",
      example.id
    );

    return example;
  }
}
```

### Factory Functions

Every service should have a factory function:

```typescript
export function createExampleService(event: H3Event): ExampleService {
  const db = event.context.cloudflare?.env?.DB as D1Database;

  if (!db) {
    throw new InternalServerError("Database not available in context");
  }

  return new ExampleService(
    event,
    db,
    new ExampleRepository(db),
    new AuditLogRepository(db)
  );
}
```

### Service Rules

- **Request-scoped**: Create new instances per request
- **Context validation**: Validate required context in constructor
- **Dependency injection**: Use factory functions
- **Business logic only**: No direct database queries
- **Audit logging**: Log significant actions

---

## Repository Layer

Repositories handle data access with tenant isolation.

### Repository Structure

```typescript
export class ExampleRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db);
  }

  async findById(id: string): Promise<Example | null> {
    const result = await this.drizzle
      .select()
      .from(schema.examples)
      .where(and(eq(schema.examples.id, id), isNull(schema.examples.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewExample): Promise<Example> {
    const [example] = await this.drizzle
      .insert(schema.examples)
      .values(data)
      .returning();

    return example;
  }
}
```

### Repository Rules

- **Soft deletes**: Check `deletedAt IS NULL` for all queries
- **Type safety**: Use Drizzle schema types
- **No business logic**: Data access only
- **Atomic operations**: Use batch operations from `server/utils/database.ts` for multi-record operations
- **Consistent patterns**: Follow established query patterns

---

## API Response Format

All API responses use a standardized format defined in [server/lib/response.ts](server/lib/response.ts).

### Success Response

```typescript
{
  message: "Operation completed successfully",
  data: { /* response data */ },
  error: null,
  pagination?: { /* pagination info */ }
}
```

**Note**: HTTP status code (200, 201) indicates success. No `success` boolean needed.

### Error Response

```typescript
{
  message: "Error occurred",
  data: null,
  error: {
    traceId: "uuid-here",
    code: "VALIDATION_ERROR",
    details?: { /* field-specific errors */ }
  }
}
```

### Response Helpers

```typescript
// Success (server/lib/response.ts)
return createSuccessResponse("User created", user);

// With pagination
return createSuccessResponse("Users retrieved", users, {
  page: 1,
  perPage: 20,
  total: 100,
});

// Error (handled by error middleware)
throw new ValidationError("Email is required");
```

---

## Error Handling

The application uses a **structured error system** with shared error codes between frontend and backend. For complete documentation, see [ERROR_HANDLING.md](ERROR_HANDLING.md).

### Quick Reference

**Backend throws specific error classes:**

```typescript
import {
  PasswordSameAsOldError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
} from "~/server/error/errors";

// Specific error (FE reacts specially)
throw new PasswordSameAsOldError(undefined, {
  field: "password",
  userId: user.id,
});

// Generic error
throw new ValidationError("Field X is invalid", {
  field: "fieldX",
  value: value,
});
```

**Frontend reacts to error codes:**

```typescript
import { ERROR_CODES } from "~/server/error/codes";

if (error.code === ERROR_CODES.PASSWORD_SAME_AS_OLD) {
  toast.error(t("errors.passwordSameAsOld"));
}
```

### Error Details Convention

**Only include error-specific data:**

- ✅ Field names, resource IDs, conflicting values
- ❌ tenantId, path, method, IP (already logged by errorHandler)

```typescript
// ✅ GOOD: Minimal, flat structure
throw new EmailAlreadyExistsError(undefined, {
  field: "email",
  email: "user@example.com",
  existingUserId: "user_456",
});

// ❌ BAD: Redundant info
throw new EmailAlreadyExistsError(undefined, {
  field: "email",
  email: email,
  tenantId: tenantId, // ❌ Already in context
  path: event.path, // ❌ Already logged
});
```

### Error Handler

Errors are automatically caught and formatted by [server/error/errorHandler.ts](../server/error/errorHandler.ts):

- **400-level:** Message + details sent to FE (production + dev)
- **500-level:** Generic message only (production), full details in dev
- **Dev mode:** Includes `debug` block with stack trace

---

## Database Schema Patterns

### Schema Structure

```typescript
// Base fields for all entities
export const baseFields = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
};

// Note: In multi-tenant mode, each tenant has a separate database
// No need for tenantId/companyId columns - physical isolation via separate DB bindings
```

### Schema Rules

- **Soft deletes**: Use `deletedAt` for soft deletion (timestamp nullable)
- **Timestamps**: Include `createdAt` and `updatedAt` on all tables
- **UUIDs**: Use `createId()` for primary keys
- **Indexes**: Add indexes for foreign keys and commonly queried fields
- **Foreign keys**: Use CASCADE DELETE for dependent data cleanup

---

## Database Schema Overview

### Core Tables

#### Identity & Access (RBAC)

These tables form the core authentication and authorization system.

#### Users & Authentication

```sql
users
├── id (UUID, PK)
├── email (unique), passwordHash, isEmailVerified
├── firstName, lastName, dateOfBirth
├── phone, address, city, state, country, postalCode
├── role (simple role field: admin, manager, user, etc.)
├── isActive
└── timestamps (createdAt, updatedAt, deletedAt)

userSettings
├── id (UUID, PK)
├── userId (FK to users.id, cascade delete)
├── settings (JSON blob for user preferences)
└── timestamps
```

#### RBAC (Role-Based Access Control)

```sql
permissions (registry/validation table)
├── id (UUID, PK)
├── code (unique, e.g., "users:create", "posts:*", "*")
├── name, description, category
└── timestamps

roles
├── id (UUID, PK)
├── name (unique, e.g., "admin", "manager", "user")
├── description
├── permissions (JSON array of permission codes)
├── isSystem (boolean, system roles cannot be deleted)
└── timestamps

user_roles (many-to-many)
├── id (UUID, PK)
├── userId (FK to users.id, cascade delete)
├── roleId (FK to roles.id, cascade delete)
└── timestamps
```

#### Audit Logging

```sql
auditLogs
├── id (UUID, PK)
├── userId (nullable FK to users.id)
├── action (e.g., "USER_CREATED", "POST_PUBLISHED")
├── entityType, entityId (what was affected)
├── stateBefore, stateAfter (JSON)
├── metadata (JSON for additional context)
├── ipAddress, userAgent
└── timestamps
```

---

## Route Handlers

### Route Structure

```typescript
export default defineEventHandler(async (event) => {
  // 1. Parse and validate request
  const body = await readBody(event);
  const validated = createExampleSchema.parse(body);

  // 2. Create service
  const exampleService = createExampleService(event);

  // 3. Execute business logic
  const example = await exampleService.createExample(validated);

  // 4. Return standardized response
  return createSuccessResponse("Example created successfully", example);
});
```

### Route Rules

- **Validation first**: Always validate input with Zod schemas
- **Service delegation**: Delegate business logic to services
- **Standardized responses**: Use response helpers
- **Error handling**: Let middleware handle errors

---

## Testing

### Test Structure

```typescript
describe("ExampleService", () => {
  let service: ExampleService;
  let mockEvent: H3Event;

  beforeEach(() => {
    mockEvent = createMockEvent({
      db: mockD1Database,
      userId: "test-user-id",
    });
    service = createExampleService(mockEvent);
  });

  it("should create example", async () => {
    const result = await service.createExample({
      name: "Test Example",
    });

    expect(result.name).toBe("Test Example");
    expect(result.userId).toBe("test-user-id");
  });
});
```

### Testing Rules

- **Unit tests**: Test business logic in services
- **Integration tests**: Test API endpoints
- **Mock external dependencies**: Database, external APIs
- **Test error cases**: Validate error handling

---

## Field Naming

### Database Fields

- **Snake_case**: Use snake_case for database column names
- **Clear intent**: Field names should be self-documenting
- **Consistent suffixes**: `_id` for foreign keys, `_at` for timestamps

### API Fields

- **CamelCase**: Use camelCase for API request/response fields
- **TypeScript types**: Auto-generate from database schema where possible

### Examples

```typescript
// Database schema
export const examples = sqliteTable("examples", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }),
});

// API types (auto-inferred)
type Example = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
};
```

---

## Development Workflow

### Adding New Features

1. **Schema**: Define database tables in `server/database/schema/`
2. **Repository**: Create repository class for data access
3. **Service**: Implement business logic in service class
4. **API**: Create route handlers in `server/api/`
5. **Validation**: Add Zod schemas for request validation
6. **Tests**: Write unit and integration tests
7. **Frontend**: Implement UI components and pages

### Migration Process

1. **Schema changes**: Update Drizzle schema
2. **Generate migration**: `npm run db:generate`
3. **Test locally**: `npm run db:migrate:local:staging`
4. **Deploy**: `npm run db:migrate:safe:production`

---

## Best Practices

### Security

- **Input validation**: Always validate user input
- **SQL injection**: Use Drizzle's type-safe queries
- **Authentication**: Check user authentication in services
- **Authorization**: Implement permission checks
- **Audit logging**: Log sensitive operations

### Performance

- **Indexes**: Add database indexes for common queries
- **Pagination**: Implement pagination for large datasets
- **Caching**: Use permission versions for cache invalidation
- **Query optimization**: Avoid N+1 queries

### Maintainability

- **Type safety**: Use TypeScript throughout
- **Consistent patterns**: Follow established conventions
- **Error handling**: Use custom error classes
- **Documentation**: Keep docs updated
- **Testing**: Maintain good test coverage

---

## Common Patterns

### Creating New Entities

```typescript
// 1. Repository method
async create(data: NewExample): Promise<Example> {
  const [example] = await this.drizzle
    .insert(schema.examples)
    .values(data)
    .returning();

  return example;
}

// 2. Service method
async createExample(data: CreateExampleRequest): Promise<Example> {
  // Validate user has permission
  if (!this.userId) {
    throw new AuthenticationError("User not authenticated");
  }

  // Create the entity
  const example = await this.exampleRepo.create({
    ...data,
    userId: this.userId,
  });

  // Log the action
  await this.auditLogRepo.log(
    this.userId,
    "EXAMPLE_CREATED",
    "Example",
    example.id
  );

  return example;
}
```

### Batch Operations for Atomicity (D1)

D1 provides atomic batch operations - all succeed or all fail together (max 100 statements per batch).

**Use cases**: Multiple related records, consistent updates, cascading deletes

```typescript
import {
  executeBatch,
  createBatchInserts,
  createBatchUpdates,
  BatchBuilder
} from '~/server/database/batch'

// Method 1: Helper functions
async createUsersWithRoles(users: NewUser[], roles: NewUserRole[]) {
  const statements = [
    ...createBatchInserts(this.db, 'users', users),
    ...createBatchInserts(this.db, 'user_roles', roles),
  ]

  // All inserted together or none at all (atomic)
  await executeBatch(this.db, statements)
}

// Method 2: Fluent API with BatchBuilder
async updateMultipleUsers(updates: UserUpdate[]) {
  const builder = new BatchBuilder(this.db)

  for (const update of updates) {
    builder.add(
      this.db.prepare('UPDATE users SET name = ? WHERE id = ?')
        .bind(update.name, update.id)
    )
  }

  await builder.execute()
}

// Method 3: Callback pattern
import { withBatch } from '~/server/database/batch'

await withBatch(this.db, async (batch) => {
  batch.add(this.db.prepare('INSERT INTO users ...').bind(...))
  batch.add(this.db.prepare('INSERT INTO settings ...').bind(...))
  // Executes on callback completion
})
```

See [server/database/batch.ts](server/database/batch.ts) for full API documentation.

### Permission Checking

```typescript
// In service methods
if (!this.userId) {
  throw new AuthenticationError("User not authenticated");
}

// For more complex permissions, implement a permission service
const hasPermission = await this.permissionService.checkPermission(
  this.userId,
  "examples:create"
);

if (!hasPermission) {
  throw new PermissionError("Insufficient permissions");
}
```
