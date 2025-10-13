# 🔐 Role-Based Access Control (RBAC) Guide

Complete guide to the enterprise-grade RBAC system built into this template.

> **Related Documentation:**
> - [CLAUDE.md](CLAUDE.md) - Quick RBAC reference
> - [CONVENTIONS.md](CONVENTIONS.md) - Service and repository patterns
> - [SECURITY.md](SECURITY.md) - Security architecture
> - [TEMPLATE_SETUP.md](TEMPLATE_SETUP.md) - RBAC setup and configuration

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Permission System](#permission-system)
- [Role Management](#role-management)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

---

## Overview

### What is RBAC?

Role-Based Access Control (RBAC) is a method of regulating access to resources based on the roles of individual users. Instead of assigning permissions directly to users, you:

1. **Define roles** (e.g., admin, manager, user)
2. **Assign permissions to roles** (e.g., admin has all permissions)
3. **Assign roles to users** (e.g., john@example.com is an admin)

### Why This RBAC Implementation?

**Hybrid Storage Architecture:**
- ✅ **Fast queries** - Permissions stored as JSON arrays in roles (2-way join vs 4-way join)
- ✅ **Metadata** - Permissions table provides names/descriptions for admin UI
- ✅ **Validation** - Permission codes validated against registry at role creation
- ✅ **Type-safe** - TypeScript union types for all permission codes
- ✅ **Industry standard** - Pattern used by Auth0, AWS IAM, etc.

**Key Features:**
- ✅ Wildcard permissions (`*`, `users:*`, `roles:*`)
- ✅ Multiple roles per user
- ✅ System roles (cannot be deleted)
- ✅ Graceful degradation (toggle on/off)
- ✅ Full REST API for role management

---

## Architecture

### Database Schema

```
┌──────────┐
│  User    │ Multiple roles per user
└────┬─────┘
     │
     ↓
┌──────────────┐
│  user_roles  │ Many-to-many junction
└──────┬───────┘
       │
       ↓
┌─────────────────────────┐
│     Roles               │ Fast runtime queries
│  - name: "admin"        │
│  - permissions: JSON[]  │ ["*"] or ["users:*", "company:*"]
│  - isSystem: boolean    │
└─────────────────────────┘

┌──────────────────────┐
│   Permissions        │ Registry/validation (not joined at runtime)
│  - code (PK)         │ Used for:
│  - name              │ - Admin UI permission lists
│  - description       │ - Validation at role creation
│  - category          │ - TypeScript type generation
└──────────────────────┘
```

### Permission Flow

```typescript
// 1. User makes request
GET /api/v1/users

// 2. Middleware sets userId in context
event.context.userId = "user-123"

// 3. Route checks permission
await requirePermission(event, 'users:view')

// 4. RBACService checks (if RBAC enabled):
const userRoles = await getUserRoles(userId)
// Returns: [{ name: "manager", permissions: ["users:*", "company:*"] }]

const userPermissions = aggregatePermissions(userRoles)
// Returns: ["users:*", "company:*"]

const hasPermission = matchesWildcard("users:view", userPermissions)
// Returns: true (matched by "users:*")

// 5. If permission granted, route continues
// If denied, throws AuthorizationError
```

---

## Quick Start

### Default Setup

The template includes 3 system roles out of the box:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | `*` (all permissions) | Super admin with full system access |
| **manager** | `users:view`, `users:update`, `company:view`, `company:update` | Team managers who can manage users and company settings |
| **user** | `company:view` | Standard users with read-only access |

### Default Test Accounts

```bash
# Admin (full access)
Email: admin@test.com
Password: testtesttest
Permissions: * (all)

# Manager (user + company management)
Email: manager@test.com
Password: testtesttest
Permissions: users:view, users:update, company:view, company:update

# User (read-only)
Email: user@test.com
Password: testtesttest
Permissions: company:view
```

### Testing RBAC

```bash
# 1. Start development server
npm run dev

# 2. Sign in as admin
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testtesttest"}'

# 3. Try accessing protected routes
# Admin can access all routes
curl http://localhost:3000/api/v1/users \
  -H "Cookie: your-session-cookie"

# 4. Sign in as user (read-only)
# User cannot access /api/v1/users (requires users:view)
```

---

## Permission System

### Permission Code Format

All permissions follow the format: `resource:action` or wildcards

```
Format: {resource}:{action}

Examples:
  users:view         - Specific permission
  users:create       - Specific permission
  users:*            - Category wildcard (all user permissions)
  *                  - Super admin wildcard (all permissions)
```

### Available Permissions

**Users:**
- `users:view` - View users
- `users:create` - Create new users
- `users:update` - Update user details
- `users:delete` - Delete users
- `users:*` - All user permissions

**Roles:**
- `roles:view` - View roles
- `roles:create` - Create new roles
- `roles:update` - Update role details
- `roles:delete` - Delete roles (except system roles)
- `roles:*` - All role permissions

**Company:**
- `company:view` - View company settings
- `company:update` - Update company settings
- `company:*` - All company permissions

**System:**
- `*` - Super admin (all permissions)

### Wildcard Matching

Wildcards are resolved at runtime during permission checks:

```typescript
// User has: ["users:*", "company:view"]

hasPermission("users:view")    // ✅ true (matched by users:*)
hasPermission("users:create")  // ✅ true (matched by users:*)
hasPermission("users:delete")  // ✅ true (matched by users:*)
hasPermission("company:view")  // ✅ true (exact match)
hasPermission("company:update") // ❌ false (not granted)
hasPermission("roles:view")    // ❌ false (not granted)

// Super admin has: ["*"]
hasPermission("users:view")    // ✅ true (matched by *)
hasPermission("anything:action") // ✅ true (matched by *)
```

---

## Role Management

### Creating Roles

**Via REST API:**
```bash
POST /api/v1/roles
{
  "name": "editor",
  "description": "Content editors with limited access",
  "permissions": ["users:view", "company:view"]
}
```

**Via Seed Data:**
```typescript
// In server/database/seed.ts
const [editorRole] = await drizzleDb.insert(schema.roles).values({
  id: crypto.randomUUID(),
  name: "editor",
  description: "Content editors",
  permissions: ["users:view", "company:view"],
  isSystem: false, // Can be deleted
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})
```

**Via RBACService:**
```typescript
import { getRBACService } from '~/server/services/rbac'

const rbacService = getRBACService(event)
const role = await rbacService.createRole({
  name: "editor",
  description: "Content editors",
  permissions: ["users:view", "company:view"],
})
```

### Updating Roles

```bash
PUT /api/v1/roles/:roleId
{
  "name": "senior-editor",
  "permissions": ["users:*", "company:view"]
}
```

### Deleting Roles

```bash
DELETE /api/v1/roles/:roleId
```

**Note:** System roles (`admin`, `manager`, `user`) cannot be deleted.

### Assigning Roles to Users

**Via REST API:**
```bash
PUT /api/v1/users/:userId/roles
{
  "roleIds": ["role-id-1", "role-id-2"]
}
```

**Via RBACService:**
```typescript
const rbacService = getRBACService(event)

// Assign single role
await rbacService.assignRoleToUser(userId, roleId)

// Replace all roles
await rbacService.replaceUserRoles(userId, [roleId1, roleId2])

// Remove role
await rbacService.removeRoleFromUser(userId, roleId)
```

---

## API Reference

### Role Endpoints

**List all roles**
```
GET /api/v1/roles?includeSystem=true
```

**Get role by ID**
```
GET /api/v1/roles/:roleId
```

**Create role**
```
POST /api/v1/roles
Body: { name, description?, permissions[], isSystem? }
```

**Update role**
```
PUT /api/v1/roles/:roleId
Body: { name?, description?, permissions? }
```

**Delete role**
```
DELETE /api/v1/roles/:roleId
```

### User-Role Endpoints

**Get user roles**
```
GET /api/v1/users/:userId/roles
```

**Replace user roles**
```
PUT /api/v1/users/:userId/roles
Body: { roleIds: string[] }
```

### Permission Endpoints

**List all permissions**
```
GET /api/v1/permissions
```

---

## Usage Examples

### Protecting API Routes

```typescript
// server/api/v1/users/index.post.ts
import { requirePermission } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  // Throws AuthorizationError if permission not granted
  await requirePermission(event, 'users:create')

  // Your logic here
  const body = await readBody(event)
  const user = await createUser(body)
  return createSuccessResponse('User created', user)
})
```

### Conditional Logic Based on Permissions

```typescript
import { hasPermission } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  const canDelete = await hasPermission(event, 'users:delete')

  if (canDelete) {
    // Show delete button, enable delete actions
  } else {
    // Hide delete functionality
  }
})
```

### Getting Current User Permissions

```typescript
import { getCurrentUserPermissions } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  const permissions = await getCurrentUserPermissions(event)
  // Returns: ['*'] or ['users:*', 'company:view'] etc.

  return createSuccessResponse('User permissions', { permissions })
})
```

### Getting Current User Roles

```typescript
import { getCurrentUserRoles } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  const roles = await getCurrentUserRoles(event)
  // Returns: [{ id, name, permissions, isSystem }, ...]

  return createSuccessResponse('User roles', { roles })
})
```

### Using RBACService Directly

```typescript
import { getRBACService } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  const rbacService = getRBACService(event)

  // Check multiple permissions
  const canManageUsers = await rbacService.userHasAllPermissions(
    userId,
    ['users:view', 'users:update', 'users:delete']
  )

  // Check if user has ANY of the permissions
  const canAccessUserData = await rbacService.userHasAnyPermission(
    userId,
    ['users:view', 'users:*', '*']
  )
})
```

### Creating Custom Permission Checks

```typescript
// server/utils/customPermissions.ts
import type { H3Event } from 'h3'
import { getRBACService } from '~/server/services/rbac'

export async function requireUserManagement(event: H3Event) {
  const userId = event.context.userId
  if (!userId) throw new Error('Not authenticated')

  const rbacService = getRBACService(event)
  const hasPermission = await rbacService.userHasAnyPermission(userId, [
    'users:*',
    '*',
  ])

  if (!hasPermission) {
    throw new AuthorizationError('User management permission required')
  }
}

// Use in routes
export default defineEventHandler(async (event) => {
  await requireUserManagement(event)
  // Your logic
})
```

---

## Configuration

### Enabling/Disabling RBAC

**Enable RBAC (Default):**
```bash
# In .dev.vars
NUXT_RBAC_ENABLED=true
```

**Disable RBAC (allow all actions):**
```bash
# In .dev.vars
NUXT_RBAC_ENABLED=false
```

**In nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    rbac: {
      enabled: true, // or false
    },
  },
})
```

### Graceful Degradation

When RBAC is disabled:
- All permission checks return `true`
- No database queries for roles/permissions
- Perfect for simple apps that don't need permissions

When RBAC is enabled:
- Full permission checking enforced
- Role-based authorization required
- Perfect for multi-user applications

---

## Best Practices

### 1. Use Wildcard Permissions Wisely

```typescript
// ✅ Good: Specific permissions for granular control
permissions: ['users:view', 'users:update']

// ✅ Good: Category wildcard for full resource access
permissions: ['users:*']

// ⚠️ Caution: Super admin wildcard (use sparingly)
permissions: ['*']
```

### 2. Create Roles Based on Job Functions

```typescript
// ✅ Good: Role names reflect actual job functions
- "customer-support"    → users:view, company:view
- "content-editor"      → posts:*, media:*
- "billing-admin"       → invoices:*, payments:*

// ❌ Bad: Generic names without clear purpose
- "role1", "role2", "role3"
```

### 3. Use System Roles for Core Functionality

```typescript
// Mark essential roles as system roles
isSystem: true

// System roles cannot be deleted (prevents accidents)
```

### 4. Validate Permissions at Role Creation

```typescript
// The RBACService validates permissions automatically
const role = await rbacService.createRole({
  name: "editor",
  permissions: ["invalid:permission"], // Will throw error
})
```

### 5. Add RBAC Checks Early in Routes

```typescript
// ✅ Good: Check permission first
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:create')
  // ... rest of logic
})

// ❌ Bad: Check permission after expensive operations
export default defineEventHandler(async (event) => {
  const data = await expensiveOperation()
  await requirePermission(event, 'users:create') // Too late!
})
```

### 6. Use Descriptive Permission Names

```typescript
// ✅ Good: Clear permission purpose
permissions: [
  'users:view',      // View user list
  'users:create',    // Create new users
  'users:update',    // Update user details
]

// ❌ Bad: Unclear abbreviations
permissions: ['u:v', 'u:c', 'u:u']
```

### 7. Test with Multiple Roles

```bash
# Test with different permission levels
1. Login as admin (full access) - should work
2. Login as manager (partial access) - should work for allowed routes
3. Login as user (read-only) - should fail for write operations
```

### 8. Document Custom Permissions

```typescript
// Add comments explaining custom permissions
/**
 * Custom permission for financial reports
 * Required for: /api/v1/reports/financial
 * Granted to: CFO, Finance Manager roles
 */
export type PermissionCode =
  | 'reports:financial'
  | ...
```

---

## Troubleshooting

### "Permission denied" Error

**Check:**
1. User is authenticated (`event.context.userId` is set)
2. User has required role assigned
3. Role has required permission
4. RBAC is enabled (`NUXT_RBAC_ENABLED=true`)

**Debug:**
```typescript
const permissions = await getCurrentUserPermissions(event)
console.log('User permissions:', permissions)
```

### Permission Not Working After Update

**Cause:** Permission changes don't affect existing sessions

**Solution:** Sign out and sign in again to refresh permissions in session

### System Role Cannot Be Deleted

**Cause:** System roles (`isSystem: true`) are protected

**Solution:** This is by design. Update the role instead, or mark `isSystem: false` if needed

### RBAC Disabled But Still Getting Errors

**Check:** Ensure `NUXT_RBAC_ENABLED=false` in `.dev.vars`

**Verify:**
```typescript
const rbacService = getRBACService(event)
console.log('RBAC enabled:', rbacService.isEnabled())
```

---

## Migration from Direct Permissions

If you're migrating from a direct user-permission system:

1. **Create roles** matching your current permission patterns
2. **Assign users to roles** based on their current permissions
3. **Test thoroughly** before deploying
4. **Update API routes** to use `requirePermission()` instead of direct checks

**Example migration:**
```typescript
// Before: Direct permissions
const userPermissions = await getUserPermissions(userId)
if (!userPermissions.includes('users:view')) {
  throw new Error('Permission denied')
}

// After: RBAC
await requirePermission(event, 'users:view')
```

---

## Additional Resources

- **[TEMPLATE_SETUP.md](TEMPLATE_SETUP.md)** - Setup guide including RBAC configuration
- **[CONVENTIONS.md](CONVENTIONS.md)** - Architecture patterns
- **API Documentation** - See `server/api/v1/roles/` and `server/api/v1/users/[userId]/roles/`

---

**Need help?** Open an issue in the repository or check the troubleshooting section above.
