<template>
  <div>
    <AppPageHeader
      title="Settings"
      description="Manage your profile and preferences"
      :showBack="false"
    />

    <div class="grid gap-6 mt-4">
      <!-- Profile -->
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Basic information associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4">
            <div class="grid gap-2 md:grid-cols-2">
              <div>
                <Label for="firstName">First name</Label>
                <Input id="firstName" placeholder="First name" />
              </div>
              <div>
                <Label for="lastName">Last name</Label>
                <Input id="lastName" placeholder="Last name" />
              </div>
            </div>
            <div>
              <Label for="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save changes</Button>
        </CardFooter>
      </Card>

      <!-- Theme Settings -->
      <Card>
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
</script>
