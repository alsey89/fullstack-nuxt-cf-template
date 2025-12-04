# 🔐 Role-Based Access Control (RBAC) Guide

Complete guide to the RBAC & permissions system for the project management + chat application.

> **Related Documentation:**
>
> - [CLAUDE.md](../CLAUDE.md) - Quick RBAC reference
> - [CLAUDE.md](../CLAUDE.md) - Service and repository patterns
> - [SECURITY.md](../OPERATIONS/SECURITY.md) - Security architecture
> - [SETUP.md](../OPERATIONS/SETUP.md) - RBAC setup and configuration

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Permission System](#permission-system)
- [Role Hierarchy System](#role-hierarchy-system)
- [Role Management](#role-management)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

---

## Overview

### What is RBAC?

Role-Based Access Control (RBAC) is a method of regulating access to resources based on the roles of individual users. Instead of assigning permissions directly to users, you:

1. **Define roles** (e.g., Super Admin, Project Creator, Member)
2. **Assign permissions to roles** (e.g., Super Admin has all permissions)
3. **Assign roles to users** (e.g., john@example.com is a Project Creator)

### Dual Permission System

This application uses a **dual permission architecture** (Option B):

```
┌─────────────────────────────────────────────────────────┐
│  RBAC (Global/Organization-level)                       │
│  - Create projects                                      │
│  - Create organization channels                         │
│  - User management                                      │
│  - Message moderation (edit/delete any)                 │
│  ✅ Enforced via: getRBACService().requirePermission()  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Resource Roles (Project/Channel-specific)              │
│  - Access within specific projects                      │
│  - Access within specific channels                      │
│  - Role hierarchy enforcement                           │
│  ✅ Enforced via: verifyAccess() + role checks          │
└─────────────────────────────────────────────────────────┘
```

**Why Dual System?**

- **RBAC** controls who can create new projects, org channels, and perform admin actions
- **Resource Roles** control access within specific projects and channels
- Combines organization-level control with fine-grained resource access

### Why This RBAC Implementation?

**Hybrid Storage Architecture:**

- ✅ **Fast queries** - Permissions stored as JSON arrays in roles (2-way join vs 4-way join)
- ✅ **Metadata** - Permissions table provides names/descriptions for admin UI
- ✅ **Validation** - Permission codes validated against registry at role creation
- ✅ **Type-safe** - TypeScript union types for all permission codes
- ✅ **Industry standard** - Pattern used by Auth0, AWS IAM, etc.

**Key Features:**

- ✅ Wildcard permissions (`*`, `users:*`, `projects:*`)
- ✅ Multiple roles per user
- ✅ System roles (cannot be deleted)
- ✅ Role hierarchy enforcement (prevent privilege escalation)
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
│  - name: "Admin"        │
│  - permissions: JSON[]  │ ["projects:*", "channels:*", ...]
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
// 1. User makes request to create organization channel
POST / api / v1 / channels;

// 2. Middleware sets userId in context
event.context.userId = "user-123";

// 3. Service checks RBAC permission
const rbacService = getRBACService(event);
await rbacService.requirePermission(userId, "channels:create_organization");

// 4. RBACService checks (if RBAC enabled):
const userRoles = await getUserRoles(userId);
// Returns: [{ name: "Admin", permissions: ["projects:*", "channels:*", ...] }]

const userPermissions = aggregatePermissions(userRoles);
// Returns: ["projects:*", "channels:*", ...]

const hasPermission = matchesWildcard(
  "channels:create_organization",
  userPermissions
);
// Returns: true (matched by "channels:*")

// 5. If permission granted, operation continues
// If denied, throws PermissionDeniedError
```

### Resource Role Flow

```typescript
// 1. User tries to add member to project
POST /api/v1/projects/:id/members

// 2. Service verifies user's project role
const inviterMember = await this.verifyAccess(projectId, "admin")
// Returns: { role: "admin", ... } or throws PermissionDeniedError

// 3. Service validates role hierarchy
if (!canAssignRole(inviterMember.role, targetRole, PROJECT_ROLE_HIERARCHY)) {
  throw new PermissionDeniedError("Cannot assign higher roles")
}
// Prevents: admin assigning "owner" role (privilege escalation)
```

---

## Permission System

### Permission Code Format

All permissions follow the format: `resource:action` or wildcards

```
Format: {resource}:{action}

Examples:
  projects:create         - Specific permission
  channels:create_organization - Specific permission
  projects:*              - Category wildcard (all project permissions)
  *                       - Super admin wildcard (all permissions)
```

### Available Permissions (31 Total)

#### Users (5 permissions)

- `users:view` - View user list and profiles
- `users:create` - Create new users
- `users:update` - Update user details
- `users:delete` - Delete users
- `users:*` - All user permissions

#### Roles (5 permissions)

- `roles:view` - View roles and permissions
- `roles:create` - Create new roles
- `roles:update` - Update role details and permissions
- `roles:delete` - Delete roles (except system roles)
- `roles:*` - All role permissions

#### Projects (6 permissions)

- `projects:view` - View projects (supplemental to project membership)
- `projects:create` - **Critical:** Create new projects
- `projects:update` - Update project settings
- `projects:delete` - Delete projects (requires owner role too)
- `projects:invite_members` - Invite users to projects
- `projects:*` - All project permissions

#### Channels (5 permissions)

- `channels:create_project` - Create channels within projects
- `channels:create_organization` - **Critical:** Create organization-wide channels
- `channels:manage_members` - Add/remove channel members
- `channels:delete` - Delete channels
- `channels:*` - All channel permissions

#### Messages (6 permissions)

- `messages:send` - Send messages in channels
- `messages:edit_own` - Edit own messages (implicit for message authors)
- `messages:edit_any` - Edit any message (moderation)
- `messages:delete_own` - Delete own messages (implicit for message authors)
- `messages:delete_any` - Delete any message (moderation, channel admins have this implicitly)
- `messages:*` - All message permissions

#### System (1 permission)

- `*` - Super admin (all permissions)

### Permission Categories

Permissions are organized by category for admin UI display:

| Category     | Permission Count | Examples                                                 |
| ------------ | ---------------- | -------------------------------------------------------- |
| **USERS**    | 5                | `users:view`, `users:create`, `users:*`                  |
| **ROLES**    | 5                | `roles:view`, `roles:create`, `roles:*`                  |
| **PROJECTS** | 6                | `projects:create`, `projects:delete`, `projects:*`       |
| **CHANNELS** | 5                | `channels:create_organization`, `channels:*`             |
| **MESSAGES** | 6                | `messages:edit_any`, `messages:delete_any`, `messages:*` |
| **SYSTEM**   | 1                | `*`                                                      |

### Wildcard Matching

Wildcards are resolved at runtime during permission checks:

```typescript
// User has: ["projects:*", "messages:send"]

hasPermission("projects:view"); // ✅ true (matched by projects:*)
hasPermission("projects:create"); // ✅ true (matched by projects:*)
hasPermission("projects:delete"); // ✅ true (matched by projects:*)
hasPermission("messages:send"); // ✅ true (exact match)
hasPermission("messages:edit_any"); // ❌ false (not granted)
hasPermission("channels:create_organization"); // ❌ false (not granted)

// Super admin has: ["*"]
hasPermission("projects:view"); // ✅ true (matched by *)
hasPermission("anything:action"); // ✅ true (matched by *)
```

---

## Role Hierarchy System

### Project Role Hierarchy

Projects use a 4-level role hierarchy to control access and prevent privilege escalation:

```typescript
// server/utils/roleHierarchy.ts
export const PROJECT_ROLE_HIERARCHY = {
  owner: 4, // Full control, can delete project
  admin: 3, // Manage members, settings
  member: 2, // Access project, create tasks
  viewer: 1, // Read-only access
} as const;
```

**Rules:**

- Users can only assign roles **lower** than their own
- Example: `admin` (level 3) can assign `member` (level 2) or `viewer` (level 1)
- Example: `admin` (level 3) **cannot** assign `owner` (level 4) - prevents privilege escalation

### Channel Role Hierarchy

Channels use a 3-level role hierarchy:

```typescript
export const CHANNEL_ROLE_HIERARCHY = {
  owner: 3, // Creator, full control
  admin: 2, // Manage members, settings
  member: 1, // Send messages, access channel
} as const;
```

**Rules:**

- Same as project hierarchy: can only assign lower roles
- Channel admins can delete messages (implicit `messages:delete_any` within channel)

### Role Hierarchy Helpers

**Location:** `server/utils/roleHierarchy.ts`

```typescript
// Check if user can assign a target role
import {
  canAssignRole,
  PROJECT_ROLE_HIERARCHY,
} from "#server/utils/roleHierarchy";

const allowed = canAssignRole("admin", "member", PROJECT_ROLE_HIERARCHY);
// Returns: true (admin level 3 > member level 2)

const blocked = canAssignRole("admin", "owner", PROJECT_ROLE_HIERARCHY);
// Returns: false (admin level 3 < owner level 4)

// Check if one role is higher than another
import { isHigherRole } from "#server/utils/roleHierarchy";

const isHigher = isHigherRole("owner", "admin", PROJECT_ROLE_HIERARCHY);
// Returns: true

// Get all roles a user can assign
import { getAssignableRoles } from "#server/utils/roleHierarchy";

const assignable = getAssignableRoles("admin", PROJECT_ROLE_HIERARCHY);
// Returns: ['member', 'viewer']
```

### Enforcement Points

Role hierarchy is enforced at:

1. **Project member invitation** (`server/services/projects.ts:454-459`)

   ```typescript
   if (!canAssignRole(inviterMember.role, role, PROJECT_ROLE_HIERARCHY)) {
     throw new PermissionDeniedError(
       `You can only assign roles lower than your own role (${inviterMember.role})`
     );
   }
   ```

2. **Project member role update** (`server/services/projects.ts:500-507`)

3. **Channel member addition** (`server/services/channels.ts:676-681`)
   ```typescript
   if (!canAssignRole(membership.role, role, CHANNEL_ROLE_HIERARCHY)) {
     throw new PermissionDeniedError(
       `You can only assign roles lower than your own role (${membership.role})`
     );
   }
   ```

---

## Role Management

### Default Roles

The application includes 4 system roles out of the box:

| Role                | Permissions                                                                                                                              | Use Case                           | Can Delete?    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------- |
| **Super Admin**     | `*`                                                                                                                                      | Full system access, all operations | ❌ System role |
| **Admin**           | `users:view`, `users:create`, `users:update`, `roles:view`, `projects:*`, `channels:*`, `messages:*`                                     | Organization administrator         | ❌ System role |
| **Project Creator** | `users:view`, `projects:view`, `projects:create`, `channels:create_project`, `messages:send`, `messages:edit_own`, `messages:delete_own` | Can create projects and channels   | ❌ System role |
| **Member**          | `users:view`, `projects:view`, `messages:send`, `messages:edit_own`, `messages:delete_own`                                               | Basic messaging and project access | ❌ System role |

### Default Test Accounts

```bash
# Super Admin (all permissions)
Email: admin@test.com
Password: testtesttest
Permissions: * (all)

# Project Creator (can create projects)
Email: manager@test.com
Password: testtesttest
Permissions: projects:view, projects:create, channels:create_project, messages:*

# Member (basic access)
Email: user@test.com
Password: testtesttest
Permissions: projects:view, messages:send, messages:edit_own, messages:delete_own
```

### Testing RBAC

```bash
# 1. Start development server
npm run dev

# 2. Sign in as admin
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testtesttest"}'

# 3. Try creating organization channel (requires channels:create_organization)
# Admin can do this
curl -X POST http://localhost:3000/api/v1/channels \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name":"announcements","description":"Company announcements"}'

# 4. Sign in as Member
# Member CANNOT create organization channels (will get 403 Forbidden)
```

### Creating Custom Roles

**Via REST API:**

```bash
POST /api/v1/roles
{
  "name": "Content Moderator",
  "description": "Can moderate messages across all channels",
  "permissions": ["messages:edit_any", "messages:delete_any", "channels:manage_members"]
}
```

**Via Seed Data:**

```typescript
// In server/database/seed.ts
const [moderatorRole] = await drizzleDb.insert(schema.roles).values({
  id: crypto.randomUUID(),
  name: "Content Moderator",
  description: "Message moderation across all channels",
  permissions: ["messages:edit_any", "messages:delete_any"],
  isSystem: false, // Can be deleted
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});
```

**Via RBACService:**

```typescript
import { getRBACService } from "#server/services/rbac";

const rbacService = getRBACService(event);
const role = await rbacService.createRole({
  name: "Content Moderator",
  description: "Message moderation",
  permissions: ["messages:edit_any", "messages:delete_any"],
});
```

### Updating Roles

```bash
PUT /api/v1/roles/:roleId
{
  "name": "Senior Moderator",
  "permissions": ["messages:*", "channels:manage_members"]
}
```

### Deleting Roles

```bash
DELETE /api/v1/roles/:roleId
```

**Note:** System roles (`Super Admin`, `Admin`, `Project Creator`, `Member`) cannot be deleted.

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
const rbacService = getRBACService(event);

// Assign single role
await rbacService.assignRoleToUser(userId, roleId);

// Replace all roles
await rbacService.replaceUserRoles(userId, [roleId1, roleId2]);

// Remove role
await rbacService.removeRoleFromUser(userId, roleId);
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

### 1. Protecting Organization-Level Operations

Use RBAC for operations that affect the entire organization:

```typescript
// server/api/v1/projects/index.post.ts
import { getRBACService } from "#server/services/rbac";
import { createProjectsService } from "#server/services/projects";

export default defineEventHandler(async (event) => {
  // Check RBAC permission for creating projects
  const rbacService = getRBACService(event);
  await rbacService.requirePermission(event.context.userId!, "projects:create");

  // If permission granted, continue
  const body = await readBody(event);
  const projectsService = createProjectsService(event);
  const { project } = await projectsService.createProject(body);

  return createSuccessResponse("Project created", project);
});
```

```typescript
// server/services/channels.ts
async createOrganizationChannel(data: { name: string, ... }) {
  if (!this.userId) {
    throw new PermissionDeniedError("Not authenticated");
  }

  // Check RBAC permission
  const rbacService = getRBACService(this.event);
  await rbacService.requirePermission(
    this.userId,
    'channels:create_organization'
  );

  // Create org channel...
}
```

### 2. Message Moderation with Ownership Checks

Use ownership checks with RBAC fallback:

```typescript
// server/services/messages.ts
async updateMessage(messageId: string, data: { content: string }) {
  const message = await this.messagesRepo.findById(messageId);

  // Check if user can edit this message
  const isAuthor = message.userId === this.userId;
  if (!isAuthor) {
    // Not the author - check RBAC permission for editing any message
    const rbacService = getRBACService(this.event);
    await rbacService.requirePermission(this.userId!, "messages:edit_any");
  }
  // If author or has permission, continue...
}

async deleteMessage(messageId: string) {
  const message = await this.messagesRepo.findById(messageId);
  const membership = await this.channelMembersRepo.findByChannelAndUser(
    message.channelId,
    this.userId!
  );

  const isAuthor = message.userId === this.userId;
  const isChannelAdmin = membership && ["admin", "owner"].includes(membership.role);

  // If not author or channel admin, check RBAC permission
  if (!isAuthor && !isChannelAdmin) {
    const rbacService = getRBACService(this.event);
    await rbacService.requirePermission(this.userId!, "messages:delete_any");
  }
  // If authorized, continue...
}
```

### 3. Role Hierarchy Validation

Prevent privilege escalation when inviting members:

```typescript
// server/services/projects.ts
import { canAssignRole, PROJECT_ROLE_HIERARCHY } from '#server/utils/roleHierarchy';

async inviteMember(projectId: string, email: string, role: ProjectRole) {
  // Get inviter's membership and role
  const inviterMember = await this.verifyAccess(projectId, "admin");

  // Validate role hierarchy: can only assign roles lower than own
  if (!canAssignRole(inviterMember.role, role, PROJECT_ROLE_HIERARCHY)) {
    throw new PermissionDeniedError(
      `You can only assign roles lower than your own role (${inviterMember.role})`
    );
  }

  // Invite member...
}
```

### 4. Conditional Logic Based on Permissions

```typescript
import { getRBACService } from "#server/services/rbac";

export default defineEventHandler(async (event) => {
  const rbacService = getRBACService(event);
  const userId = event.context.userId!;

  const canCreateOrgChannels = await rbacService.userHasPermission(
    userId,
    "channels:create_organization"
  );

  const canModerateMessages = await rbacService.userHasAnyPermission(userId, [
    "messages:edit_any",
    "messages:delete_any",
    "messages:*",
  ]);

  return {
    canCreateOrgChannels,
    canModerateMessages,
  };
});
```

### 5. Getting Current User Permissions

```typescript
import { getCurrentUserPermissions } from "#server/services/rbac";

export default defineEventHandler(async (event) => {
  const permissions = await getCurrentUserPermissions(event);
  // Returns: ['*'] or ['projects:*', 'channels:*', ...] etc.

  return createSuccessResponse("User permissions", { permissions });
});
```

### 6. Getting Current User Roles

```typescript
import { getCurrentUserRoles } from "#server/services/rbac";

export default defineEventHandler(async (event) => {
  const roles = await getCurrentUserRoles(event);
  // Returns: [{ id, name, permissions, isSystem }, ...]

  return createSuccessResponse("User roles", { roles });
});
```

### 7. Using RBACService Directly

```typescript
import { getRBACService } from "#server/services/rbac";

export default defineEventHandler(async (event) => {
  const rbacService = getRBACService(event);
  const userId = event.context.userId!;

  // Check multiple permissions (AND)
  const canManageProjects = await rbacService.userHasAllPermissions(userId, [
    "projects:view",
    "projects:create",
    "projects:update",
  ]);

  // Check if user has ANY of the permissions (OR)
  const canAccessProjects = await rbacService.userHasAnyPermission(userId, [
    "projects:view",
    "projects:*",
    "*",
  ]);

  // Require specific permission (throws if not granted)
  await rbacService.requirePermission(userId, "projects:create");
});
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
});
```

### Graceful Degradation

When RBAC is disabled:

- All permission checks return `true`
- No database queries for roles/permissions
- Perfect for simple apps or development

When RBAC is enabled:

- Full permission checking enforced
- Role-based authorization required
- Production-ready security

---

## Best Practices

### 1. When to Use RBAC vs Resource Roles

**Use RBAC (Global Permissions) for:**

- ✅ Creating projects (`projects:create`)
- ✅ Creating organization channels (`channels:create_organization`)
- ✅ User management (`users:create`, `users:delete`)
- ✅ Message moderation across all channels (`messages:edit_any`, `messages:delete_any`)
- ✅ Cross-project administrative actions

**Use Resource Roles (Project/Channel Roles) for:**

- ✅ Access within specific projects (project member, admin, viewer)
- ✅ Access within specific channels (channel member, admin)
- ✅ Resource-specific operations (edit project settings, manage channel members)

**Decision Tree:**

```
Does the operation affect the entire organization?
├─ YES → Use RBAC
│   └─ Example: Creating a new project, creating org channel
│
└─ NO → Does it affect a specific project/channel?
    └─ YES → Use Resource Roles
        └─ Example: Editing project settings, posting in channel
```

### 2. Use Wildcard Permissions Wisely

```typescript
// ✅ Good: Specific permissions for granular control
permissions: ["projects:view", "projects:create"];

// ✅ Good: Category wildcard for full resource access
permissions: ["projects:*", "channels:create_project"];

// ⚠️ Caution: Super admin wildcard (use sparingly)
permissions: ["*"];
```

### 3. Create Roles Based on Job Functions

```typescript
// ✅ Good: Role names reflect actual job functions
- "Content Moderator"    → messages:edit_any, messages:delete_any
- "Project Manager"      → projects:*, channels:create_project
- "Team Lead"            → projects:create, projects:invite_members

// ❌ Bad: Generic names without clear purpose
- "role1", "role2", "role3"
```

### 4. Always Validate Role Hierarchy

```typescript
// ✅ Good: Validate before assigning roles
import {
  canAssignRole,
  PROJECT_ROLE_HIERARCHY,
} from "#server/utils/roleHierarchy";

if (!canAssignRole(currentUserRole, targetRole, PROJECT_ROLE_HIERARCHY)) {
  throw new PermissionDeniedError("Cannot assign higher roles");
}

// ❌ Bad: Directly assign without validation (privilege escalation risk)
await addMember(projectId, userId, "owner"); // No check!
```

### 5. Use Ownership Checks with RBAC Fallback

```typescript
// ✅ Good: Authors can always edit, others need permission
const isAuthor = resource.userId === userId;
if (!isAuthor) {
  await rbacService.requirePermission(userId, "resource:edit_any");
}

// ❌ Bad: RBAC check for everyone (too restrictive)
await rbacService.requirePermission(userId, "resource:edit"); // Author can't edit own!
```

### 6. Add RBAC Checks Early in Routes

```typescript
// ✅ Good: Check permission first
export default defineEventHandler(async (event) => {
  const rbacService = getRBACService(event);
  await rbacService.requirePermission(event.context.userId!, "projects:create");
  // ... rest of logic
});

// ❌ Bad: Check permission after expensive operations
export default defineEventHandler(async (event) => {
  const data = await expensiveOperation();
  await rbacService.requirePermission(event.context.userId!, "projects:create"); // Too late!
});
```

### 7. Test with Multiple Role Levels

```bash
# Test with different permission levels
1. Login as Super Admin (all access) - should work for everything
2. Login as Project Creator (can create projects) - should work for project creation
3. Login as Member (basic access) - should fail for project creation
```

### 8. Document Custom Permissions

```typescript
// Add comments explaining custom permissions
/**
 * Permission for accessing financial reports
 * Required for: /api/v1/reports/financial
 * Granted to: Super Admin, Finance Manager roles
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
5. Permission code matches exactly (case-sensitive)

**Debug:**

```typescript
const permissions = await getCurrentUserPermissions(event);
console.log("User permissions:", permissions);

const roles = await getCurrentUserRoles(event);
console.log("User roles:", roles);
```

### Permission Not Working After Update

**Cause:** Permission changes don't affect existing sessions

**Solution:** Sign out and sign in again to refresh permissions in session

### System Role Cannot Be Deleted

**Cause:** System roles (`isSystem: true`) are protected

**Solution:** This is by design. Update the role instead, or mark `isSystem: false` if absolutely needed

### Role Hierarchy Validation Failing

**Cause:** Trying to assign a role higher than current user's role

**Solution:** This is security feature (prevent privilege escalation). Users can only assign roles lower than their own.

**Example:**

```typescript
// admin (level 3) tries to assign owner (level 4)
canAssignRole("admin", "owner", PROJECT_ROLE_HIERARCHY); // Returns false

// Solution: Have an owner assign the owner role, or admin assign member/viewer
```

### RBAC Disabled But Still Getting Errors

**Check:** Ensure `NUXT_RBAC_ENABLED=false` in `.dev.vars`

**Verify:**

```typescript
const rbacService = getRBACService(event);
console.log("RBAC enabled:", rbacService.isEnabled());
```

---

## Additional Resources

- **[RBAC_IMPLEMENTATION.md](../RBAC_IMPLEMENTATION.md)** - Implementation checklist and progress tracking
- **[SECURITY.md](../OPERATIONS/SECURITY.md)** - Security architecture and threat model
- **[CLAUDE.md](../CLAUDE.md)** - Code patterns and best practices
- **[CLAUDE.md](../CLAUDE.md)** - Quick reference for AI-assisted development
- **API Documentation** - See `server/api/v1/roles/` and `server/api/v1/users/[userId]/roles/`

---

**Last Updated:** 2025-11-12
**Implementation Status:** ✅ Phase 1-3 Complete (Critical security fixes, message authorization, role hierarchy)

**Need help?** Open an issue in the repository or check the troubleshooting section above.
