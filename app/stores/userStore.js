import { defineStore } from "pinia";
import posthog from "posthog-js";

export const useUserStore = defineStore("user-store", {
  state: () => ({
    // Local UI state
    // userType controls app experience: 'admin' | 'manager' | 'employee'
    // default to 'admin' as requested; persisted via pinia persist plugin
    userType: 'admin',
    // theme preference: 'light' | 'dark'
    theme: 'light',

    // User profile data from session
    userProfile: null,

    isLoading: false,
    error: null,
  }),
  getters: {
    isAdmin: (state) => state.userType === 'admin',
    isManager: (state) => state.userType === 'manager',
    isEmployee: (state) => state.userType === 'employee',
  },
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

    setUserType(type) {
      const allowed = ['admin', 'manager', 'employee']
      if (!allowed.includes(type)) return
      this.userType = type
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
          this.userProfile = payload.data.user;
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

      // Do not clear userType/theme on signout so app preference remains
      this.isLoading = false;
      this.error = null;

      showToast({
        title: "Success",
        description: "You have signed out.",
      });

      return navigateTo(redirectTo);
    },
  },
  persist: {
    omit: ["isLoading", "error", "userProfile"],
  },
});
