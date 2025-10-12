<template>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="icon" aria-label="Toggle theme" @click="toggleTheme">
      <Icon v-if="theme === 'light'" name="lucide:sun" class="h-5 w-5" />
      <Icon v-else name="lucide:moon" class="h-5 w-5" />
    </Button>
  </div>
</template>

<script setup>
const userStore = useUserStore()
const theme = computed(() => userStore.theme)

function toggleTheme() {
  userStore.setTheme(theme.value === 'light' ? 'dark' : 'light')
}
</script>
