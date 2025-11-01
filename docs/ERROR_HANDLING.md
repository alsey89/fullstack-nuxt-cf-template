# Error Handling Guide

> **Related Documentation:**
> - [CLAUDE.md](CLAUDE.md) - Quick error handling reference
> - [CONVENTIONS.md](CONVENTIONS.md) - Complete conventions guide
> - [SECURITY.md](SECURITY.md) - Security considerations

## Overview

The application uses a **structured error system** with specific error classes and shared error codes between frontend and backend. This provides:

-  **Consistent error responses** across all API endpoints
-  **Automatic HTTP status codes** based on error type
-  **Shared error codes** between FE and BE for type-safe handling
-  **Frontend-only error code reactions** (FE uses codes, not details)
-  **Minimal error details** for debugging (dev mode only)
-  **Trace IDs** for debugging and log correlation

---

## Architecture Overview

### Three-Part System

#### 1. **Shared Error Codes** ([shared/error/codes.ts](../shared/error/codes.ts))
- Single source of truth for all error codes
- Importable by both frontend and backend
- Type-safe with TypeScript

```typescript
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  // ... etc
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

#### 2. **Error Classes** ([server/error/errors.ts](../server/error/errors.ts))
- Specific error classes for common errors (type-safe)
- Generic error classes for edge cases
- All use codes from `ERROR_CODES`

```typescript
// Specific error (FE can react to this)
export class PasswordSameAsOldError extends AppError {
  constructor(message = 'Password cannot be same as old', details?: any) {
    super(message, 400, ERROR_CODES.PASSWORD_SAME_AS_OLD, details);
  }
}

// Generic error (for general cases)
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }
}
```

#### 3. **Error Handler** ([server/error/errorHandler.ts](../server/error/errorHandler.ts))
- Automatically catches and formats all errors
- Environment-aware (dev vs production)
- Logs errors with context

---

## Error Response Format

### Production Response (400-level errors)
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "PASSWORD_SAME_AS_OLD",
    "message": "New password cannot be the same as your current password",
    "details": {
      "field": "password",
      "userId": "user_123"
    }
  }
}
```

### Production Response (500-level errors)
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

**Note:** `details` is hidden for 500-level errors in production (security).

### Development Response
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "PASSWORD_SAME_AS_OLD",
    "message": "New password cannot be the same as your current password",
    "details": {
      "field": "password",
      "userId": "user_123"
    },
    "debug": {
      "statusCode": 400,
      "url": "/api/v1/auth/password/reset",
      "method": "POST",
      "timestamp": "2025-10-12T10:30:00.000Z",
      "stack": "PasswordSameAsOldError: ...\n    at ..."
    }
  }
}
```

### Response Structure Rules

**400-level errors (Client errors):**
-  Always send: `code`, `message`, `details` (production + dev)
-  Dev only: `debug` block with stack trace

**500-level errors (Server errors):**
-  Always send: `code`, generic `message`, `traceId`
- L Never send: `details` in production (security)
-  Dev only: `message`, `details`, `debug` block

---

## How to Use Errors

### 1. Backend: Throw Specific Error Classes

**The backend should NOT decide error codes.** Just throw the appropriate error class:

```typescript
import {
  PasswordSameAsOldError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError
} from '~/server/error/errors';

//  Specific error (FE can react specially)
throw new PasswordSameAsOldError(undefined, {
  field: 'password',
  userId: user.id
});

//  Generic error (FE shows generic message)
throw new ValidationError("Field X is invalid", {
  field: 'fieldX',
  value: someValue
});
```

### 2. Frontend: React to Error Codes

**Frontend only uses `error.code`** to determine behavior:

```typescript
import { ERROR_CODES } from '#shared/error/codes';

// FE reacts based on code only
if (error.code === ERROR_CODES.PASSWORD_SAME_AS_OLD) {
  toast.error(t('errors.passwordSameAsOld'));
  highlightField('password');
}
else if (error.code === ERROR_CODES.EMAIL_EXISTS) {
  toast.error(t('errors.emailExists'));
  showLoginLink();
}
else if (error.code === ERROR_CODES.TENANT_MISMATCH) {
  navigateTo('/login?reason=session_mismatch');
}
// Generic fallback
else {
  toast.error(error.message || t('errors.generic'));
}
```

**Frontend does NOT use `details`** - it's only for developer debugging in dev mode.

---

## Error Details Convention

**Purpose:** Help developers debug issues by providing minimal, critical context.

### What to Include in `details`

**Only include error-specific data that answers: "What caused this error?"**

 **Include:**
- Field names (for validation errors)
- Resource IDs (userId, email, etc.)
- Conflicting values (existingUserId, tokenTenantId vs currentTenantId)
- Error-specific context (expectedPurpose vs actualPurpose)

L **Don't include** (errorHandler already logs this):
- `tenantId` - Already in event.context
- `path` - Already logged by errorHandler
- `method` - Already logged by errorHandler
- `ip` - Can be derived from request
- `attemptedAction` - Usually obvious from context

### Error Details Examples

```typescript
//  Email conflict
throw new EmailAlreadyExistsError(undefined, {
  field: 'email',
  email: 'user@example.com',
  existingUserId: 'user_456'
});

//  Invalid credentials
throw new InvalidCredentialsError(undefined, {
  email: 'user@example.com'  // Just the email
});

//  Token mismatch
throw new InvalidTokenError("Token tenant mismatch", {
  tokenTenantId: 'tenant_a',
  currentTenantId: 'tenant_b'
});

//  Password validation
throw new PasswordSameAsOldError(undefined, {
  field: 'password',
  userId: 'user_123'
});

// L TOO MUCH INFO (redundant)
throw new EmailAlreadyExistsError(undefined, {
  field: 'email',
  email: email,
  existingUserId: existingUser.id,
  tenantId: tenantId,        // L Already in event.context
  attemptedAction: 'signup', // L Obvious from context
  ip: getRequestIP(event),   // L Already logged by errorHandler
  path: event.path           // L Already logged by errorHandler
});
```

### Details Structure (Flat, Not Nested)

```typescript
//  GOOD: Flat structure
{
  field: 'email',
  email: 'user@example.com',
  existingUserId: 'user_456'
}

// L BAD: Nested with redundant 'context' key
{
  field: 'email',
  context: {              // L Unnecessary nesting
    email: 'user@example.com',
    existingUserId: 'user_456'
  }
}
```

---

## Available Error Classes

### Authentication (401)
- `AuthenticationError` - Generic auth required
- `InvalidCredentialsError` - Wrong email/password
- `InvalidTokenError` - Invalid/malformed token
- `InvalidTokenPurposeError` - Token has wrong purpose
- `TokenExpiredError` - Token expired
- `TenantMismatchError` - Session tenant mismatch
- `EmailNotConfirmedError` - Email not verified
- `AccountInactiveError` - Account is inactive

### Authorization (403)
- `AuthorizationError` - Generic permission denied
- `PermissionDeniedError` - Specific permission missing

### Validation (400)
- `ValidationError` - Generic validation failed
- `InvalidInputError` - Invalid input format
- `MissingFieldError` - Required field missing
- `PasswordSameAsOldError` - Password same as current

### Not Found (404)
- `NotFoundError` - Generic resource not found
- `UserNotFoundError` - User not found
- `CompanyNotFoundError` - Company not found

### Conflict (409)
- `ConflictError` - Generic conflict
- `DuplicateError` - Duplicate entry
- `EmailAlreadyExistsError` - Email already exists
- `TenantIdTakenError` - Tenant ID taken

### Rate Limit (429)
- `RateLimitError` - Too many requests

### Server Errors (500)
- `InternalServerError` - Generic server error
- `DatabaseError` - Database operation failed
- `ExternalServiceError` - External API failed

### Business Logic (422)
- `BusinessRuleError` - Business rule violation
- `InvalidStateError` - Invalid state transition

---

## Error Throwing Patterns

### Validation Errors
```typescript
// Password validation
throw new PasswordSameAsOldError(undefined, {
  field: 'password',
  userId: user.id
});

// Generic validation
throw new ValidationError("Email format is invalid", {
  field: 'email',
  email: email
});
```

### Authentication Errors
```typescript
// Invalid credentials
throw new InvalidCredentialsError(undefined, {
  email: email
});

// Account inactive
throw new AccountInactiveError(undefined, {
  userId: user.id,
  email: user.email
});

// Token errors
throw new InvalidTokenPurposeError(undefined, {
  expectedPurpose: 'email-confirm',
  actualPurpose: payload.purpose
});
```

### Not Found Errors
```typescript
throw new UserNotFoundError(undefined, {
  userId: userId
});
```

### Conflict Errors
```typescript
throw new EmailAlreadyExistsError(undefined, {
  field: 'email',
  email: email,
  existingUserId: existingUser.id
});
```

---

## Frontend Error Handling

### Using Error Codes

```typescript
import { ERROR_CODES } from '#shared/error/codes';

async function handlePasswordReset() {
  try {
    await $fetch('/api/v1/auth/password/reset', {
      method: 'POST',
      body: { token, newPassword }
    });
    toast.success(t('password.resetSuccess'));
  } catch (error: any) {
    // React based on error code only
    switch (error.data?.error?.code) {
      case ERROR_CODES.PASSWORD_SAME_AS_OLD:
        toast.error(t('errors.passwordSameAsOld'));
        break;
      case ERROR_CODES.TOKEN_EXPIRED:
        toast.error(t('errors.tokenExpired'));
        navigateTo('/forgot-password');
        break;
      case ERROR_CODES.INVALID_TOKEN_PURPOSE:
        toast.error(t('errors.invalidLink'));
        break;
      default:
        toast.error(error.data?.error?.message || t('errors.generic'));
    }
  }
}
```

### i18n Mapping

```typescript
// In your i18n files
export default {
  errors: {
    passwordSameAsOld: 'Your new password must be different from your current password',
    emailExists: 'This email is already registered. Try logging in instead.',
    invalidCredentials: 'Invalid email or password',
    tokenExpired: 'This link has expired. Please request a new one.',
    tenantMismatch: 'Your session has expired. Please sign in again.',
    generic: 'Something went wrong. Please try again.',
  }
}

// Map codes to translations
const errorMap = {
  [ERROR_CODES.PASSWORD_SAME_AS_OLD]: 'errors.passwordSameAsOld',
  [ERROR_CODES.EMAIL_EXISTS]: 'errors.emailExists',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'errors.invalidCredentials',
  // ... etc
};

const message = t(errorMap[error.code] || 'errors.generic');
```

---

## Best Practices

###  DO

```typescript
// Use specific error classes when FE needs special handling
throw new PasswordSameAsOldError(undefined, {
  field: 'password',
  userId: user.id
});

// Use generic classes for truly generic cases
throw new ValidationError("Field X is invalid", {
  field: 'fieldX',
  value: value
});

// Keep details minimal and error-specific
throw new EmailAlreadyExistsError(undefined, {
  field: 'email',
  email: email,
  existingUserId: existingUser.id
});

// Frontend: Only check error codes
if (error.code === ERROR_CODES.PASSWORD_SAME_AS_OLD) {
  // Handle specially
}
```

### L DON'T

```typescript
// Don't use generic Error
throw new Error('Something went wrong');

// Don't include redundant info in details
throw new ValidationError("Error", {
  field: 'email',
  tenantId: tenantId,        // L Already in event.context
  path: event.path,          // L Already logged
  attemptedAction: 'signup'  // L Obvious from context
});

// Don't nest details unnecessarily
throw new ValidationError("Error", {
  context: {                 // L Redundant nesting
    field: 'email'
  }
});

// Frontend: Don't use details for business logic
if (error.details?.field === 'password') {  // L Use error.code instead
  // ...
}
```

---

## Decision Tree

**"Should I create a new specific error class?"**

Ask: **"Does the frontend need to react differently to this error?"**

- **YES** � Create specific error class with specific code
  - Example: `PasswordSameAsOldError` � FE shows hint about password rules
  - Example: `EmailExistsError` � FE shows "Already have account? Login"
  - Example: `TenantMismatchError` � FE redirects to login

- **NO** � Use generic error class
  - Example: `ValidationError("Field X invalid")` � FE shows generic toast
  - Example: `InternalServerError("DB failed")` � FE shows generic "something went wrong"

---

## Summary

### Backend:
- Throw specific error classes (don't think about codes)
- Include minimal, error-specific details
- Let errorHandler format the response

### Frontend:
- Check `error.code` only
- Map codes to i18n translations
- Ignore `details` (only for dev debugging)

### Error Details:
- Only include error-specific critical data
- Keep it flat (no nested `context` key)
- Don't duplicate what errorHandler already logs

### Error Handler:
- Automatically catches all errors
- Formats response based on environment
- Logs full context for debugging
- Obscures 500-level errors in production
