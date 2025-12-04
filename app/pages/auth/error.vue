<template>
  <Card class="w-[95%] md:w-[500px]">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-destructive">
        <Icon name="lucide:alert-circle" class="w-6 h-6" />
        Authentication Error
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="rounded-md bg-destructive/10 p-4">
        <p class="text-sm font-medium">{{ errorTitle }}</p>
        <p v-if="errorMessage" class="text-sm text-muted-foreground mt-2">
          {{ errorMessage }}
        </p>
      </div>

      <div class="text-sm text-muted-foreground">
        {{ errorDescription }}
      </div>
    </CardContent>

    <CardFooter class="flex flex-col gap-2">
      <Button @click="onTryAgain" class="w-full">
        <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
        Try Again
      </Button>
      <Button variant="outline" @click="onContactSupport" class="w-full">
        <Icon name="lucide:mail" class="w-4 h-4 mr-2" />
        Contact Support
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup>
definePageMeta({
  title: 'Authentication Error',
  description: 'An error occurred during authentication',
  layout: 'auth',
});

const route = useRoute();
const error = route.query.error as string;
const message = route.query.message as string;

// Error mapping
const errorMap: Record<string, { title: string; description: string }> = {
  oauth_failed: {
    title: "OAuth Authorization Failed",
    description: "The authorization request was denied or an error occurred with the OAuth provider. Please try signing in again."
  },
  state_mismatch: {
    title: "Security Validation Failed",
    description: "The authentication state token is invalid or expired. This could be due to a timeout or a security issue. Please try signing in again."
  },
  invalid_callback: {
    title: "Invalid Callback",
    description: "The authentication callback is missing required parameters. Please try signing in again."
  },
  exchange_failed: {
    title: "Token Exchange Failed",
    description: "Failed to exchange the authorization code for an access token. Please try signing in again."
  },
  userinfo_failed: {
    title: "User Info Retrieval Failed",
    description: "Failed to retrieve your user information from the OAuth provider. Please try signing in again."
  },
  user_creation_failed: {
    title: "Account Setup Failed",
    description: "An error occurred while setting up your account. This might be due to an existing account conflict or a system error."
  },
  unknown: {
    title: "Unexpected Error",
    description: "An unexpected error occurred during authentication. Please try again or contact support if the problem persists."
  }
};

const errorInfo = computed(() => errorMap[error] || errorMap.unknown);
const errorTitle = computed(() => errorInfo.value.title);
const errorDescription = computed(() => errorInfo.value.description);
const errorMessage = computed(() => message || '');

const onTryAgain = () => {
  navigateTo('/auth/signin');
};

const onContactSupport = () => {
  navigateTo('/help/contact');
};
</script>
