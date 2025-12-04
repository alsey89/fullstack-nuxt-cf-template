# Naming Conventions

Consistent naming patterns across the codebase for files, functions, classes, and variables.

## Quick Reference Table

| Type                   | Convention                        | Examples                                            | Notes                                                              |
| ---------------------- | --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| **Files**              |                                   |                                                     |                                                                    |
| API Routes             | `kebab-case.{method}.ts`          | `user-profile.get.ts`<br>`signin.post.ts`           | HTTP method as extension                                           |
| Services               | `camelCase.ts`                    | `identityService.ts`<br>`rbacService.ts`            | Descriptive, domain-focused                                        |
| Repositories           | `camelCase.ts`                    | `identityRepository.ts`<br>`auditLogRepository.ts`  | Match service naming                                               |
| Components             | `PascalCase.vue`                  | `UserCard.vue`<br>`AppSidebar.vue`                  | Match folder nesting in Pascal Case example: User/Card -> UserCard |
| Composables            | `useCamelCase.ts`                 | `useMarzipano.ts`<br>`useRetry.ts`                  | Must start with `use`                                              |
| Stores                 | `camelCaseStore.ts`               | `userStore.ts`<br>`projectStore.ts`                 | End with `Store`                                                   |
| Utils                  | `camelCase.ts`                    | `stringUtils.ts`<br>`dateUtils.ts`                  | Any case works, prefer camelCase                                   |
| Types                  | `camelCase.ts` or `PascalCase.ts` | `api.ts`<br>`User.ts`                               | Context-dependent                                                  |
| **Functions**          |                                   |                                                     |                                                                    |
| Regular Functions      | `camelCase`                       | `createUser()`<br>`validateEmail()`                 | Verb-first                                                         |
| Async Functions        | `camelCase`                       | `async fetchUsers()`<br>`async saveProject()`       | Same as regular                                                    |
| Event Handlers         | `handleCamelCase`                 | `handleSubmit()`<br>`handleClick()`                 | Prefix with `handle`                                               |
| Composables            | `useCamelCase`                    | `useMarzipano()`<br>`useRetry()`                    | Must start with `use`                                              |
| Store Actions          | `camelCase`                       | `fetchUser()`<br>`updateProject()`                  | Verb-first                                                         |
| **Classes**            |                                   |                                                     |                                                                    |
| Services               | `PascalCase` + `Service`          | `IdentityService`<br>`RBACService`                  | Suffix with `Service`                                              |
| Repositories           | `PascalCase` + `Repository`       | `UserRepository`<br>`AuditLogRepository`            | Suffix with `Repository`                                           |
| Errors                 | `PascalCase` + `Error`            | `ValidationError`<br>`AuthenticationError`          | Suffix with `Error`                                                |
| **Constants**          |                                   |                                                     |                                                                    |
| Global Constants       | `SCREAMING_SNAKE_CASE`            | `MAX_PAGE_SIZE`<br>`DEFAULT_TIMEOUT`                | All caps with underscores                                          |
| Enum Values            | `SCREAMING_SNAKE_CASE`            | `ENV.DEVELOPMENT`<br>`ERROR_CODES.VALIDATION_ERROR` | All caps                                                           |
| Config Keys            | `SCREAMING_SNAKE_CASE`            | `JWT_SECRET`<br>`DATABASE_URL`                      | Environment variables                                              |
| **Variables**          |                                   |                                                     |                                                                    |
| Local Variables        | `camelCase`                       | `userId`<br>`currentProject`                        | Descriptive names                                                  |
| Boolean Variables      | `is/has/should` + `CamelCase`     | `isActive`<br>`hasPermission`<br>`shouldRedirect`   | Prefix for booleans                                                |
| Private Class Fields   | `camelCase`                       | `private userId`<br>`private db`                    | No underscore prefix                                               |
| **Types & Interfaces** |                                   |                                                     |                                                                    |
| Types                  | `PascalCase`                      | `User`<br>`ApiResponse<T>`                          | Singular, descriptive                                              |
| Interfaces             | `PascalCase`                      | `IUser`<br>`IRepository`                            | Optional `I` prefix                                                |
| Generic Types          | `T`, `K`, `V`                     | `Array<T>`<br>`Record<K, V>`                        | Single uppercase letter                                            |
| **Database**           |                                   |                                                     |                                                                    |
| Table Names            | `snake_case` (plural)             | `users`<br>`audit_logs`                             | Lowercase, plural                                                  |
| Column Names           | `snake_case`                      | `user_id`<br>`created_at`                           | Lowercase with underscores                                         |
| Primary Keys           | `id`                              | `id`                                                | Always just `id`                                                   |
| Foreign Keys           | `{table}_id`                      | `user_id`<br>`role_id`                              | Singular table name + `_id`                                        |
| Timestamps             | `{action}_at`                     | `created_at`<br>`updated_at`<br>`deleted_at`        | Past tense + `_at`                                                 |
| Booleans               | `is_{adjective}`                  | `is_active`<br>`is_verified`                        | Prefix with `is_`                                                  |

---

## File Naming Examples

```
✅ GOOD:
server/api/v1/auth/signin.post.ts
server/services/identityService.ts
server/repositories/userRepository.ts
app/components/User/ProfileCard.vue
app/composables/useMarzipano.ts
app/stores/userStore.ts

❌ BAD:
server/api/v1/auth/SignIn.post.ts          // Should be kebab-case
server/services/identity-service.ts        // Should be camelCase
app/components/user/profile-card.vue       // Folder should be PascalCase
app/composables/marzipano.ts               // Missing 'use' prefix
app/stores/user.ts                         // Missing 'Store' suffix
```

## Function Naming Examples

```typescript
// ✅ GOOD
function createUser(data: CreateUserRequest) {}
async function fetchUserById(id: string) {}
function handleSubmit(values: FormValues) {}
export function useMarzipano() {}

// ❌ BAD
function CreateUser(data: CreateUserRequest) {} // Should be camelCase
async function getUserById(id: string) {} // Prefer 'fetch' for async
function onSubmit(values: FormValues) {} // Prefer 'handle' prefix
export function marzipano() {} // Missing 'use' prefix
```

## Variable Naming Examples

```typescript
// ✅ GOOD
const userId = event.context.userId
const isAuthenticated = computed(() => user.value !== null)
const hasPermission = await checkPermission(userId, 'users:create')
const shouldRedirect = !isAuthenticated.value

// ❌ BAD
const user_id = event.context.userId              // Should be camelCase
const authenticated = computed(...)               // Should be 'isAuthenticated'
const permission = await checkPermission(...)     // Unclear, use 'hasPermission'
const redirect = !isAuthenticated.value           // Should be 'shouldRedirect'
```

## Database Naming Examples

```typescript
// ✅ GOOD
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  firstName: text("first_name"),
  isActive: integer("is_active", { mode: "boolean" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// ❌ BAD
export const Users = sqliteTable("Users", {
  // Table should be lowercase
  ID: text("ID").primaryKey(), // Column should be lowercase
  user_id: text("userID"), // Inconsistent
  FirstName: text("FirstName"), // Should be snake_case
  active: integer("active"), // Should be 'is_active'
  created: integer("created"), // Should be 'created_at'
});
```

---

## Naming Patterns by Context

### API Routes

**Pattern:** `{resource}.{method}.ts` or `{kebab-case-name}.{method}.ts`

```
✅ server/api/v1/auth/signin.post.ts
✅ server/api/v1/users/index.get.ts
✅ server/api/v1/users/[id].get.ts
✅ server/api/v1/user-profile.patch.ts

❌ server/api/v1/auth/signIn.post.ts       // Should be kebab-case
❌ server/api/v1/users/getUsers.ts         // Method in filename, not extension
```

### Services and Repositories

**Pattern:** `{domain}{Type}.ts` where Type is Service or Repository

```
✅ server/services/identityService.ts
✅ server/services/rbacService.ts
✅ server/repositories/userRepository.ts
✅ server/repositories/projectRepository.ts

❌ server/services/identity.ts             // Missing 'Service'
❌ server/services/IdentityService.ts      // Should be camelCase
❌ server/repositories/user-repository.ts  // Should be camelCase
```

### Components

**Pattern:** `{Category}/{ComponentName}.vue` (both PascalCase)

```
✅ app/components/App/Sidebar.vue          → <AppSidebar />
✅ app/components/User/ProfileCard.vue     → <UserProfileCard />
✅ app/components/Task/Sheet.vue           → <TaskSheet />

❌ app/components/app/sidebar.vue          // Lowercase folder
❌ app/components/User/profile-card.vue    // kebab-case file
❌ app/components/App/index.vue            // Don't use index.vue
```

### Composables

**Pattern:** `use{FunctionalityName}.ts`

```
✅ app/composables/useMarzipano.ts         → useMarzipano()
✅ app/composables/useRetry.ts             → useRetry()
✅ app/composables/useExtendedFetch.ts     → useExtendedFetch()

❌ app/composables/marzipano.ts            // Missing 'use' prefix
❌ app/composables/UseMarzipano.ts         // Should be camelCase
❌ app/composables/use-retry.ts            // Should be camelCase
```

### Stores

**Pattern:** `{domain}Store.ts` with export `use{Domain}Store`

```
✅ app/stores/userStore.ts                 → useUserStore()
✅ app/stores/projectStore.ts              → useProjectStore()
✅ app/stores/billingStore.ts              → useBillingStore()

❌ app/stores/user.ts                      // Missing 'Store' suffix
❌ app/stores/UserStore.ts                 // Should be camelCase
❌ app/stores/use-user-store.ts            // Should be camelCase
```

### Boolean Variables and Functions

Use clear prefixes that indicate true/false:

```typescript
// ✅ GOOD
const isActive = user.isActive
const hasPermission = await checkPermission(...)
const shouldRedirect = !isAuthenticated
const canEdit = isOwner || isAdmin

// Functions returning booleans
function isValidEmail(email: string): boolean { }
function hasRole(userId: string, role: string): boolean { }
function canAccessResource(userId: string, resourceId: string): boolean { }

// ❌ BAD
const active = user.isActive              // Unclear type
const permission = await checkPermission(...) // What type?
const redirect = !isAuthenticated         // Unclear
```

### Constants and Enums

```typescript
// ✅ GOOD
const MAX_PAGE_SIZE = 100;
const DEFAULT_TIMEOUT = 5000;
const API_BASE_URL = process.env.API_URL;

enum ENV {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
}

const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
} as const;

// ❌ BAD
const maxPageSize = 100; // Should be SCREAMING_SNAKE_CASE
const ApiBaseUrl = process.env.API_URL; // Should be all caps
```

---

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](./COMMON_PITFALLS.md#imports--aliases) - Naming-related mistakes
- [Import Conventions](./IMPORTS.md) - File naming for auto-imports

**Deep Dive:**

- [Backend Guide](../BACKEND/README.md) - Backend naming patterns (when available)
- [Frontend Guide](../FRONTEND/README.md) - Frontend naming patterns (when available)
- [Database Schema](../../server/database/schema/README.md) - Database naming
