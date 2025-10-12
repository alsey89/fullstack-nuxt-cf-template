<template>
    <div v-if="items && items.length > 0" v-for="(item, index) in items" class="main-content flex flex-col gap-4">
        <Card :key="item.id" @click="navigateTo(getItemLink(item.id))"
            class="flex flex-col items-start gap-2 hover:cursor-pointer hover:bg-accent rounded-md p-2 lg:p-4">
            <div class="w-full flex items-center justify-between gap-4 text-sm lg:text-base">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    <h3 class="text-base lg:text-lg text-primary font-bold line-clamp-1">
                        {{ resolvePath(item, titleField) || `No ${titleField}` }}
                    </h3>
                    <div class="flex flex-shrink-0 items-center gap-2">
                        <slot name="addon" :item="item" :index="index" />
                    </div>
                </div>
                <Icon name="mdi:chevron-right" class="text-primary flex-shrink-0" />
            </div>
            <p class="text-xs lg:text-sm text-gray-400 line-clamp-1"> <span>{{ resolvePath(item, subtitleField) || `No
                    ${subtitleField}`
            }}</span>
            </p>
        </Card>
    </div>
    <div v-else class="main-content">
        <Card @click="navigateTo(getEmptyListLink())"
            class="flex flex-col items-start gap-2 hover:cursor-pointer hover:bg-accent rounded-md p-2 lg:p-4">
            <div class="w-full flex items-center justify-between">
                <h3 class="text-base lg:text-lg text-primary font-bold">
                    {{ emptyListTitle }}
                </h3>
                <Icon name="mdi:chevron-right" class="text-primary" />
            </div>
            <p class="text-xs lg:text-sm text-gray-400 line-clamp-1">
                {{ emptyListSubtitle }}
            </p>
        </Card>
    </div>
</template>

<script setup>
const props = defineProps({
    /**
     * An array of items to be displayed in the list.
     * Each item should have at least an `id`, `name`, and optionally a `description`.
     */
    items: {
        type: Array,
        required: true,
    },
    /**
    * The field name on each `item` whose value should be shown as the title.
    * Defaults to "name".
    */
    titleField: {
        type: String,
        default: "name",
    },
    /**
     * The field name on each `item` whose value should be shown as the subtitle/description.
     * Defaults to "description".
     */
    subtitleField: {
        type: String,
        default: "description",
    },
    /**
     * The prefix for the item links, used to construct the full URL for each item.
     * e.g., "/company/location" would be used for "/company/location/123" & "/company/location/add"
     */
    itemLinkPrefix: {
        type: String,
        required: true,
    },
    /**
     * The title for the empty list item.
     * If not provided, will default to "No items found".
     */
    emptyListTitle: {
        type: String,
        default: "No items found",
    },
    /**
     * The subtitle for the empty list item.
     * If not provided, will default to "Click here to add a new item."
     */
    emptyListSubtitle: {
        type: String,
        default: "Click here to add a new item.",
    },
});

/**
 * Resolves dot separated fields
 * e.g. "user.name" will resolve to user.name
 * @param obj 
 * @param path 
 */
function resolvePath(obj, path) {
    return path
        .split('.')
        .reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

const getItemLink = (id) => `${props.itemLinkPrefix}/${id}`;
const getEmptyListLink = () => `${props.itemLinkPrefix}/add`;

watch(
    () => props.items,
    async (newItems, oldItems) => {
        // only when items go from empty→nonempty
        if (oldItems.length === 0 && newItems.length > 0) {
            // wait for DOM to render the new list
            await nextTick()
            usePrimaryAnimation({ identifier: '.main-content', stagger: 0.1 })
        }
    },
    { immediate: false }
)

onMounted(() => {
    usePrimaryAnimation({ identifier: ".main-content", stagger: 0.1 })
});
</script>