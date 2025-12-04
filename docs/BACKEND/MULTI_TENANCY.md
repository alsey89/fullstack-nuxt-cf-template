# Multi-Tenancy & Workspace Patterns

This guide shows how to add multi-tenancy or workspace support to your SaaS application.

## Overview

The template is **single-tenant by default** for simplicity, but includes ready-made patterns for:
- **Multi-Tenancy** - Isolated data per customer organization
- **Workspace/Team-based** - Multiple workspaces per user
- **User-owned Resources** - Resources owned by individual users

All helpers are already in `QueryHelpers` and ready to use when needed.

---

## When to Use Each Pattern

### 🏢 Multi-Tenancy (B2B SaaS)
**Use when:** Each customer organization needs complete data isolation

**Example:** Project management tool where Acme Corp and TechCo each have separate data

**Schema:**
```typescript
export const projects = sqliteTable("projects", {
  ...baseFields,
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
});
```

**Query:**
```typescript
// All queries are automatically scoped to tenant
QueryHelpers.tenantScoped(schema.projects, tenantId)
```

---

### 👥 Workspace-based (Team Collaboration)
**Use when:** Users can belong to multiple workspaces/teams

**Example:** Slack/Discord model - users join multiple workspaces, each with their own data

**Schema:**
```typescript
export const channels = sqliteTable("channels", {
  ...baseFields,
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
});

export const workspaceMembers = sqliteTable("workspace_members", {
  ...baseFields,
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // owner, admin, member
});
```

**Query:**
```typescript
// Scope queries to workspace
QueryHelpers.workspaceScoped(schema.channels, workspaceId)
```

---

### 👤 User-owned Resources
**Use when:** Resources belong to individual users

**Example:** Personal todo lists, user profiles, preferences

**Schema:**
```typescript
export const todos = sqliteTable("todos", {
  ...baseFields,
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
});
```

**Query:**
```typescript
// Scope to user
QueryHelpers.userOwned(schema.todos, userId)
```

---

## Migration Guide

### Step 1: Choose Your Model

Decide which pattern fits your SaaS:
- B2B with complete isolation? → Multi-tenancy
- Users join multiple teams? → Workspace-based
- Personal resources per user? → User-owned

### Step 2: Update Schema

Add the appropriate column to your tables:

#### Multi-Tenancy Schema
```typescript
// server/database/schema/yourTable.ts
import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { baseFields } from "./base";

export const projects = sqliteTable(
  "projects",
  {
    ...baseFields,
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (table) => ({
    // Important: Index tenantId for performance
    tenantIdIdx: index("idx_projects_tenant_id").on(table.tenantId),
  })
);
```

#### Workspace-based Schema
```typescript
export const projects = sqliteTable(
  "projects",
  {
    ...baseFields,
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("idx_projects_workspace_id").on(table.workspaceId),
  })
);

// Junction table for workspace membership
export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    ...baseFields,
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // 'owner' | 'admin' | 'member'
  },
  (table) => ({
    workspaceUserIdx: index("idx_workspace_members_workspace_user").on(
      table.workspaceId,
      table.userId
    ),
  })
);
```

### Step 3: Generate Migration

```bash
npm run db:generate
```

Review the migration in `server/database/migrations/` before applying.

### Step 4: Update Repositories

Replace `QueryHelpers.notDeleted()` with scoped helpers:

**Before (Single-tenant):**
```typescript
async findById(id: string): Promise<Project | null> {
  const result = await this.drizzle
    .select()
    .from(schema.projects)
    .where(
      QueryHelpers.notDeleted(schema.projects, eq(schema.projects.id, id))
    )
    .limit(1);

  return result[0] || null;
}
```

**After (Multi-tenant):**
```typescript
async findById(id: string, tenantId: string): Promise<Project | null> {
  const result = await this.drizzle
    .select()
    .from(schema.projects)
    .where(
      QueryHelpers.tenantScoped(
        schema.projects,
        tenantId,
        eq(schema.projects.id, id)
      )
    )
    .limit(1);

  return result[0] || null;
}
```

**After (Workspace-based):**
```typescript
async findById(id: string, workspaceId: string): Promise<Project | null> {
  const result = await this.drizzle
    .select()
    .from(schema.projects)
    .where(
      QueryHelpers.workspaceScoped(
        schema.projects,
        workspaceId,
        eq(schema.projects.id, id)
      )
    )
    .limit(1);

  return result[0] || null;
}
```

### Step 5: Update Services

Pass tenantId/workspaceId from event context:

```typescript
export class ProjectService extends BaseService {
  constructor(event: H3Event, repos: RepositoryContainer) {
    super(event, repos);
  }

  async getProject(projectId: string) {
    // Multi-tenant: Get tenantId from context
    const tenantId = this.tenantId;
    if (!tenantId) {
      throw new AuthenticationError("Tenant context required");
    }

    const project = await this.repos.project.findById(projectId, tenantId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    return project;
  }
}
```

### Step 6: Update Middleware

Add tenant/workspace resolution to auth middleware:

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (session?.user) {
    event.context.userId = session.user.id;

    // Add tenant context
    event.context.tenantId = session.user.tenantId;

    // OR add workspace context
    // Get from header/query/subdomain
    const workspaceId = getRequestHeader(event, "x-workspace-id");
    event.context.workspaceId = workspaceId;
  }
});
```

---

## Available QueryHelpers

### `tenantScoped(table, tenantId, ...conditions)`

Filters by tenant ID + soft delete + additional conditions.

```typescript
// Simple tenant scope
QueryHelpers.tenantScoped(schema.projects, tenantId);

// With additional conditions
QueryHelpers.tenantScoped(
  schema.projects,
  tenantId,
  eq(schema.projects.status, "active")
);
```

### `workspaceScoped(table, workspaceId, ...conditions)`

Filters by workspace ID + soft delete + additional conditions.

```typescript
// Simple workspace scope
QueryHelpers.workspaceScoped(schema.channels, workspaceId);

// With additional conditions
QueryHelpers.workspaceScoped(
  schema.channels,
  workspaceId,
  eq(schema.channels.isPrivate, false)
);
```

### `userOwned(table, userId, ...conditions)`

Filters by user ID + soft delete + additional conditions.

```typescript
// Simple user ownership
QueryHelpers.userOwned(schema.todos, userId);

// With additional conditions
QueryHelpers.userOwned(
  schema.todos,
  userId,
  eq(schema.todos.completed, false)
);
```

---

## Multi-Tenant Context Flow

### 1. Request arrives
```
GET /api/v1/projects/123
Header: Authorization: Bearer <token>
```

### 2. Auth middleware extracts tenant
```typescript
// server/middleware/auth.ts
const session = await getUserSession(event);
event.context.tenantId = session.user.tenantId;
```

### 3. Service uses tenant from context
```typescript
// server/services/project.ts
async getProject(projectId: string) {
  const tenantId = this.tenantId; // From BaseService
  return await this.repos.project.findById(projectId, tenantId);
}
```

### 4. Repository scopes query
```typescript
// server/repositories/project.ts
async findById(id: string, tenantId: string) {
  return await this.drizzle
    .select()
    .from(schema.projects)
    .where(
      QueryHelpers.tenantScoped(schema.projects, tenantId, eq(schema.projects.id, id))
    )
    .limit(1);
}
```

### Result: Automatic tenant isolation ✅

---

## Workspace Membership Pattern

For workspace-based SaaS, check membership before accessing resources:

### Schema
```typescript
export const workspaceMembers = sqliteTable("workspace_members", {
  ...baseFields,
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // 'owner' | 'admin' | 'member'
});
```

### Service Method
```typescript
async getProject(projectId: string, workspaceId: string) {
  const userId = this.requireAuth();

  // Check workspace membership
  const isMember = await this.repos.workspace.isMember(workspaceId, userId);
  if (!isMember) {
    throw new AuthorizationError("Not a workspace member");
  }

  // Fetch project scoped to workspace
  const project = await this.repos.project.findById(projectId, workspaceId);
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return project;
}
```

---

## Common Patterns

### Pattern 1: Tenant from Subdomain

```typescript
// server/middleware/tenant.ts
export default defineEventHandler((event) => {
  const host = getRequestHeader(event, "host");
  const subdomain = host?.split(".")[0];

  // Map subdomain to tenantId
  // e.g., acme.yourapp.com -> tenantId: "tenant_acme"
  if (subdomain && subdomain !== "www") {
    event.context.tenantId = `tenant_${subdomain}`;
  }
});
```

### Pattern 2: Workspace from Header

```typescript
// server/middleware/workspace.ts
export default defineEventHandler((event) => {
  const workspaceId = getRequestHeader(event, "x-workspace-id");

  if (workspaceId) {
    event.context.workspaceId = workspaceId;
  }
});
```

### Pattern 3: Dynamic Workspace Selection

```typescript
// API route: GET /api/v1/workspaces/:workspaceId/projects
export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, "workspaceId");
  const userId = event.context.userId;

  // Verify membership
  const service = createProjectService(event);
  return await service.listProjects(workspaceId, userId);
});
```

---

## Testing Multi-Tenancy

### Test Data Isolation

```typescript
// Test that tenantA cannot see tenantB's data
describe("Multi-tenant isolation", () => {
  it("should not return projects from other tenants", async () => {
    const tenantA = "tenant_a";
    const tenantB = "tenant_b";

    // Create project in tenantA
    await createProject({ name: "Project A", tenantId: tenantA });

    // Query as tenantB
    const projects = await repo.list(tenantB);

    // Should not see tenantA's project
    expect(projects).toHaveLength(0);
  });
});
```

---

## Security Checklist

When implementing multi-tenancy:

- [ ] **Never trust client-provided tenant/workspace IDs**
  - Always derive from authenticated session
  - Validate membership before accessing resources

- [ ] **Always use scoped helpers in repositories**
  - Use `tenantScoped()` / `workspaceScoped()` everywhere
  - Never query without tenant/workspace filter

- [ ] **Index tenant/workspace columns**
  - Add indexes for performance: `index("idx_tenant_id").on(table.tenantId)`

- [ ] **Test data isolation**
  - Write tests verifying tenants can't access each other's data

- [ ] **Audit sensitive operations**
  - Log tenant/workspace changes
  - Track cross-tenant access attempts

- [ ] **Handle cascade deletes**
  - When deleting tenant/workspace, clean up all related data

---

## Related Documentation

**Prerequisites:**
- [Common Pitfalls](../CONVENTIONS/COMMON_PITFALLS.md#database--repositories) - Repository patterns
- [Services](./SERVICES.md) - Service patterns and context

**Deep Dive:**
- [RBAC](./RBAC.md) - Role-based access control
- [Error Handling](./ERROR_HANDLING.md) - Authorization errors

---

**Last Updated:** 2025-12-04
