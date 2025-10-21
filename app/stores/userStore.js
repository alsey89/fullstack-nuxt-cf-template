import { defineStore } from "pinia";
import posthog from "posthog-js";

export const useUserStore = defineStore("user-store", {
  state: () => ({
    // Local UI state
    // theme preference: 'light' | 'dark'
    theme: 'light',

    // User profile data from session
    userProfile: null,

    isLoading: false,
    error: null,
  }),
  getters: {},
  actions: {
    async signin({ email, password, redirectTo = "/" } = {}) {
      this.isLoading = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();
      const { fetch: fetchSession } = useUserSession();

      const { status, payload } = await extendedFetch("/v1/auth/signin", {
        method: "POST",
        body: {
          email,
          password,
        },
      });

      if (status === 200) {
        // Fetch the session from nuxt-auth-utils
        await fetchSession();

        showToast({
          title: "Success",
          description: "You are now logged in.",
        });

        // Track user login
        posthog.identify(payload.data.user.email, {
          user_id: payload.data.user.id,
          email: payload.data.user.email,
          first_name: payload.data.user.firstName,
          last_name: payload.data.user.lastName,
        });

        this.isLoading = false;
        return navigateTo(redirectTo);
      } else {
        this.isLoading = false;
        return false;
      }
    },

    async signup({ firstName, lastName, email, password, passwordConfirmation } = {}) {
      this.isLoading = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const { status } = await extendedFetch("/v1/auth/signup", {
        method: "POST",
        body: {
          firstName,
          lastName,
          email,
          password,
          passwordConfirmation,
        },
      });

      if (status === 200 || status === 201) {
        showToast({
          title: "Account Created",
          description: "Please check your email to verify your account before signing in.",
        });

        // Track user signup
        posthog.capture('user_signed_up', {
          email: email,
        });

        this.isLoading = false;
        return navigateTo('/auth/signin');
      } else {
        this.isLoading = false;
        return false;
      }
    },

    setTheme(theme) {
      const allowed = ['light', 'dark']
      if (!allowed.includes(theme)) return
      this.theme = theme
    },

    async fetchUserProfile() {
      const { extendedFetch } = useExtendedFetch();

      try {
        const { status, payload } = await extendedFetch("/v1/user/profile", {
          method: "GET",
        });

        if (status === 200) {
          this.userProfile = payload.data;
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        this.userProfile = null;
      }
    },

    async signout({ redirectTo = "/auth/signin" } = {}) {
      this.isLoading = true;
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
      this.userProfile = null;

      // Track user logout
      posthog.reset();

      // Do not clear theme on signout so app preference remains
      this.isLoading = false;
      this.error = null;

      showToast({
        title: "Success",
        description: "You have signed out.",
      });

      return navigateTo(redirectTo);
    },

    async requestPasswordReset({ email } = {}) {
      this.isLoading = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const { status } = await extendedFetch("/v1/auth/password/reset/request", {
        method: "POST",
        body: {
          email,
        },
      });

      if (status === 200) {
        showToast({
          title: "Reset Email Sent",
          description: "Please check your email for password reset instructions.",
        });

        this.isLoading = false;
        return navigateTo('/auth/signin');
      } else {
        this.isLoading = false;
        return false;
      }
    },

    async resetPassword({ token, newPassword, newPasswordConfirmation } = {}) {
      this.isLoading = true;
      const showToast = useShowToast();
      const { extendedFetch } = useExtendedFetch();

      const { status } = await extendedFetch("/v1/auth/password/reset", {
        method: "PUT",
        body: {
          token,
          newPassword,
          newPasswordConfirmation,
        },
      });

      if (status === 200) {
        showToast({
          title: "Password Reset Successfully",
          description: "You can now sign in with your new password.",
        });

        this.isLoading = false;
        return navigateTo('/auth/signin');
      } else {
        this.isLoading = false;
        return false;
      }
    },
  },
  persist: {
    omit: ["isLoading", "error", "userProfile"],
  },
});
