# Nuxt Cloudflare Template

Full-stack template for Nuxt 4 on Cloudflare Workers with authentication, RBAC, and workspace multi-tenancy.

## Quick Reference

- **Template ethos:** `docs/ETHOS.md`
- **Backend conventions:** `server/CLAUDE.md`
- **Frontend conventions:** `app/CLAUDE.md`
- **Setup guide:** `docs/TEMPLATE_SETUP.md`
- **OAuth setup:** `docs/OAUTH_SETUP.md`

## Architecture Overview

### Tech Stack
- **Runtime:** Cloudflare Workers (Nuxt 4 with Nitro)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle
- **Auth:** nuxt-auth-utils (session-based)
- **UI:** shadcn-vue + Tailwind CSS

### Layer Flow
```
API Routes (server/api/**/*.ts)
    ↓
Middleware (tenant context, auth, rate limiting)
    ↓
Service Layer (business logic, request-scoped)
    ↓
Repository Layer (data access)
    ↓
Database (Drizzle ORM → D1)
```

### Terminology

| Term | Usage |
|------|-------|
| **tenant / tenantId** | Backend isolation context - used in middleware, session, service layer |
| **workspace** | User-facing entity - the `workspaces` table that users see and manage |

The same backend `tenantId` maps to a user-facing "workspace" (or could be branded as "organization", "team", etc.).

### Multi-Tenancy Model

**Single-database architecture** with tenant isolation:
- One D1 database for all tenants
- `tenantId` column on tenant-scoped tables (references `workspaces.id`)
- Users are global (can belong to multiple workspaces)
- Tenant context stored in session as `session.tenantId`

### RBAC Model

**Config-based roles** (no database tables):
- Roles defined in `server/config/rbac.ts`
- No database queries for permission checks

**Role Hierarchy:**

| Level | Field | Use Case |
|-------|-------|----------|
| Global | `users.role` | Platform-wide role (e.g., super admin) |
| Workspace | `workspace_members.role` | Role within a specific workspace |

Both levels use the same role names from `DEFAULT_ROLES` config:
- `admin` - Full access (`*`)
- `manager` - Manage users and workspace
- `user` - Basic read access

To extend roles, edit `DEFAULT_ROLES` in `server/config/rbac.ts`.

## Import Conventions

| Alias | Points To | Use In | Example |
|-------|-----------|--------|---------|
| `#server` | `server/` | Backend | `import { createIdentityService } from '#server/services/identity'` |
| `#shared` | `shared/` | Both | `import { signinSchema } from '#shared/validators/auth'` |
| `@` or `~` | `app/` | Frontend | `import { Button } from '@/components/ui/button'` |

## Security Principles

### Fail Closed
When handling edge cases or errors, deny access by default:

```typescript
// ✅ Correct - fail closed
if (!workspace?.members) {
  return []; // Return empty, don't show data
}

// ❌ Wrong - fail open
if (!workspace?.members) {
  return await fetchAllMembers(); // Leaks data on error
}
```

### Tenant Scoping
All tenant-scoped queries MUST include `tenantId`:

```typescript
import { Conditions } from "#server/repositories/helpers/conditions";

// ✅ Correct - tenant scoped
const conditions = [
  Conditions.notDeleted(schema.projects),
  Conditions.tenantScoped(schema.projects, tenantId),
  eq(schema.projects.id, projectId),
];

// ❌ Wrong - no tenant filter (data leakage!)
const conditions = [
  Conditions.notDeleted(schema.projects),
  eq(schema.projects.id, projectId),
];
```

**Global entities (no tenantId):** `users`
**Tenant-scoped entities:** `workspaces`, `workspace_members`, `workspace_invites`, `audit_logs`, and your domain tables

## Git Conventions

Use conventional commits:

- **Branch:** `type/short-description`
- **Commit:** `type: description`

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `security`

## Key Files

| Pattern | Location |
|---------|----------|
| Database schema | `server/database/schema/` |
| Conditions helpers | `server/repositories/helpers/conditions.ts` |
| Route config | `server/config/routes.ts` |
| Error classes | `server/error/errors.ts` |
| Error codes | `shared/error/codes.ts` |
| RBAC config | `server/config/rbac.ts` |
| Validators | `shared/validators/` |
| Middleware | `server/middleware/` |
