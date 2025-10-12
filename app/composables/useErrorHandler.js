// composables/useErrorHandler.js
export function useErrorHandler() {
  const isDebugMode = useRuntimeConfig().public.debugMode;
  const showToast = useShowToast();

  /**
   ** A centralized error handler for API errors.
   ** Handles different error codes and displays appropriate messages.
   * @param {Object} error - The error object from the API response
   * @param {boolean} [blockRedirect=false] - If true, prevents redirecting on 401/403 errors
   **/
  function handleApiError({ error, blockRedirect = false }) {
    const status = error.response.status;
    const code = error?.response?._data?.error?.code || "UNKNOWN_ERROR";

    if (isDebugMode == true) {
      console.error("API Error:", { rawError: error, errorCode: code });
    }

    if (status == 401) {
      showToast({
        title: "Not Authenticated",
        description: "Please sign in to continue.",
      });
      if (!blockRedirect) navigateTo("/auth/signin");
    } else if (status == 403) {
      showToast({
        title: "Forbidden",
        description: "You do not have permission to access this resource.",
      });
      if (!blockRedirect) navigateTo("/auth/signin");
    }

    switch (code) {
      case "TOKEN_EXPIRED":
        showToast({
          title: "Session Expired",
          description: "Your session has expired. Please sign in again.",
        });
        if (!blockRedirect) navigateTo("/auth/signin");
        break;

      case "USER_NOT_FOUND":
        showToast({
          title: "User Not Found",
          description: "The requested user does not exist.",
        });
        break;

      //todo: add specific error cases -----------------

      default:
        showToast({
          title: "Error",
          description:
            "An unexpected error occurred. Please try again or contact support if the problem persists.",
          action: {
            label: "Support",
            onClick: () => navigateTo("/support"),
          },
        });
    }
  }

  return { handleApiError };
}
