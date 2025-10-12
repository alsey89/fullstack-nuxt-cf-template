// ========================================
// ERROR CLASSES
// ========================================
// Custom error types for structured error handling
// Used throughout services and API routes
// ========================================

/**
 * Base application error
 * All custom errors extend this class
 */
export class AppError extends Error {
  public traceId?: string

  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      traceId: this.traceId,
      code: this.code,
      ...(this.details && { details: this.details }),
    }
  }
}

// ========================================
// AUTHENTICATION ERRORS (401)
// ========================================

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code?: string, details?: any) {
    super(message, 401, code || 'AUTH_REQUIRED', details)
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401, 'INVALID_CREDENTIALS')
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'INVALID_TOKEN')
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED')
  }
}

export class EmailNotConfirmedError extends AppError {
  constructor(message = 'Email address not confirmed') {
    super(message, 401, 'EMAIL_NOT_CONFIRMED')
  }
}

export class AccountInactiveError extends AppError {
  constructor(message = 'Account is inactive') {
    super(message, 401, 'ACCOUNT_INACTIVE')
  }
}

// ========================================
// AUTHORIZATION ERRORS (403)
// ========================================

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', requiredPermissions?: string[]) {
    super(message, 403, 'FORBIDDEN', { requiredPermissions })
  }
}

export class PermissionDeniedError extends AppError {
  constructor(permission: string, message?: string) {
    super(
      message || `Permission denied: ${permission}`,
      403,
      'PERMISSION_DENIED',
      { permission }
    )
  }
}

// ========================================
// VALIDATION ERRORS (400)
// ========================================

export class ValidationError extends AppError {
  constructor(message: string, errors?: any) {
    super(message, 400, 'VALIDATION_ERROR', errors)
  }
}

export class InvalidInputError extends AppError {
  constructor(field: string, message?: string) {
    super(message || `Invalid input: ${field}`, 400, 'INVALID_INPUT', { field })
  }
}

export class MissingFieldError extends AppError {
  constructor(field: string) {
    super(`Missing required field: ${field}`, 400, 'MISSING_FIELD', { field })
  }
}

// ========================================
// NOT FOUND ERRORS (404)
// ========================================

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} not found: ${identifier}` : `${resource} not found`,
      404,
      'NOT_FOUND',
      { resource, identifier }
    )
  }
}

export class UserNotFoundError extends AppError {
  constructor(identifier?: string) {
    super(
      identifier ? `User not found: ${identifier}` : 'User not found',
      404,
      'USER_NOT_FOUND'
    )
  }
}

export class CompanyNotFoundError extends AppError {
  constructor(identifier?: string) {
    super(
      identifier ? `Company not found: ${identifier}` : 'Company not found',
      404,
      'COMPANY_NOT_FOUND'
    )
  }
}

// ========================================
// CONFLICT ERRORS (409)
// ========================================

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
  }
}

export class DuplicateError extends AppError {
  constructor(field: string, value: string) {
    super(`${field} already exists: ${value}`, 409, 'DUPLICATE', { field, value })
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(`Email already exists: ${email}`, 409, 'EMAIL_EXISTS', { email })
  }
}

export class TenantIdTakenError extends AppError {
  constructor(tenantId: string) {
    super(`Tenant ID already taken: ${tenantId}`, 409, 'TENANT_ID_TAKEN', { tenantId })
  }
}

// ========================================
// RATE LIMIT ERRORS (429)
// ========================================

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter })
  }
}

// ========================================
// SERVER ERRORS (500)
// ========================================

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_ERROR', details)
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `External service error: ${service}`, 500, 'EXTERNAL_SERVICE_ERROR', {
      service,
    })
  }
}

// ========================================
// BUSINESS LOGIC ERRORS (422)
// ========================================

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', details)
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'INVALID_STATE', details)
  }
}

// ========================================
// ERROR HANDLER
// ========================================

/**
 * Convert unknown errors to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
      stack: error.stack,
    })
  }

  return new InternalServerError('Unknown error occurred', { error })
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Format error response for H3
 */
export function formatErrorResponse(error: AppError) {
  return {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details }),
    },
  }
}

/**
 * Log error with context
 */
export function logError(error: AppError, context?: Record<string, any>) {
  const errorLog = {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  }

  if (error.statusCode >= 500) {
    console.error('Server Error:', errorLog)
  } else if (error.statusCode >= 400) {
    console.warn('Client Error:', errorLog)
  } else {
    console.log('Error:', errorLog)
  }
}
