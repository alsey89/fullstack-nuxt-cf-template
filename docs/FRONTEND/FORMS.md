# Form Handling

Type-safe form validation with vee-validate + Zod for Keystone.

## Overview

Keystone uses **vee-validate + Zod** for all form handling with shared validation schemas between frontend and backend.

**Core Principles:**
- Type-safe forms with vee-validate
- Shared Zod schemas (`#shared/validators/`)
- Single source of truth for validation
- shadcn-vue form components
- API integration with Pinia stores

---

## Basic Setup

### Import Pattern

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { taskSchema } from '#shared/validators/task'
</script>
```

---

## Complete Form Example

```vue
<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>Edit Task</CardTitle>
      <CardDescription>Update task details</CardDescription>
    </CardHeader>

    <CardContent>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Title field -->
        <FormField v-slot="{ field }" name="title" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel class="flex items-center justify-between">
              <span>Title</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="text" v-bind="field" placeholder="Task title" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Description field -->
        <FormField v-slot="{ field }" name="description">
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea v-bind="field" placeholder="Task description..." rows="4" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Submit buttons -->
        <div class="flex items-center gap-4 pt-4">
          <Button type="button" variant="outline" @click="onCancel">
            Cancel
          </Button>

          <Button type="submit" :disabled="!isDirty || isSubmitting">
            <Icon v-if="isSubmitting" name="svg-spinners:90-ring-with-bg" class="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { taskSchema } from '#shared/validators/task'

const taskStore = useTaskStore()
const router = useRouter()

// Convert Zod schema to vee-validate schema
const formSchema = toTypedSchema(taskSchema)

// Initialize form with validation schema
const { handleSubmit, isSubmitting, isFieldDirty, values, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    title: taskStore.currentTask?.title ?? '',
    description: taskStore.currentTask?.description ?? '',
  },
})

// Check if form has unsaved changes
const isDirty = computed(() => {
  const current = taskStore.currentTask
  return (
    values.title !== (current?.title ?? '') ||
    values.description !== (current?.description ?? '')
  )
})

// Submit handler with type-safe values
const onSubmit = handleSubmit(async (formValues) => {
  const success = await taskStore.updateTask(taskStore.currentTask.id, formValues)

  if (success) {
    router.push('/tasks')
  }
})

function onCancel() {
  resetForm()
  router.push('/tasks')
}
</script>
```

---

## Form Composition API

### useForm() Returns

```typescript
const {
  // Form submission
  handleSubmit,          // (handler) => (e) => Promise<void>
  submitForm,           // () => Promise<void>

  // Form state
  values,               // Record<string, any> - current form values
  errors,               // Record<string, string> - validation errors
  isSubmitting,         // Ref<boolean> - true while submitting
  isValidating,         // Ref<boolean> - true while validating

  // Field state
  isFieldDirty,         // (field) => boolean - has field changed?
  isFieldTouched,       // (field) => boolean - has field been focused?
  isFieldValid,         // (field) => boolean - is field valid?

  // Form methods
  resetForm,            // () => void - reset to initial values
  setFieldValue,        // (field, value) => void
  setFieldError,        // (field, message) => void
  setErrors,            // (errors) => void
} = useForm({
  validationSchema: formSchema,
  initialValues: { ... },
})
```

---

## Form Field Components

### FormField Structure

```vue
<FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input type="email" v-bind="field" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

**Components:**
- `FormField` - Provides field context (validation, errors)
  - `name` - matches schema field name
  - `validate-on-blur` - when to validate
  - `v-slot="{ field }"` - exposes field bindings
- `FormItem` - Wrapper for spacing
- `FormLabel` - Accessible label
- `FormControl` - Wrapper for input
- `FormMessage` - Displays errors
- `FormDescription` - Optional help text

---

## Input Types

### Text Input

```vue
<FormField v-slot="{ field }" name="title">
  <FormItem>
    <FormLabel>Title</FormLabel>
    <FormControl>
      <Input type="text" v-bind="field" placeholder="Enter title" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Email Input

```vue
<FormField v-slot="{ field }" name="email">
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input type="email" v-bind="field" placeholder="you@example.com" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Password Input

```vue
<FormField v-slot="{ field }" name="password">
  <FormItem>
    <FormLabel>Password</FormLabel>
    <FormControl>
      <Input type="password" v-bind="field" placeholder="••••••••" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Textarea

```vue
<FormField v-slot="{ field }" name="description">
  <FormItem>
    <FormLabel>Description</FormLabel>
    <FormControl>
      <Textarea v-bind="field" placeholder="Enter description..." rows="4" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Select

```vue
<FormField v-slot="{ field }" name="priority">
  <FormItem>
    <FormLabel>Priority</FormLabel>
    <FormControl>
      <Select v-bind="field">
        <SelectTrigger>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Checkbox

```vue
<FormField v-slot="{ field }" name="acceptTerms">
  <FormItem class="flex items-center gap-2">
    <FormControl>
      <Checkbox :checked="field.value" @update:checked="field.onChange" />
    </FormControl>
    <FormLabel class="mt-0!">I accept the terms</FormLabel>
    <FormMessage />
  </FormItem>
</FormField>
```

### Radio Group

```vue
<FormField v-slot="{ field }" name="status">
  <FormItem>
    <FormLabel>Status</FormLabel>
    <FormControl>
      <RadioGroup :model-value="field.value" @update:model-value="field.onChange">
        <div class="flex items-center gap-2">
          <RadioGroupItem value="todo" id="todo" />
          <label for="todo">To Do</label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem value="in-progress" id="in-progress" />
          <label for="in-progress">In Progress</label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem value="done" id="done" />
          <label for="done">Done</label>
        </div>
      </RadioGroup>
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

---

## Validation Schemas

### Shared Validators

```typescript
// Shared between frontend and backend
import { taskSchema } from '#shared/validators/task'
import { userSchema } from '#shared/validators/user'
import { projectSchema } from '#shared/validators/project'
```

### Example Zod Schema

```typescript
// shared/validators/task.ts
import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
})

// Type inference
export type TaskFormData = z.infer<typeof taskSchema>
```

### Using Schema in Form

```typescript
import { toTypedSchema } from '@vee-validate/zod'
import { taskSchema } from '#shared/validators/task'

const formSchema = toTypedSchema(taskSchema)
const { handleSubmit } = useForm({
  validationSchema: formSchema,
})
```

---

## Validation Timing

### Validate on Blur (Recommended)

```vue
<FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
  <!-- Only validates after field is touched -->
</FormField>
```

### Validate on Input

```vue
<FormField v-slot="{ field }" name="email" validate-on-input>
  <!-- Validates as user types -->
</FormField>
```

### Validate on Submit Only

```vue
<FormField v-slot="{ field }" name="email">
  <!-- No validation until form is submitted -->
</FormField>
```

---

## Error Display

### Inline Errors (Recommended)

```vue
<FormField v-slot="{ field }" name="email">
  <FormItem>
    <FormLabel class="flex items-center justify-between">
      <span>Email</span>
      <FormMessage /> <!-- Error next to label -->
    </FormLabel>
    <FormControl>
      <Input v-bind="field" />
    </FormControl>
  </FormItem>
</FormField>
```

### Below Field Errors

```vue
<FormField v-slot="{ field }" name="email">
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input v-bind="field" />
    </FormControl>
    <FormMessage /> <!-- Error below input -->
  </FormItem>
</FormField>
```

### Form-Level Errors

```vue
<template>
  <form @submit.prevent="onSubmit">
    <div v-if="Object.keys(errors).length > 0" class="rounded bg-destructive/10 p-4 text-sm text-destructive">
      Please fix the errors above
    </div>
    <!-- Fields -->
  </form>
</template>

<script setup lang="ts">
const { errors } = useForm({ ... })
</script>
```

---

## API Integration

### With Pinia Store (Recommended)

```vue
<script setup lang="ts">
const taskStore = useTaskStore()
const router = useRouter()

const onSubmit = handleSubmit(async (values) => {
  const success = await taskStore.updateTask(taskId, values)

  if (success) {
    router.push('/tasks')
  }
})
</script>
```

### Direct API Call

```vue
<script setup lang="ts">
const { extendedFetch } = useExtendedFetch()
const showToast = useShowToast()
const router = useRouter()

const onSubmit = handleSubmit(async (values) => {
  const { ok } = await extendedFetch('/v1/tasks', {
    method: 'POST',
    body: values,
  })

  if (ok) {
    showToast({
      title: 'Success',
      description: 'Task created successfully',
    })
    router.push('/tasks')
  }
})
</script>
```

---

## Loading States

### Disable Submit While Loading

```vue
<Button type="submit" :disabled="!isDirty || isSubmitting">
  <Icon v-if="isSubmitting" name="svg-spinners:90-ring-with-bg" class="mr-2 h-4 w-4" />
  {{ isSubmitting ? 'Saving...' : 'Save' }}
</Button>
```

### Disable Fields While Loading

```vue
<FormField v-slot="{ field }" name="title">
  <FormItem>
    <FormLabel>Title</FormLabel>
    <FormControl>
      <Input v-bind="field" :disabled="isSubmitting" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

---

## Form Reset

### Reset to Initial Values

```vue
<script setup lang="ts">
const { resetForm } = useForm({
  initialValues: {
    title: 'Default Title',
    description: '',
  },
})

function onCancel() {
  resetForm()
  router.push('/tasks')
}
</script>
```

### Reset to New Values

```vue
<script setup lang="ts">
const { resetForm } = useForm({ ... })

function loadTask(task) {
  resetForm({
    values: {
      title: task.title,
      description: task.description,
    },
  })
}
</script>
```

---

## handleSubmit Patterns

### Pattern 1: Inline Handler (Recommended)

```vue
<script setup lang="ts">
const onSubmit = handleSubmit(async (values) => {
  await taskStore.updateTask(values)
})
</script>

<template>
  <form @submit.prevent="onSubmit">
    <!-- fields -->
  </form>
</template>
```

### Pattern 2: Multiple Submit Handlers

```vue
<script setup lang="ts">
const onSave = handleSubmit(async (values) => {
  await taskStore.updateTask(values)
  router.push('/tasks')
})

const onSaveAndContinue = handleSubmit(async (values) => {
  await taskStore.updateTask(values)
  // Stay on page
})
</script>

<template>
  <form @submit.prevent="onSave">
    <Button type="submit">Save</Button>
    <Button type="button" @click="onSaveAndContinue">Save & Continue</Button>
  </form>
</template>
```

---

## Best Practices

### ✅ DO

- Use shared Zod schemas from `#shared/validators/`
- Use `handleSubmit` for type-safe handling
- Validate on blur for better UX
- Show inline errors next to labels
- Use `useExtendedFetch()` for API calls
- Let stores handle success toasts
- Disable submit button while submitting
- Use `isDirty` to track unsaved changes
- Always validate on server

### ❌ DON'T

- Don't create separate FE and BE validation schemas
- Don't validate on every keystroke (annoying)
- Don't handle errors manually
- Don't forget loading states
- Don't skip server-side validation
- Don't use manual form state (`ref()` + `v-model`)
- Don't ignore `isDirty` state

---

## Form Checklist

When creating a form:

- [ ] Use shared Zod schema from `#shared/validators/`
- [ ] Convert schema with `toTypedSchema()`
- [ ] Use `useForm()` with validation schema
- [ ] Use `FormField` components with proper structure
- [ ] Validate on blur (`:validate-on-blur="!isFieldDirty"`)
- [ ] Show inline errors with `FormMessage`
- [ ] Disable submit while `isSubmitting`
- [ ] Track `isDirty` for unsaved changes
- [ ] Integrate with Pinia store or `useExtendedFetch()`
- [ ] Handle form reset with `resetForm()`

---

**For component patterns, see:** [COMPONENTS.md](./COMPONENTS.md)
**For styling patterns, see:** [STYLING.md](./STYLING.md)
**For state management, see:** [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
