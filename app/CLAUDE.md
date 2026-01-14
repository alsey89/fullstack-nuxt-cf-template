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

Use `useExtendedFetch()` for all HTTP requests:

```typescript
const { extendedFetch } = useExtendedFetch();

const response = await extendedFetch<ProjectData>(
  `/v1/projects/${projectId}`,
  { method: 'GET' }
);

if (response.ok) {
  // response.payload.data contains the result
}
```

Features:
- Automatic request ID headers
- Centralized error handling
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
