# Component Patterns

Component architecture and organization for Keystone.

## Overview

Keystone uses Vue 3 with TypeScript and follows Nuxt 4 auto-import conventions.

**Core Principles:**
- TypeScript throughout (`<script setup lang="ts">`)
- Component auto-import (never import manually)
- shadcn-vue for UI primitives
- Tailwind CSS for styling
- Composition API for logic

---

## Component Organization

```
app/components/
├── ui/              # shadcn-vue UI primitives (Button, Card, Input, etc.)
├── App/             # App-level shared components (Header, Wrapper, etc.)
├── User/            # User-specific components (Avatar, AvatarGroup, etc.)
├── Task/            # Task management components
├── Chat/            # Chat/messaging components
├── Goals/           # Goals management components
├── Project/         # Project management components
└── Generic/         # Generic reusable components
```

---

## Component Auto-Import

### Nuxt Auto-Imports Everything

**Components, Vue utilities, and composables are all auto-imported:**

```vue
<!-- ✅ GOOD: Auto-imported -->
<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
  </Card>
</template>

<script setup lang="ts">
// ❌ NEVER import these (auto-imported):
// import { ref, computed, watch } from 'vue'
// import { useRouter, useRoute } from 'vue-router'
// import { useI18n } from 'vue-i18n'
// import { Card } from '@/components/ui/card'
// import { useAuthStore } from '@/stores/authStore'

// ✅ Only import types and Zod schemas
import type { User } from '~~/server/database/schema/users'
import { taskSchema } from '#shared/validators/task'

// Auto-imported Vue utilities
const title = ref('My Title')
const isActive = computed(() => title.value.length > 0)

// Auto-imported composables
const router = useRouter()
const { t } = useI18n()

// Auto-imported stores
const authStore = useAuthStore()
</script>
```

**What's auto-imported:**
- ✅ Components (`Button`, `Card`, `Input`, etc.)
- ✅ Vue utilities (`ref`, `computed`, `watch`, `onMounted`, etc.)
- ✅ Vue Router (`useRouter`, `useRoute`, `navigateTo`)
- ✅ Nuxt composables (`useI18n`, `useFetch`, `useRuntimeConfig`)
- ✅ Pinia stores (`useTaskStore`, `useAuthStore`, etc.)
- ✅ Custom composables from `app/composables/`

**What to import manually:**
- ❌ Types (`import type { User }`)
- ❌ Zod schemas (`import { taskSchema }`)
- ❌ Utility functions from libraries
- ❌ Server-side imports (`import { db } from '~~/server/database'`)

### Component Naming

Components are auto-imported based on their file path:

| File Path | Component Name | Usage |
|-----------|---------------|-------|
| `components/ui/button/Button.vue` | `<Button />` | shadcn-vue component |
| `components/App/PageHeader.vue` | `<AppPageHeader />` | App component |
| `components/User/Avatar.vue` | `<UserAvatar />` | User component |
| `components/Chat/MessageBox.vue` | `<ChatMessageBox />` | Chat component |

**Naming pattern:** PascalCase based on folder structure

---

## Component Structure

### Basic Component Template

```vue
<template>
  <div class="flex items-center gap-4">
    <h2 class="text-xl font-semibold">{{ title }}</h2>
    <Button @click="handleClick">Action</Button>
  </div>
</template>

<script setup lang="ts">
// Props with TypeScript
interface Props {
  title: string
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

// Emits with TypeScript
const emit = defineEmits<{
  'update:value': [value: string]
  'submit': [data: FormData]
}>()

// Auto-imported composables (no import needed)
const { t } = useI18n()
const router = useRouter()

// Auto-imported Vue utilities (no import needed)
const count = ref(0)
const isDisabled = computed(() => count.value === 0)

// Methods
function handleClick() {
  emit('submit', new FormData())
}
</script>
```

---

## Props and Emits

### Props Declaration

**TypeScript-based props:**

```vue
<script setup lang="ts">
// Simple props
defineProps<{
  userId: string
  isActive: boolean
}>()

// With defaults
withDefaults(defineProps<{
  userId: string
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  isActive: true,
  size: 'md'
})

// With complex types
import type { User } from '~~/server/database/schema/users'

defineProps<{
  user: User
  options?: {
    showAvatar: boolean
    showStatus: boolean
  }
}>()
</script>
```

### Emits Declaration

**TypeScript-based emits:**

```vue
<script setup lang="ts">
// Simple emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()

// With payload types
const emit = defineEmits<{
  'update:user': [user: User]
  'delete': [id: string]
  'select': [item: Task, index: number]
}>()

// Usage
emit('update:user', updatedUser)
emit('delete', userId)
</script>
```

---

## shadcn-vue Components

### Using UI Components

shadcn-vue provides pre-built, accessible UI components:

```vue
<template>
  <div class="space-y-4">
    <!-- Button -->
    <Button variant="default">Default</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Delete</Button>

    <!-- Card -->
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>

    <!-- Dialog -->
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
```

### Common UI Components

- **Button** - Button with variants (default, outline, ghost, destructive)
- **Card** - Card container with header, content, footer
- **Dialog** - Modal dialog
- **Input** - Text input
- **Select** - Dropdown select
- **Checkbox** - Checkbox input
- **RadioGroup** - Radio button group
- **Textarea** - Multiline text input
- **Avatar** - User avatar with fallback
- **Badge** - Small label/tag
- **Alert** - Alert messages
- **Toast** - Notification toasts

**See:** [shadcn-vue documentation](https://www.shadcn-vue.com/)

---

## Composables

### Using Composables

**All composables are auto-imported - no imports needed:**

```vue
<script setup lang="ts">
// ❌ DON'T import (auto-imported):
// import { useI18n } from 'vue-i18n'
// import { useRouter, useRoute } from 'vue-router'
// import { useShowToast } from '@/composables/useShowToast'
// import { useExtendedFetch } from '@/composables/useExtendedFetch'
// import { useAuthStore } from '@/stores/authStore'

// ✅ Just use them directly:

// i18n (auto-imported)
const { t } = useI18n()

// Router (auto-imported)
const router = useRouter()
const route = useRoute()

// Custom composables (auto-imported from app/composables/)
const showToast = useShowToast()
const { extendedFetch } = useExtendedFetch()

// Pinia stores (auto-imported from app/stores/)
const authStore = useAuthStore()
const taskStore = useTaskStore()

// Other custom composables (auto-imported)
const { isLoading, error, execute } = useAsyncTask()
</script>
```

---

## Component Patterns

### App-Level Components

**Location:** `app/components/App/`

```vue
<!-- AppPageHeader.vue -->
<template>
  <header class="flex h-16 items-center justify-between border-b bg-background px-6">
    <h1 class="text-xl font-semibold">{{ title }}</h1>
    <slot name="actions" />
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
```

### Feature-Specific Components

**Location:** `app/components/{Feature}/`

```vue
<!-- UserAvatar.vue -->
<template>
  <Avatar :size="size">
    <AvatarImage :src="user.avatarUrl" :alt="user.name" />
    <AvatarFallback>{{ initials }}</AvatarFallback>
  </Avatar>
</template>

<script setup lang="ts">
import type { User } from '~~/server/database/schema/users'

interface Props {
  user: User
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const initials = computed(() => {
  const names = props.user.name.split(' ')
  return names.map(n => n[0]).join('').toUpperCase()
})
</script>
```

### Generic Components

**Location:** `app/components/Generic/`

```vue
<!-- ConfirmationDialog.vue -->
<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction @click="$emit('confirm')">Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description: string
}>()

defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()
</script>
```

---

## Best Practices

### ✅ DO

- Use TypeScript with `<script setup lang="ts">`
- Let Nuxt auto-import components, composables, and Vue utilities
- Use shadcn-vue for UI primitives
- Define prop and emit types
- Use Tailwind utilities for styling
- Keep components focused (single responsibility)
- Extract reusable logic into composables
- Use slots for flexible layouts
- Only import types and Zod schemas manually

### ❌ DON'T

- Don't import components (auto-imported)
- Don't import Vue utilities like `ref`, `computed` (auto-imported)
- Don't import composables like `useRouter`, `useI18n` (auto-imported)
- Don't import Pinia stores (auto-imported)
- Don't add `<style scoped>` blocks
- Don't use hardcoded colors
- Don't create God components
- Don't skip TypeScript types
- Don't duplicate shadcn-vue components
- Don't use `any` types
- Don't mix concerns (keep logic in composables)

---

## Component Checklist

When creating a new component:

- [ ] TypeScript with `<script setup lang="ts">`
- [ ] Props typed with interface
- [ ] Emits typed if needed
- [ ] No manual imports for components, Vue utilities, or composables
- [ ] Only import types and Zod schemas manually
- [ ] Tailwind utilities for styling
- [ ] No `<style scoped>` block
- [ ] Placed in correct directory (`ui/`, `App/`, `{Feature}/`, `Generic/`)
- [ ] Named with PascalCase matching folder structure
- [ ] Uses theme tokens for colors
- [ ] Responsive design considered
- [ ] Accessible (ARIA attributes if needed)

---

**For styling patterns, see:** [STYLING.md](./STYLING.md)
**For form components, see:** [FORMS.md](./FORMS.md)
**For state management, see:** [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
