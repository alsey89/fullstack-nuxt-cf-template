# Server Backend Conventions

Quick reference for Claude when working on the backend.

## API Response Structure

All endpoints return this structure:

```typescript
{
  message: string;           // Developer message
  data: T | null;            // Actual data
  error: ApiError | null;    // Error details
  pagination?: Pagination;   // SIBLING to data, NOT nested
}
```

Use `createSuccessResponse()` from `server/lib/response.ts`.

## Architecture Layers

```
API Route → Service → Repository → Database
```

- **API routes** validate input, call services, return responses
- **Services** contain business logic, validate workspace context, throw errors
- **Repositories** are pure data access (no business logic)

## Service Pattern

There are two types of services:

### Workspace-Scoped Services (require workspaceId)
For services that operate on workspace-specific data:

```typescript
export class ProjectService {
  private readonly workspaceId: string;

  constructor(
    private readonly event: H3Event,
    private readonly projectRepo: ProjectRepository
  ) {
    this.workspaceId = event.context.workspaceId;

    // ALWAYS validate workspace context for workspace-scoped services
    if (!this.workspaceId) {
      throw new WorkspaceContextMissingError();
    }
  }
}
```

### Global Services (no workspaceId requirement)
For services that operate on global entities (like users):

```typescript
export class IdentityService {
  private readonly userId?: string;  // Optional, set after auth

  constructor(
    private readonly event: H3Event,
    private readonly userRepo: UserRepository
  ) {
    // No workspace validation - users are global entities
    this.userId = event.context.userId;
  }
}
```

### Factory Function Pattern
```typescript
export function createXxxService(event: H3Event): XxxService {
  const db = getDatabase(event);
  return new XxxService(event, new XxxRepository(db));
}
```

## Repository Pattern with Conditions

Use the flat array pattern with `Conditions` helpers:

```typescript
import { Conditions } from "#server/repositories/helpers/conditions";

export class XxxRepository extends BaseRepository {
  // workspaceId is REQUIRED for workspace-scoped entities
  async findById(id: string, workspaceId: string): Promise<Entity | null> {
    const conditions = [
      Conditions.notDeleted(schema.entities),
      Conditions.workspaceScoped(schema.entities, workspaceId),
      eq(schema.entities.id, id),
    ];

    const result = await this.drizzle
      .select()
      .from(schema.entities)
      .where(and(...conditions))
      .limit(1);

    return result[0] || null;
  }

  // Complex queries with optional filters
  async list(workspaceId: string, filters: ListFilters): Promise<Entity[]> {
    const { search, status, ownerId } = filters;

    // Build conditions as flat array - each returns SQL | undefined
    const conditions = [
      Conditions.notDeleted(schema.entities),
      Conditions.workspaceScoped(schema.entities, workspaceId),
      Conditions.search([schema.entities.name, schema.entities.description], search),
      status ? eq(schema.entities.status, status) : undefined,
      ownerId ? eq(schema.entities.ownerId, ownerId) : undefined,
    ];

    // Combine at the end - filter(Boolean) removes undefined
    return this.drizzle
      .select()
      .from(schema.entities)
      .where(and(...conditions.filter(Boolean)));
  }
}
```

## Conditions Helpers

Located at `server/repositories/helpers/conditions.ts`:

```typescript
// Soft delete filter
Conditions.notDeleted(table)

// Workspace scoping (for workspaceId column)
Conditions.workspaceScoped(table, workspaceId)

// User ownership
Conditions.userOwned(table, userId)

// Multi-column search (returns undefined if no term)
Conditions.search([table.name, table.email], searchTerm)

// Date range (returns undefined if no dates)
Conditions.dateRange(column, startDate, endDate)

// Active records (not deleted AND isActive = true)
Conditions.activeOnly(table)

// Combine conditions with AND/OR
Conditions.all(condition1, condition2, maybeUndefined)
Conditions.any(condition1, condition2)
```

**Note:** For junction tables like `workspace_members` that use `workspaceId` as a foreign key, use `eq(table.workspaceId, id)` directly - this is a FK reference, not workspace isolation.

## Workspace Isolation

Every workspace-scoped query MUST include `workspaceId`:

```typescript
// ✅ Correct - workspace scoped
const conditions = [
  Conditions.notDeleted(schema.projects),
  Conditions.workspaceScoped(schema.projects, workspaceId),
  eq(schema.projects.id, id),
];

// ❌ Wrong - no workspace filter (data leakage!)
const conditions = [
  Conditions.notDeleted(schema.projects),
  eq(schema.projects.id, id),
];
```

**Global entities (no workspaceId):** `users`
**Workspace-scoped entities:** `workspaces`, `workspace_members`, `workspace_invites`, `audit_logs`, and your domain tables

## RBAC (Config-Based)

Roles are defined in `server/config/rbac.ts` - no database tables needed.

### Role Hierarchy

| Level | Field | Use Case |
|-------|-------|----------|
| Global | `users.role` | Platform-wide role (e.g., super admin) |
| Workspace | `workspace_members.role` | Role within a specific workspace |

Both use the same role names from `DEFAULT_ROLES` config.

### Using RBAC

```typescript
// Check permission
const rbacService = getRBACService(event);
await rbacService.requirePermission("users:create");

// Get user permissions (looks up from config based on user.role)
const permissions = await rbacService.getUserPermissions(userId);
```

To extend roles, edit `DEFAULT_ROLES` in `server/config/rbac.ts`.

## Time Handling

### Architecture

```
Database:     INTEGER (Unix milliseconds, always UTC)
Application:  Date objects (JavaScript standard)
API:          ISO 8601 strings (with timezone offsets)
Drizzle:      Automatic Date ↔ integer conversion
```

### Rules

1. Always store timestamps in UTC (no timezone ambiguity)
2. Use Date objects in application code (type-safe)
3. Let Drizzle handle Date ↔ integer conversion automatically
4. Never manually convert: `Math.floor(date.getTime())` - Drizzle does this
5. Store location timezones for business logic (IANA format, e.g., `America/Los_Angeles`)
6. Convert to local timezone only at presentation layer

### Key Functions

```typescript
import { parseISODate, formatInTimezone, addDays } from '#server/lib/time';

// API input → Date
const date = parseISODate(body.startDate);

// Date → Display (for emails, reports, etc.)
const display = formatInTimezone(date, 'America/Los_Angeles', 'h:mm A');

// Date arithmetic
const nextWeek = addDays(date, 7);
```

## Error Handling

```typescript
// Specific error (FE shows specific message)
throw new UploadSizeExceededError(MAX_SIZE, file.size);

// Generic error
throw new NotFoundError("Project not found");

// With details for frontend
throw new ValidationError("Invalid input", { field: "email" });
```

Error codes are shared in `shared/error/codes.ts` for frontend i18n mapping.

## Validation

Use Zod schemas from `shared/validators/`:

```typescript
const body = await readBody(event);
const validated = createProjectSchema.parse(body);
```

## Pagination

```typescript
import { normalizePagination, calculatePagination } from "#server/utils/pagination";

const { limit, offset } = normalizePagination(page, perPage);
const { items, total } = await service.list({ limit, offset });
const pagination = calculatePagination(page, perPage, total);

return createSuccessResponse("Items retrieved", items, pagination);
```

## Route Configuration

Route metadata is centralized in `server/config/routes.ts`:

```typescript
import { isPublicRoute, getRateLimitConfig } from "#server/config/routes";

// Check if route is public (no auth required)
if (isPublicRoute(path)) { ... }

// Get rate limit config for a route
const config = getRateLimitConfig(path);
```

To add a new route:
1. Add entry to `ROUTE_CONFIG` array in `server/config/routes.ts`
2. Set `public: true` if no auth required
3. Add `rateLimit` with matching binding name from wrangler.jsonc

## Middleware Stack

Ordered by filename prefix:
1. `00.request-context.ts` - Capture request ID, IP, user agent
2. `01.workspace.ts` - Set database binding
3. `02.auth.ts` - Validate session, set userId and workspaceId (uses route config for public routes)
4. `03.rate-limit.ts` - Rate limiting (uses route config for rate limit settings)

Context variables available after middleware:
- `event.context.db` - D1 database instance
- `event.context.userId` - Authenticated user ID (if logged in)
- `event.context.workspaceId` - Current workspace ID (from session)

## SafeUser Pattern

Never expose `passwordHash` in responses:

```typescript
// In relational queries
const result = await this.drizzle.query.messages.findMany({
  with: {
    user: { columns: safeUserRelationColumns },  // Excludes passwordHash
  },
});
```

## Adding a New Domain

Step-by-step guide for adding a new domain entity (e.g., "Project", "Invoice", "Task"):

### 1. Schema (`server/database/schema/`)

Create `server/database/schema/{domain}.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users, workspaces } from "./identity";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});
```

Export from `server/database/schema/index.ts`.

### 2. Repository (`server/repositories/`)

Create `server/repositories/{domain}.ts`:

```typescript
import { and, eq } from "drizzle-orm";
import * as schema from "#server/database/schema";
import { Conditions } from "#server/repositories/helpers/conditions";
import { BaseRepository } from "./base";

export class ProjectRepository extends BaseRepository {
  async findById(id: string, workspaceId: string) {
    const conditions = [
      Conditions.notDeleted(schema.projects),
      Conditions.workspaceScoped(schema.projects, workspaceId),
      eq(schema.projects.id, id),
    ];

    const result = await this.drizzle
      .select()
      .from(schema.projects)
      .where(and(...conditions))
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewProject) {
    const result = await this.drizzle
      .insert(schema.projects)
      .values(data)
      .returning();
    return result[0];
  }
}
```

### 3. Service (`server/services/`)

Create `server/services/{domain}.ts`:

```typescript
import type { H3Event } from "h3";
import { ProjectRepository } from "#server/repositories/project";
import { WorkspaceContextMissingError, NotFoundError } from "#server/error/errors";
import { getDatabase } from "#server/lib/database";

export class ProjectService {
  private readonly workspaceId: string;

  constructor(
    private readonly event: H3Event,
    private readonly projectRepo: ProjectRepository
  ) {
    this.workspaceId = event.context.workspaceId;
    if (!this.workspaceId) {
      throw new WorkspaceContextMissingError();
    }
  }

  async getById(id: string) {
    const project = await this.projectRepo.findById(id, this.workspaceId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }
}

export function createProjectService(event: H3Event) {
  const db = getDatabase(event);
  return new ProjectService(event, new ProjectRepository(db));
}
```

### 4. Validator (`shared/validators/`)

Create `shared/validators/{domain}.ts`:

```typescript
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
```

### 5. API Routes (`server/api/v1/`)

Create `server/api/v1/{domain}/`:

```typescript
// server/api/v1/projects/index.get.ts
import { createProjectService } from "#server/services/project";
import { createSuccessResponse } from "#server/lib/response";

export default defineEventHandler(async (event) => {
  const service = createProjectService(event);
  const projects = await service.list();
  return createSuccessResponse("Projects retrieved", projects);
});

// server/api/v1/projects/index.post.ts
import { createProjectService } from "#server/services/project";
import { createProjectSchema } from "#shared/validators/project";
import { createSuccessResponse } from "#server/lib/response";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validated = createProjectSchema.parse(body);
  const service = createProjectService(event);
  const project = await service.create(validated);
  return createSuccessResponse("Project created", project);
});
```

### 6. Generate Migration

```bash
npm run db:generate
npm run db:migrate:local
```

### Checklist

- [ ] Schema with `workspaceId`, `createdAt`, `updatedAt`, `deletedAt`
- [ ] Repository using `Conditions.workspaceScoped()`
- [ ] Service with `WorkspaceContextMissingError` check
- [ ] Shared validators for input
- [ ] API routes using factory pattern
- [ ] Migration generated and applied

## Database Migrations

Always use Drizzle to generate migrations:

```bash
npm run db:generate         # Generate migration
npm run db:migrate:local    # Apply locally
```
