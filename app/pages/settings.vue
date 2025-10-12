<template>
  <div class="space-y-8">
    <AppPageHeader :showBack="false">

      <template #default>
        <!-- right side slot left empty intentionally -->
      </template>
    </AppPageHeader>

    <div class="grid gap-6 max-w-4xl">
      <!-- Role Settings -->
      <Card class="main-content">
        <CardHeader>
          <CardTitle>Role</CardTitle>
          <CardDescription>Select the type of user for this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="max-w-xs space-y-2">
            <Label for="role">User Type</Label>
            <Select :model-value="userStore.userType" @update:modelValue="onChangeRole">
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">Default is Admin. This preference is saved locally.</p>
          </div>
        </CardContent>
      </Card>

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

function onChangeRole(val) {
  userStore.setUserType(val)
}
</script>
