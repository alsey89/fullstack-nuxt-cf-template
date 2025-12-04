<template>
    <div class="w-full flex flex-col gap-2">
        <header class="w-full flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 min-w-0 flex-1">
                <Button v-if="showBack" variant="outline" size="icon" aria-label="Back"
                    class="flex-shrink-0 text-muted-foreground hover:text-primary" @click="$router.back">
                    <Icon name="lucide:chevron-left" class="w-5 h-5" />
                </Button>
                <div class="flex flex-col gap-1 min-w-0 flex-1">
                    <h1 v-if="title" class="text-2xl font-bold tracking-tight">{{ title }}</h1>
                    <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
                </div>
                <div class="flex items-center flex-shrink-0">
                    <slot name="addon" />
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <slot />
            </div>
        </header>
    </div>
</template>

<script setup>
const props = defineProps({
    showBack: {
        type: Boolean,
        default: true,
    },
    title: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: '',
    },
})
</script>
