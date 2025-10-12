# Development Conventions & Guidelines

**Project:** Cloudflare Full-Stack Template
**Last Updated:** 2025-10-10

This document consolidates all coding conventions, architectural patterns, and best practices for the Cloudflare Full-Stack Template.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Service Layer Pattern](#service-layer-pattern)
3. [Repository Layer](#repository-layer)
4. [API Response Format](#api-response-format)
5. [Error Handling](#error-handling)
6. [Pagination](#pagination)
7. [Route Handlers](#route-handlers)
8. [Testing](#testing)
9. [Database Access](#database-access)
10. [Field Naming](#field-naming)

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
      .where(
        and(
          eq(schema.examples.id, id),
          isNull(schema.examples.deletedAt)
        )
      )
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
return createSuccessResponse("User created", user)

// With pagination
return createSuccessResponse("Users retrieved", users, {
  page: 1,
  perPage: 20,
  total: 100
})

// Error (handled by error middleware)
throw new ValidationError("Email is required")
```

---

## Error Handling

### Custom Error Classes

```typescript
// 400 Bad Request
throw new ValidationError("Invalid email format");

// 401 Unauthorized
throw new AuthenticationError("User not authenticated");

// 403 Forbidden
throw new PermissionError("Insufficient permissions");

// 404 Not Found
throw new NotFoundError("User", userId);

// 409 Conflict
throw new DuplicateError("Email already exists");

// 500 Internal Server Error
throw new InternalServerError("Database connection failed");
```

### Error Middleware

Errors are automatically caught and formatted by the error middleware in `server/middleware/03.error.ts`.

---

## Database Schema Patterns

### Schema Structure

```typescript
// Base fields for all entities
export const baseFields = {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}

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
describe('ExampleService', () => {
  let service: ExampleService;
  let mockEvent: H3Event;

  beforeEach(() => {
    mockEvent = createMockEvent({
      db: mockD1Database,
      userId: 'test-user-id'
    });
    service = createExampleService(mockEvent);
  });

  it('should create example', async () => {
    const result = await service.createExample({
      name: 'Test Example',
    });

    expect(result.name).toBe('Test Example');
    expect(result.userId).toBe('test-user-id');
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
export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }),
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

---

This template provides a solid foundation for building scalable, multi-tenant applications on Cloudflare Workers. The patterns and conventions ensure consistency, security, and maintainability as your application grows.