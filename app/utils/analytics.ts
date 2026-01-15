// ========================================
// ANALYTICS UTILITY
// ========================================
// Centralized analytics tracking using PostHog
// All analytics calls should go through this module
// ========================================

import posthog from "posthog-js";

/**
 * User data for identification
 */
interface UserIdentity {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Analytics utility object
 * Centralizes all analytics tracking calls
 */
export const analytics = {
  /**
   * Identify a user after sign in
   * Links future events to this user
   */
  identifyUser(user: UserIdentity): void {
    posthog.identify(user.email, {
      user_id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    });
  },

  /**
   * Track user sign up event
   */
  trackSignUp(email: string): void {
    posthog.capture("user_signed_up", {
      email,
    });
  },

  /**
   * Track user sign in event
   */
  trackSignIn(email: string): void {
    posthog.capture("user_signed_in", {
      email,
    });
  },

  /**
   * Track user sign out event
   */
  trackSignOut(): void {
    posthog.capture("user_signed_out");
  },

  /**
   * Track password reset request
   */
  trackPasswordResetRequest(email: string): void {
    posthog.capture("password_reset_requested", {
      email,
    });
  },

  /**
   * Track successful password reset
   */
  trackPasswordResetSuccess(): void {
    posthog.capture("password_reset_completed");
  },

  /**
   * Reset user identity (on sign out)
   * Clears the current user and generates a new anonymous ID
   */
  reset(): void {
    posthog.reset();
  },

  /**
   * Track a custom event
   * Use for domain-specific events
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    posthog.capture(eventName, properties);
  },
};
