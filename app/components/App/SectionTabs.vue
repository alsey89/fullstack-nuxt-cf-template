<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tabs from '@/components/ui/tabs/Tabs.vue'
import TabsList from '@/components/ui/tabs/TabsList.vue'
import TabsTrigger from '@/components/ui/tabs/TabsTrigger.vue'
import { useSectionTabs } from '@/composables/useSectionTabs'

const router = useRouter()
const route = useRoute()
const { tabs, active } = useSectionTabs()

const hasTabs = computed(() => (tabs.value?.length ?? 0) > 0)

function onChange(val: string) {
  if (val && val !== route.path) {
    router.push(val)
  }
}
</script>

<template>
  <div v-if="hasTabs" class="w-full">
    <Tabs
      :model-value="active"
      :value="active"
      @update:modelValue="onChange"
      @update:value="onChange"
      class="w-full"
    >
      <TabsList class="w-full overflow-x-auto no-scrollbar gap-1 p-1">
        <div class="flex w-full gap-1">
          <TabsTrigger
            v-for="t in tabs"
            :key="t.to"
            :value="t.to"
            @click="onChange(t.to)"
            class="flex-auto sm:flex-none"
          >
            <Icon v-if="t.icon" :name="t.icon" class="-ml-0.5" />
            <span class="truncate">{{ t.label }}</span>
          </TabsTrigger>
        </div>
      </TabsList>
    </Tabs>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
