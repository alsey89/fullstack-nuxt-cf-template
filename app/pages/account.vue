<template>
  <div>
    <AppPageHeader title="Account" description="Manage your profile, email, and password." />

    <div class="grid gap-6 mt-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update your password regularly to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <Label for="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div>
              <Label for="newPassword">New password</Label>
              <Input id="newPassword" type="password" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary">Update password</Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
// Placeholder page. Wire up to backend forms later.
</script>
