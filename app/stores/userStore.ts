import { defineStore } from "pinia";
import { ref } from "vue";
import type { User } from "#shared/types";
import { analytics } from "@/utils/analytics";
import { getTranslation } from "@/utils/translations";

type Theme = "light" | "dark";

interface SigninParams {
  email: string;
  password: string;
  redirectTo?: string;
}

interface SignupParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface RequestPasswordResetParams {
  email: string;
}

interface ResetPasswordParams {
  token: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export const useUserStore = defineStore(
  "user-store",
  () => {
    // ==========================================
    // State
    // ==========================================
    const theme = ref<Theme>("light");
    const userProfile = ref<User | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // ==========================================
    // Actions
    // ==========================================

    /**
     * Sign in user with email and password
     */
    async function signin({
      email,
      password,
      redirectTo = "/",
    }: SigninParams): Promise<void | false> {
      isLoading.value = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();
      const { fetch: fetchSession } = useUserSession();

      const response = await extendedFetch("/v1/auth/signin", {
        method: "POST",
        body: {
          email,
          password,
        },
      });

      if (response?.ok) {
        // Fetch the session from nuxt-auth-utils
        await fetchSession();

        showToast({
          title: getTranslation("auth.signin.success.title"),
          description: getTranslation("auth.signin.success.description"),
        });

        // Track user login
        const user = response.payload?.data?.user;
        if (user) {
          analytics.identifyUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        }

        isLoading.value = false;
        return navigateTo(redirectTo);
      } else {
        isLoading.value = false;
        return false;
      }
    }

    /**
     * Sign up new user
     */
    async function signup({
      firstName,
      lastName,
      email,
      password,
      passwordConfirmation,
    }: SignupParams): Promise<void | false> {
      isLoading.value = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const response = await extendedFetch("/v1/auth/signup", {
        method: "POST",
        body: {
          firstName,
          lastName,
          email,
          password,
          passwordConfirmation,
        },
      });

      if (response?.ok) {
        showToast({
          title: getTranslation("auth.signup.success.title"),
          description: getTranslation("auth.signup.success.description"),
        });

        // Track user signup
        analytics.trackSignUp(email);

        isLoading.value = false;
        return navigateTo("/auth/signin");
      } else {
        isLoading.value = false;
        return false;
      }
    }

    /**
     * Set theme preference
     */
    function setTheme(newTheme: Theme): void {
      const allowed: Theme[] = ["light", "dark"];
      if (!allowed.includes(newTheme)) return;
      theme.value = newTheme;
    }

    /**
     * Fetch current user profile
     */
    async function fetchUserProfile(): Promise<boolean> {
      const { extendedFetch } = useExtendedFetch();

      const response = await extendedFetch("/v1/user/profile", {
        method: "GET",
      });

      if (response?.ok) {
        userProfile.value = response.payload?.data ?? null;
        return true;
      }

      userProfile.value = null;
      return false;
    }

    /**
     * Sign out current user
     */
    async function signout({
      redirectTo = "/auth/signin",
    }: { redirectTo?: string } = {}): Promise<void> {
      isLoading.value = true;
      const showToast = useShowToast();
      const { clear } = useUserSession();

      // Call signout endpoint
      const { extendedFetch } = useExtendedFetch();
      await extendedFetch("/v1/auth/signout", {
        method: "POST",
      });

      // Clear session on client
      await clear();

      // Clear user profile
      userProfile.value = null;

      // Track user logout and reset analytics identity
      analytics.reset();

      // Do not clear theme on signout so app preference remains
      isLoading.value = false;
      error.value = null;

      showToast({
        title: getTranslation("auth.signout.success.title"),
        description: getTranslation("auth.signout.success.description"),
      });

      return navigateTo(redirectTo);
    }

    /**
     * Request password reset email
     */
    async function requestPasswordReset({
      email,
    }: RequestPasswordResetParams): Promise<void | false> {
      isLoading.value = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const response = await extendedFetch("/v1/auth/password/reset/request", {
        method: "POST",
        body: {
          email,
        },
      });

      if (response?.ok) {
        showToast({
          title: getTranslation("auth.password.resetSent.title"),
          description: getTranslation("auth.password.resetSent.description"),
        });

        // Track password reset request
        analytics.trackPasswordResetRequest(email);

        isLoading.value = false;
        return navigateTo("/auth/signin");
      } else {
        isLoading.value = false;
        return false;
      }
    }

    /**
     * Reset password with token
     */
    async function resetPassword({
      token,
      newPassword,
      newPasswordConfirmation,
    }: ResetPasswordParams): Promise<void | false> {
      isLoading.value = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const response = await extendedFetch("/v1/auth/password/reset", {
        method: "PUT",
        body: {
          token,
          newPassword,
          newPasswordConfirmation,
        },
      });

      if (response?.ok) {
        showToast({
          title: getTranslation("auth.password.resetSuccess.title"),
          description: getTranslation("auth.password.resetSuccess.description"),
        });

        // Track successful password reset
        analytics.trackPasswordResetSuccess();

        isLoading.value = false;
        return navigateTo("/auth/signin");
      } else {
        isLoading.value = false;
        return false;
      }
    }

    /**
     * Reset store to initial state
     */
    function reset(): void {
      theme.value = "light";
      userProfile.value = null;
      isLoading.value = false;
      error.value = null;
    }

    // ==========================================
    // Return public API
    // ==========================================
    return {
      // State
      theme,
      userProfile,
      isLoading,
      error,

      // Actions
      signin,
      signup,
      setTheme,
      fetchUserProfile,
      signout,
      requestPasswordReset,
      resetPassword,
      reset,
    };
  },
  {
    persist: {
      omit: ["isLoading", "error", "userProfile"],
    },
  }
);
