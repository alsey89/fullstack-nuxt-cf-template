# TypeScript Conventions

This document establishes TypeScript conventions for maintaining type safety throughout the codebase.

## Null vs Undefined

Use a consistent distinction between `null` and `undefined`:

| Value | Meaning | Use Case |
|-------|---------|----------|
| `null` | Intentionally empty / not found | Repository queries, explicit "no value" |
| `undefined` | Not provided / optional | Optional function parameters, optional properties |

```typescript
// ✅ Repository returns null for "not found"
async findById(id: string): Promise<User | null> {
  const [user] = await db.select()...
  return user ?? null;
}

// ✅ Optional parameters use undefined
function fetchUsers(filters?: Filter[]): Promise<User[]> {
  // filters is undefined if not provided
}
```

**Never return `undefined` when `null` is semantically correct.** This maintains a clear contract.

## Return Type Patterns

### Repositories

```typescript
// Single item queries: T | null
async findById(id: string): Promise<User | null>

// List queries: T[] (empty array for no results)
async findAll(): Promise<User[]>

// Create operations: T (throws on failure)
async create(data: NewUser): Promise<User> {
  const [user] = await db.insert(...).returning();
  if (!user) throw new InternalServerError("Failed to create user");
  return user;
}
```

### Services

Services convert `null` to errors (fail-closed pattern):

```typescript
async getUser(id: string): Promise<User> {
  const user = await this.userRepo.findById(id);
  if (!user) {
    throw new NotFoundError("User");
  }
  return user;
}
```

### API Routes

Always wrap responses in `ApiResponse<T>`:

```typescript
return createSuccessResponse("User found", user);
// Returns: { message: "...", data: User, error: null }
```

## Type Assertions

Only use type assertions **after** validation:

```typescript
// ✅ Good - assertion after validation
if (rbacService.isValidRole(roleName)) {
  return getRolePermissions(roleName as RoleName);
}

// ❌ Bad - assertion without validation
return getRolePermissions(roleName as RoleName);
```

### Safe Assertion Patterns

```typescript
// Type guards
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// After null check
const user = await repo.findById(id);
if (!user) throw new NotFoundError();
// user is now User, not User | null

// Non-null assertion (use sparingly, with comment)
// Safe: array is defined above with known length
const firstUser = users[0]!;
```

## Error Typing

### Error Class Hierarchy

Extend `AppError` for domain errors:

```typescript
export class NotFoundError extends AppError {
  constructor(entity = "Resource", details?: any) {
    super(`${entity} not found`, 404, ERROR_CODES.NOT_FOUND, details);
  }
}
```

### Error Type Guards

Use type guards for safe error handling:

```typescript
try {
  // ...
} catch (error) {
  if (isAppError(error)) {
    // error is AppError - safe to access .code, .statusCode
  } else {
    // Unknown error - wrap it
    throw new InternalServerError("Unexpected error");
  }
}
```

## Null Checks

### Prefer Guard Clauses

```typescript
// ✅ Good - guard clause, early exit
async getUser(id: string): Promise<User> {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError("User");
  return user;
}

// ❌ Bad - nested conditionals
async getUser(id: string): Promise<User | null> {
  const user = await repo.findById(id);
  if (user) {
    return user;
  } else {
    return null;
  }
}
```

### Nullish Coalescing vs OR

```typescript
// ✅ Use ?? for null/undefined fallbacks
const value = input ?? defaultValue;

// ❌ Avoid || for fallbacks (treats 0, '', false as falsy)
const value = input || defaultValue;
```

## Generic Types

### Use Sensible Defaults

```typescript
// ✅ Default generic for flexibility
interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}
```

### Prefer `unknown` over `any`

```typescript
// ✅ Use unknown for truly unknown types
function handleError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return new InternalServerError(String(error));
}

// ❌ Avoid any - loses type safety
function handleError(error: any): AppError { ... }
```

## Module Imports

### Use Relative Paths in shared/

The `#server` alias may not resolve consistently in all contexts:

```typescript
// shared/types/index.ts
// ✅ Good - relative path
export type { User } from "../../server/database/schema/identity";

// ❌ May fail in some contexts
export type { User } from "#server/database/schema/identity";
```

## Cloudflare Types

The project uses `@cloudflare/workers-types` for D1, KV, R2 types:

```typescript
// server/types/env.d.ts
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  KV?: KVNamespace;
  // Index signature for dynamic tenant bindings
  [key: string]: D1Database | KVNamespace | string | undefined;
}
```

## Checklist for New Code

- [ ] Return `null` (not `undefined`) for "not found" cases
- [ ] Services throw on null from repositories (fail-closed)
- [ ] Type assertions only after validation
- [ ] Use `??` instead of `||` for nullish fallbacks
- [ ] Extend `AppError` for domain errors
- [ ] Use type guards for unknown error handling
- [ ] Generic defaults use `unknown` not `any`
