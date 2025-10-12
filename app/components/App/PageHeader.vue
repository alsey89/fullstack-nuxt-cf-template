<template>
    <div class="w-full flex flex-col gap-2">
        <header class="w-full flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 min-w-0 flex-1">
                <Button v-if="showBack" variant="outline" size="icon" aria-label="Back"
                    class="flex-shrink-0 text-muted-foreground hover:text-primary" @click="$router.back">
                    <Icon name="lucide:chevron-left" class="w-5 h-5" />
                </Button>
                <div class="flex items-center flex-shrink-0">
                    <slot name="addon" />
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0" v-if="!hasTabs">
                <slot />
            </div>
        </header>
    </div>
</template>

<script setup>
const route = useRoute();
const metaTitle = computed(() => route.meta.title);
const slots = useSlots();
const hasDefaultSlot = computed(() => !!slots.default)
const { tabs } = useSectionTabs()
const hasTabs = computed(() => (tabs.value?.length ?? 0) > 0)
const props = defineProps({
    showBack: {
        type: Boolean,
        default: true,
    },
})
</script>
