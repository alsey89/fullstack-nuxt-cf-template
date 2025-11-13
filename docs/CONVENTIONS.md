# Development Conventions & Guidelines

**Project:** Cloudflare Full-Stack Template
**Last Updated:** 2025-10-28

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
4. [Service Layer Pattern](#service-layer-pattern)
5. [Repository Layer](#repository-layer)
6. [API Response Format](#api-response-format)
7. [Error Handling](#error-handling)
8. [Pagination](#pagination)
9. [Route Handlers](#route-handlers)
10. [Testing](#testing)
11. [Database Access](#database-access)
12. [Field Naming](#field-naming)
13. [Frontend Component Organization](#frontend-component-organization)
14. [Frontend Architecture & State Management](#frontend-architecture--state-management)
    - [Forms Convention](#1-forms-convention)
    - [State Management Architecture](#2-state-management-architecture)
    - [API Call Patterns](#3-api-call-patterns)
    - [Migration Checklist](#4-migration-checklist)
    - [Decision Trees](#5-decision-trees)

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

### Auto-Import Conventions

Nuxt 4 automatically imports components, composables, utilities, and stores based on directory structure and naming conventions. Understanding these patterns is crucial for maintaining a clean and consistent codebase.

#### Auto-Import Directories

| Directory | Auto-imports | Naming Convention | Case Requirement | Import Needed? |
|-----------|--------------|-------------------|------------------|----------------|
| `app/components/` | Yes | Folder/File.vue → `<FolderFile />` | PascalCase folders/files | ❌ No (auto-imported) |
| `app/composables/` | Yes | `use` prefix required | camelCase | ❌ No (auto-imported) |
| `app/utils/` | Yes | No prefix required | Any case | ❌ No (auto-imported) |
| `app/stores/` | Yes | `use[Name]Store` pattern | camelCase | ❌ No (auto-imported) |
| `server/utils/` | Yes (server-only) | No prefix required | Any case | ❌ No (auto-imported) |
| `app/plugins/` | Auto-registered | `defineNuxtPlugin()` | Any case | N/A (auto-registered) |
| `app/middleware/` | Auto-registered | Route-based | kebab-case | N/A (auto-registered) |

**Note:** All components including UI library components (shadcn-vue in `app/components/ui/`) are auto-imported by Nuxt.

#### Component Auto-Import Rules

Components are auto-imported based on their **folder path**, using folder-based naming:

```
File path: app/components/Folder/File.vue
Component name in template: <FolderFile />
```

**Examples from this codebase:**
```
app/components/App/Sidebar.vue        → <AppSidebar />
app/components/Tours/SceneManager.vue → <ToursSceneManager />
app/components/Billing/TierBadge.vue  → <BillingTierBadge />
```

**Component Naming Rules:**
```vue
<!-- ✅ GOOD: Capitalized folder, PascalCase file -->
<script setup>
// No imports needed - auto-imported!
const userStore = useUserStore()
const route = useRoute()
</script>

<template>
  <AppSidebar />
  <ToursSceneManager />
  <BillingTierBadge />
</template>

<!-- ❌ BAD: Lowercase folder names -->
app/components/app/sidebar.vue  <!-- Won't work correctly -->

<!-- ❌ BAD: Deeply nested (3+ levels) -->
app/components/Tours/Editor/Scene/Card.vue  <!-- Too nested -->

<!-- ❌ BAD: Using index.vue -->
app/components/App/index.vue  <!-- Nuxt won't auto-import correctly -->

<!-- ✅ GOOD: UI library components also auto-imported -->
<script setup>
// No imports needed - UI components are auto-imported
</script>

<template>
  <Button>Click</Button>  <!-- Auto-imported -->
  <Card>Content</Card>    <!-- Auto-imported -->
</template>
```

**Best Practices:**
- ✅ Keep folders 2 levels max: `Category/ComponentName.vue`
- ✅ Capitalize folder names for components (App, Tours, Billing)
- ✅ Use PascalCase for file names (Sidebar.vue, SceneManager.vue)
- ✅ Only create components when reused 2+ times
- ❌ Don't import custom components explicitly (auto-imported)
- ❌ Don't use lowercase folder names for components

#### Composable Auto-Import Rules

Composables MUST follow the `use` prefix convention to be auto-imported:

```typescript
// ✅ GOOD: Proper composable structure
// File: app/composables/useMarzipano.ts
export function useMarzipano() {
  const viewer = ref(null)
  const loadViewer = () => { /* ... */ }
  return { viewer, loadViewer }
}

// Usage (no import needed):
const { viewer, loadViewer } = useMarzipano()

// ❌ BAD: Missing 'use' prefix
// File: app/composables/marzipano.ts
export function marzipano() { /* ... */ }  // Won't auto-import

// ❌ BAD: Wrong export pattern
export default function() { /* ... */ }  // Won't auto-import
```

**Composables in this codebase:**
```typescript
useErrorHandler()     // app/composables/useErrorHandler.ts
useExtendedFetch()    // app/composables/useExtendedFetch.ts
useMarzipano()        // app/composables/useMarzipano.ts
useRetry()            // app/composables/useRetry.ts
useShowToast()        // app/composables/useShowToast.js
```

**Best Practices:**
- ✅ Always use `use` prefix
- ✅ Export named function matching filename (without extension)
- ✅ Use composition API patterns (ref, computed, reactive)
- ❌ Don't create composables that are just single functions (use utils instead)
- ❌ Don't wrap stores in composables (use stores directly)

#### Store Auto-Import Rules

Pinia stores MUST follow the `use[Name]Store` convention:

```typescript
// ✅ GOOD: Proper store structure
// File: app/stores/userStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref(null)

  // Getters
  const isAuthenticated = computed(() => user.value !== null)

  // Actions
  async function fetchUser() { /* ... */ }

  return { user, isAuthenticated, fetchUser }
})

// Usage (no import needed):
const userStore = useUserStore()

// ❌ BAD: Wrong naming pattern
export const userStore = defineStore(...)  // Missing 'use' prefix
export const useUser = defineStore(...)    // Missing 'Store' suffix
```

**Stores in this codebase:**
```typescript
useBillingStore()  // app/stores/billingStore.ts
useProjectStore()  // app/stores/projectStore.ts
useUserStore()     // app/stores/userStore.ts
```

**Best Practices:**
- ✅ Use composition API: `defineStore('name', () => { ... })`
- ✅ ALL API calls use `extendedFetch` (automatic error handling)
- ✅ Return state, getters, and actions
- ✅ Include reset() function for signout
- ❌ Don't use options API for stores
- ❌ Don't make direct API calls in pages (use stores)

#### Utils Auto-Import Rules

Utils have no naming requirements and are auto-imported:

```typescript
// ✅ GOOD: Simple util function
// File: app/utils/stringutils.js
export function convertToInitials(str) {
  return str.split(' ').map(word => word[0]).join('')
}

// Usage (no import needed):
const initials = convertToInitials("John Doe")

// ❌ BAD: Default export
export default function convertToInitials(str) { /* ... */ }  // Won't auto-import
```

**Server Utils** (server-side only):
```typescript
// File: server/utils/pagination.ts
export function parsePaginationParams(query: any) {
  // Utility logic
}

// Usage in API routes (no import needed):
const { page, perPage } = parsePaginationParams(query)
```

**Best Practices:**
- ✅ Use for simple, reusable functions
- ✅ Export named functions
- ✅ Keep utils pure (no side effects)
- ❌ Don't use for complex stateful logic (use composables)
- ❌ Don't export default

#### Plugin Auto-Registration

Plugins are automatically registered based on file naming:

```typescript
// File: app/plugins/theme.client.ts  (client-side only)
export default defineNuxtPlugin(() => {
  // Plugin logic runs automatically
})

// File: app/plugins/analytics.server.ts  (server-side only)
// File: app/plugins/myPlugin.ts  (both sides)
```

**File naming conventions:**
- `.client.ts` - Client-side only
- `.server.ts` - Server-side only
- `.ts` - Both client and server

#### When Imports ARE Required

Despite auto-imports, you still need explicit imports for:

1. **Type-only Imports** (optimization):
```typescript
import type { User } from '@/stores/userStore'
import type { ApiResponse } from '~~/server/types/api'
```

2. **Third-party Libraries**:
```typescript
import { format } from 'date-fns'
import { z } from 'zod'
```

3. **Shared Validators** (cross-boundary):
```typescript
import { signinSchema } from '#shared/validators/auth'
```

#### Auto-Import Verification

Nuxt generates type definitions for all auto-imports in `.nuxt/`:

```
.nuxt/
├── components.d.ts  # Component auto-imports
├── imports.d.ts     # Composables, utils, stores
└── tsconfig.json    # TypeScript configuration
```

If auto-imports stop working:
1. Restart dev server: `npm run dev`
2. Check `.nuxt/` folder exists
3. Restart TypeScript server in IDE
4. Verify file naming matches conventions

#### Complete Auto-Import Example

```vue
<script setup lang="ts">
// ============================================
// AUTO-IMPORTED (no import statements needed)
// ============================================

// Nuxt composables
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Custom composables
const { viewer } = useMarzipano()
const { retry } = useRetry()

// Stores
const userStore = useUserStore()
const projectStore = useProjectStore()

// Utils
const initials = convertToInitials("John Doe")

// ============================================
// EXPLICIT IMPORTS (required)
// ============================================

// Type imports (optimization)
import type { Project } from '@/stores/projectStore'
import type { ApiResponse } from '~~/server/types/api'

// Third-party libraries
import { z } from 'zod'

// Shared validators
import { createProjectSchema } from '#shared/validators/project'
</script>

<template>
  <!-- All components auto-imported -->
  <AppSidebar />
  <ToursSceneManager />
  <Button>Click me</Button>
  <Card>Content</Card>
</template>
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
      .where(and(eq(schema.examples.id, id), this.notDeleted(schema.examples)))
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

- **Soft deletes**: ALWAYS use `this.notDeleted(schema.table)` helper for soft delete checks (inherited from BaseRepository). Never use `isNull(schema.table.deletedAt)` directly.
- **Type safety**: Use Drizzle schema types
- **No business logic**: Data access only
- **Atomic operations**: Use batch operations from `server/utils/database.ts` for multi-record operations
- **Consistent patterns**: Follow established query patterns

**Example of correct soft delete usage:**
```typescript
// ✅ CORRECT - Use notDeleted() helper
.where(and(eq(schema.examples.id, id), this.notDeleted(schema.examples)))

// ❌ WRONG - Don't use isNull directly
.where(and(eq(schema.examples.id, id), isNull(schema.examples.deletedAt)))
```

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

## Frontend Component Organization

### Nuxt Component Naming Convention

Nuxt automatically imports components based on their file path using a **folder-based naming convention**. Components are auto-imported without explicit import statements.

**Naming Pattern:**
- File path: `app/components/Folder/File.vue`
- Component name: `<FolderFile />`
- No explicit imports needed

**Examples:**
```
app/components/App/Sidebar.vue        → <AppSidebar />
app/components/Tours/SceneManager.vue → <ToursSceneManager />
app/components/Billing/TierBadge.vue  → <BillingTierBadge />
app/components/ui/button.vue          → <UiButton /> (shadcn uses lowercase)
```

**Important Rules:**
1. ✅ **DO**: Use folder structure to namespace components
2. ✅ **DO**: Use PascalCase for component files (except ui/ library which uses kebab-case)
3. ✅ **DO**: Capitalize folder names (App, Tours, Billing, not app, tours, billing)
4. ❌ **DON'T**: Create deeply nested folders (2 levels max: `Category/ComponentName.vue`)
5. ❌ **DON'T**: Use index.vue files (Nuxt won't auto-import them correctly)
6. ❌ **DON'T**: Import components explicitly (Nuxt does this automatically)

**Benefits:**
- No import statements needed
- Clear component namespacing
- Better organization by feature/domain
- Prevents naming collisions

### Component Splitting Philosophy

Components should **only** be created when they are reusable across multiple pages or features. Non-reusable UI should remain in page templates to improve code discoverability and reduce unnecessary abstraction.

**Create a component when:**
- Used in 2+ different pages/routes
- Part of a shared design system (UI library components like buttons, inputs, cards)
- Truly reusable utility or widget across the application

**Keep in page template when:**
- Only used once in a single page/feature
- Specific to a single page's functionality
- Doesn't need to be shared with other parts of the application

**Exception:** Very large single-use sections (500+ lines) may be extracted for maintainability, but should be:
- Clearly documented as page-specific components
- Co-located with or near their parent page
- Named to indicate their specific usage (e.g., `ToursSceneManager` for the editor page)

### Examples

**Good Practice:**
```vue
<!-- ✅ MarzipanoViewer.vue - Used in 3 places (public/preview/edit) -->
<!-- Keep as reusable component -->

<!-- ✅ ProjectCard - Only used in projects/index.vue -->
<!-- Inline directly into the page template -->
```

**Component Organization:**
```
app/components/
├── ui/                          # Shared UI library (shadcn-vue, lowercase)
│   ├── button.vue              # → <UiButton />
│   └── card.vue                # → <UiCard />
├── App/                         # Application-level components (capitalized)
│   ├── Sidebar.vue             # → <AppSidebar />
│   ├── PageHeader.vue          # → <AppPageHeader />
│   └── ThemeToggle.vue         # → <AppThemeToggle />
├── Tours/                       # Tour-specific components (capitalized)
│   ├── MarzipanoViewer.vue     # → <ToursMarzipanoViewer /> ✅ Reusable (3+ uses)
│   ├── PublishDialog.vue       # → <ToursPublishDialog /> ✅ Reusable (2+ uses)
│   ├── SceneManager.vue        # → <ToursSceneManager /> ⚠️ Exception (large, editor-specific)
│   └── HotspotDialogs.vue      # → <ToursHotspotDialogs /> ⚠️ Exception (large, editor-specific)
└── Billing/                     # Billing components (capitalized)
    ├── TierBadge.vue           # → <BillingTierBadge /> ✅ Reusable (3+ uses)
    ├── UsageBar.vue            # → <BillingUsageBar /> ✅ Reusable (2+ uses)
    └── PlanComparisonTable.vue # → <BillingPlanComparisonTable /> ✅ Reusable (3+ uses)
```

### Benefits of This Approach

1. **Code Discoverability**: Page-specific code lives in pages, making it easier to find and understand
2. **Reduced Abstraction**: Fewer unnecessary component boundaries to navigate
3. **Clearer Intent**: Components that exist are truly reusable, making architecture clearer
4. **Easier Refactoring**: When changing page-specific UI, no need to worry about breaking other pages

### Refactoring Checklist

Before creating a new component, ask:
1. Is this used in 2+ different places?
2. Will this realistically be reused in the future?
3. Is this part of a shared design system?

If all answers are "no", keep it in the page template.

---

## Frontend Architecture & State Management

### Overview

The frontend uses **Nuxt 4 + Vue 3 + Pinia** for state management. This section defines conventions for forms, state management, and API calls to ensure consistency across the application.

**Core Principles:**
1. **Single source of truth**: Stores manage all domain data and API calls
2. **Forms use shared validators**: Same Zod schemas as backend
3. **No API calls in pages**: All API calls go through store actions
4. **No store wrappers**: Pages use stores directly, not through composables
5. **Component extraction only when reused**: Keep UI inline until truly reusable

---

### 1. Forms Convention

All forms must use **vee-validate + shadcn-vue + shared validators + i18n** for consistency and validation.

#### Form Setup Pattern

```typescript
// ✅ CORRECT PATTERN (signin.vue, account.vue, settings.vue)
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { signinSchema } from '#shared/validators/auth'

const { t } = useI18n()
const userStore = useUserStore()

// Extend shared schema with i18n error messages
const formSchema = toTypedSchema(
  signinSchema.extend({
    email: z.string()
      .min(1, t('auth.signin.email.requiredMessage'))
      .email(t('auth.signin.email.formatErrMessage')),
    password: z.string()
      .min(1, t('auth.signin.password.requiredMessage'))
  })
)

const { handleSubmit, isSubmitting, isFieldDirty, setValues } = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: '',
    password: ''
  }
})

const onSubmit = handleSubmit(async (values) => {
  await userStore.signin(values) // Call store action, NOT API directly
})
</script>
```

#### Form Template Pattern

```vue
<template>
  <form @submit.prevent="onSubmit">
    <FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
      <FormItem>
        <FormLabel class="flex items-center justify-between">
          <span>{{ t('auth.signin.email.title') }}</span>
          <FormMessage />
        </FormLabel>
        <FormControl>
          <Input
            v-bind="field"
            type="email"
            :placeholder="t('auth.signin.email.placeholder')"
          />
        </FormControl>
      </FormItem>
    </FormField>

    <Button type="submit" :disabled="isSubmitting">
      <Icon v-if="isSubmitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
      {{ t('auth.signin.submitButton') }}
    </Button>
  </form>
</template>
```

#### Form Rules

**Always:**
- ✅ Use shared validators from `#shared/validators/*`
- ✅ Extend schemas with i18n error messages in component
- ✅ Use `handleSubmit`, `isSubmitting`, `v-bind="field"`
- ✅ Call store actions for submission (NOT API directly)
- ✅ Use `:validate-on-blur="!isFieldDirty"` for better UX
- ✅ Display loading state with `isSubmitting`

**Never:**
- ❌ Create local form state (like `form.value`) - vee-validate IS the state
- ❌ Make API calls directly from form submission
- ❌ Write manual validation - let Zod schema handle it
- ❌ Duplicate validation logic from backend

#### Populating Forms from Store

```typescript
// Load data and populate form
onMounted(async () => {
  await userStore.fetchUserProfile()

  // Use setValues to populate form
  setValues({
    firstName: userStore.firstName || '',
    lastName: userStore.lastName || ''
  })
})
```

---

### 2. State Management Architecture

**Architecture Overview:**

```
Pages
  ↓ consume state via computed
Stores (Pinia)
  ↓ ALL API calls
  ↓ update state
Backend API
```

#### State Classification: Domain vs View vs Temporary

**IMPORTANT:** Not all state belongs in stores. Understanding what goes where is critical for performance and maintainability.

**Use this decision tree:**

```
Is this state...
├─ Domain data that needs to persist to database?
│  └─ YES → Pinia Store
├─ A library instance or DOM reference?
│  └─ YES → Composable (NEVER Store)
├─ Temporary high-frequency state (60+ updates/second)?
│  └─ YES → Component-local ref
├─ UI state that multiple components need?
│  └─ YES → Composable (or Store if needs persistence)
└─ UI state only one component needs?
   └─ YES → Component-local ref
```

**Examples by Category:**

| State Type | Where | Example | Why |
|------------|-------|---------|-----|
| **Domain State** | Store | Hotspot positions, user data, project settings | Needs to persist, shared across app, part of data model |
| **Library Instances** | Composable | Marzipano viewer, scene objects, DOM elements | Not serializable, can't be reactive, library internals |
| **High-Frequency Temporary** | Component-local | Drag position during drag (60+ updates/sec) | Performance critical, no other component needs it |
| **Shared UI State** | Composable | Auto-rotate enabled, fullscreen mode, dialog visibility | Multiple components access, doesn't need persistence |
| **Local UI State** | Component-local | Modal open/closed, selected tab, search filter | Only one component needs it |

**Anti-Patterns to Avoid:**

- ❌ **NEVER** put library instances in store (Marzipano viewer, etc.) - not serializable
- ❌ **NEVER** put high-frequency temporary state in store (drag coordinates) - performance killer
- ❌ **NEVER** put DOM element references in store - will break
- ❌ **NEVER** duplicate domain state locally in components - single source of truth

**Real-World Example: Marzipano Panorama Viewer**

```typescript
// ✅ CORRECT: Domain State (Store)
projectStore {
  currentProject        // Persistent business data
  scenes               // Scene list
  linkHotspots         // Hotspot positions (persisted to DB)
  infoHotspots         // Hotspot content (persisted to DB)
  saveProject()        // API call to save changes
}

// ✅ CORRECT: Library State (Composable)
useMarzipano() {
  viewer               // Marzipano.Viewer instance (not serializable)
  scene                // Marzipano.Scene instance (library object)
  currentHotspots      // Map<string, {element, hotspot}> (DOM + library)
  initViewer()         // Initialize library
  updateHotspots()     // Update library objects
}

// ✅ CORRECT: Shared UI State (Composable)
useTourViewer() {
  autoRotateEnabled    // UI preference (doesn't need to persist)
  isFullscreen         // UI state
  showSceneSelector    // Dialog visibility
  toggleFullscreen()   // UI action
}

// ✅ CORRECT: Temporary Interaction State (Component-local)
MarzipanoViewer.vue {
  localDragPosition    // Drag coordinates (updates 60+ times/sec)
  isDragging           // Temporary flag
  draggedElement       // Temporary DOM ref
}
```

**Why This Matters:**

❌ **BAD: Putting drag position in store**
```typescript
// This would cause:
// - 60+ store mutations per second during drag
// - 60+ Vue reactivity evaluations
// - 60+ watcher triggers
// - 60+ immutable array operations
// - Significant performance degradation
projectStore.updateHotspotPosition(id, yaw, pitch) // Called on every mousemove!
```

✅ **GOOD: Local position tracking**
```typescript
// During drag:
localDragPosition.value = coords                    // Local ref only
hotspotEntry.hotspot.setPosition(coords)           // Direct Marzipano API

// On drag end:
emit('hotspotPositionUpdate', coords)              // Single store update
projectStore.updateHotspotPosition(id, yaw, pitch) // One mutation
```

**Benefits of Proper State Classification:**
- 🎯 Clear separation of concerns
- ⚡ Better performance (no reactivity overhead for transient state)
- 🔧 Easier testing (mock library instances separately)
- 📦 Smaller store (only domain data)
- 🚀 Scales better (as app grows)

#### A. Stores (Pinia) - Single Source of Truth

**Stores are responsible for:**
- ALL API calls (no exceptions)
- All domain data state (projects, users, billing, etc.)
- Loading/error states
- Getters for computed values
- Success/error toasts

**Critical Store Rules:**
- ✅ **ALWAYS** use `extendedFetch` from `useExtendedFetch()` for ALL API calls in store actions
- ❌ **NEVER** use `$fetch` directly in stores - it lacks centralized error handling
- ❌ **NEVER** use `$fetch` in components/pages - ALL API calls must go through store actions

**Store Pattern:**

```typescript
// ✅ CORRECT PATTERN
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'

export const useProjectStore = defineStore('project', {
  state: () => ({
    currentProject: null as Project | null,
    projects: [] as Project[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    // Computed values based on state
    currentScene: (state) => {
      if (!state.currentProject) return undefined
      return state.currentProject.scenes.find(s => s.id === state.currentSceneId)
    },

    projectCount: (state) => state.projects.length
  },

  actions: {
    // ALL API calls go here
    async loadProject(projectId: string) {
      try {
        this.loading = true
        this.error = null

        // Use extendedFetch for consistent error handling
        const { extendedFetch } = useExtendedFetch()
        const { ok, payload } = await extendedFetch(`/v1/projects/${projectId}/load`)

        if (ok) {
          this.currentProject = payload.data
          toast.success('Project loaded')
          return true
        }
        return false
      } catch (error: any) {
        this.error = error.message
        // extendedFetch already handled error display
        return false
      } finally {
        this.loading = false
      }
    },

    async updateProject(projectId: string, data: Partial<Project>) {
      try {
        const { extendedFetch } = useExtendedFetch()
        const { ok, payload } = await extendedFetch(`/v1/projects/${projectId}`, {
          method: 'PATCH',
          body: data
        })

        if (ok) {
          // Update state immediately
          if (this.currentProject?.id === projectId) {
            this.currentProject = { ...this.currentProject, ...payload.data }
          }
          toast.success('Project updated')
          return true
        }
        return false
      } catch (error) {
        // extendedFetch already handled error display
        return false
      }
    }
  }
})
```

**Store Rules:**
- ✅ Use `extendedFetch` for ALL API calls (consistent error handling)
- ✅ Store actions show success toasts
- ✅ Store actions update state immediately after success
- ✅ Return success/failure boolean from actions
- ✅ Keep loading/error state in store
- ❌ NEVER make API calls outside store actions

#### B. Composables - Reusable Logic ONLY

**Composables are for:**
- Reusable business logic WITHOUT state
- DOM/browser interactions (useMarzipano, useRetry)
- Complex algorithms or calculations
- NOT for wrapping stores

**When to create composables:**
- ✅ Reusable logic (e.g., `useMarzipano` for viewer setup)
- ✅ Browser APIs (e.g., `useOnlineStatus`)
- ✅ Complex utilities (e.g., `usePanoramaTiler`)

**When NOT to create composables:**
- ❌ Simple store wrappers (just use store directly)
- ❌ Single-use logic (keep in page/component)
- ❌ State management (use stores)

**Examples:**

```typescript
// ❌ BAD - Just a store wrapper (remove this)
export function useBilling() {
  const billingStore = useBillingStore()
  return {
    tier: computed(() => billingStore.tier),
    limits: computed(() => billingStore.limits)
  }
}

// ✅ GOOD - Actual reusable logic
export function useMarzipano() {
  const initViewer = (container: HTMLElement) => {
    // Complex Marzipano initialization logic
  }

  const addHotspot = (scene: Scene, hotspot: Hotspot) => {
    // Hotspot manipulation logic
  }

  return { initViewer, addHotspot }
}

// ✅ GOOD - Browser API interaction
export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine)

  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  })

  return { isOnline }
}
```

#### C. Pages - Consume Store State

**Pages are responsible for:**
- Consuming store state via computed
- Calling store actions for operations
- Local UI state ONLY (modals, filters, search, selected items)
- Rendering components

**Page Pattern:**

```typescript
// ✅ CORRECT PATTERN
<script setup lang="ts">
const projectStore = useProjectStore()
const billingStore = useBillingStore()
const route = useRoute()

// Consume store state via computed
const projects = computed(() => projectStore.projects)
const loading = computed(() => projectStore.loading)
const canCreate = computed(() => billingStore.canCreateProject)
const tier = computed(() => billingStore.tier)

// Local UI state ONLY
const showDialog = ref(false)
const searchQuery = ref('')
const selectedProject = ref<string | null>(null)

// Computed filters (derived from local UI state)
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  return projects.value.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Call store actions for operations
const handleCreate = async () => {
  const success = await projectStore.createProject({
    name: 'New Project'
  })
  if (success) {
    showDialog.value = false
  }
}

const handleDelete = async (id: string) => {
  await projectStore.deleteProject(id)
}

// Load data on mount
onMounted(async () => {
  await projectStore.loadProjects()
  await billingStore.fetchSubscription()
})
</script>
```

**Page Rules:**
- ✅ Use stores directly (e.g., `billingStore.tier`, not `useBilling().tier`)
- ✅ Consume state via computed props
- ✅ Call store actions for ALL operations
- ✅ Keep local UI state for modals, filters, search
- ❌ NEVER call `$fetch` or API directly
- ❌ NEVER duplicate store state locally
- ❌ NEVER create "wrapper" composables for stores

**Bad Pattern (DO NOT DO THIS):**

```typescript
// ❌ BAD - Direct API call in page
const handleSave = async () => {
  const response = await $fetch(`/api/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: formData
  })
  // ...
}

// ❌ BAD - Duplicating store state
const projects = ref([]) // This should come from store!
const fetchProjects = async () => {
  const data = await $fetch('/api/v1/projects')
  projects.value = data
}

// ❌ BAD - Using wrapper composable
const { tier, limits } = useBilling() // Just use billingStore directly!
```

---

### 3. API Call Patterns

**All API calls must:**
1. Go through store actions (no exceptions)
2. Use `extendedFetch` for consistent error handling
3. Update store state on success
4. Show success/error toasts

**API Call Pattern:**

```typescript
// In store actions
async someAction() {
  try {
    // 1. Use extendedFetch (not $fetch)
    const { extendedFetch } = useExtendedFetch()

    // 2. Make API call
    const { ok, payload } = await extendedFetch('/v1/endpoint', {
      method: 'POST',
      body: data
    })

    // 3. Update state on success
    if (ok) {
      this.someState = payload.data
      toast.success('Operation successful')
      return true
    }
    return false
  } catch (error) {
    // extendedFetch already handled error display
    return false
  }
}
```

**Why extendedFetch?**
- Centralized error handling
- Automatic error toasts
- Consistent request headers (tenant ID, request ID)
- Handles authentication redirects

---

### 4. Migration Checklist

#### Current Issues

**Problem 1: API Calls in Pages**
- `app/pages/projects/[id]/settings.vue` makes direct API calls
- `app/pages/tours/[slug].vue` may have direct API calls

**Solution:**
1. Move all `$fetch` calls to store actions
2. Pages should call store actions instead
3. Store actions handle API calls and state updates

**Problem 2: Unnecessary Composable Wrappers**
- `app/composables/useBilling.ts` - just wraps billingStore
- `app/composables/useQuota.ts` - just wraps billingStore

**Solution:**
1. Remove these composables entirely
2. Update all pages to use stores directly:
   ```typescript
   // Before
   const { tier, limits } = useBilling()

   // After
   const billingStore = useBillingStore()
   const tier = computed(() => billingStore.tier)
   const limits = computed(() => billingStore.limits)
   ```

**Problem 3: Inconsistent API Patterns**
- `projectStore` uses `$fetch` directly
- `userStore` uses `extendedFetch`
- Settings page uses `$fetch` directly

**Solution:**
1. Update `projectStore` to use `extendedFetch`
2. Remove all `$fetch` from pages
3. Standardize on `extendedFetch` for consistency

**Problem 4: State Duplication**
- settings.vue has both `form.value` AND vee-validate state
- Some pages have local state that duplicates store state

**Solution:**
1. Remove local form state - use vee-validate only
2. Remove any local state that duplicates store state
3. Only keep local UI state (modals, filters, etc.)

#### Refactoring Example: settings.vue

**Before (BAD):**
```typescript
// Multiple sources of state
const form = ref({
  name: '',
  description: ''
})

// Direct API call
const handleSave = async () => {
  await $fetch(`/api/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: form.value
  })
}

// Load project directly
const loadProject = async () => {
  const response = await $fetch(`/api/v1/projects/${projectId}`)
  form.value = response.data
}
```

**After (GOOD):**
```typescript
// Single source of truth - vee-validate
const { handleSubmit, isSubmitting, setValues } = useForm({
  validationSchema: formSchema
})

// Call store action
const onSubmit = handleSubmit(async (values) => {
  await projectStore.updateProject(projectId, values)
})

// Load from store
onMounted(async () => {
  await projectStore.loadProject(projectId)

  setValues({
    name: projectStore.currentProject?.name || '',
    description: projectStore.currentProject?.description || ''
  })
})
```

---

### 5. Decision Trees

#### Should I Create a Composable?

```
Is this reusable logic without state?
├─ YES: Is it used in 2+ places?
│  ├─ YES → Create composable (e.g., useMarzipano)
│  └─ NO → Keep inline in component
└─ NO: Does it manage state or make API calls?
   └─ YES → Use Pinia store instead
```

#### Should I Extract a Component?

```
Is this UI used in 2+ different pages/features?
├─ YES → Extract to components/
├─ NO: Is it a single-use section over 200 lines?
│  ├─ YES → Consider extracting for maintainability
│  └─ NO → Keep inline in page
└─ Is it part of a design system (buttons, cards)?
   └─ YES → Extract to components/ui/
```

#### Where Should This API Call Go?

```
API call
└─ ALWAYS → Store action
   └─ Page calls store action
      └─ Store updates state
         └─ Page consumes via computed
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

### Frontend

- **Marzipano hotspot lifecycle**: Create hotspots once and track by ID. Use `setPosition()` for updates; never destroy/recreate during position changes. This prevents DOM reference errors when the view changes. See [MARZIPANO.md Section VI](./MARZIPANO.md#vi-hotspot-lifecycle-management---best-practices) for detailed implementation.
- **Reactive data**: Use Vue's reactivity system properly
- **Component composition**: Follow single responsibility principle
- **State management**: Use Pinia stores for shared state

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
