# Development Checklists

Use these checklists to ensure consistent implementation across the codebase.

## New API Endpoint Checklist

When creating a new API endpoint:

- [ ] Create Zod validator in `#shared/validators/` (shared with frontend)
- [ ] Add repository method in `server/repositories/` if data access is needed
- [ ] Implement service method with:
  - [ ] Permission check (`if (!this.userId)` or RBAC check)
  - [ ] Business logic
  - [ ] Audit log for sensitive operations
- [ ] Create route handler in `server/api/v1/`:
  - [ ] Validate request with Zod schema
  - [ ] Use factory function to create service
  - [ ] Call service method
  - [ ] Return standardized response via `createSuccessResponse()`
- [ ] Add integration test in `server/api/__tests__/`
- [ ] Update API documentation if needed
- [ ] Test manually in development

## New Database Table Checklist

When adding a new database table:

- [ ] Define schema in `server/database/schema/`:
  - [ ] Include `baseFields` (id, createdAt, updatedAt, deletedAt)
  - [ ] Use `text()` for IDs with `createId()`
  - [ ] Use `integer()` with `mode: "timestamp"` for dates
  - [ ] Use `integer()` with `mode: "boolean"` for booleans
  - [ ] Add foreign key constraints with `onDelete: "cascade"` where appropriate
- [ ] Add indexes:
  - [ ] Foreign keys
  - [ ] Commonly queried fields
  - [ ] Unique constraints where needed
- [ ] Run `npm run db:generate` to create migration
- [ ] Review generated migration in `server/database/migrations/`
- [ ] Test migration locally: `npm run db:migrate:local:staging`
- [ ] Create repository class extending `BaseRepository`
- [ ] Add CRUD methods to repository
- [ ] ALWAYS use `this.notDeleted(schema.table)` in queries
- [ ] Create service class if business logic is needed
- [ ] Add tests for repository methods

## New Feature Checklist

When implementing a complete feature:

- [ ] **Planning**:
  - [ ] Review requirements and acceptance criteria
  - [ ] Identify required database changes
  - [ ] Identify required API endpoints
  - [ ] Identify required frontend pages/components
- [ ] **Backend**:
  - [ ] Database schema changes (see Database Table Checklist)
  - [ ] Repository layer implementation
  - [ ] Service layer implementation
  - [ ] API endpoints (see API Endpoint Checklist)
  - [ ] Error handling with specific error classes
  - [ ] Audit logging for sensitive operations
- [ ] **Frontend**:
  - [ ] Store actions for API calls (using `extendedFetch`)
  - [ ] Store state management
  - [ ] Form components with vee-validate + shared validators
  - [ ] UI components (only if reused 2+ times)
  - [ ] Page implementation
- [ ] **Testing**:
  - [ ] Unit tests for service methods
  - [ ] Integration tests for API endpoints
  - [ ] Manual testing in development
- [ ] **Documentation**:
  - [ ] Update relevant docs if patterns changed
  - [ ] Add JSDoc comments for complex logic

## New Store Action Checklist

When adding a new store action:

- [ ] Use `extendedFetch` from `useExtendedFetch()` (NEVER `$fetch`)
- [ ] Update loading state (`this.loading = true` at start)
- [ ] Clear error state (`this.error = null`)
- [ ] Make API call with proper method and body
- [ ] Update store state immediately on success
- [ ] Show success toast with descriptive message
- [ ] Return boolean (true for success, false for failure)
- [ ] Clear loading state in `finally` block
- [ ] Let `extendedFetch` handle error toasts (don't duplicate)

**Template:**

```typescript
async myAction(data: MyData) {
  try {
    this.loading = true
    this.error = null

    const { extendedFetch } = useExtendedFetch()
    const { ok, payload } = await extendedFetch('/v1/endpoint', {
      method: 'POST',
      body: data
    })

    if (ok) {
      this.myState = payload.data
      toast.success('Action completed')
      return true
    }
    return false
  } catch (error: any) {
    this.error = error.message
    return false
  } finally {
    this.loading = false
  }
}
```

## New Form Component Checklist

When creating a form:

- [ ] Import shared validator from `#shared/validators/*`
- [ ] Extend validator with i18n messages using `t()`
- [ ] Use `useForm()` from vee-validate with `toTypedSchema()`
- [ ] Destructure needed properties: `handleSubmit`, `isSubmitting`, `setValues`, `isFieldDirty`
- [ ] Set initial values in `useForm()` config
- [ ] Create submit handler with `handleSubmit(async (values) => ...)`
- [ ] Call store action (NOT direct API call)
- [ ] Use `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` components
- [ ] Use `v-bind="field"` on input components
- [ ] Use `:validate-on-blur="!isFieldDirty"` for better UX
- [ ] Show loading spinner when `isSubmitting` is true
- [ ] Disable submit button when `isSubmitting` is true
- [ ] Populate form with `setValues()` if editing existing data

---

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](./COMMON_PITFALLS.md) - Avoid frequent mistakes
- [Naming Conventions](./NAMING.md) - File and variable naming
- [Import Conventions](./IMPORTS.md) - Path aliases and auto-imports

**Deep Dive:**

- [Backend Guide](../BACKEND/README.md) - Backend patterns (when available)
- [Frontend Guide](../FRONTEND/README.md) - Frontend patterns (when available)
- [Testing Guide](../TESTING.md) - Testing patterns and best practices
