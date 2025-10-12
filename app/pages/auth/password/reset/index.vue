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
        <FormField v-slot="{ field }" name="confirmNewPassword" :validate-on-blur="!isFieldDirty">
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

import { z } from 'zod';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';

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

const formSchema = toTypedSchema(
  z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmNewPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords must match',
    path: ['confirmNewPassword'],
  })
);

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
    newPasswordConfirmation: values.confirmNewPassword,
  });
});

const onBackToSignin = () => navigateTo('/auth/signin');
</script>
