<template>
    <Button variant="outline" class="bg-white flex items-center gap-2 hover:cursor-pointer">
        <Icon :name="icon" :class="[sizeClass, `text-${color}`]" />
        <span v-if="!isMobile">
            <slot />
        </span>
    </Button>
</template>

<script setup>
import { computed } from 'vue'
import { useIsMobile } from '~/composables/useIsMobile'

const { icon, size, color } = defineProps({
    icon: { type: String, default: 'material-symbols:question-mark' },
    size: { type: Number, default: 4 },
    color: { type: String, default: 'primary' },
})

const isMobile = useIsMobile()

const sizeClass = computed(() => {
    const map = {
        2: 'w-2 h-2',
        3: 'w-3 h-3',
        4: 'w-4 h-4',
        5: 'w-5 h-5',
        6: 'w-6 h-6',
    }
    return map[size] || map[4]
})
</script>
