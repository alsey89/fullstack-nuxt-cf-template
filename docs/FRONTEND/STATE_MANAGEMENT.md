# State Management

## Overview

This codebase uses **Pinia** for state management with a preference for the **Composition API style**.

**Two patterns exist:**
- **Composition API** (preferred for new stores) - Modern, type-safe, composable
- **Options API** (legacy) - Older pattern, still functional but migrate when touching

**When to use state management:**
- Complex state that needs to be shared across multiple components/routes
- Data fetched from API that multiple components need
- User session data
- Application-wide settings

**When NOT to use state management:**
- Simple component-local state (use `ref()` instead)
- Form state (use vee-validate instead)
- Read-only block components (Tier 1)

---

## Pinia Stores - Composition API (Preferred)

**Used in:**
- `app/stores/pageStore.ts` - Page management
- `app/stores/templateStore.ts` - Template management

**Core Principle:** Modern, type-safe stores using composition API style with TypeScript.

### Basic Store Structure

```typescript
// app/stores/exampleStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Example } from '~~/server/database/schema/examples'

export const useExampleStore = defineStore('example', () => {
  // ==========================================
  // State (ref)
  // ==========================================
  const items = ref<Example[]>([])
  const currentItem = ref<Example | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================
  // Getters (computed)
  // ==========================================
  const activeItems = computed(() =>
    items.value.filter(item => item.isActive)
  )

  const itemCount = computed(() => items.value.length)

  const hasItems = computed(() => items.value.length > 0)

  // ==========================================
  // Actions (functions)
  // ==========================================
  async function fetchItems(): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const { extendedFetch } = useExtendedFetch()

    try {
      const { ok, payload } = await extendedFetch('/v1/examples', {
        method: 'GET',
      })

      if (ok && payload?.data) {
        items.value = payload.data
        return true
      }

      return false
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchItem(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const { extendedFetch } = useExtendedFetch()

    try {
      const { ok, payload } = await extendedFetch(`/v1/examples/${id}`, {
        method: 'GET',
      })

      if (ok && payload?.data) {
        currentItem.value = payload.data
        return true
      }

      return false
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function createItem(data: Partial<Example>): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const { extendedFetch } = useExtendedFetch()
    const showToast = useShowToast()

    try {
      const { ok, payload } = await extendedFetch('/v1/examples', {
        method: 'POST',
        body: data,
      })

      if (ok && payload?.data) {
        items.value.push(payload.data)

        showToast({
          title: 'Success',
          description: 'Item created successfully',
        })

        return true
      }

      return false
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateItem(id: string, data: Partial<Example>): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const { extendedFetch } = useExtendedFetch()
    const showToast = useShowToast()

    try {
      const { ok, payload } = await extendedFetch(`/v1/examples/${id}`, {
        method: 'PATCH',
        body: data,
      })

      if (ok && payload?.data) {
        // Update in items array
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
          items.value[index] = payload.data
        }

        // Update current item if it's the same
        if (currentItem.value?.id === id) {
          currentItem.value = payload.data
        }

        showToast({
          title: 'Success',
          description: 'Item updated successfully',
        })

        return true
      }

      return false
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deleteItem(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    const { extendedFetch } = useExtendedFetch()
    const showToast = useShowToast()

    try {
      const { ok } = await extendedFetch(`/v1/examples/${id}`, {
        method: 'DELETE',
      })

      if (ok) {
        // Remove from items array
        items.value = items.value.filter(item => item.id !== id)

        // Clear current item if it's the deleted one
        if (currentItem.value?.id === id) {
          currentItem.value = null
        }

        showToast({
          title: 'Success',
          description: 'Item deleted successfully',
        })

        return true
      }

      return false
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  function reset() {
    items.value = []
    currentItem.value = null
    isLoading.value = false
    error.value = null
  }

  // ==========================================
  // Return public API
  // ==========================================
  return {
    // State
    items,
    currentItem,
    isLoading,
    error,

    // Getters
    activeItems,
    itemCount,
    hasItems,

    // Actions
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    clearError,
    reset,
  }
})
```

### Composition API Conventions

**1. State with `ref()`:**
```typescript
const items = ref<Example[]>([])
const currentItem = ref<Example | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
```

**2. Getters with `computed()`:**
```typescript
const activeItems = computed(() =>
  items.value.filter(item => item.isActive)
)

const itemById = computed(() => {
  return (id: string) => items.value.find(item => item.id === id)
})
```

**3. Actions as async functions returning `Promise<boolean>`:**
```typescript
async function fetchItems(): Promise<boolean> {
  try {
    // API call
    return true  // Success
  } catch {
    return false // Failure
  }
}
```

**Why return boolean?**
- Allows components to react to success/failure
- Error handling is done by `useExtendedFetch`
- Success toasts are shown by the action itself

**4. Always use `useExtendedFetch()`:**
```typescript
const { extendedFetch } = useExtendedFetch()

const { ok, payload } = await extendedFetch('/v1/examples', {
  method: 'GET',
})
```

**5. Show success toasts in actions:**
```typescript
const showToast = useShowToast()

if (ok) {
  showToast({
    title: 'Success',
    description: 'Item created successfully',
  })
}
```

**6. Type imports from backend schema:**
```typescript
import type { Example } from '~~/server/database/schema/examples'
import type { Page } from '~~/server/database/schema/pages'
```

### Using Stores in Components

**Basic usage:**
```vue
<script setup lang="ts">
const exampleStore = useExampleStore()

// Access state
console.log(exampleStore.items)
console.log(exampleStore.isLoading)

// Access getters
console.log(exampleStore.activeItems)
console.log(exampleStore.itemCount)

// Call actions
await exampleStore.fetchItems()
</script>
```

**With destructuring (reactive):**
```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'

const exampleStore = useExampleStore()

// Destructure state and getters (keeps reactivity)
const { items, isLoading, activeItems } = storeToRefs(exampleStore)

// Destructure actions (no need for storeToRefs)
const { fetchItems, createItem } = exampleStore

// Use in template
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else>
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>
```

**Calling actions with feedback:**
```vue
<script setup lang="ts">
const exampleStore = useExampleStore()
const router = useRouter()

async function handleCreate() {
  const success = await exampleStore.createItem({
    name: 'New Item',
  })

  if (success) {
    // Success toast already shown by store action
    router.push('/items')
  }
  // Error handling is done by useExtendedFetch
}
</script>
```

**In composables:**
```typescript
// composables/useExample.ts
export function useExample() {
  const exampleStore = useExampleStore()

  async function loadExample(id: string) {
    const success = await exampleStore.fetchItem(id)
    if (!success) {
      // Handle error (redirect, etc.)
      navigateTo('/items')
    }
  }

  return {
    loadExample,
    example: computed(() => exampleStore.currentItem),
  }
}
```

### Common Patterns

**Pattern 1: List + Detail (Master-Detail)**
```typescript
export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([])           // List
  const currentItem = ref<Item | null>(null)  // Detail

  async function fetchItems(): Promise<boolean> {
    // Fetch list
  }

  async function fetchItem(id: string): Promise<boolean> {
    // Fetch detail
  }

  return { items, currentItem, fetchItems, fetchItem }
})
```

**Pattern 2: Optimistic Updates**
```typescript
async function updateItem(id: string, data: Partial<Item>): Promise<boolean> {
  // Save original for rollback
  const original = items.value.find(item => item.id === id)

  // Optimistic update
  const index = items.value.findIndex(item => item.id === id)
  if (index !== -1) {
    items.value[index] = { ...items.value[index], ...data }
  }

  try {
    const { ok } = await extendedFetch(`/v1/items/${id}`, {
      method: 'PATCH',
      body: data,
    })

    if (!ok && original) {
      // Rollback on failure
      items.value[index] = original
      return false
    }

    return true
  } catch (err) {
    // Rollback on error
    if (original) items.value[index] = original
    return false
  }
}
```

**Pattern 3: Pagination**
```typescript
export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const isLoading = ref(false)

  async function fetchPage(page: number): Promise<boolean> {
    isLoading.value = true

    const { extendedFetch } = useExtendedFetch()

    try {
      const { ok, payload } = await extendedFetch(`/v1/items?page=${page}`, {
        method: 'GET',
      })

      if (ok && payload?.data) {
        items.value = payload.data
        currentPage.value = payload.meta.currentPage
        totalPages.value = payload.meta.totalPages
        return true
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  async function nextPage(): Promise<boolean> {
    if (currentPage.value < totalPages.value) {
      return await fetchPage(currentPage.value + 1)
    }
    return false
  }

  async function prevPage(): Promise<boolean> {
    if (currentPage.value > 1) {
      return await fetchPage(currentPage.value - 1)
    }
    return false
  }

  return { items, currentPage, totalPages, fetchPage, nextPage, prevPage }
})
```

**Pattern 4: Filtering/Searching**
```typescript
export const useItemStore = defineStore('item', () => {
  const allItems = ref<Item[]>([])
  const searchQuery = ref('')
  const filterCategory = ref<string | null>(null)

  const filteredItems = computed(() => {
    let result = allItems.value

    // Apply search
    if (searchQuery.value) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }

    // Apply filter
    if (filterCategory.value) {
      result = result.filter(item => item.category === filterCategory.value)
    }

    return result
  })

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setFilterCategory(category: string | null) {
    filterCategory.value = category
  }

  return {
    allItems,
    filteredItems,
    searchQuery,
    filterCategory,
    setSearchQuery,
    setFilterCategory,
  }
})
```

### Store Initialization in Layouts

**Fetch data in layout or page:**
```vue
<!-- app/layouts/default.vue -->
<script setup lang="ts">
const userStore = useUserStore()

// Fetch user data on layout mount
onMounted(async () => {
  await userStore.fetchCurrentUser()
})
</script>

<template>
  <div>
    <Header />
    <slot />
    <Footer />
  </div>
</template>
```

**Or use middleware:**
```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  const userStore = useUserStore()

  if (!userStore.currentUser) {
    await userStore.fetchCurrentUser()
  }
})
```

---

## Pinia Stores - Options API (Legacy)

**Used in:**
- `app/stores/userStore.js` - Legacy user store

**Note:** When touching these files, consider migrating to Composition API.

### Basic Structure

```javascript
// app/stores/legacyStore.js
import { defineStore } from 'pinia'

export const useLegacyStore = defineStore('legacy', {
  // ==========================================
  // State
  // ==========================================
  state: () => ({
    items: [],
    currentItem: null,
    isLoading: false,
    error: null,
  }),

  // ==========================================
  // Getters
  // ==========================================
  getters: {
    activeItems(state) {
      return state.items.filter(item => item.isActive)
    },

    itemCount(state) {
      return state.items.length
    },

    itemById: (state) => {
      return (id) => state.items.find(item => item.id === id)
    },
  },

  // ==========================================
  // Actions
  // ==========================================
  actions: {
    async fetchItems() {
      this.isLoading = true
      this.error = null

      try {
        const response = await $fetch('/api/v1/items')
        this.items = response.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },

    async createItem(data) {
      this.isLoading = true

      try {
        const response = await $fetch('/api/v1/items', {
          method: 'POST',
          body: data,
        })

        this.items.push(response.data)
        return true
      } catch (err) {
        this.error = err.message
        return false
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    reset() {
      this.items = []
      this.currentItem = null
      this.isLoading = false
      this.error = null
    },
  },
})
```

### Migration Guide

**When to migrate:**
- When you're making significant changes to the store
- When adding TypeScript support
- When refactoring related components

**How to migrate:**

**Before (Options API):**
```javascript
export const useItemStore = defineStore('item', {
  state: () => ({
    items: [],
    isLoading: false,
  }),

  getters: {
    itemCount(state) {
      return state.items.length
    },
  },

  actions: {
    async fetchItems() {
      this.isLoading = true
      const response = await $fetch('/api/items')
      this.items = response.data
      this.isLoading = false
    },
  },
})
```

**After (Composition API):**
```typescript
export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([])
  const isLoading = ref(false)

  const itemCount = computed(() => items.value.length)

  async function fetchItems(): Promise<boolean> {
    isLoading.value = true
    const { extendedFetch } = useExtendedFetch()

    try {
      const { ok, payload } = await extendedFetch('/v1/items')

      if (ok && payload?.data) {
        items.value = payload.data
        return true
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  return { items, isLoading, itemCount, fetchItems }
})
```

**Key differences:**
1. `state: () => ({})` → `ref()`
2. `getters: {}` → `computed()`
3. `actions: {}` → `async function`
4. `this.property` → `property.value`
5. No return type → `Promise<boolean>`
6. `$fetch` → `useExtendedFetch()`

---

## Local Component State

**When NOT to use Pinia:**

Use local `ref()` for:
- Simple UI toggles (modals, dropdowns)
- Form field values (use vee-validate)
- Component-specific temporary state

**Example:**
```vue
<script setup lang="ts">
import { ref } from 'vue'

// ✅ GOOD: Local state for UI toggle
const isModalOpen = ref(false)

function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}
</script>

<template>
  <div>
    <Button @click="openModal">Open</Button>
    <Modal :open="isModalOpen" @close="closeModal">
      <!-- Modal content -->
    </Modal>
  </div>
</template>
```

**When to move to Pinia:**
- If multiple components need the same state
- If state needs to persist across route changes
- If state is complex (multiple related properties)

---

## Composables vs Stores

**Use composables for:**
- Reusable logic without state (utilities)
- Simple reactive state that doesn't need to be shared
- Wrapping browser APIs (localStorage, geolocation, etc.)

**Use stores for:**
- Complex state management
- Data fetched from API
- State shared across multiple components/routes
- User session data

**Example composable:**
```typescript
// composables/useLocalStorage.ts
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const storedValue = ref<T>(defaultValue)

  function load() {
    const item = localStorage.getItem(key)
    if (item) {
      storedValue.value = JSON.parse(item)
    }
  }

  function save(value: T) {
    storedValue.value = value
    localStorage.setItem(key, JSON.stringify(value))
  }

  function clear() {
    storedValue.value = defaultValue
    localStorage.removeItem(key)
  }

  onMounted(() => load())

  return { storedValue, save, clear }
}
```

---

## Best Practices

### ✅ DO:

**Store patterns:**
- Use Composition API for new stores
- Return `Promise<boolean>` from async actions
- Use TypeScript with proper types
- Use `useExtendedFetch()` for all API calls
- Show success toasts in store actions
- Let `useExtendedFetch` handle errors
- Keep stores focused (single responsibility)
- Update local state optimistically where appropriate

**Usage patterns:**
- Use `storeToRefs()` when destructuring state/getters
- Check return value of actions (`if (success) { ... }`)
- Access stores in `<script setup>` (not in template)
- Initialize stores in layouts or middleware

**TypeScript:**
- Import types from backend schema
- Type all state with proper interfaces
- Type action parameters and return values

### ❌ DON'T:

**Store patterns:**
- Don't use Options API for new stores
- Don't handle errors manually (useExtendedFetch does it)
- Don't use `$fetch` directly (use useExtendedFetch)
- Don't forget to show success toasts
- Don't create God stores (keep them focused)
- Don't mutate state outside actions

**Usage patterns:**
- Don't destructure state without `storeToRefs()`
- Don't ignore action return values
- Don't access stores directly in templates (use setup)
- Don't create stores for simple component state

**JavaScript/TypeScript:**
- Don't use JavaScript for new stores (use TypeScript)
- Don't use `any` types
- Don't skip type imports from backend

---

## Error Handling

**Errors are handled by `useExtendedFetch`:**
```typescript
async function fetchItems(): Promise<boolean> {
  const { extendedFetch } = useExtendedFetch()

  try {
    const { ok, payload } = await extendedFetch('/v1/items')

    if (ok && payload?.data) {
      items.value = payload.data
      return true
    }

    // Error toast already shown by extendedFetch
    return false
  } catch (err) {
    // Error toast already shown
    return false
  }
}
```

**Custom error handling (only if needed):**
```typescript
async function fetchItems(): Promise<boolean> {
  const { extendedFetch } = useExtendedFetch()
  const showToast = useShowToast()

  try {
    const { ok, payload, status } = await extendedFetch('/v1/items')

    if (status === 404) {
      // Custom handling for 404
      showToast({
        title: 'No items found',
        description: 'Try creating your first item',
      })
      return false
    }

    if (ok && payload?.data) {
      items.value = payload.data
      return true
    }

    return false
  } catch (err) {
    return false
  }
}
```

---

## Testing Stores

**Unit test example:**
```typescript
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useItemStore } from '~/stores/itemStore'

describe('Item Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty items', () => {
    const store = useItemStore()
    expect(store.items).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('computes item count correctly', () => {
    const store = useItemStore()
    store.items = [{ id: '1' }, { id: '2' }]
    expect(store.itemCount).toBe(2)
  })
})
```

---

## Quick Decision Guide

**When managing state, ask:**

1. **Does multiple components/routes need this state?**
   - YES → Pinia store
   - NO → Local `ref()`

2. **Is this state from an API?**
   - YES → Pinia store
   - NO → Consider local state or composable

3. **Is this form state?**
   - YES → Use vee-validate (not Pinia)
   - NO → Continue

4. **Is this simple UI state (modal open/closed, etc.)?**
   - YES → Local `ref()`
   - NO → Pinia store

---

**For related patterns, see:**
- [COMPONENTS.md](./COMPONENTS.md) - Component architecture
- [FORMS.md](./FORMS.md) - Form state management
- [STYLING.md](./STYLING.md) - Styling approaches
