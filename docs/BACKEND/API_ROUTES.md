# API Route Patterns

API routes are HTTP handlers that validate requests, delegate to services, and return standardized responses.

## Quick Reference

**File Naming:** `{resource}.{method}.ts` or `[id].{method}.ts`

**Standard Pattern:**

```
1. Validate + Sanitize Input
2. Create Service (factory function)
3. Execute Business Logic
4. Return Standardized Response
```

**Key Rules:**

- Validate first (Zod schemas)
- Delegate to services (no business logic in routes)
- Use response helpers (`createSuccessResponse`)
- Let middleware handle errors (don't catch)

---

## Standard API Route Pattern

Every API route should follow this structure:

```typescript
// server/api/v1/examples/index.post.ts
import {
  validateAndSanitize,
  SanitizationPresets,
} from "#server/utils/validation";
import { createExampleSchema } from "#shared/validators";
import { createExampleService } from "#server/services";
import { createSuccessResponse } from "#server/utils/response";

export default defineEventHandler(async (event) => {
  // 1. Read and validate + sanitize input
  const body = await readBody(event);
  const data = validateAndSanitize(
    createExampleSchema,
    body,
    SanitizationPresets.text // Or custom rules
  );

  // 2. Call service
  const service = createExampleService(event);
  const example = await service.createExample(data);

  // 3. Return standard response
  return createSuccessResponse("Example created", example);
});
```

---

## File Naming Conventions

### Standard Routes

```
server/api/v1/
├── examples/
│   ├── index.get.ts           # GET /api/v1/examples (list)
│   ├── index.post.ts          # POST /api/v1/examples (create)
│   ├── [id].get.ts            # GET /api/v1/examples/:id (get one)
│   ├── [id].patch.ts          # PATCH /api/v1/examples/:id (update)
│   ├── [id].delete.ts         # DELETE /api/v1/examples/:id (delete)
│   └── [id]/
│       └── activate.post.ts   # POST /api/v1/examples/:id/activate
```

### Nested Resources

```
server/api/v1/
└── projects/
    └── [projectId]/
        ├── tasks/
        │   ├── index.get.ts   # GET /api/v1/projects/:projectId/tasks
        │   └── index.post.ts  # POST /api/v1/projects/:projectId/tasks
        └── members/
            ├── index.get.ts   # GET /api/v1/projects/:projectId/members
            └── index.post.ts  # POST /api/v1/projects/:projectId/members
```

---

## Validation & Sanitization

### Using Validation Schemas

```typescript
import {
  validateAndSanitize,
  SanitizationPresets,
  mergeSanitizationRules,
} from "#server/utils/validation";
import { createUserSchema } from "#shared/validators";

// Basic validation with sanitization
const data = validateAndSanitize(
  createUserSchema,
  body,
  SanitizationPresets.user
);

// Merge multiple sanitization presets
const data = validateAndSanitize(
  createLocationSchema,
  body,
  mergeSanitizationRules(
    SanitizationPresets.text,
    SanitizationPresets.contact,
    SanitizationPresets.address
  )
);
```

### Sanitization Presets

```typescript
// Available presets
SanitizationPresets.text; // name, title, description
SanitizationPresets.contact; // email, phone
SanitizationPresets.address; // address, city, state, etc.
SanitizationPresets.company; // all company fields
SanitizationPresets.user; // firstName, lastName, email, phone
```

### Custom Sanitization Rules

```typescript
const customRules = {
  email: "email",
  name: "text",
  phone: "phone",
  description: "description",
};

const data = validateAndSanitize(schema, body, customRules);
```

---

## Response Formatting

### Success Responses

```typescript
import { createSuccessResponse } from "#server/utils/response";

// Simple success
return createSuccessResponse("User created", user);

// With pagination
return createSuccessResponse("Users retrieved", users, {
  page: 1,
  perPage: 20,
  total: 100,
});

// With metadata
return createSuccessResponse("Report generated", report, {
  generatedAt: new Date(),
  format: "pdf",
});
```

### Response Format

```typescript
// Success response structure
{
  success: true,
  message: "Operation completed",
  data: { ... },
  metadata: {
    page: 1,
    perPage: 20,
    total: 100
  }
}

// Error response structure (handled by middleware)
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: { field: "email", message: "Invalid email" },
    traceId: "abc123"
  }
}
```

---

## HTTP Methods & Patterns

### GET - Retrieve Resources

```typescript
// List resources
// GET /api/v1/examples
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const perPage = parseInt(query.perPage as string) || 20;

  const service = createExampleService(event);
  const result = await service.listExamples({ page, perPage });

  return createSuccessResponse("Examples retrieved", result.items, {
    page,
    perPage,
    total: result.total,
  });
});

// Get single resource
// GET /api/v1/examples/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;

  const service = createExampleService(event);
  const example = await service.getExample(id);

  return createSuccessResponse("Example retrieved", example);
});
```

### POST - Create Resources

```typescript
// POST /api/v1/examples
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const data = validateAndSanitize(
    createExampleSchema,
    body,
    SanitizationPresets.text
  );

  const service = createExampleService(event);
  const example = await service.createExample(data);

  return createSuccessResponse("Example created", example);
});
```

### PATCH - Update Resources

```typescript
// PATCH /api/v1/examples/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const body = await readBody(event);
  const data = validateAndSanitize(
    updateExampleSchema,
    body,
    SanitizationPresets.text
  );

  const service = createExampleService(event);
  const example = await service.updateExample(id, data);

  return createSuccessResponse("Example updated", example);
});
```

### DELETE - Remove Resources

```typescript
// DELETE /api/v1/examples/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;

  const service = createExampleService(event);
  await service.deleteExample(id);

  return createSuccessResponse("Example deleted", { id });
});
```

---

## Query Parameters

### Pagination

```typescript
import { normalizePagination } from "#server/utils/response";

const query = getQuery(event);
const pagination = normalizePagination({
  page: query.page ? parseInt(query.page as string) : 1,
  perPage: query.perPage ? parseInt(query.perPage as string) : 20,
});

// Use in service
const result = await service.listExamples(pagination);
```

### Filtering

```typescript
const query = getQuery(event);
const filters = {
  status: query.status as string | undefined,
  type: query.type as string | undefined,
  search: query.search as string | undefined,
  startDate: query.startDate as string | undefined,
  endDate: query.endDate as string | undefined,
};

const result = await service.listExamples(filters, pagination);
```

### Sorting

```typescript
const query = getQuery(event);
const sort = {
  field: (query.sortBy as string) || "createdAt",
  order: (query.sortOrder as "asc" | "desc") || "desc",
};

const result = await service.listExamples({ ...filters, ...sort });
```

---

## Location-Scoped Routes

For resources that belong to a specific location (shifts, timesheets, clock events), use location-scoped routes.

### URL Pattern

```
/api/v1/location/{locationId}/resource
```

**Examples:**

```
GET  /api/v1/location/loc_abc123/shifts
POST /api/v1/location/loc_abc123/shifts
GET  /api/v1/location/loc_abc123/clock-events
POST /api/v1/location/loc_abc123/clock-in
```

### Middleware Validation

The `03.location-context.ts` middleware automatically:

- Extracts `locationId` from URL
- Verifies user has access to the location (via `session.locationIds`)
- Sets `event.context.locationId` for route handlers
- Throws `PermissionDeniedError` if user lacks access

**Session-based verification (0 DB queries - fast!):**

```typescript
// Session contains locationIds array
{
  user: { id: string },
  tenantId: string,
  locationIds: ["loc_abc", "loc_def"]  // Accessible locations
}
```

### Example: Location-Scoped List

```typescript
// server/api/v1/location/[locationId]/shifts/index.get.ts
import { requirePermission } from "#server/utils/permissions";

export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, "shifts:read");

  // locationId already validated by middleware
  const locationId = event.context.locationId!;

  // Optional filters
  const query = getQuery(event);
  const filters = {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    status: query.status as string | undefined,
  };

  // Pagination
  const pagination = normalizePagination({
    page: query.page ? parseInt(query.page as string) : 1,
    perPage: query.perPage ? parseInt(query.perPage as string) : 20,
  });

  const service = createShiftService(event);
  const result = await service.listShifts(locationId, filters, pagination);

  return createSuccessResponse("Shifts retrieved", result.items, {
    page: pagination.page,
    perPage: pagination.perPage,
    total: result.total,
  });
});
```

### Example: Location-Scoped Create

```typescript
// server/api/v1/location/[locationId]/shifts/index.post.ts
export default defineEventHandler(async (event) => {
  await requirePermission(event, "shifts:create");

  const locationId = event.context.locationId!;

  const body = await readBody(event);
  const data = validateAndSanitize(
    createShiftSchema,
    body,
    SanitizationPresets.text
  );

  const service = createShiftService(event);
  const shift = await service.createShift(locationId, data);

  return createSuccessResponse("Shift created", shift);
});
```

---

## Permission Checks

### Manual Permission Checks

```typescript
import {
  requirePermission,
  requireAnyPermission,
  hasPermission,
} from "#server/utils/permissions";

// Require single permission
await requirePermission(event, "users:create");

// Require any of multiple permissions
await requireAnyPermission(event, ["users:read", "users:read:all"]);

// Check permission (returns boolean)
const canEdit = await hasPermission(event, "projects:update");
if (!canEdit) {
  throw new AuthorizationError("Insufficient permissions");
}
```

### Automatic Middleware Detection

```typescript
// GET /api/v1/location/{id}/shifts
// Middleware automatically checks 'shifts:read' + location access

// GET /api/v1/timekeeping/shifts
// Middleware automatically checks 'shifts:read:all'
```

---

## Error Handling

### Let Middleware Handle Errors

```typescript
// ✅ GOOD: Throw errors, let middleware handle
export default defineEventHandler(async (event) => {
  const service = createExampleService(event);
  const example = await service.getExample(id); // Throws NotFoundError if missing
  return createSuccessResponse("Example retrieved", example);
});

// ❌ BAD: Catching errors manually
export default defineEventHandler(async (event) => {
  try {
    const service = createExampleService(event);
    const example = await service.getExample(id);
    return { success: true, data: example };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Common Error Types

```typescript
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DuplicateError,
  BusinessRuleError,
} from "#server/error/errors";

// Service throws
if (!user) {
  throw new NotFoundError("User", userId);
}

if (emailExists) {
  throw new DuplicateError("email", email);
}

if (!hasPermission) {
  throw new AuthorizationError("Insufficient permissions");
}

if (hasActiveTasks) {
  throw new BusinessRuleError("Cannot delete project with active tasks");
}
```

---

## Route Patterns

### Self-Service Routes

```typescript
// /api/v1/me/*
// User-specific resources (own data)

// GET /api/v1/me/profile
export default defineEventHandler(async (event) => {
  const userId = event.context.userId!;
  const service = createUserService(event);
  const profile = await service.getOwnProfile(userId);
  return createSuccessResponse("Profile retrieved", profile);
});
```

### Admin Routes

```typescript
// /api/v1/users/*
// Admin operations on all users

// GET /api/v1/users
export default defineEventHandler(async (event) => {
  await requirePermission(event, "users:read:all");

  const service = createUserService(event);
  const users = await service.listAllUsers();
  return createSuccessResponse("Users retrieved", users);
});
```

### Manager Routes (Location-Scoped)

```typescript
// /api/v1/location/{locationId}/team/*
// Manager operations scoped to their location

// GET /api/v1/location/:locationId/team/members
export default defineEventHandler(async (event) => {
  await requirePermission(event, "team:read");

  const locationId = event.context.locationId!;
  const service = createTeamService(event);
  const members = await service.listTeamMembers(locationId);
  return createSuccessResponse("Team members retrieved", members);
});
```

---

## Complete Examples

### Complete CRUD Routes

```typescript
// server/api/v1/projects/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const pagination = normalizePagination({
    page: parseInt(query.page as string) || 1,
    perPage: parseInt(query.perPage as string) || 20,
  });

  const service = createProjectService(event);
  const result = await service.listProjects(pagination);

  return createSuccessResponse("Projects retrieved", result.items, {
    page: pagination.page,
    perPage: pagination.perPage,
    total: result.total,
  });
});

// server/api/v1/projects/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const data = validateAndSanitize(
    createProjectSchema,
    body,
    SanitizationPresets.text
  );

  const service = createProjectService(event);
  const project = await service.createProject(data);

  return createSuccessResponse("Project created", project);
});

// server/api/v1/projects/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;

  const service = createProjectService(event);
  const project = await service.getProject(id);

  return createSuccessResponse("Project retrieved", project);
});

// server/api/v1/projects/[id].patch.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const body = await readBody(event);
  const data = validateAndSanitize(
    updateProjectSchema,
    body,
    SanitizationPresets.text
  );

  const service = createProjectService(event);
  const project = await service.updateProject(id, data);

  return createSuccessResponse("Project updated", project);
});

// server/api/v1/projects/[id].delete.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;

  const service = createProjectService(event);
  await service.deleteProject(id);

  return createSuccessResponse("Project deleted", { id });
});
```

---

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](../CONVENTIONS/COMMON_PITFALLS.md#api-routes--validation) - Route mistakes to avoid
- [Development Checklists](../CONVENTIONS/CHECKLISTS.md#new-api-endpoint-checklist) - Step-by-step guide

**Deep Dive:**

- [Services](./SERVICES.md) - Service layer patterns
- [Error Handling](./ERROR_HANDLING.md) - Error classes and codes
- [RBAC](./RBAC.md) - Permission system

**Related:**

- [Backend Guide](./README.md) - Backend overview
- [Complete Conventions](../CLAUDE.md) - Full patterns
