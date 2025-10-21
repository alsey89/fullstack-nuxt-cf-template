<template>
  <Card class="w-[95%] md:w-[400px] flex flex-col signup-card">
    <CardHeader>
      <CardTitle>{{ t('auth.signup.title') }}</CardTitle>
    </CardHeader>

    <form class="w-full flex flex-col gap-4" @submit.prevent="onSubmit">

      <CardContent class="flex flex-col gap-2">
        <!-- First Name (required) -->
        <FormField v-slot="{ field }" name="firstName" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>First Name</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="text" autocomplete="given-name" placeholder="First Name" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Last Name (required) -->
        <FormField v-slot="{ field }" name="lastName" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>Last Name</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="text" autocomplete="family-name" placeholder="Last Name" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Email (required) -->
        <FormField v-slot="{ field }" name="email" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>{{ t('auth.signup.email.title') }}</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="email" autocomplete="email" :placeholder="t('auth.signup.email.placeholder')"
                v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Password (required) -->
        <FormField v-slot="{ field }" name="password" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>{{ t('auth.signup.password.title') }}</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="password" autocomplete="new-password"
                :placeholder="t('auth.signup.password.placeholder')" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

        <!-- Confirm Password (required) -->
        <FormField v-slot="{ field }" name="passwordConfirmation" :validate-on-blur="!isFieldDirty">
          <FormItem class="w-full">
            <FormLabel v-auto-animate class="flex items-center justify-between text-sm md:text-base">
              <span>{{ t('auth.signup.confirmPassword.title') }}</span>
              <FormMessage />
            </FormLabel>
            <FormControl>
              <Input type="password" autocomplete="new-password"
                :placeholder="t('auth.signup.confirmPassword.placeholder')" v-bind="field" />
            </FormControl>
          </FormItem>
        </FormField>

      </CardContent>

      <CardFooter class="flex flex-col gap-2">
        <!-- Submit -->
        <Button type="submit" class="w-full">
          <div v-if="isSubmitting" class="flex items-center justify-center">
            <Icon name="svg-spinners:90-ring-with-bg" class="w-5 h-5 animate-spin" />
            <span class="ml-2">{{ t('auth.signup.submitting') }}</span>
          </div>
          <div v-else>
            {{ t('auth.signup.submitButton') }}
          </div>
        </Button>
        <!-- Go to Signin -->
        <Button variant="link" type="button" class="hover:cursor-pointer" @click="onGoToSignin">
          {{ t('auth.signup.haveAccountButton') }}
        </Button>
      </CardFooter>
    </form>

    <div class="flex items-center gap-4 px-4">
      <div class="w-full h-0.5 bg-accent" />
      <span> {{ t('auth.signup.seperator') }} </span>
      <div class="w-full h-0.5 bg-accent" />
    </div>

    <div class="w-full flex justify-center items-center gap-8 px-4 pb-4">
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
  title: 'Sign Up',
  description: 'Create a new account',
  layout: 'auth',
});

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { signupSchema } from '#shared/validators/auth';

const { t } = useI18n();
const userStore = useUserStore();

/////////////////////////////////////////////////////////////////////
// Form Setup
/////////////////////////////////////////////////////////////////////

// Use shared schema (same validation as backend, includes password strength requirements)
const formSchema = toTypedSchema(signupSchema);

const { handleSubmit, isSubmitting, isFieldDirty } = useForm({
  validationSchema: formSchema,
});

/////////////////////////////////////////////////////////////////////
// Handlers
/////////////////////////////////////////////////////////////////////

const onSubmit = handleSubmit(async (values) => {
  await userStore.signup({
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    password: values.password,
    passwordConfirmation: values.passwordConfirmation,
  });
});

const onGoToSignin = () => navigateTo('/auth/signin');

onMounted(() => {
  usePrimaryAnimation({ identifier: ".signup-card" })
});
</script>
