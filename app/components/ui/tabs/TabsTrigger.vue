<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsTrigger, type TabsTriggerProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    v-bind="forwardedProps"
    :class="cn(
      // Base styles first
      `inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[state=active]:shadow-sm`,
      // Consumer overrides next
      props.class,
      // Active state styles last so they win
      `data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground [aria-selected=true]:!bg-secondary [aria-selected=true]:!text-secondary-foreground data-[state=active]:[&_svg]:!text-secondary-foreground [aria-selected=true]:[&_svg]:!text-secondary-foreground`,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
