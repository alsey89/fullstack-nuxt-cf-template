# Frontend Guide

Frontend patterns and conventions for Keystone's Nuxt 4 application.

## Tech Stack

**Framework:** Nuxt 4 (Vue 3)
**Language:** TypeScript
**Styling:** Tailwind CSS (exclusively)
**State Management:** Pinia (Composition API preferred)
**Forms:** vee-validate + Zod
**UI Components:** shadcn-vue
**Icons:** Iconify via nuxt-icon
**i18n:** Vue I18n

---

## Core Patterns

### [Component Architecture](./COMPONENTS.md)

Component organization, naming, and structure.

**Key Concepts:**

- Component auto-import (never import components manually)
- shadcn-vue UI component library
- TypeScript with proper typing
- Component composition and props patterns
- App-specific vs generic components

**When to read:**

- Creating any new component
- Understanding component organization
- Working with shadcn-vue components

### [State Management](./STATE_MANAGEMENT.md)

Pinia store patterns with Composition API.

**Key Concepts:**

- Composition API (preferred) vs Options API (legacy)
- Store structure: `ref()` state, `computed()` getters, async actions
- Always use `useExtendedFetch()` for API calls
- Actions return `Promise<boolean>` for success/failure
- Master-detail, pagination, filtering patterns

**When to read:**

- Creating a new store
- Managing application state
- Fetching data from APIs
- Migrating Options API stores

### [Form Handling](./FORMS.md)

Type-safe form validation with vee-validate + Zod.

**Key Concepts:**

- vee-validate for form state management
- Shared Zod validators between frontend and backend
- Form submission patterns
- Validation timing and error display
- API integration with stores

**When to read:**

- Creating forms
- Implementing validation
- Handling form submission
- Displaying validation errors

### [Styling Conventions](./STYLING.md)

Tailwind CSS patterns and best practices.

**Key Concepts:**

- Tailwind utilities exclusively (no scoped CSS)
- Theme tokens for colors (`bg-background`, `text-foreground`)
- Responsive design patterns
- Layout, spacing, typography conventions
- Component styling patterns

**When to read:**

- Styling components
- Understanding the color system
- Implementing responsive designs
- Working with Tailwind utilities

---

## Architecture Principles

### TypeScript Throughout

All components and logic use TypeScript for type safety:

- Components: `<script setup lang="ts">`
- Stores: Full TypeScript with proper interfaces
- Forms: Type-safe validation with Zod
- API responses: Typed from backend schema

### Tailwind CSS Only

**No scoped CSS blocks anywhere:**

- All styling via Tailwind utility classes
- Use theme tokens for colors (never hardcode)
- Mobile-first responsive design
- Consistent spacing and typography

### Auto-Import System

Nuxt auto-imports everything - never import manually:

- **Components:** All from `app/components/**/*.vue`
- **Vue utilities:** `ref`, `computed`, `watch`, `onMounted`, etc.
- **Composables:** `useRouter`, `useI18n`, custom composables from `app/composables/`
- **Pinia stores:** All stores from `app/stores/`

**Only import manually:**

- Types: `import type { User } from '~~/server/database/schema/users'`
- Zod schemas: `import { taskSchema } from '#shared/validators/task'`

### Shared Validation

Zod schemas shared between frontend and backend:

- Located in `shared/validators/`
- Frontend uses for vee-validate
- Backend uses for API validation
- Single source of truth

---

## Best Practices

### Component Development

**✅ DO:**

- Use TypeScript with `lang="ts"`
- Use Tailwind utilities exclusively
- Let Nuxt auto-import components, Vue utilities, and composables
- Use shadcn-vue for UI components
- Follow mobile-first responsive design
- Use theme tokens for colors
- Only import types and Zod schemas manually

**❌ DON'T:**

- Don't add `<style scoped>` blocks
- Don't import components (auto-imported)
- Don't import Vue utilities like `ref`, `computed` (auto-imported)
- Don't import composables or stores (auto-imported)
- Don't use hardcoded colors
- Don't use arbitrary Tailwind values unless necessary
- Don't skip TypeScript typing

### State Management

**✅ DO:**

- Use Composition API for new stores
- Return `Promise<boolean>` from actions
- Use `useExtendedFetch()` for API calls
- Show success toasts in store actions
- Let `useExtendedFetch` handle errors
- Use `storeToRefs()` when destructuring

**❌ DON'T:**

- Don't use Options API for new stores
- Don't handle errors manually
- Don't use `$fetch` directly in stores
- Don't forget to show success toasts
- Don't create God stores
- Don't use stores for form state

### Forms and Validation

**✅ DO:**

- Use shared Zod schemas from `#shared/validators/`
- Use vee-validate for all forms
- Validate on blur for better UX
- Show inline errors next to labels
- Disable submit button while submitting
- Use `isDirty` to track unsaved changes
- Always validate on server

**❌ DON'T:**

- Don't create separate FE and BE schemas
- Don't validate on every keystroke
- Don't handle errors manually
- Don't forget loading states
- Don't skip server-side validation
- Don't use manual form state

### Styling

**✅ DO:**

- Use Tailwind utilities exclusively
- Use theme tokens for all colors
- Use mobile-first responsive classes
- Use `gap` for spacing between items
- Group related utilities logically
- Use opacity modifiers (`bg-primary/90`)

**❌ DON'T:**

- Don't add `<style scoped>` blocks
- Don't use hardcoded colors
- Don't use arbitrary values excessively
- Don't mix Tailwind with custom CSS
- Don't use `!important`

---

## Quick Navigation

**By Task:**

- Creating a component → [COMPONENTS.md](./COMPONENTS.md)
- Managing state → [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
- Building a form → [FORMS.md](./FORMS.md)
- Styling a component → [STYLING.md](./STYLING.md)

**By Component Location:**

- `app/components/ui/` - shadcn-vue UI primitives
- `app/components/App/` - App-level shared components
- `app/components/User/` - User-related components
- `app/components/Task/` - Task-related components
- `app/components/Chat/` - Chat-related components
- `app/pages/` - Page components with routing

---

## Component Organization

```
app/
├── components/
│   ├── ui/              # shadcn-vue components (auto-imported)
│   ├── App/             # App-level shared components
│   ├── User/            # User-specific components
│   ├── Task/            # Task-specific components
│   ├── Chat/            # Chat-specific components
│   ├── Goals/           # Goals-specific components
│   ├── Project/         # Project-specific components
│   └── Generic/         # Generic reusable components
├── pages/               # Route pages (auto-routes)
├── layouts/             # Layout components
├── stores/              # Pinia stores
└── composables/         # Composable functions
```

---

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](../CONVENTIONS/COMMON_PITFALLS.md#frontend) - Frontend mistakes to avoid
- [Development Checklists](../CONVENTIONS/CHECKLISTS.md) - Step-by-step guides
- [Import Conventions](../CONVENTIONS/IMPORTS.md) - Auto-import configuration
- [Naming Conventions](../CONVENTIONS/NAMING.md) - File and component naming

**Integration:**

- [Backend API Routes](../BACKEND/API_ROUTES.md) - API endpoints to call
- [Error Handling](../BACKEND/ERROR_HANDLING.md) - Error codes and handling
- [RBAC](../BACKEND/RBAC.md) - Permission system

**Setup:**

- [5-Minute Quickstart](../QUICKSTART.md) - Fast local setup
- [Contributing Guide](../../CONTRIBUTING.md) - Development workflow

---

**Last updated:** 2025-11-30
