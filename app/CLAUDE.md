# Frontend Conventions

Quick reference for Claude when working on the frontend.

## Store vs Composable

**Use Pinia store when:**
- Data persists across page navigation
- Multiple unrelated components need the same data
- Data requires server synchronization (CRUD)

**Use composable when:**
- UI state (modals, sheets, tabs)
- Feature-specific logic
- Utilities and helpers

## Type Imports

**Always import from `#shared/types`:**

```typescript
// ✅ Correct
import type { User, ApiResponse } from '#shared/types';

// ❌ Wrong - server schemas are internal
import type { User } from '#server/database/schema/identity';
```

## API Calls

Use `useExtendedFetch()` for HTTP requests. It provides two functions:

### extendedFetch (default choice)

Handles errors automatically via `handleApiError()`:

```typescript
const { extendedFetch } = useExtendedFetch();

const response = await extendedFetch<ProjectData>('/v1/projects');

if (response?.ok) {
  // response.payload.data contains the result
}
// Errors are handled automatically (toast, redirect, etc.)
```

### simpleFetch (custom error handling)

Same as `extendedFetch` but does NOT handle errors - use when you need custom error handling:

```typescript
const { simpleFetch } = useExtendedFetch();

try {
  const response = await simpleFetch<ProjectData>('/v1/projects');
  // Handle success
} catch (error) {
  // Handle error yourself
}
```

Both include:
- Automatic request ID headers (`X-Request-Id`)
- Tenant ID headers (`X-Tenant-Id`)
- Typed responses

## Error Handling

Error codes are shared between FE/BE (`shared/error/codes.ts`):

```typescript
import { handleApiError } from '@/composables/useErrorHandler';

try {
  await extendedFetch(...);
} catch (error) {
  handleApiError(error);  // Shows toast, handles redirects
}
```

Backend `message` field is for developers; users see i18n translations based on `code`.

## Form Handling

Forms use **vee-validate** + **Zod** + **shadcn FormField**:

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { createProjectSchema } from '#shared/validators/project';

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(createProjectSchema),
});

const onSubmit = handleSubmit(async (values) => {
  await extendedFetch('/v1/projects', { method: 'POST', body: values });
});
</script>

<template>
  <form @submit.prevent="onSubmit">
    <FormField v-slot="{ field }" name="name">
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input v-bind="field" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <Button type="submit" :disabled="isSubmitting">Create</Button>
  </form>
</template>
```

## Component Organization

```
components/
├── ui/              # shadcn-vue base components
├── App/             # App-level components (Sidebar, Layout)
├── User/            # User domain components
└── Generic/         # Shared generic components
```

## Composable Pattern

```typescript
export function useTaskSheet() {
  // State via useState (SSR-safe)
  const isOpen = useState<boolean>('taskSheet_isOpen', () => false);

  // Actions
  const openSheet = (taskId: string) => {
    isOpen.value = true;
  };

  return { isOpen, openSheet };
}
```

## Styling

Use Tailwind CSS exclusively:

```vue
<template>
  <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-background">
    Content
  </div>
</template>
```

Dark mode: Use `dark:` prefix for dark mode variants.

## Key Files

| Pattern | File |
|---------|------|
| Extended fetch | `composables/useExtendedFetch.ts` |
| Error handler | `composables/useErrorHandler.ts` |
| Toast | `composables/useShowToast.ts` |
| User store | `stores/userStore.ts` |
| Auth middleware | `middleware/auth.global.ts` |

## Adding a New Page

Step-by-step guide for adding a new page:

### 1. Create Page File

Create `app/pages/{path}.vue` (file path = URL path):

```vue
<template>
  <div class="space-y-6">
    <AppPageHeader :showBack="true">
      <template #title>Page Title</template>
    </AppPageHeader>

    <Card class="main-content">
      <CardHeader>
        <CardTitle>{{ t('page.title') }}</CardTitle>
        <CardDescription>{{ t('page.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Content here -->
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',  // or 'auth' for auth pages
});

useHead({ title: 'Page Title' });

const { t } = useI18n();

onMounted(() => {
  primaryAnimation({ identifier: '.main-content' });
});
</script>
```

### 2. Add i18n Keys

Add translations to `i18n/i18n.config.ts` for all 3 locales (en, zh-CN, zh-TW):

```typescript
page: {
  title: "Page Title",
  description: "Page description text",
},
```

### 3. Add Navigation (if needed)

Update `components/App/Sidebar.vue` to include the new page in navigation.

### 4. Protected vs Public Pages

**Protected pages** (default): Require authentication. No extra config needed.

**Public pages**: Add to `publicPaths` in `middleware/auth.global.ts`:

```typescript
const publicPaths = [
  "/auth/signin",
  "/your-new-public-page",  // Add here
];
```

### Page Types

| Type | Layout | Location | Example |
|------|--------|----------|---------|
| Dashboard | `default` | `pages/` | `pages/dashboard.vue` |
| Auth | `auth` | `pages/auth/` | `pages/auth/signin.vue` |
| Settings | `default` | `pages/account/` | `pages/account/settings.vue` |
| Help | `default` | `pages/help/` | `pages/help/contact.vue` |

### With Data Fetching

```vue
<script setup lang="ts">
const { extendedFetch } = useExtendedFetch();
const projects = ref<Project[]>([]);
const loading = ref(true);

onMounted(async () => {
  const response = await extendedFetch<Project[]>('/v1/projects');
  if (response.ok) {
    projects.value = response.payload.data;
  }
  loading.value = false;
});
</script>
```

### With Form

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { createProjectSchema } from '#shared/validators/project';

const { handleSubmit, isSubmitting, isFieldDirty } = useForm({
  validationSchema: toTypedSchema(createProjectSchema),
});

const onSubmit = handleSubmit(async (values) => {
  const { extendedFetch } = useExtendedFetch();
  await extendedFetch('/v1/projects', { method: 'POST', body: values });
});
</script>
```

### Checklist

- [ ] Page file in correct location (`pages/{path}.vue`)
- [ ] `definePageMeta` with correct layout
- [ ] `useHead` for page title
- [ ] i18n keys for all text (3 locales)
- [ ] Entry animation with `primaryAnimation()`
- [ ] Added to navigation if needed
- [ ] Added to `publicPaths` if public page
