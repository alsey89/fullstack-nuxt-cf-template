import { getRequestIP, getHeader } from 'h3';

// ========================================
// REQUEST CONTEXT MIDDLEWARE
// ========================================
// Captures request metadata for audit logging and tracking
// Runs before tenant and auth middleware (00 prefix)
// ========================================

/**
 * Request context middleware
 *
 * Captures or generates:
 * - Request ID (from header or generated)
 * - IP address
 * - User agent
 * - Endpoint and method
 *
 * This context is used for:
 * - Audit logging
 * - Error tracking
 * - Request tracing across services
 */
export default defineEventHandler((event) => {
  // Only process API routes
  if (!event.path.startsWith('/api/')) {
    return;
  }

  // Capture or generate request ID
  // Client can provide X-Request-ID for tracing, otherwise we generate one
  const requestId = getHeader(event, 'x-request-id') || crypto.randomUUID();

  // Capture request metadata
  event.context.requestId = requestId;
  event.context.ipAddress = getRequestIP(event);
  event.context.userAgent = getHeader(event, 'user-agent') || 'unknown';
  event.context.endpoint = event.path;
  event.context.method = event.method;

  // Set response header so client can track requests
  setHeader(event, 'X-Request-ID', requestId);
});
