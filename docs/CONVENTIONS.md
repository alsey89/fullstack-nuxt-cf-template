# Development Conventions & Guidelines

**Project:** Cloudflare Full-Stack Template
**Last Updated:** 2025-10-21

This document consolidates all coding conventions, architectural patterns, and best practices for the Cloudflare Full-Stack Template.

> **Quick Reference for AI:** See [CLAUDE.md](CLAUDE.md) for a condensed AI-optimized reference guide.

**Related Documentation:**
- [CLAUDE.md](CLAUDE.md) - AI-optimized quick reference (recommended starting point)
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Complete error handling system
- [RBAC.md](RBAC.md) - Role-based access control guide
- [SECURITY.md](SECURITY.md) - Security architecture and threat model
- [TEMPLATE_SETUP.md](TEMPLATE_SETUP.md) - Setup guide for new projects
- [MIGRATIONS.md](MIGRATIONS.md) - Database migration workflows
- [SECRETS.md](SECRETS.md) - Secrets management

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Import Aliases](#import-aliases)
3. [Environment Detection](#environment-detection)
4. [Configuration & Environment Variables](#configuration--environment-variables)
5. [Service Layer Pattern](#service-layer-pattern)
6. [Repository Layer](#repository-layer)
7. [API Response Format](#api-response-format)
8. [Error Handling](#error-handling)
9. [Pagination](#pagination)
10. [Route Handlers](#route-handlers)
11. [Testing](#testing)
12. [Database Access](#database-access)
13. [Field Naming](#field-naming)

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
│  Frontend (app/)                                        │
│  - Vue components, pages, layouts                       │
│  - Client-side form validation                          │
│  - Pinia stores, composables                            │
└──────────────────┬──────────────────────────────────────┘
                   │ imports ↓
                   ├───────────────────────────────────────┐
                   │                                       │
┌──────────────────▼──────────────────────────────────────▼┐
│  Shared Layer (shared/)                                  │
│  - shared/validators/*.ts (Zod schemas)                  │
│  - shared/constants/*.ts (business rules)                │
│  - shared/types/*.ts (shared TypeScript types)           │
│  ⚠️  NO dependencies on server/ or app/                  │
│  ⚠️  Use relative imports within shared/                 │
└──────────────────▲──────────────────────────────────────┬┘
                   │ imports ↑                    imports ↓
┌──────────────────┴──────────────────────────────────────▼┐
│  API Layer (Route Handlers)                              │
│  - server/api/**/*.{get,post,put,delete}.ts              │
│  - Request validation using #shared validators           │
│  - Response formatting                                   │
│  - Session management (nuxt-auth-utils)                  │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Middleware Layer                                        │
│  - server/middleware/01.tenant.ts (tenant resolution)    │
│  - server/middleware/02.auth.ts (authentication)         │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Service Layer (Business Logic)                          │
│  - server/services/*.ts                                  │
│  - Request-scoped instances (no singletons)              │
│  - Context validation in constructors                    │
│  - Uses #shared validators for business logic validation │
└──────────────────┬──────────────────────────────────────┘
                   │ calls ↓
┌──────────────────▼──────────────────────────────────────┐
│  Repository Layer (Data Access)                          │
│  - server/repositories/*.ts                              │
│  - Database-scoped queries with batch operations         │
│  - No business logic (data access only)                  │
│  - Type-safe Drizzle ORM operations                      │
└──────────────────┬──────────────────────────────────────┘
                   │ queries ↓
┌──────────────────▼──────────────────────────────────────┐
│  Database Layer (Cloudflare D1)                          │
│  - Drizzle schema definitions                            │
│  - Type-safe SQL generation                              │
│  - Multi-tenant data isolation                           │
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
| `#shared`          | `shared/`      | Shared code (validators, constants, types)        | `import { signinSchema } from '#shared/validators/auth'` |
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

#### Shared Code (shared/)

**The `shared/` directory contains code that is used by BOTH frontend and backend.**

Use `#shared` when importing from outside the shared directory:

```typescript
// From backend API routes
import { signinSchema } from "#shared/validators/auth";
import { MAX_PER_PAGE } from "#shared/constants/api";

// From frontend pages
import { signupSchema } from "#shared/validators/auth";
import { DEFAULT_PER_PAGE } from "#shared/constants/api";
```

**Within the `shared/` directory itself, use relative imports:**

```typescript
// shared/validators/auth.ts
import { passwordSchema } from './password';  // ✅ relative import within shared/

// shared/validators/query.ts
import { MAX_PER_PAGE } from '../constants/api';  // ✅ relative import within shared/
```

**Why relative imports within shared/?**
- TypeScript path resolution works differently for files inside vs outside the shared directory
- Relative imports are more reliable and work consistently across all contexts
- Simpler and more explicit for files in the same directory structure

**What goes in `shared/`?**
- ✅ **Validators**: Zod schemas for form and API validation
- ✅ **Constants**: Business rules that apply to both FE/BE (pagination limits, validation rules)
- ✅ **Types**: TypeScript types/interfaces used across boundaries
- ✅ **Utilities**: Pure functions with no side effects or platform dependencies
- ❌ **NOT server-specific code**: Database queries, H3 event handlers, middleware
- ❌ **NOT frontend-specific code**: Vue components, composables, stores

#### Cross-Boundary Imports

Use `~~` (project root) when importing across app/server boundaries, or `#shared` for shared code:

```typescript
// Frontend importing shared constants/types
import { ERROR_CODES } from "#shared/error/codes";
import type { PaginationParams } from "#shared/validators/query";

// Server importing shared constants
import { ERROR_CODES } from "#shared/error/codes";
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
import { signinSchema } from "#shared/validators/auth";
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

## Configuration & Environment Variables

### Core Principle: Runtime Config as Single Source of Truth

This template uses **Nuxt Runtime Config** exclusively for all configuration values. Direct access to `process.env` or `event.context.cloudflare?.env` for configuration is **prohibited** in application code.

**Why this matters:**
- ✅ Centralized configuration management
- ✅ Type-safe access with IDE autocomplete
- ✅ Consistent override pattern via `NUXT_` prefix
- ✅ Works seamlessly across local dev and Cloudflare Workers
- ✅ No scattered environment variable access throughout codebase

### Correct Pattern

#### ✅ Server-Side Configuration Access

```typescript
// API routes, middleware, server utils
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);

  // Private (server-only) config
  const jwtSecret = config.jwtSecret;
  const sessionPassword = config.session.password;
  const emailProvider = config.email.provider;

  // Public config (also available on client)
  const environment = config.public.environment;
  const apiUrl = config.public.apiUrl;
});

// Utility functions (pass event when available)
function myUtil(event?: H3Event) {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
  return config.jwtSecret;
}
```

#### ✅ Client-Side Configuration Access

```typescript
// Components, composables, pages
const config = useRuntimeConfig();

// Only public config is available
const environment = config.public.environment; // ✅ Works
const apiUrl = config.public.apiUrl; // ✅ Works

// Private config will cause runtime error
// const jwt = config.jwtSecret; // ❌ Throws error on client
```

#### ✅ Cloudflare Bindings (Exception)

```typescript
// Accessing D1, KV, R2 bindings is allowed
const db = event.context.cloudflare?.env?.DB as D1Database; // ✅ OK
const kv = event.context.cloudflare?.env?.KV; // ✅ OK
const r2 = event.context.cloudflare?.env?.R2; // ✅ OK

// Multi-tenant database selection
const dbBinding = `DB_${tenantId.toUpperCase()}`;
const tenantDb = cfEnv?.[dbBinding] as D1Database; // ✅ OK
```

### Incorrect Patterns

#### ❌ Direct process.env Access

```typescript
// ❌ NEVER do this in application code
const secret = process.env.JWT_SECRET;
const provider = process.env.EMAIL_PROVIDER;

// ✅ Use runtime config instead
const config = useRuntimeConfig(event);
const secret = config.jwtSecret;
const provider = config.email.provider;
```

**Acceptable exceptions:**
- Build/config time: `nuxt.config.ts` (e.g., `process.env.NODE_ENV`)
- Scripts: `scripts/` directory (e.g., `safe-migrate.ts` for CI detection)
- Test setup: `tests/setup.ts`

#### ❌ Direct cloudflare.env for Configuration

```typescript
// ❌ NEVER access config via cloudflare.env
const secret = event.context.cloudflare?.env?.JWT_SECRET;
const provider = event.context.cloudflare?.env?.EMAIL_PROVIDER;

// ✅ Use runtime config instead
const config = useRuntimeConfig(event);
const secret = config.jwtSecret;
const provider = config.email.provider;
```

### Environment Variable Override Convention

All `runtimeConfig` values can be overridden using environment variables with the `NUXT_` prefix:

#### Private Configuration (Server-Only)

Use `NUXT_<KEY>` for private server-side config:

| Runtime Config Path | Environment Variable | Example |
|---------------------|---------------------|---------|
| `runtimeConfig.jwtSecret` | `NUXT_JWT_SECRET` | `NUXT_JWT_SECRET="abc123"` |
| `runtimeConfig.session.password` | `NUXT_SESSION_PASSWORD` | `NUXT_SESSION_PASSWORD="xyz789"` |
| `runtimeConfig.email.provider` | `NUXT_EMAIL_PROVIDER` | `NUXT_EMAIL_PROVIDER="resend"` |
| `runtimeConfig.email.apiKey` | `NUXT_EMAIL_API_KEY` | `NUXT_EMAIL_API_KEY="re_xxx"` |
| `runtimeConfig.turnstileSecretKey` | `NUXT_TURNSTILE_SECRET_KEY` | `NUXT_TURNSTILE_SECRET_KEY="0x4xxx"` |
| `runtimeConfig.multitenancy.enabled` | `NUXT_MULTITENANCY_ENABLED` | `NUXT_MULTITENANCY_ENABLED="true"` |
| `runtimeConfig.rbac.enabled` | `NUXT_RBAC_ENABLED` | `NUXT_RBAC_ENABLED="false"` |

#### Public Configuration (Client + Server)

Use `NUXT_PUBLIC_<KEY>` for public config accessible on both client and server:

| Runtime Config Path | Environment Variable | Example |
|---------------------|---------------------|---------|
| `runtimeConfig.public.environment` | `NUXT_PUBLIC_ENVIRONMENT` | `NUXT_PUBLIC_ENVIRONMENT="production"` |
| `runtimeConfig.public.apiUrl` | `NUXT_PUBLIC_API_URL` | `NUXT_PUBLIC_API_URL="/api"` |
| `runtimeConfig.public.turnstileSiteKey` | `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | `NUXT_PUBLIC_TURNSTILE_SITE_KEY="0x4xxx"` |
| `runtimeConfig.public.multitenancy.enabled` | `NUXT_PUBLIC_MULTITENANCY_ENABLED` | `NUXT_PUBLIC_MULTITENANCY_ENABLED="true"` |

#### OAuth Providers (nuxt-auth-utils)

OAuth credentials follow the same pattern:

| Provider | Environment Variables |
|----------|----------------------|
| **GitHub** | `NUXT_OAUTH_GITHUB_CLIENT_ID`<br>`NUXT_OAUTH_GITHUB_CLIENT_SECRET` |
| **Google** | `NUXT_OAUTH_GOOGLE_CLIENT_ID`<br>`NUXT_OAUTH_GOOGLE_CLIENT_SECRET` |
| **Discord** | `NUXT_OAUTH_DISCORD_CLIENT_ID`<br>`NUXT_OAUTH_DISCORD_CLIENT_SECRET` |
| **Microsoft** | `NUXT_OAUTH_MICROSOFT_CLIENT_ID`<br>`NUXT_OAUTH_MICROSOFT_CLIENT_SECRET` |
| **Others** | `NUXT_OAUTH_<PROVIDER>_CLIENT_ID`<br>`NUXT_OAUTH_<PROVIDER>_CLIENT_SECRET` |

See [SECRETS.md](./SECRETS.md) for complete OAuth setup guide.

### Configuration Workflow

```
┌─────────────────────────────────────────┐
│  Environment Variables                  │
│  (.env, .dev.vars, wrangler secrets)   │
│  NUXT_* prefix convention              │
└─────────────┬───────────────────────────┘
              │ Overrides ↓
┌─────────────▼───────────────────────────┐
│  nuxt.config.ts runtimeConfig          │
│  (Defaults + Type Definitions)         │
└─────────────┬───────────────────────────┘
              │ Accessed via ↓
┌─────────────▼───────────────────────────┐
│  useRuntimeConfig()                    │
│  • Server: useRuntimeConfig(event)     │
│  • Client: useRuntimeConfig().public   │
└─────────────────────────────────────────┘
```

### Best Practices

1. **Define all config in `nuxt.config.ts`**: Add all configuration keys to `runtimeConfig` with sensible defaults
2. **Use environment variables to override**: Never hardcode production values in `nuxt.config.ts`
3. **Document new variables**: Update `.env.example`, `.dev.vars.example`, and wrangler config comments
4. **Pass event context**: Always pass `event` to `useRuntimeConfig(event)` in server code when available
5. **Type safety**: Runtime config is fully typed - use IDE autocomplete to discover available values
6. **Public vs Private**: Only use `public` for values that must be accessible on the client (security consideration)

### Common Mistakes

❌ **Forgetting to add to runtimeConfig**
```typescript
// Won't work - not defined in runtimeConfig
const value = process.env.MY_NEW_SETTING;
```

❌ **Accessing private config on client**
```typescript
// Runtime error - jwtSecret is private
const jwt = useRuntimeConfig().jwtSecret; // in component
```

❌ **Hardcoding production values**
```typescript
// Bad - production secret in source code
runtimeConfig: {
  jwtSecret: 'prod-secret-abc123' // ❌ Never do this
}
```

✅ **Correct approach**
```typescript
// 1. Define in nuxt.config.ts with placeholder
runtimeConfig: {
  myNewSetting: 'default-value'
}

// 2. Set via environment variable
// .dev.vars or wrangler secret
NUXT_MY_NEW_SETTING="production-value"

// 3. Access via runtime config
const config = useRuntimeConfig(event);
const value = config.myNewSetting;
```

### Related Documentation

- **[SECRETS.md](./SECRETS.md)** - Complete secrets management guide
- **[TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md)** - Initial configuration setup
- **[Nuxt Runtime Config Docs](https://nuxt.com/docs/guide/going-further/runtime-config)** - Official documentation

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
import { QueryHelpers } from "#server/repositories/helpers/query-builder";

export class ExampleRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db);
  }

  async findById(id: string): Promise<Example | null> {
    const result = await this.drizzle
      .select()
      .from(schema.examples)
      .where(QueryHelpers.notDeleted(schema.examples, eq(schema.examples.id, id)))
      .limit(1);

    return result[0] || null;
  }

  async list(
    limit = 100,
    offset = 0,
    filters?: Filter[],
    sortBy?: string,
    sortOrder?: SortOrder,
    searchTerm?: string
  ): Promise<Example[]> {
    const conditions: (SQL | undefined)[] = [
      QueryHelpers.notDeleted(schema.examples),
    ];

    // Add filters
    if (filters && filters.length > 0) {
      conditions.push(this.buildFilters(schema.examples, filters));
    }

    // Add search
    if (searchTerm) {
      conditions.push(
        QueryHelpers.search([schema.examples.name, schema.examples.description], searchTerm)
      );
    }

    const validConditions = conditions.filter((c): c is SQL => c !== undefined);
    const query = this.drizzle
      .select()
      .from(schema.examples)
      .where(and(...validConditions))
      .limit(limit)
      .offset(offset);

    return query;
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

### QueryHelpers Pattern

**Architectural Decision:** This template uses **QueryHelpers** as the single source of truth for common query utilities. This pattern was chosen for scalability and consistency in list APIs.

#### Why QueryHelpers?

1. **Scalable for growing webapps**: All production apps need pagination, search, and filtering
2. **Single source of truth**: No redundancy between repository helpers
3. **Usable anywhere**: Not limited to repository classes (works in services, utils)
4. **Consistent patterns**: Standardized query building across the codebase
5. **Easy to extend**: Add new helpers as needs grow

#### Available Helpers

**File:** `server/repositories/helpers/query-builder.ts`

```typescript
// Soft delete filtering
QueryHelpers.notDeleted(table, ...additionalConditions)

// Multi-column search
QueryHelpers.search(columns, searchTerm)

// Date range filtering
QueryHelpers.dateRange(column, startDate, endDate)

// Pagination with metadata
QueryHelpers.paginated(baseQuery, totalCount, { page, limit })

// Active records (isActive + notDeleted)
QueryHelpers.activeOnly(table, ...additionalConditions)
```

#### Usage Examples

**Simple soft delete check:**
```typescript
// Get all non-deleted users
const users = await db
  .select()
  .from(schema.users)
  .where(QueryHelpers.notDeleted(schema.users));
```

**Combining multiple helpers:**
```typescript
// Search users by name/email, exclude deleted
const searchCondition = QueryHelpers.search(
  [schema.users.name, schema.users.email],
  "john"
);

const users = await db
  .select()
  .from(schema.users)
  .where(QueryHelpers.notDeleted(schema.users, searchCondition));
```

**Pagination with total count:**
```typescript
// Build base query
const condition = QueryHelpers.notDeleted(schema.users);
const baseQuery = db.select().from(schema.users).where(condition);

// Count total records
const [{ count: total }] = await db
  .select({ count: drizzleCount() })
  .from(schema.users)
  .where(condition);

// Return paginated results with metadata
return QueryHelpers.paginated(baseQuery, total, { page: 1, limit: 10 });
// Returns: { data: [...], total: 150, pages: 15, page: 1, limit: 10 }
```

**Date range filtering:**
```typescript
// Get users created in 2024
const dateCondition = QueryHelpers.dateRange(
  schema.users.createdAt,
  new Date("2024-01-01"),
  new Date("2024-12-31")
);

const users = await db
  .select()
  .from(schema.users)
  .where(QueryHelpers.notDeleted(schema.users, dateCondition));
```

#### Extending QueryHelpers

Add new helpers to `server/repositories/helpers/query-builder.ts`:

```typescript
export class QueryHelpers {
  // ... existing helpers

  // NEW: Tenant isolation helper
  static byTenant<T extends { tenantId: any; deletedAt: any }>(
    table: T,
    tenantId: string,
    ...additionalConditions: (SQL | undefined)[]
  ): SQL {
    return this.notDeleted(
      table,
      eq(table.tenantId, tenantId),
      ...additionalConditions
    );
  }
}
```

### Repository Rules

- **Use QueryHelpers**: Always use `QueryHelpers.notDeleted()` for soft delete checks
- **Type safety**: Use Drizzle schema types
- **No business logic**: Data access only
- **Atomic operations**: Use batch operations from `server/utils/database.ts` for multi-record operations
- **Consistent patterns**: Follow QueryHelpers patterns for common operations

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
import { ERROR_CODES } from "#shared/error/codes";

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

## Validation Strategy

### Shared Validators (`shared/validators/`)

**All validation schemas are defined in the `shared/` directory** to ensure consistency between frontend and backend validation.

#### Directory Structure

```
shared/
├── validators/
│   ├── auth.ts          # Authentication schemas (signin, signup, password reset)
│   ├── password.ts      # Password strength validation
│   ├── user.ts          # User profile schemas
│   └── query.ts         # Query parameter schemas (pagination, filtering, sorting)
└── constants/
    └── api.ts           # Shared constants (MAX_PER_PAGE, DEFAULT_PER_PAGE, etc.)
```

#### Benefits of Shared Validators

1. **Single Source of Truth**: Validation logic defined once, used everywhere
2. **Consistent Validation**: Frontend and backend enforce identical rules
3. **Type Safety**: Zod schemas generate TypeScript types automatically
4. **Better UX**: Frontend catches errors before submission
5. **Security**: Backend re-validates even if frontend bypassed
6. **Maintainability**: Update validation in one place

#### Backend Usage

```typescript
// server/api/v1/auth/signin.post.ts
import { signinSchema } from "#shared/validators/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate with shared schema
  const validated = signinSchema.parse(body);  // ✅ Throws ValidationError if invalid

  // ... rest of handler
});
```

#### Frontend Usage

```vue
<!-- app/pages/auth/signin.vue -->
<script setup>
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { signinSchema } from '#shared/validators/auth';

// Use shared schema for form validation
const formSchema = toTypedSchema(signinSchema);
const { handleSubmit, isSubmitting } = useForm({
  validationSchema: formSchema,
});
</script>
```

#### Example Schemas

**Authentication** (`shared/validators/auth.ts`):
- `signinSchema`: Email + password
- `signupSchema`: Email, password, names (with password confirmation)
- `passwordResetRequestSchema`: Email only
- `passwordResetSchema`: Token + new password (with confirmation)
- `emailConfirmSchema`: Token only

**Password** (`shared/validators/password.ts`):
- `passwordSchema`: Reusable password validation with strength requirements
- `validatePasswordStrength()`: Programmatic validation function
- `PASSWORD_RULES`: Configurable password policy constants

**User Profile** (`shared/validators/user.ts`):
- `updateProfileSchema`: Optional fields for profile updates

**Query Parameters** (`shared/validators/query.ts`):
- `paginationSchema`: Page + perPage validation
- `sortSchema`: Sort field + order validation
- `filterSchema`: Field + operator + value validation
- `listQuerySchema`: Combined pagination + sorting + filtering

#### Validation Best Practices

1. **Always validate on backend**: Never trust client-side validation alone
2. **Use `.parse()` for sync validation**: Throws `ZodError` on failure
3. **Use `.safeParse()` for custom error handling**: Returns `{ success, data/error }`
4. **Keep schemas focused**: One schema per endpoint/form
5. **Reuse base schemas**: Compose larger schemas from smaller ones
6. **Add helpful error messages**: Users should understand what's wrong
7. **Use relative imports within shared/**: TypeScript path resolution works better

#### Password Validation Example

```typescript
// shared/validators/password.ts
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireNumber: true,
  requireUppercase: false,
  requireLowercase: false,
  requireSpecial: false,
} as const;

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength, `Password must be less than ${PASSWORD_RULES.maxLength} characters`)
  .refine(
    (password) => validatePasswordStrength(password).valid,
    (password) => ({
      message: validatePasswordStrength(password).errors.join(", "),
    })
  );
```

#### Schema Composition Example

```typescript
// shared/validators/auth.ts
import { passwordSchema } from './password';  // ✅ relative import within shared/

export const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: passwordSchema,  // ✅ Reuse password schema
  passwordConfirmation: z.string().min(1, 'Password confirmation is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Passwords must match',
  path: ['passwordConfirmation'],
});
```

#### Error Handling

```typescript
// Backend: Let Zod errors be caught by error middleware
const validated = signinSchema.parse(body);  // Throws ZodError → caught by middleware

// Frontend: Use vee-validate for inline error display
const formSchema = toTypedSchema(signinSchema);
const { handleSubmit, errors } = useForm({ validationSchema: formSchema });
```

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

## Pagination and Filtering

The application uses a standardized pagination, filtering, and sorting system across all list endpoints.

### Query Parameters Format

```
GET /api/v1/{resource}?page=1&perPage=20&sortBy=field&sortOrder=desc&filter[field][operator]=value
```

#### Pagination Parameters
- `page` (number, default: 1): Page number (1-indexed)
- `perPage` (number, default: 20, max: 100): Items per page
  - Set to `-1` to disable pagination and return all results

#### Sorting Parameters
- `sortBy` (string): Field name to sort by (validated per endpoint)
- `sortOrder` (enum: "asc" | "desc", default: "asc"): Sort direction

#### Filter Parameters
Format: `filter[fieldName][operator]=value`

**Supported Operators:**
- `eq`: Equal to
- `ne`: Not equal to
- `like`: SQL LIKE pattern (you provide `%` wildcards)
- `contains`: Contains text (auto-wrapped with `%`)
- `startsWith`: Starts with text (auto-appends `%`)
- `endsWith`: Ends with text (auto-prepends `%`)
- `in`: Value in array (comma-separated)
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `isNull`: Field is NULL
- `notNull`: Field is NOT NULL

### Response Format

```json
{
  "message": "Resources retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "error": null
}
```

### Common Query Examples

#### Basic Pagination
```bash
# First page (default: 20 items)
GET /api/v1/user

# Specific page and size
GET /api/v1/user?page=2&perPage=50

# Get all results (no pagination)
GET /api/v1/user?perPage=-1
```

#### Sorting
```bash
# Sort by email ascending (default)
GET /api/v1/user?sortBy=email

# Sort by creation date descending
GET /api/v1/user?sortBy=createdAt&sortOrder=desc
```

#### Filtering
```bash
# Exact match
GET /api/v1/user?filter[isActive][eq]=true

# Pattern matching (simple)
GET /api/v1/user?filter[email][contains]=@example.com
GET /api/v1/user?filter[firstName][startsWith]=John

# Pattern matching (advanced with like)
GET /api/v1/user?filter[email][like]=%@example.com%

# Multiple filters (AND logic)
GET /api/v1/user?filter[isActive][eq]=true&filter[role][eq]=admin
```

#### Combined Queries
```bash
# Pagination + Sorting + Filtering
GET /api/v1/user?page=1&perPage=50&filter[isActive][eq]=true&filter[role][eq]=admin&sortBy=email&sortOrder=asc
```

### Implementation Architecture

#### Type Definitions (`server/types/api.ts`)
- `Pagination`: Pagination metadata
- `PaginatedResponse<T>`: Generic paginated response wrapper
- `SortOrder`: "asc" | "desc"
- `FilterOperator`: Supported filter operators
- `Filter`: Single filter definition
- `ListQuery`: Combined query parameters

#### Query Parser (`server/utils/query-parser.ts`)
- `parseListQuery(event)`: Parses all query parameters
- `parsePaginationParams(query)`: Extracts pagination
- `parseSortParams(query)`: Extracts sorting
- `parseFilterParams(query)`: Parses filter[field][operator] format
- `validateSortField()`: Validates sortBy against allowed fields
- `validateFilters()`: Validates filter fields

#### Pagination Helper (`server/utils/pagination.ts`)
- `calculatePagination()`: Computes pagination metadata
- `buildPaginatedResponse()`: Creates paginated response wrapper
- `calculateLimitOffset()`: Converts page/perPage to limit/offset

#### Base Repository (`server/repositories/base.ts`)
Enhanced with:
- `buildFilterCondition()`: Converts Filter to SQL condition
- `buildFilters()`: Combines multiple filters with AND
- `buildSort()`: Creates SQL ORDER BY clause
- `countRecords()`: Counts with optional filters

### Frontend Integration

```typescript
// Fetch users with pagination
const { data } = await $fetch('/api/v1/user', {
  query: {
    page: 1,
    perPage: 20,
    sortBy: 'email',
    sortOrder: 'asc',
    'filter[isActive][eq]': true
  }
})

// Access pagination info
console.log(data.pagination.total)
console.log(data.pagination.hasNext)
console.log(data.data) // Array of users
```

### Validation

Zod schemas are available in `server/validators/query.ts`:
- `paginationSchema`: Validates pagination params
- `sortSchema`: Validates sort params
- `filterSchema`: Validates individual filters
- `listQuerySchema`: Combined validation
- Endpoint-specific schemas: `userListQuerySchema`, `roleListQuerySchema`, etc.

### Performance Considerations

1. **Parallel Queries**: Count and list queries run in parallel
2. **Index Optimization**: Ensure indexes on filtered/sorted fields
3. **Max Page Size**: Enforced limit of 100 items per page
4. **Validated Fields**: Only allowed fields can be filtered/sorted

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
