# Common Pitfalls

This section lists frequent mistakes to avoid. Review this before starting any development task.

## Backend Pitfalls

### Database & Repositories

- ❌ **Forgetting soft delete checks** → ALWAYS use `this.notDeleted(schema.table)` helper in queries

  ```typescript
  // ❌ WRONG
  .where(eq(schema.users.id, id))

  // ✅ CORRECT
  .where(and(eq(schema.users.id, id), this.notDeleted(schema.users)))
  ```

- ❌ **Using `isNull(schema.table.deletedAt)` directly** → Use `this.notDeleted()` from BaseRepository

- ❌ **Manually generating IDs or timestamps in repositories** → `baseFields.$defaultFn()` handles this automatically

  ```typescript
  // ❌ WRONG - Manual ID generation
  const id = this.generateId(); // doesn't exist!
  const example = { id, createdAt: new Date(), ...data };

  // ✅ CORRECT - Let Drizzle handle it
  const [example] = await this.drizzle
    .insert(schema.examples)
    .values(data)
    .returning();
  ```

### Imports & Aliases

- ❌ **Using relative imports** (`../../services/identity`) → Use `#server` alias
- ❌ **Using `../` more than one level** → Use path aliases
- ❌ **Inconsistent alias usage** → Frontend: `@`, Backend: `#server`, Cross-boundary: `~~`

### Environment Detection

- ❌ **Hardcoding environment strings** (`"development"`) → Use `isDevelopment()`, `ENV.DEVELOPMENT`
- ❌ **Not passing event to environment functions** → Pass `event` parameter when available
- ❌ **Checking environment multiple times inline** → Assign to variable if used 2+ times

### Services & Business Logic

- ❌ **Missing userId validation** → Check `if (!this.userId)` at start of service methods
- ❌ **Not logging significant actions** → Add audit logs for create/update/delete operations
- ❌ **Skipping permission checks** → Validate permissions before sensitive operations
- ❌ **Creating service singletons** → Services must be request-scoped (via factory functions)
- ❌ **Missing context validation in constructor** → Validate `db` and required context in constructor

### API Routes & Validation

- ❌ **No input validation** → ALWAYS use Zod schemas for request validation
- ❌ **Not using factory functions** → Use `createExampleService(event)` pattern
- ❌ **Not using response helpers** → Use `createSuccessResponse()` for consistency
- ❌ **Handling errors manually** → Let error middleware handle errors (just throw)

### Error Handling

- ❌ **Including redundant error details** → Don't add `tenantId`, `path`, `method` (already logged)
- ❌ **Using generic errors** → Use specific error classes when available
- ❌ **Not including field names in validation errors** → Add `{ field: 'email' }` to details

### Deprecation Pattern

When deprecating code, add JSDoc deprecation notices and TODO comments:

```typescript
/**
 * @deprecated Use EntityMentionsRepository instead.
 * This repository handles legacy tables being phased out.
 * TODO: Remove this file once all usages have been migrated
 */
export class LegacyRepository extends BaseRepository { ... }

/**
 * @deprecated Use createXxxService instead
 */
export const getXxxService = createXxxService;
```

## Frontend Pitfalls

### API Calls & State Management

- ❌ **Direct `$fetch` in pages/components** → ALL API calls must go through store actions
- ❌ **Using `$fetch` in stores** → Use `extendedFetch` for centralized error handling
- ❌ **Duplicating store state locally** → Single source of truth in stores
- ❌ **Creating wrapper composables for stores** → Use stores directly in pages
- ❌ **API calls outside store actions** → Store actions are the ONLY place for API calls

### State Management

- ❌ **Putting library instances in stores** → Use composables (Marzipano viewer, etc.)
- ❌ **Putting high-frequency state in stores** → Use component-local refs for drag coordinates, etc.
- ❌ **Putting DOM references in stores** → Use composables or component-local
- ❌ **Not returning boolean from store actions** → Return true/false for success/failure

### Forms

- ❌ **Creating local form state** (`form.value`) → vee-validate IS the state
- ❌ **Direct API calls from form submission** → Call store actions
- ❌ **Manual validation** → Let Zod schemas handle validation
- ❌ **Not using shared validators** → Import from `#shared/validators/*`
- ❌ **Forgetting i18n for error messages** → Extend schemas with `t()` messages

### Components & Auto-Imports

- ❌ **Importing components explicitly** → Nuxt auto-imports them
- ❌ **Lowercase folder names** → Use PascalCase (App, Tours, not app, tours)
- ❌ **Deeply nested components** (3+ levels) → Keep 2 levels max
- ❌ **Using index.vue** → Name files explicitly (Sidebar.vue, not index.vue)
- ❌ **Creating components for single-use UI** → Only extract when used 2+ times

### Composables

- ❌ **Missing `use` prefix** → Composables must start with `use`
- ❌ **Creating store wrappers** → Use stores directly
- ❌ **Using composables for state management** → Use stores for state

### General

- ❌ **Not using auto-imports** → Don't import composables, utils, stores, components
- ❌ **Default exports in utils/composables** → Use named exports
- ❌ **Forgetting to update loading state** → Track loading in store actions

---

## Related Documentation

**Quick Reference:**

- [Development Checklists](./CHECKLISTS.md) - Step-by-step implementation guides
- [Import Conventions](./IMPORTS.md) - Path aliases and auto-imports
- [Naming Conventions](./NAMING.md) - File and variable naming

**Deep Dive:**

- [Service Patterns](../BACKEND/SERVICES.md) - Service layer conventions
- [Frontend State Management](../FRONTEND/STATE_MANAGEMENT.md) - Pinia and stores
- [Error Handling](../BACKEND/ERROR_HANDLING.md) - Error system and codes
