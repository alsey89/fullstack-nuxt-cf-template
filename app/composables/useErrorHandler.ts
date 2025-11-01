// ========================================
// FRONTEND ERROR HANDLER
// ========================================
// Centralized error handling for API responses
// Imports error codes from backend for type-safe error handling
// Uses i18n for multi-language error messages
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
 * Map error codes to redirect configurations
 */
const redirectConfig: Partial<Record<ErrorCode, { path: string }>> = {
  [ERROR_CODES.AUTH_REQUIRED]: { path: "/auth/signin" },
  [ERROR_CODES.INVALID_TOKEN]: { path: "/auth/signin" },
  [ERROR_CODES.TOKEN_EXPIRED]: { path: "/auth/signin" },
  [ERROR_CODES.TENANT_MISMATCH]: { path: "/auth/signin" },
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
 * Get error message from i18n translations
 * This function can be called outside of setup context
 */
function getErrorMessage(code: ErrorCode | "UNKNOWN_ERROR"): ErrorMessage {
  const { t } = useI18n();
  const errorKey = `errors.${code}`;

  // Build error message from i18n
  const message: ErrorMessage = {
    title: t(`${errorKey}.title`),
    description: t(`${errorKey}.description`),
  };

  // Add redirect configuration if exists
  const redirect = redirectConfig[code as ErrorCode];
  if (redirect) {
    message.shouldRedirect = true;
    message.redirectTo = redirect.path;
  }

  // Add action button if translation exists
  const actionPath = actionConfig[code as ErrorCode];
  if (actionPath && t(`${errorKey}.action.label`)) {
    message.action = {
      label: t(`${errorKey}.action.label`),
      onClick: () => {
        navigateTo(actionPath.path);
        return true;
      },
    };
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
      ERROR_CODES.TENANT_MISMATCH,
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
