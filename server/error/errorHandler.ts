import type { H3Error } from "h3";
import { setResponseStatus, setResponseHeader, send } from "h3";
import { ZodError } from "zod";
import type { AppError } from "#server/error/errors";
import { logError, ValidationError } from "#server/error/errors";
import { isDevelopment } from "#server/utils/environment";

// ========================================
// NITRO ERROR HANDLER
// ========================================
// Global error handler for all uncaught errors
// Automatically picked up by Nitro
// Handles AppError and ZodError instances
// ========================================

export default defineNitroErrorHandler((error: H3Error, event) => {
  const isDev = isDevelopment(event);

  // H3 wraps thrown errors - extract the original error from error.cause
  const originalError = error.cause;

  // Convert ZodError to ValidationError
  let appError: AppError;
  if (originalError instanceof ZodError) {
    // Format Zod errors into user-friendly messages
    const zodErrors = originalError.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    const firstError = originalError.errors[0];
    const errorMessage = firstError ? firstError.message : "Validation failed";
    appError = new ValidationError(errorMessage, zodErrors);
  } else if (
    originalError &&
    typeof originalError === "object" &&
    "code" in originalError &&
    "statusCode" in originalError
  ) {
    // It's already an AppError
    appError = originalError as AppError;
  } else {
    // Fallback for other error types
    appError = error as unknown as AppError;
  }

  // Get trace ID from context (set by request-context middleware)
  const traceId = event.context.requestId || crypto.randomUUID();

  // Set traceId on error for logging correlation
  appError.traceId = traceId;

  // Log full error server-side with trace ID
  // todo: implement structured logging
  logError(appError, {
    traceId,
    url: event.path,
    method: event.method,
    ...(error.stack && {
      stack: error.stack.split("\n").map((line) => line.trim()),
    }),
  });

  // Prepare response based on environment and error type
  const statusCode = appError.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const isServerError = statusCode >= 500;

  // Build response payload based on error type and environment
  // Client errors (400-499): Always send message + details (users need to know what's wrong)
  // Server errors (500-599): Obscure in production (security), show in dev
  const responsePayload = {
    message: "Error occurred",
    data: null,
    error: {
      traceId,
      code: appError.code,
      // Always send message for client errors, generic message for server errors in prod
      message: isClientError || isDev
        ? appError.message
        : "Internal server error",
      // Always send details for client errors, hide for server errors in prod
      ...(isClientError || isDev) && appError.details && { details: appError.details },
      // Debug info only in development
      ...(isDev && {
        debug: {
          statusCode: appError.statusCode,
          url: event.path,
          method: event.method,
          timestamp: new Date().toISOString(),
          ...(error.stack && { stack: error.stack }),
        },
      }),
    },
  };

  // Send response
  setResponseStatus(event, statusCode);
  setResponseHeader(event, "Content-Type", "application/json");
  return send(event, JSON.stringify(responsePayload));
});
