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
Middleware (tenant DB selection, auth, rate limiting)
    ↓
Service Layer (business logic, request-scoped)
    ↓
Repository Layer (data access)
    ↓
Database (Drizzle ORM → D1)
```

### Isolation Model

Two levels of isolation:

**1. Tenant (Infrastructure) - Which D1 database:**
- Single-tenant mode (default): Uses `DB` binding
- Multi-tenant mode: Subdomain + header → `DB_<TENANT>` binding
  - Production: Subdomain required (e.g., `acme.myapp.com`)
  - Development: Falls back to `X-Tenant-ID` header (for API tools)
- Enable via `NUXT_MULTITENANCY_ENABLED=true`
- Set base domain via `NUXT_MULTITENANCY_BASE_DOMAIN=myapp.com`

**2. Workspace (Application) - Within a database:**
- `workspaceId` column on workspace-scoped tables
- Users are global (can belong to multiple workspaces)
- Workspace context stored in session as `session.workspaceId`

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

### Workspace Scoping
All workspace-scoped queries MUST include `workspaceId`:

```typescript
import { Conditions } from "#server/repositories/helpers/conditions";

// ✅ Correct - workspace scoped
const conditions = [
  Conditions.notDeleted(schema.projects),
  Conditions.workspaceScoped(schema.projects, workspaceId),
  eq(schema.projects.id, projectId),
];

// ❌ Wrong - no workspace filter (data leakage!)
const conditions = [
  Conditions.notDeleted(schema.projects),
  eq(schema.projects.id, projectId),
];
```

**Global entities (no workspaceId):** `users`
**Workspace-scoped entities:** `workspaces`, `workspace_members`, `workspace_invites`, `audit_logs`, and your domain tables

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
