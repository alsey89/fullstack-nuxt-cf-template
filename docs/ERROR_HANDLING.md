# Error Handling Guide

## Overview

The application uses a **structured error system** with custom error classes that extend from `AppError`. This provides:

- ✅ **Consistent error responses** across all API endpoints
- ✅ **Automatic HTTP status codes** based on error type
- ✅ **Machine-readable error codes** for client-side handling
- ✅ **Type-safe error handling** with TypeScript
- ✅ **Trace IDs** for debugging and log correlation

---

## Error Class Hierarchy

```
AppError (Base Class)
├── AuthenticationError (401)
│   ├── InvalidCredentialsError
│   ├── InvalidTokenError
│   ├── TokenExpiredError
│   ├── EmailNotConfirmedError
│   └── AccountInactiveError
├── AuthorizationError (403)
│   └── PermissionDeniedError
├── ValidationError (400)
│   ├── InvalidInputError
│   └── MissingFieldError
├── NotFoundError (404)
│   ├── UserNotFoundError
│   └── CompanyNotFoundError
├── ConflictError (409)
│   ├── DuplicateError
│   ├── EmailAlreadyExistsError
│   └── TenantIdTakenError
├── RateLimitError (429)
├── InternalServerError (500)
│   ├── DatabaseError
│   └── ExternalServiceError
└── BusinessRuleError (422)
    └── InvalidStateError
```

---

## Error Response Format

All errors follow this structure:

```typescript
{
  message: "Error occurred",    // Always static
  data: null,                   // Always null for errors
  error: {
    traceId: string,           // Request trace ID for debugging
    code: string,              // Machine-readable error code
    details?: any,             // Additional context (dev only)
    debug?: {                  // Development only
      message: string,         // Human-readable error message
      statusCode: number,
      url: string,
      method: string,
      timestamp: string
    },
    stack?: string             // Stack trace (dev only)
  }
}
```

**Production vs Development:**
- **Production:** Only `traceId` and `code` exposed (no error messages, details, or stack traces)
- **Development:** Full error details including `debug` object with message, context, and stack trace

**Example Production Response:**
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "USER_NOT_FOUND"
  }
}
```

**Example Development Response:**
```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "USER_NOT_FOUND",
    "debug": {
      "message": "User not found: user_123",
      "statusCode": 404,
      "url": "/api/v1/user/user_123",
      "method": "GET",
      "timestamp": "2025-10-08T10:30:00.000Z"
    },
    "stack": "UserNotFoundError: User not found: user_123\n    at ..."
  }
}
```

---

## How to Use Errors

### Import Error Classes

```typescript
import {
  ValidationError,
  NotFoundError,
  UserNotFoundError,
  InvalidCredentialsError,
  BusinessRuleError,
} from '../error/errors'
```

### Throw Errors in Services

```typescript
// ❌ BAD - Generic Error
throw new Error('User not found')

// ✅ GOOD - Specific AppError
throw new UserNotFoundError(userId)
```

---

## Common Error Patterns

### Authentication Errors (401)

```typescript
// Invalid credentials
const isValid = await verifyPassword(user.passwordHash, password)
if (!user || !isValid) {
  throw new InvalidCredentialsError()
}

// Email not confirmed
if (!user.isEmailVerified) {
  throw new EmailNotConfirmedError()
}

// Account inactive
if (!user.isActive) {
  throw new AccountInactiveError()
}
```

### Validation Errors (400)

```typescript
// Missing field
if (!body.email) {
  throw new MissingFieldError('email')
}

// Invalid input
if (!/^[a-z0-9-]+$/.test(tenantId)) {
  throw new InvalidInputError('tenantId', 'Must be lowercase alphanumeric')
}

// Validation with details
const validation = validatePasswordStrength(password)
if (!validation.valid) {
  throw new ValidationError(
    'Password does not meet requirements',
    validation.errors
  )
}
```

### Not Found Errors (404)

```typescript
// User not found
const user = await this.userRepo.findById(userId, companyId)
if (!user) {
  throw new UserNotFoundError(userId)
}

// Generic resource not found
const location = await this.locationRepo.findById(locationId, companyId)
if (!location) {
  throw new NotFoundError('Location', locationId)
}
```

### Conflict Errors (409)

```typescript
// Duplicate check
const existing = await this.locationRepo.findByName(name, companyId)
if (existing) {
  throw new DuplicateError('location name', name)
}

// Email exists
const existingUser = await this.userRepo.findByEmail(email, companyId)
if (existingUser) {
  throw new EmailAlreadyExistsError(email)
}
```

### Business Rule Errors (422)

```typescript
// Business rule violation with context
const activeAssignments = assignments.filter(a => !a.endedAt)
if (activeAssignments.length > 0) {
  throw new BusinessRuleError(
    'Cannot delete location with active assignments',
    { activeCount: activeAssignments.length }
  )
}
```

### Server Errors (500)

```typescript
// Internal error with context
try {
  await someCriticalOperation()
} catch (error) {
  throw new InternalServerError('Failed to process request', { originalError: error })
}
```

---

## Client-Side Error Handling

Use the `useErrorHandler` composable:

```typescript
const { handleApiError } = useErrorHandler()

try {
  await $fetch('/api/v1/user/profile')
} catch (error) {
  handleApiError({ error })
}
```

### Handled Error Codes

- `TOKEN_EXPIRED` - Redirects to signin
- `USER_NOT_FOUND` - Shows toast notification
- `401` status - "Not Authenticated" toast + redirect
- `403` status - "Forbidden" toast + redirect
- Default - Generic error toast with support link

### Block Redirects

```typescript
handleApiError({ error, blockRedirect: true })
```

---

## Best Practices

### ✅ DO

```typescript
// Use specific error classes
throw new UserNotFoundError(userId)

// Include helpful details (dev only)
throw new ValidationError('Invalid input', { field: 'email', reason: 'Invalid format' })

// Pass identifiers
throw new NotFoundError('Location', locationId)

// Add context
throw new BusinessRuleError('Cannot delete', { assignmentId, status: 'ACTIVE' })
```

### ❌ DON'T

```typescript
// Don't use generic Error
throw new Error('Something went wrong')

// Don't throw strings
throw 'User not found'

// Don't return error objects
return { error: 'Invalid email' }

// Don't swallow errors
try {
  await operation()
} catch (e) {
  throw new InternalServerError()  // ❌ Missing context
}
```

---

## Error Flow

```
Service throws AppError
      ↓
H3/Nitro catches error
      ↓
server/error/errorHandler.ts formats response
      ↓
Client receives { traceId, code, debug? }
      ↓
useErrorHandler handles UI (toasts/redirects)
```

---

## Summary Table

| Error Class | Status | Code | Production Response |
|------------|--------|------|---------------------|
| `InvalidCredentialsError` | 401 | `INVALID_CREDENTIALS` | traceId + code only |
| `EmailNotConfirmedError` | 401 | `EMAIL_NOT_CONFIRMED` | traceId + code only |
| `PermissionDeniedError` | 403 | `PERMISSION_DENIED` | traceId + code only |
| `ValidationError` | 400 | `VALIDATION_ERROR` | traceId + code only |
| `UserNotFoundError` | 404 | `USER_NOT_FOUND` | traceId + code only |
| `DuplicateError` | 409 | `DUPLICATE` | traceId + code only |
| `BusinessRuleError` | 422 | `BUSINESS_RULE_VIOLATION` | traceId + code only |
| `InternalServerError` | 500 | `INTERNAL_ERROR` | traceId + code only |

**Key Points:**
- Production: Minimal response (`traceId` + `code` only) for security
- Development: Full `debug` info, `details`, and `stack` trace
- Use `traceId` for log correlation when debugging production issues
