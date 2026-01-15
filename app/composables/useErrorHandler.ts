// ========================================
// FRONTEND ERROR HANDLER
// ========================================
// Centralized error handling for API responses
// Imports error codes from backend for type-safe error handling
// Uses i18n for multi-language error messages (with fallbacks)
// ========================================

import { ERROR_CODES, type ErrorCode } from "#shared/error/codes";
import type { FetchError } from "ofetch";

interface ApiErrorData {
  message?: string;
  error?: {
    code?: string;
    message?: string;
    traceID?: string;
  };
}

interface ErrorHandlerOptions {
  blockRedirect?: boolean;
  customMessage?: string;
  onError?: (code: ErrorCode | "UNKNOWN_ERROR") => void;
}

interface ErrorMessage {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => boolean;
  };
  shouldRedirect?: boolean;
  redirectTo?: string;
}

/**
 * Fallback error messages when i18n is not available
 */
const fallbackMessages: Record<string, { title: string; description: string }> = {
  [ERROR_CODES.AUTH_REQUIRED]: {
    title: "Authentication Required",
    description: "Please sign in to continue.",
  },
  [ERROR_CODES.INVALID_TOKEN]: {
    title: "Invalid Session",
    description: "Your session is invalid. Please sign in again.",
  },
  [ERROR_CODES.TOKEN_EXPIRED]: {
    title: "Session Expired",
    description: "Your session has expired. Please sign in again.",
  },
  [ERROR_CODES.WORKSPACE_MISMATCH]: {
    title: "Access Denied",
    description: "You don't have access to this workspace.",
  },
  [ERROR_CODES.EMAIL_NOT_CONFIRMED]: {
    title: "Email Not Verified",
    description: "Please verify your email address before signing in.",
  },
  [ERROR_CODES.INVALID_CREDENTIALS]: {
    title: "Invalid Credentials",
    description: "The email or password you entered is incorrect.",
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    title: "Validation Error",
    description: "Please check your input and try again.",
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    title: "Server Error",
    description: "An unexpected error occurred. Please try again later.",
  },
  UNKNOWN_ERROR: {
    title: "Error",
    description: "An unexpected error occurred.",
  },
};

/**
 * Map error codes to redirect configurations
 */
const redirectConfig: Partial<Record<ErrorCode, { path: string }>> = {
  [ERROR_CODES.AUTH_REQUIRED]: { path: "/auth/signin" },
  [ERROR_CODES.INVALID_TOKEN]: { path: "/auth/signin" },
  [ERROR_CODES.TOKEN_EXPIRED]: { path: "/auth/signin" },
  [ERROR_CODES.WORKSPACE_MISMATCH]: { path: "/auth/signin" },
};

/**
 * Map error codes to action button configurations
 */
const actionConfig: Partial<Record<ErrorCode, { path: string }>> = {
  [ERROR_CODES.EMAIL_NOT_CONFIRMED]: { path: "/auth/email/resend" },
  [ERROR_CODES.ACCOUNT_INACTIVE]: { path: "/support" },
  [ERROR_CODES.EMAIL_EXISTS]: { path: "/auth/signin" },
  [ERROR_CODES.INTERNAL_ERROR]: { path: "/support" },
  [ERROR_CODES.DATABASE_ERROR]: { path: "/support" },
};

/**
 * Safely get translation function
 * Returns null if i18n is not available (outside Vue context)
 */
function tryGetI18n(): ((key: string) => string) | null {
  try {
    const nuxtApp = useNuxtApp();
    if (nuxtApp.$i18n) {
      return (key: string) => nuxtApp.$i18n.t(key) as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Default fallback for unknown errors
 */
const defaultFallback = {
  title: "Error",
  description: "An unexpected error occurred.",
};

/**
 * Get error message from i18n translations with fallback
 * Works both inside and outside Vue component context
 */
function getErrorMessage(code: ErrorCode | "UNKNOWN_ERROR"): ErrorMessage {
  const t = tryGetI18n();
  const errorKey = `errors.${code}`;
  const fallback = fallbackMessages[code] ?? defaultFallback;

  // Build error message - use i18n if available, otherwise fallback
  const message: ErrorMessage = {
    title: t ? t(`${errorKey}.title`) : fallback.title,
    description: t ? t(`${errorKey}.description`) : fallback.description,
  };

  // Check if i18n returned the key itself (translation missing)
  if (message.title === `${errorKey}.title`) {
    message.title = fallback.title;
  }
  if (message.description === `${errorKey}.description`) {
    message.description = fallback.description;
  }

  // Add redirect configuration if exists
  const redirect = redirectConfig[code as ErrorCode];
  if (redirect) {
    message.shouldRedirect = true;
    message.redirectTo = redirect.path;
  }

  // Add action button if configured
  const actionPath = actionConfig[code as ErrorCode];
  if (actionPath) {
    const actionLabel = t ? t(`${errorKey}.action.label`) : null;
    // Only add action if we have a valid label (not the key itself)
    if (actionLabel && actionLabel !== `${errorKey}.action.label`) {
      message.action = {
        label: actionLabel,
        onClick: () => {
          navigateTo(actionPath.path);
          return true;
        },
      };
    }
  }

  return message;
}

/**
 * Handle API errors with appropriate user feedback
 * This is a standalone function that can be called from anywhere
 *
 * @param error - The fetch error from the API
 * @param options - Additional options for error handling
 */
export function handleApiError(
  error: FetchError<ApiErrorData>,
  options: ErrorHandlerOptions = {}
) {
  const config = useRuntimeConfig();
  const isDebugMode = config.public.debugMode;
  const showToast = useShowToast();
  const { blockRedirect = false, customMessage, onError } = options;

  // Extract error details
  const status = error.response?.status || 500;
  const errorData = error.response?._data;
  const code = (errorData?.error?.code || "UNKNOWN_ERROR") as
    | ErrorCode
    | "UNKNOWN_ERROR";
  const serverMessage = errorData?.error?.message;
  const traceID = errorData?.error?.traceID;

  // Debug logging
  if (isDebugMode) {
    console.error("API Error:", {
      status,
      code,
      serverMessage,
      traceID,
      rawError: error,
    });
  }

  // Get error message configuration from i18n
  const errorConfig = getErrorMessage(code);

  // Show toast notification
  showToast({
    title: errorConfig.title,
    description: customMessage || errorConfig.description,
    action: errorConfig.action,
  });

  // Handle redirects (unless blocked)
  if (
    !blockRedirect &&
    errorConfig.shouldRedirect &&
    errorConfig.redirectTo
  ) {
    navigateTo(errorConfig.redirectTo);
  }

  // Call custom error handler if provided
  if (onError) {
    onError(code);
  }

  // Return error details for further handling if needed
  return {
    code,
    status,
    message: serverMessage || errorConfig.description,
    traceID,
  };
}

/**
 * Centralized error handler for API errors with i18n support
 * Use this composable in setup context for type-safe error utilities
 *
 * @example
 * const { handleApiError } = useErrorHandler()
 *
 * try {
 *   await $fetch('/api/v1/users')
 * } catch (error) {
 *   handleApiError(error)
 * }
 */
export function useErrorHandler() {

  /**
   * Check if an error code requires authentication
   */
  function isAuthError(code: ErrorCode | "UNKNOWN_ERROR"): boolean {
    const authErrors: ErrorCode[] = [
      ERROR_CODES.AUTH_REQUIRED,
      ERROR_CODES.INVALID_TOKEN,
      ERROR_CODES.TOKEN_EXPIRED,
      ERROR_CODES.WORKSPACE_MISMATCH,
    ];
    return authErrors.includes(code as ErrorCode);
  }

  /**
   * Check if an error code is a validation error
   */
  function isValidationError(code: ErrorCode | "UNKNOWN_ERROR"): boolean {
    const validationErrors: ErrorCode[] = [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.INVALID_INPUT,
      ERROR_CODES.MISSING_FIELD,
      ERROR_CODES.INVALID_EMAIL_FORMAT,
    ];

    return (
      validationErrors.includes(code as ErrorCode) ||
      code.startsWith("PASSWORD_")
    );
  }

  return {
    handleApiError, // Re-export the standalone function for convenience
    isAuthError,
    isValidationError,
    ERROR_CODES, // Export error codes for use in components
  };
}
