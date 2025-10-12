<template>
  <div>
    <AppPageHeader title="Billing" description="Manage your subscription, payment methods, and invoices." />

    <div class="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>View and manage your subscription plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Pro</p>
              <p class="text-sm text-muted-foreground">Billed monthly</p>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="secondary">Change plan</Button>
              <Button>Upgrade</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Update your default payment method.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <Label for="cardNumber">Card number</Label>
              <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label for="exp">Exp</Label>
                <Input id="exp" placeholder="MM/YY" />
              </div>
              <div>
                <Label for="cvc">CVC</Label>
                <Input id="cvc" placeholder="CVC" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save payment method</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Download your past invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <span>Aug 2025 • INV-000123</span>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <span>Jul 2025 • INV-000122</span>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <span>Jun 2025 • INV-000121</span>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
// Placeholder page. Wire up to billing provider later.
</script>
