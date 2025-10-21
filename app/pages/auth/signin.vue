<template>
  <Card class="w-[95%] md:w-[400px] flex flex-col signin-card">
    <CardHeader>
      <CardTitle>{{ t('auth.signin.title') }}</CardTitle>
    </CardHeader>

    <form class="w-full flex flex-col gap-4" @submit.prevent="onSubmit">

      <CardContent class="flex flex-col gap-2">
        <!-- Email (required) -->
        <FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>{{ t('auth.signin.email.title') }}</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="email" autocomplete="username" :placeholder="t('auth.signin.email.placeholder')"
                v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Password (required) -->
        <FormField v-slot="{ field }" name="password" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>{{ t('auth.signin.password.title') }}</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="password" autocomplete="current-password"
                :placeholder="t('auth.signin.password.placeholder')" v-bind="field" />
            </FormControl>
            <FormDescription class="text-right text-sm">
              <Button variant="link" @click.prevent="onForgotPassword" class="hover:cursor-pointer">
                {{ t('auth.signin.forgotPasswordButton') }}
              </Button>
            </FormDescription>
          </FormItem>
        </FormField>
      </CardContent>

      <CardFooter class="flex flex-col gap-2">
        <!-- Submit -->
        <Button type="submit" class="w-full">
          <div v-if="isSubmitting" class="flex items-center justify-center">
            <Icon name="svg-spinners:90-ring-with-bg" class="w-5 h-5 animate-spin" />
            <span class="ml-2">{{ t('auth.signin.submitting') }}</span>
          </div>
          <div v-else>
            {{ t('auth.signin.submitButton') }}
          </div>
        </Button>
        <!-- Go to Signup -->
        <Button variant="link" class="hover:cursor-pointer" @click="onGoToSignup">
          {{ t('auth.signin.noAccountButton') }}
        </Button>
      </CardFooter>
    </form>

    <div class="flex items-center gap-4 px-4">
      <div class="w-full h-0.5 bg-accent" />
      <span> {{ t('auth.signin.seperator') }} </span>
      <div class="w-full h-0.5 bg-accent" />
    </div>

    <div class="w-full flex justify-center items-center gap-8 px-4">
      <button class="hover:cursor-pointer">
        <Icon name="logos:google-icon" class="w-8 h-8 md:w-16 md:h-16" />
      </button>
      <button class="hover:cursor-pointer">
        <Icon name="cib:line" class="w-8 h-8 md:w-16 md:h-16 text-green-500" />
      </button>
    </div>

  </Card>
</template>

<script setup>
definePageMeta({
  title: 'Sign In',
  description: 'Sign in to your account',
  layout: 'auth',
});

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { signinSchema } from '#shared/validators/auth';

const { t } = useI18n();
const userStore = useUserStore();
const route = useRoute();
const { redirectTo, toast } = route.query;
const showToast = useShowToast();

/////////////////////////////////////////////////////////////////////
// Form Setup
/////////////////////////////////////////////////////////////////////

// Use shared schema (same validation as backend)
const formSchema = toTypedSchema(signinSchema);
const { handleSubmit, isSubmitting, isFieldDirty } = useForm({
  validationSchema: formSchema,
});

/////////////////////////////////////////////////////////////////////
// Handlers
/////////////////////////////////////////////////////////////////////

const onSubmit = handleSubmit(async (values) => {
  await userStore.signin({
    email: values.email,
    password: values.password,
    redirectTo: redirectTo,
  });
});

const onGoToSignup = () => navigateTo('/auth/signup');
const onForgotPassword = () => navigateTo('/auth/password/reset/request');


onMounted(() => {
  usePrimaryAnimation({ identifier: ".signin-card" })
  /*
  * Shows the authentication required message
  * when unauthenticated user is redirected to the signin page
  * Toasting from middleware doesn't work atm (possibly due to SSR)
  */
  if (toast && toast == "authRequired") {
    showToast({
      title: t('auth.signin.toast.authRequired.title'),
      description: t('auth.signin.toast.authRequired.description'),
    });
  }
});
</script>
