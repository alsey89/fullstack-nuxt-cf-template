<template>
  <div class="space-y-6">
    <AppPageHeader :showBack="false">

    </AppPageHeader>

    <div class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <Card class="main-content">
          <CardHeader>
            <CardTitle>Admin Overview</CardTitle>
            <CardDescription>Managing company settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center gap-4">
              <div class="w-32">
                <AspectRatio :ratio="16/9" class="rounded-md overflow-hidden border">
                  <Skeleton class="h-full w-full" />
                </AspectRatio>
              </div>
              <div class="flex-1 space-y-2">
                <Skeleton class="h-4 w-40" />
                <Skeleton class="h-3 w-56" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card class="main-content">
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>Invite and manage staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center gap-4">
              <div class="w-32">
                <AspectRatio :ratio="16/9" class="rounded-md overflow-hidden border">
                  <Skeleton class="h-full w-full" />
                </AspectRatio>
              </div>
              <div class="flex-1 space-y-2">
                <Skeleton class="h-4 w-44" />
                <Skeleton class="h-3 w-56" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Tutorials' })
onMounted(() => {
  usePrimaryAnimation({ identifier: '.main-content', stagger: 0.1 })
})
</script>
