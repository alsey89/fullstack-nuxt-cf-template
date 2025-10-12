import type { H3Error } from "h3";
import { setResponseStatus, setResponseHeader, send } from "h3";
import type { AppError } from "./errors";
import { logError } from "./errors";

// ========================================
// NITRO ERROR HANDLER
// ========================================
// Global error handler for all uncaught errors
// Automatically picked up by Nitro
// Assumes all errors thrown are AppError instances
// ========================================

export default defineNitroErrorHandler((error: H3Error, event) => {
  const config = useRuntimeConfig(event);
  const isDev = config.public.environment === "development";

  // H3 wraps thrown errors - extract the original AppError from error.cause
  const originalError = error.cause as AppError;
  const appError =
    originalError && "code" in originalError && "statusCode" in originalError
      ? originalError
      : (error as unknown as AppError);

  // Get trace ID from context
  const requestId = event.node.req.headers["x-request-id"];
  const traceId = Array.isArray(requestId)
    ? requestId[0]
    : requestId || crypto.randomUUID();

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

  // Build response payload
  const responsePayload = {
    message: "Error occurred",
    data: null,
    error: {
      traceId,
      code: appError.code,
      ...(isDev && appError.details && { details: appError.details }),
      ...(isDev && {
        debug: {
          message: appError.message,
          statusCode: appError.statusCode,
          url: event.path,
          method: event.method,
          timestamp: new Date().toISOString(),
        },
        ...(isDev && error.stack && { stack: error.stack }),
      }),
    },
  };

  // Send response
  setResponseStatus(event, statusCode);
  setResponseHeader(event, "Content-Type", "application/json");
  return send(event, JSON.stringify(responsePayload));
});
