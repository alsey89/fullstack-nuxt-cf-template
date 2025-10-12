<template>
    <div v-auto-animate class="w-full flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <!-- Dynamic Filters -->
        <div v-for="filter in filters" :key="filter.key" class="w-full sm:flex-1">

            <!-- Select Dropdown Filter -->
            <Select v-if="filter.type === 'select'" :model-value="modelValue[filter.key]"
                @update:model-value="updateFilter(filter.key, $event)">
                <SelectTrigger class="w-full rounded-md">
                    <SelectValue :placeholder="filter.placeholder || `All ${filter.label}`" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem :value="null">{{ filter.allLabel || `All ${filter.label}` }}</SelectItem>
                    <SelectItem v-for="option in getResolvedOptions(filter)" :key="getOptionValue(option, filter)"
                        :value="getOptionValue(option, filter)">
                        {{ getOptionLabel(option, filter) }}
                    </SelectItem>
                </SelectContent>
            </Select>

            <!-- Input Text Filter -->
            <Input v-else-if="filter.type === 'text'" :model-value="modelValue[filter.key]"
                @update:model-value="updateFilter(filter.key, $event)"
                :placeholder="filter.placeholder || `Search ${filter.label}...`" class="w-full rounded-md" />

            <!-- Date Range Filter -->
            <Popover v-else-if="filter.type === 'dateRange'">
                <PopoverTrigger as-child>
                    <Button variant="outline" class="w-full justify-start text-left font-normal rounded-md">
                        <Icon name="mdi:calendar" class="mr-2 h-4 w-4" />
                        <span v-if="modelValue[filter.key]?.start && modelValue[filter.key]?.end">
                            {{ formatDateRange(modelValue[filter.key]) }}
                        </span>
                        <span v-else class="text-muted-foreground">
                            {{ filter.placeholder || `Select ${filter.label}` }}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                    <RangeCalendar :model-value="modelValue[filter.key]"
                        @update:model-value="updateFilter(filter.key, $event)" :number-of-months="1" />
                </PopoverContent>
            </Popover>

            <!-- Single Date Filter -->
            <Popover v-else-if="filter.type === 'date'">
                <PopoverTrigger as-child>
                    <Button variant="outline" class="w-full justify-start text-left font-normal rounded-md">
                        <Icon name="mdi:calendar" class="mr-2 h-4 w-4" />
                        <span v-if="modelValue[filter.key]">
                            {{ formatDate(modelValue[filter.key]) }}
                        </span>
                        <span v-else class="text-muted-foreground">
                            {{ filter.placeholder || `Select ${filter.label}` }}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                    <Calendar :model-value="modelValue[filter.key]"
                        @update:model-value="updateFilter(filter.key, $event)" />
                </PopoverContent>
            </Popover>

            <!-- Number Range Filter -->
            <div v-else-if="filter.type === 'numberRange'" class="flex gap-2 rounded-md">
                <Input :model-value="modelValue[filter.key]?.min"
                    @update:model-value="updateNumberRange(filter.key, 'min', $event)"
                    :placeholder="filter.minPlaceholder || 'Min'" type="number" class="flex-1" />
                <Input :model-value="modelValue[filter.key]?.max"
                    @update:model-value="updateNumberRange(filter.key, 'max', $event)"
                    :placeholder="filter.maxPlaceholder || 'Max'" type="number" class="flex-1" />
            </div>
        </div>

        <!-- Clear Filters Button -->
        <Button v-if="hasActiveFilters && showClearButton" variant="outline" @click="clearAllFilters"
            class="w-full sm:w-auto sm:flex-shrink-0">
            <Icon name="mdi:close" class="w-4 h-4" />
            <span v-if="clearButtonText" class="ml-2">{{ clearButtonText }}</span>
        </Button>

        <!-- Custom Actions Slot -->
        <div v-if="$slots.actions" class="w-full sm:w-auto sm:flex-shrink-0">
            <slot name="actions" :filters="modelValue" :hasActiveFilters="hasActiveFilters" />
        </div>
    </div>
</template>

<script setup>
import { unref } from 'vue'

const props = defineProps({
    /**
     * Object containing current filter values
     * e.g., { payPeriodId: 'abc123', status: 'pending', searchText: 'john' }
     */
    modelValue: {
        type: Object,
        required: true,
    },
    /**
     * Array of filter configurations
     * Each filter should have: { key, type, label, options?, placeholder?, ... }
     */
    filters: {
        type: Array,
        required: true,
        validator: (filters) => {
            return filters.every(filter =>
                filter.key &&
                filter.type &&
                ['select', 'text', 'date', 'dateRange', 'numberRange'].includes(filter.type)
            )
        }
    },
    /**
     * Whether to show the clear filters button
     */
    showClearButton: {
        type: Boolean,
        default: true,
    },
    /**
     * Text for the clear button (optional)
     */
    clearButtonText: {
        type: String,
        default: null,
    },
    /**
     * Whether to sync filters with URL query parameters
     */
    syncWithUrl: {
        type: Boolean,
        default: false,
    }
})

const emit = defineEmits(['update:modelValue', 'filtersChanged', 'filtersCleared'])

const route = useRoute()
const router = useRouter()

// Initialize filters from URL on mount
onMounted(() => {
    if (props.syncWithUrl) {
        const urlFilters = {}
        props.filters.forEach(filter => {
            const queryValue = route.query[filter.key]
            if (queryValue) {
                if (filter.type === 'numberRange') {
                    const [min, max] = queryValue.split(',')
                    urlFilters[filter.key] = { min, max }
                } else if (filter.type === 'dateRange') {
                    const [start, end] = queryValue.split(',')
                    urlFilters[filter.key] = { start: new Date(start), end: new Date(end) }
                } else if (filter.type === 'date') {
                    urlFilters[filter.key] = new Date(queryValue)
                } else {
                    urlFilters[filter.key] = queryValue
                }
            }
        })

        if (Object.keys(urlFilters).length > 0) {
            emit('update:modelValue', { ...props.modelValue, ...urlFilters })
        }
    }
})

// Watch for filter changes and sync with URL
watch(() => props.modelValue, (newFilters) => {
    if (props.syncWithUrl) {
        const query = {}
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (typeof value === 'object' && value.start && value.end) {
                    // Date range
                    query[key] = `${value.start.toISOString()},${value.end.toISOString()}`
                } else if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
                    // Number range
                    query[key] = `${value.min || ''},${value.max || ''}`
                } else if (value instanceof Date) {
                    // Single date
                    query[key] = value.toISOString()
                } else {
                    query[key] = value
                }
            }
        })

        router.push({
            query: Object.keys(query).length ? query : {}
        })
    }

    emit('filtersChanged', newFilters)
}, { deep: true })

// Computed properties
const hasActiveFilters = computed(() => {
    return Object.values(props.modelValue).some(value => {
        if (value === null || value === undefined || value === '') return false
        if (typeof value === 'object') {
            if (value.start && value.end) return true // Date range
            if (value.min !== undefined || value.max !== undefined) return true // Number range
        }
        return true
    })
})

// Helper methods
const updateFilter = (key, value) => {
    emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const updateNumberRange = (key, type, value) => {
    const currentRange = props.modelValue[key] || {}
    const newRange = { ...currentRange, [type]: value }
    emit('update:modelValue', { ...props.modelValue, [key]: newRange })
}

const clearAllFilters = () => {
    const clearedFilters = {}
    props.filters.forEach(filter => {
        clearedFilters[filter.key] = null
    })
    emit('update:modelValue', clearedFilters)
    emit('filtersCleared')
}

const getOptionValue = (option, filter) => {
    if (typeof option === 'object') {
        return filter.valueField ? option[filter.valueField] : option.value || option.id
    }
    return option
}

const getOptionLabel = (option, filter) => {
    if (typeof option === 'object') {
        return filter.labelField ? option[filter.labelField] : option.label || option.name || option.id
    }
    return option
}

const getResolvedOptions = (filter) => {
    // Use unref to handle computed properties and refs
    return unref(filter.options) || []
}

const formatDate = (date) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date))
}

const formatDateRange = (range) => {
    if (!range?.start || !range?.end) return ''
    return `${formatDate(range.start)} - ${formatDate(range.end)}`
}
</script>
