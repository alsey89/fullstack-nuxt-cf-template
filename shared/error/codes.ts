// ========================================
// ERROR CODES (Shared between BE & FE)
// ========================================
// This file can be imported by both server and client code
// Frontend can use these codes for type-safe error handling and i18n mapping
//
// Usage (Frontend):
//   import { ERROR_CODES } from '#shared/error/codes'
//   if (error.code === ERROR_CODES.INVALID_CREDENTIALS) { ... }
//
// Usage (Backend):
//   import { ERROR_CODES } from '#shared/error/codes'
//   throw new InvalidCredentialsError('Wrong password')
// ========================================

export const ERROR_CODES = {
  // ========================================
  // AUTHENTICATION (401)
  // ========================================
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_TOKEN_PURPOSE: 'INVALID_TOKEN_PURPOSE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',

  // ========================================
  // AUTHORIZATION (403)
  // ========================================
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // ========================================
  // VALIDATION (400)
  // ========================================
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Password validation errors
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
  PASSWORD_MISSING_UPPERCASE: 'PASSWORD_MISSING_UPPERCASE',
  PASSWORD_MISSING_LOWERCASE: 'PASSWORD_MISSING_LOWERCASE',
  PASSWORD_MISSING_NUMBER: 'PASSWORD_MISSING_NUMBER',
  PASSWORD_MISSING_SPECIAL: 'PASSWORD_MISSING_SPECIAL',
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD',

  // Email validation errors
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',

  // ========================================
  // NOT FOUND (404)
  // ========================================
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND',

  // ========================================
  // CONFLICT (409)
  // ========================================
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  TENANT_ID_TAKEN: 'TENANT_ID_TAKEN',

  // ========================================
  // RATE LIMIT (429)
  // ========================================
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // ========================================
  // SERVER ERRORS (500)
  // ========================================
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // ========================================
  // BUSINESS LOGIC (422)
  // ========================================
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE: 'INVALID_STATE',
} as const;

// TypeScript type for error codes (for type safety)
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Helper to check if a string is a valid error code
export function isValidErrorCode(code: string): code is ErrorCode {
  return Object.values(ERROR_CODES).includes(code as ErrorCode);
}
