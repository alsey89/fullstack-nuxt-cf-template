<template>
  <div class="space-y-6">
    <AppPageHeader :showBack="false">

    </AppPageHeader>
    <Card class="main-content">
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>Submit a support request below.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-3">
          <Label for="category">Category</Label>
          <Select v-model="category">
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Label for="desc">Description</Label>
          <Textarea id="desc" v-model="description" class="min-h-32 w-full" placeholder="Describe your issue..." />
          <div class="pt-2">
            <Button class="w-full md:w-auto" @click="submit" :disabled="!description">Submit</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
useHead({ title: 'Contact Support' })
const category = ref('account')
const description = ref('')
const showToast = useShowToast()

onMounted(() => {
  usePrimaryAnimation({ identifier: '.main-content' })
})

function submit() {
  showToast({ title: 'Submitted', description: 'Your message has been sent.' })
  description.value = ''
}
</script>
