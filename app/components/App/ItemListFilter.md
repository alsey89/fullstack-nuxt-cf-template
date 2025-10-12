# AppItemListFilter Component

A flexible, reusable filter component designed to work seamlessly with the `AppItemList` component. It provides a consistent filtering interface that is mobile-responsive and supports various filter types.

## Features

- 🔧 **Multiple Filter Types**: Select dropdowns, text search, date pickers, date ranges, number ranges
- 📱 **Mobile Responsive**: Automatically adapts layout for mobile and desktop
- 🔗 **URL Sync**: Automatically syncs filter state with URL query parameters
- 🎨 **Consistent Design**: Follows the same design patterns as other App components
- ⚡ **Performance**: Only re-renders when necessary
- 🧩 **Extensible**: Easy to add custom actions via slots

## Basic Usage

```vue
<template>
  <div>
    <AppItemListFilter v-model="filterValues" :filters="filterConfig" />
    <AppItemList :items="filteredItems" item-link-prefix="/items" />
  </div>
</template>

<script setup>
const filterValues = ref({
  status: null,
  category: null,
});

const filterConfig = [
  {
    key: "status",
    type: "select",
    label: "Status",
    options: ["active", "inactive", "pending"],
  },
  {
    key: "category",
    type: "select",
    label: "Category",
    options: [
      { value: "tech", label: "Technology" },
      { value: "design", label: "Design" },
    ],
  },
];

const filteredItems = computed(() => {
  let items = allItems.value;

  if (filterValues.value.status) {
    items = items.filter((item) => item.status === filterValues.value.status);
  }

  if (filterValues.value.category) {
    items = items.filter(
      (item) => item.category === filterValues.value.category
    );
  }

  return items;
});
</script>
```

## Filter Types

### 1. Select Dropdown

```javascript
{
  key: 'status',
  type: 'select',
  label: 'Status',
  placeholder: 'All Status', // optional
  allLabel: 'All Status', // optional, defaults to "All {label}"
  options: [
    'pending',
    'approved',
    'rejected'
    // or objects with value/label
    { value: 'pending', label: 'Pending Review' }
  ],
  // For object options:
  valueField: 'id', // optional, defaults to 'value' or 'id'
  labelField: 'name' // optional, defaults to 'label' or 'name'
}
```

### 2. Text Search

```javascript
{
  key: 'searchText',
  type: 'text',
  label: 'Search',
  placeholder: 'Search employees...' // optional
}
```

### 3. Single Date

```javascript
{
  key: 'startDate',
  type: 'date',
  label: 'Start Date',
  placeholder: 'Select date' // optional
}
```

### 4. Date Range

```javascript
{
  key: 'dateRange',
  type: 'dateRange',
  label: 'Date Range',
  placeholder: 'Select date range' // optional
}
```

### 5. Number Range

```javascript
{
  key: 'salaryRange',
  type: 'numberRange',
  label: 'Salary Range',
  minPlaceholder: 'Min salary', // optional
  maxPlaceholder: 'Max salary'  // optional
}
```

## Props

| Prop              | Type    | Required | Default | Description                           |
| ----------------- | ------- | -------- | ------- | ------------------------------------- |
| `modelValue`      | Object  | ✅       | -       | Current filter values object          |
| `filters`         | Array   | ✅       | -       | Array of filter configurations        |
| `showClearButton` | Boolean | ❌       | `true`  | Whether to show clear filters button  |
| `clearButtonText` | String  | ❌       | `null`  | Custom text for clear button          |
| `syncWithUrl`     | Boolean | ❌       | `true`  | Whether to sync with URL query params |

## Events

| Event               | Payload | Description                          |
| ------------------- | ------- | ------------------------------------ |
| `update:modelValue` | Object  | Emitted when filter values change    |
| `filtersChanged`    | Object  | Emitted when any filter changes      |
| `filtersCleared`    | -       | Emitted when all filters are cleared |

## Slots

### `actions`

Add custom action buttons alongside the filters.

```vue
<AppItemListFilter v-model="filters" :filters="filterConfig">
  <template #actions="{ filters, hasActiveFilters }">
    <Button @click="exportData" :disabled="!hasActiveFilters">
      Export
    </Button>
    <Button @click="refreshData">
      Refresh
    </Button>
  </template>
</AppItemListFilter>
```

## Advanced Examples

### Working with Store Data

```vue
<script setup>
const compStore = useCompStore();

const filterConfig = [
  {
    key: "departmentId",
    type: "select",
    label: "Department",
    options: computed(() => compStore.departments || []),
    valueField: "id",
    labelField: "name",
  },
];
</script>
```

### Complex Filtering Logic

```vue
<script setup>
const filteredEmployees = computed(() => {
  let employees = compStore.employees || [];

  // Text search across multiple fields
  if (filterValues.value.searchText) {
    const search = filterValues.value.searchText.toLowerCase();
    employees = employees.filter(
      (emp) =>
        emp.firstName?.toLowerCase().includes(search) ||
        emp.lastName?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
    );
  }

  // Date range filtering
  if (
    filterValues.value.dateRange?.start &&
    filterValues.value.dateRange?.end
  ) {
    employees = employees.filter((emp) => {
      const hireDate = new Date(emp.hireDate);
      return (
        hireDate >= filterValues.value.dateRange.start &&
        hireDate <= filterValues.value.dateRange.end
      );
    });
  }

  // Number range filtering
  if (
    filterValues.value.salaryRange?.min ||
    filterValues.value.salaryRange?.max
  ) {
    employees = employees.filter((emp) => {
      if (
        filterValues.value.salaryRange.min &&
        emp.salary < filterValues.value.salaryRange.min
      )
        return false;
      if (
        filterValues.value.salaryRange.max &&
        emp.salary > filterValues.value.salaryRange.max
      )
        return false;
      return true;
    });
  }

  return employees;
});
</script>
```

### Disabling URL Sync

```vue
<AppItemListFilter
  v-model="filterValues"
  :filters="filterConfig"
  :sync-with-url="false"
/>
```

## Integration with Existing Pages

The component is designed to replace existing filter implementations. Here's how to migrate:

**Before (manual implementation):**

```vue
<div class="flex gap-2">
  <Select v-model="selectedStatus">
    <SelectTrigger>
      <SelectValue placeholder="All Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="null">All Status</SelectItem>
      <SelectItem value="pending">Pending</SelectItem>
    </SelectContent>
  </Select>
  <Button v-if="hasActiveFilters" @click="clearFilters">
    Clear
  </Button>
</div>
```

**After (using AppItemListFilter):**

```vue
<AppItemListFilter v-model="filterValues" :filters="filterConfig" />
```

## Mobile Responsiveness

The component automatically adapts to mobile screens:

- **Desktop**: Filters display in a horizontal row
- **Mobile**: Filters stack vertically for better usability
- Clear button and custom actions maintain proper spacing on all screen sizes

## Best Practices

1. **Filter Configuration**: Define filter configs as constants or computed properties
2. **Performance**: Use computed properties for filtered data to ensure reactivity
3. **URL Sync**: Keep enabled for better user experience (bookmarkable URLs)
4. **Validation**: The component validates filter configurations automatically
5. **Accessibility**: All filter inputs are properly labeled and accessible

## TypeScript Support

The component includes proper TypeScript definitions for all props and events, ensuring type safety when used in TypeScript projects.
