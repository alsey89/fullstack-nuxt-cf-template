<template>
  <Card class="w-[95%] md:w-[400px] flex flex-col password-reset-form-card">
    <CardHeader>
      <CardTitle>Set New Password</CardTitle>
      <CardDescription>Enter your new password</CardDescription>
    </CardHeader>

    <form class="w-full flex flex-col gap-4" @submit.prevent="onSubmit">

      <CardContent class="flex flex-col gap-2">
        <!-- New Password (required) -->
        <FormField v-slot="{ field }" name="newPassword" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>New Password</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="password" autocomplete="new-password" placeholder="New Password" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Confirm New Password (required) -->
        <FormField v-slot="{ field }" name="newPasswordConfirmation" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>Confirm New Password</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="password" autocomplete="new-password" placeholder="Confirm New Password" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>
      </CardContent>

      <CardFooter class="flex flex-col gap-2">
        <!-- Submit -->
        <Button type="submit" class="w-full">
          <div v-if="isSubmitting" class="flex items-center justify-center">
            <Icon name="svg-spinners:90-ring-with-bg" class="w-5 h-5 animate-spin" />
            <span class="ml-2">Resetting...</span>
          </div>
          <div v-else>
            Reset Password
          </div>
        </Button>
        <!-- Back to Signin -->
        <Button variant="link" class="hover:cursor-pointer" @click="onBackToSignin">
          Back to Sign In
        </Button>
      </CardFooter>
    </form>

  </Card>
</template>

<script setup>
definePageMeta({
  title: 'Reset Password',
  description: 'Set new password',
  layout: 'auth',
});

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { passwordResetSchema } from '#shared/validators/auth';

const userStore = useUserStore();
const route = useRoute();
const showToast = useShowToast();

// Get token from query params
const token = computed(() => route.query.token);

// Check if token exists
onMounted(() => {
  if (!token.value) {
    showToast({
      title: "Invalid Reset Link",
      description: "The password reset link is invalid or has expired.",
    });
    navigateTo('/auth/password/reset/request');
  }
  usePrimaryAnimation({ identifier: ".password-reset-form-card" })
});

/////////////////////////////////////////////////////////////////////
// Form Setup
/////////////////////////////////////////////////////////////////////

// Use shared schema (same validation as backend, includes password strength requirements)
const formSchema = toTypedSchema(passwordResetSchema);

const { handleSubmit, isSubmitting, isFieldDirty } = useForm({
  validationSchema: formSchema,
});

/////////////////////////////////////////////////////////////////////
// Handlers
/////////////////////////////////////////////////////////////////////

const onSubmit = handleSubmit(async (values) => {
  await userStore.resetPassword({
    token: token.value,
    newPassword: values.newPassword,
    newPasswordConfirmation: values.newPasswordConfirmation,
  });
});

const onBackToSignin = () => navigateTo('/auth/signin');
</script>
