<template>
  <div class="space-y-8">
    <AppPageHeader :showBack="false">
      <template #default>
        <!-- right side slot left empty intentionally -->
      </template>
    </AppPageHeader>

    <div class="grid gap-6 max-w-4xl">
      <!-- Theme Settings -->
      <Card class="main-content">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Toggle appearance between light and dark.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-3">
            <AppThemeToggle />
            <span class="text-sm text-muted-foreground">Current: {{ userStore.theme }}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Settings' })
const userStore = useUserStore()

onMounted(() => {
  usePrimaryAnimation({ identifier: '.main-content', stagger: 0.1 })
})
</script>
