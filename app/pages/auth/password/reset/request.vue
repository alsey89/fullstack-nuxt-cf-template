<template>
  <Card class="w-[95%] md:w-[400px] flex flex-col password-reset-card">
    <CardHeader>
      <CardTitle>Reset Password</CardTitle>
      <CardDescription>Enter your email to receive a password reset link</CardDescription>
    </CardHeader>

    <form class="w-full flex flex-col gap-4" @submit.prevent="onSubmit">

      <CardContent class="flex flex-col gap-2">
        <!-- Email (required) -->
        <FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>Email</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="email" autocomplete="email" placeholder="your@email.com" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>
      </CardContent>

      <CardFooter class="flex flex-col gap-2">
        <!-- Submit -->
        <Button type="submit" class="w-full">
          <div v-if="isSubmitting" class="flex items-center justify-center">
            <Icon name="svg-spinners:90-ring-with-bg" class="w-5 h-5 animate-spin" />
            <span class="ml-2">Sending...</span>
          </div>
          <div v-else>
            Send Reset Link
          </div>
        </Button>
        <!-- Back to Signin -->
        <Button variant="link" type="button" class="hover:cursor-pointer" @click="onBackToSignin">
          Back to Sign In
        </Button>
      </CardFooter>
    </form>

  </Card>
</template>

<script setup>
definePageMeta({
  title: 'Reset Password',
  description: 'Request password reset',
  layout: 'auth',
});

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { passwordResetRequestSchema } from '#shared/validators/auth';

const userStore = useUserStore();

/////////////////////////////////////////////////////////////////////
// Form Setup
/////////////////////////////////////////////////////////////////////

// Use shared schema (same validation as backend)
const formSchema = toTypedSchema(passwordResetRequestSchema);

const { handleSubmit, isSubmitting, isFieldDirty } = useForm({
  validationSchema: formSchema,
});

/////////////////////////////////////////////////////////////////////
// Handlers
/////////////////////////////////////////////////////////////////////

const onSubmit = handleSubmit(async (values) => {
  await userStore.requestPasswordReset({
    email: values.email,
  });
});

const onBackToSignin = () => navigateTo('/auth/signin');

onMounted(() => {
  usePrimaryAnimation({ identifier: ".password-reset-card" })
});
</script>
