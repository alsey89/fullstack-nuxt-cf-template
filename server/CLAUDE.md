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
- **Services** contain business logic, validate tenant context, throw errors
- **Repositories** are pure data access (no business logic)

## Terminology

| Term | Usage |
|------|-------|
| **tenant / tenantId** | Backend isolation context - used in middleware, session, service layer |
| **workspace** | User-facing entity - the `workspaces` table that users see and manage |

The same backend `tenantId` maps to a user-facing "workspace" (or could be "organization", "team", etc. depending on your app's branding).

## Service Pattern

```typescript
export class XxxService {
  private readonly tenantId: string;

  constructor(
    private readonly event: H3Event,
    private readonly xxxRepo: XxxRepository
  ) {
    this.tenantId = event.context.tenantId;

    // ALWAYS validate tenant context for tenant-scoped services
    if (!this.tenantId) {
      throw new TenantContextMissingError();
    }
  }
}

// Factory function
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
  // tenantId is REQUIRED for tenant-scoped entities
  async findById(id: string, tenantId: string): Promise<Entity | null> {
    const conditions = [
      Conditions.notDeleted(schema.entities),
      Conditions.tenantScoped(schema.entities, tenantId),
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
  async list(tenantId: string, filters: ListFilters): Promise<Entity[]> {
    const { search, status, ownerId } = filters;

    // Build conditions as flat array - each returns SQL | undefined
    const conditions = [
      Conditions.notDeleted(schema.entities),
      Conditions.tenantScoped(schema.entities, tenantId),
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

// Tenant scoping (for tenantId column)
Conditions.tenantScoped(table, tenantId)

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

## Tenant Isolation

Every tenant-scoped query MUST include `tenantId`:

```typescript
// ✅ Correct - tenant scoped
const conditions = [
  Conditions.notDeleted(schema.projects),
  Conditions.tenantScoped(schema.projects, tenantId),
  eq(schema.projects.id, id),
];

// ❌ Wrong - no tenant filter (data leakage!)
const conditions = [
  Conditions.notDeleted(schema.projects),
  eq(schema.projects.id, id),
];
```

**Global entities (no tenantId):** `users`
**Tenant-scoped entities:** `workspaces`, `workspace_members`, `workspace_invites`, `audit_logs`, and your domain tables

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

## Middleware Stack

Ordered by filename prefix:
1. `00.request-context.ts` - Capture request ID, IP, user agent
2. `01.workspace.ts` - Set database binding
3. `02.auth.ts` - Validate session, set userId and tenantId from session
4. `03.rate-limit.ts` - Rate limiting

Context variables available after middleware:
- `event.context.db` - D1 database instance
- `event.context.userId` - Authenticated user ID (if logged in)
- `event.context.tenantId` - Current tenant/workspace ID (from session)

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

## Database Migrations

Always use Drizzle to generate migrations:

```bash
npm run db:generate         # Generate migration
npm run db:migrate:local    # Apply locally
```
