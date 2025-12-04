# Backend Guide

Complete backend patterns and conventions for Keystone's server-side architecture.

## Quick Start

**Tech Stack:**

- **Runtime:** Cloudflare Workers (Nitro/H3)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle
- **Auth:** nuxt-auth-utils (session-based)

**Layer Flow:**

```
API Routes → Middleware → Services → Repositories → Database
```

## Core Patterns

### [API Routes](./API_ROUTES.md)

Route handlers, request validation, and response formatting.

**Key Concepts:**

- Route naming (`[resource].{method}.ts`)
- Input validation with Zod
- Factory function usage
- Standardized responses
- Error handling

### [Services](./SERVICES.md)

Business logic layer with request-scoped services.

**Key Concepts:**

- Request-scoped (factory functions)
- Business logic only
- Permission validation
- Audit logging
- Error throwing

### [Repositories](./REPOSITORIES.md)

Data access layer with soft delete support.

**Key Concepts:**

- Extends `BaseRepository`
- Soft delete pattern (`this.notDeleted()`)
- Batch operations
- Query helpers
- Null normalization (`?? null`)

### [Database](./DATABASE.md)

Database schema patterns and migrations.

**Key Concepts:**

- Base fields (id, timestamps, deletedAt)
- Schema conventions
- Foreign keys and indexes
- Migration workflow
- CUID2 for IDs

## Security & Access Control

### [RBAC (Role-Based Access Control)](./RBAC.md)

Position-based access control system.

**Key Concepts:**

- Position-based permissions
- Assignment overrides
- Session caching
- Permission format (`resource:action:scope`)
- Middleware auto-detection

### [Error Handling](./ERROR_HANDLING.md)

Structured error system with error codes.

**Key Concepts:**

- Error class hierarchy
- Error codes (`ERROR_CODES`)
- Field-level validation errors
- Global error handler
- Trace IDs

## Testing

### [Testing Guide](./TESTING_BE.md)

Backend testing patterns and best practices.

**Key Concepts:**

- Unit tests for services
- Integration tests for API routes
- Repository mocks
- Test context helpers
- Error code assertions

## Best Practices

### Request-Scoped Services

Services are created per-request via factory functions:

```typescript
// ✅ GOOD: Factory function
export function createExampleService(event: H3Event) {
  return new ExampleService(event, createRepositoryContainer(event))
}

// ❌ BAD: Singleton instance
export const exampleService = new ExampleService(...)
```

### Soft Delete Pattern

Always use `this.notDeleted()` in repository queries:

```typescript
// ✅ GOOD: Soft delete check
.where(and(
  eq(schema.users.id, id),
  this.notDeleted(schema.users)
))

// ❌ BAD: Missing soft delete check
.where(eq(schema.users.id, id))
```

### Validation & Business Logic

Validate at API boundary, enforce business rules in services:

```typescript
// API Route: Validate input
const data = validateAndSanitize(createUserSchema, body, ...)

// Service: Business rules
if (existingEmail) {
  throw new EmailAlreadyExistsError(data.email)
}
```

## Architecture Principles

1. **Single Responsibility** - Each layer has one job
2. **Request-Scoped** - No singletons, fresh context per request
3. **Fail-Fast Validation** - Validate early, throw errors
4. **Type-Safe** - End-to-end TypeScript with Zod
5. **Audit Everything** - Log significant operations
6. **Permission-Based** - Check permissions before operations

## Common Patterns

### Creating a New API Endpoint

1. **Validator** (`shared/validators/`) - Shared with frontend
2. **Repository** (`server/repositories/`) - Data access
3. **Service** (`server/services/`) - Business logic
4. **Route** (`server/api/v1/`) - HTTP handler
5. **Test** (`server/api/__tests__/`) - Integration test

See [Development Checklists](../CONVENTIONS/CHECKLISTS.md#new-api-endpoint-checklist) for step-by-step guide.

### Error Handling Flow

```
Route → Throws Error → Global Middleware → Formatted Response
```

Never catch errors in routes - let middleware handle them.

## Directory Structure

```
server/
├── api/                    # API routes
│   └── v1/                 # Versioned endpoints
│       ├── auth/           # Authentication
│       ├── users/          # User management
│       ├── projects/       # Projects
│       └── ...
├── services/               # Business logic
│   ├── identityService.ts
│   ├── projectService.ts
│   └── ...
├── repositories/           # Data access
│   ├── base.ts             # BaseRepository
│   ├── identityRepository.ts
│   └── ...
├── database/               # Database layer
│   ├── schema/             # Drizzle schemas
│   └── migrations/         # SQL migrations
├── middleware/             # Request middleware
├── utils/                  # Server utilities
└── error/                  # Error classes
```

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](../CONVENTIONS/COMMON_PITFALLS.md#backend-pitfalls) - Backend mistakes to avoid
- [Development Checklists](../CONVENTIONS/CHECKLISTS.md) - Implementation guides
- [Import Conventions](../CONVENTIONS/IMPORTS.md#backend-server-code) - Backend imports

**Deep Dive:**

- [Complete Conventions](../CLAUDE.md) - Full architectural patterns
- [Security Guide](../OPERATIONS/SECURITY.md) - Security architecture
- [Database Schema Guide](../../server/database/schema/README.md) - Complete schema docs

**Operations:**

- [Migrations](../OPERATIONS/MIGRATIONS.md) - Migration workflows (when available)
- [Secrets](../OPERATIONS/SECRETS.md) - Environment variables (when available)

---

**Quick Navigation:**

- [API Routes](./API_ROUTES.md) | [Services](./SERVICES.md) | [Repositories](./REPOSITORIES.md) | [Database](./DATABASE.md)
- [RBAC](./RBAC.md) | [Error Handling](./ERROR_HANDLING.md) | [Testing](./TESTING_BE.md)
