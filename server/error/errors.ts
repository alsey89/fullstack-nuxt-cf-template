// ========================================
// ERROR CLASSES
// ========================================
// Custom error types for structured error handling
// Used throughout services and API routes
// Error codes are imported from codes.ts for FE/BE consistency
// ========================================

import { ERROR_CODES } from '#shared/error/codes';

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
  constructor(message = 'Authentication required', details?: any) {
    super(message, 401, ERROR_CODES.AUTH_REQUIRED, details)
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password', details?: any) {
    super(message, 401, ERROR_CODES.INVALID_CREDENTIALS, details)
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token', details?: any) {
    super(message, 401, ERROR_CODES.INVALID_TOKEN, details)
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired', details?: any) {
    super(message, 401, ERROR_CODES.TOKEN_EXPIRED, details)
  }
}

export class EmailNotConfirmedError extends AppError {
  constructor(message = 'Email address not confirmed', details?: any) {
    super(message, 401, ERROR_CODES.EMAIL_NOT_CONFIRMED, details)
  }
}

export class AccountInactiveError extends AppError {
  constructor(message = 'Account is inactive', details?: any) {
    super(message, 401, ERROR_CODES.ACCOUNT_INACTIVE, details)
  }
}

export class TenantMismatchError extends AppError {
  constructor(message = 'Session tenant mismatch. Please sign in again.', details?: any) {
    super(message, 401, ERROR_CODES.TENANT_MISMATCH, details)
  }
}

export class InvalidTokenPurposeError extends AppError {
  constructor(message = 'Invalid token purpose', details?: any) {
    super(message, 401, ERROR_CODES.INVALID_TOKEN_PURPOSE, details)
  }
}

// ========================================
// AUTHORIZATION ERRORS (403)
// ========================================

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', details?: any) {
    super(message, 403, ERROR_CODES.FORBIDDEN, details)
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'Permission denied', details?: any) {
    super(message, 403, ERROR_CODES.PERMISSION_DENIED, details)
  }
}

// ========================================
// VALIDATION ERRORS (400)
// ========================================

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details)
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ERROR_CODES.INVALID_INPUT, details)
  }
}

export class MissingFieldError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ERROR_CODES.MISSING_FIELD, details)
  }
}

export class PasswordSameAsOldError extends AppError {
  constructor(message = 'New password cannot be the same as your current password', details?: any) {
    super(message, 400, ERROR_CODES.PASSWORD_SAME_AS_OLD, details)
  }
}

// ========================================
// NOT FOUND ERRORS (404)
// ========================================

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 404, ERROR_CODES.NOT_FOUND, details)
  }
}

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found', details?: any) {
    super(message, 404, ERROR_CODES.USER_NOT_FOUND, details)
  }
}

export class CompanyNotFoundError extends AppError {
  constructor(message = 'Company not found', details?: any) {
    super(message, 404, ERROR_CODES.COMPANY_NOT_FOUND, details)
  }
}

// ========================================
// CONFLICT ERRORS (409)
// ========================================

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ERROR_CODES.CONFLICT, details)
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, ERROR_CODES.DUPLICATE, details)
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message = 'Email already exists', details?: any) {
    super(message, 409, ERROR_CODES.EMAIL_EXISTS, details)
  }
}

export class TenantIdTakenError extends AppError {
  constructor(message = 'Tenant ID already taken', details?: any) {
    super(message, 409, ERROR_CODES.TENANT_ID_TAKEN, details)
  }
}

// ========================================
// RATE LIMIT ERRORS (429)
// ========================================

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, { retryAfter })
  }
}

// ========================================
// SERVER ERRORS (500)
// ========================================

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: any) {
    super(message, 500, ERROR_CODES.INTERNAL_ERROR, details)
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?: any) {
    super(message, 500, ERROR_CODES.DATABASE_ERROR, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', details?: any) {
    super(message, 500, ERROR_CODES.EXTERNAL_SERVICE_ERROR, details)
  }
}

// ========================================
// BUSINESS LOGIC ERRORS (422)
// ========================================

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, ERROR_CODES.BUSINESS_RULE_VIOLATION, details)
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, ERROR_CODES.INVALID_STATE, details)
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
