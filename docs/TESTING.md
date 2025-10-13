# Testing Guide

This directory contains all tests for the application.

## Structure

```
tests/
├── unit/                    # Unit tests for services and business logic
│   └── services/           # Service layer tests
├── integration/            # E2E integration tests
├── helpers/               # Test utilities and mocks
│   ├── mocks.ts          # Mock data factories
│   └── auto-mocks.ts     # Automatic mocking utilities
├── setup.ts              # Global test setup
├── tsconfig.json        # TypeScript config for tests
└── README.md            # Quick-start guide (see this file for full guide)
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open test UI
npm run test:ui
```

## Writing Tests

### Unit Tests (Service Layer)

We focus on **service layer tests** because that's where business logic lives. Repository tests are low-priority since repositories are thin wrappers around Drizzle ORM.

#### Example: Service Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YourService } from '~/server/services/your-service'
import { createMockH3Event, createMockD1Database } from '../../helpers/mocks'
import { createGenericRepositoryMock } from '../../helpers/auto-mocks'

describe('YourService', () => {
  let service: YourService
  let mockRepo: any

  beforeEach(() => {
    // Auto-create repository mock
    mockRepo = createGenericRepositoryMock()

    // Add custom methods if needed
    mockRepo.findByCustomCriteria = vi.fn()

    // Create service
    service = new YourService(
      createMockH3Event() as any,
      createMockD1Database() as any,
      mockRepo
    )
  })

  it('tests business logic', async () => {
    // Setup
    mockRepo.findByCustomCriteria.mockResolvedValue({ id: '1', name: 'Test' })

    // Execute
    const result = await service.performAction()

    // Verify
    expect(result).toBeDefined()
    expect(mockRepo.findByCustomCriteria).toHaveBeenCalled()
  })
})
```

### Integration Tests (E2E)

Test full request flows through the API using `@nuxt/test-utils`.

**Note:** Integration tests require additional setup (test database, authentication).

```typescript
import { describe, it, expect } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils'

describe('API Integration Flow', () => {
  await setup({
    // Configure test environment
  })

  it('complete user workflow', async () => {
    const response = await $fetch('/api/v1/user', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
    })

    expect(response.data.user).toBeDefined()
    expect(response.data.user.email).toBe('test@example.com')
  })
})
```

## Mock Utilities

### Global Mocks (nuxt-auth-utils)

Global authentication utilities are mocked in `tests/setup.ts`:

```typescript
// tests/setup.ts
global.hashPassword = vi.fn().mockImplementation(async (password: string) => {
  return `hashed_${password}`
})

// IMPORTANT: Parameter order is (hash, password) - nuxt-auth-utils signature
global.verifyPassword = vi.fn().mockImplementation(async (hash: string, password: string) => {
  return hash === `hashed_${password}`
})

global.getUserSession = vi.fn().mockResolvedValue(null)
global.setUserSession = vi.fn().mockResolvedValue(undefined)
```

**Key Points:**
- `verifyPassword` uses signature `(hash, password)` - matches nuxt-auth-utils
- These mocks are available in all test files automatically
- Override them in specific tests using `vi.mocked(global.verifyPassword).mockImplementation(...)`

### Manual Mocking

Use the mock factories in `helpers/mocks.ts`:

```typescript
import {
  createMockUser,
  createMockCompany,
} from '../../helpers/mocks'

const company = createMockCompany({ name: 'Test Company' })
const user = createMockUser({ companyId: company.id, email: 'test@example.com' })
```

### Automatic Mocking

Use `createGenericRepositoryMock()` for automatic repository mocking:

```typescript
import { createGenericRepositoryMock } from '../../helpers/auto-mocks'

const mockRepo = createGenericRepositoryMock()

// All methods are automatically vi.fn() spies
mockRepo.findById.mockResolvedValue({ id: '1' })
mockRepo.create.mockResolvedValue({ id: '2' })
```

## Test Coverage Goals

### High Priority (Required)

- ✅ **Service Layer**: Business logic, state machines, calculations
- ✅ **Validators**: Zod schema validation edge cases
- ✅ **E2E Flows**: Critical user journeys

### Low Priority (Optional)

- ❌ **Repository Layer**: Thin wrappers, already tested by Drizzle
- ❌ **Simple CRUD Endpoints**: Unless complex filtering/logic

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on inputs/outputs
   - Don't test internal method calls

2. **Use Descriptive Test Names**
   ```typescript
   it('prevents updating user with invalid email format') // ✅ Good
   it('test update') // ❌ Bad
   ```

3. **AAA Pattern: Arrange, Act, Assert**
   ```typescript
   it('updates user profile correctly', async () => {
     // Arrange
     const userId = 'user-123'
     const updateData = { firstName: 'John', lastName: 'Doe' }
     mockRepo.findById.mockResolvedValue({ id: userId, email: 'john@example.com' })
     mockRepo.update.mockResolvedValue({ id: userId, ...updateData })

     // Act
     const result = await service.updateProfile(userId, updateData)

     // Assert
     expect(result.firstName).toBe('John')
     expect(mockRepo.update).toHaveBeenCalledWith(userId, updateData)
   })
   ```

4. **Mock Time When Testing Time-Dependent Logic**
   ```typescript
   vi.useFakeTimers()
   vi.setSystemTime(new Date('2025-10-10T12:00:00Z'))
   // ... test code
   vi.useRealTimers()
   ```

5. **Test Error Cases**
   ```typescript
   it('throws error when user is not found', async () => {
     mockRepo.findById.mockResolvedValue(null)

     await expect(service.updateProfile('invalid-id', {})).rejects.toThrow(
       UserNotFoundError
     )
   })
   ```

6. **Test Error Types, Not Messages**

   **✅ DO:** Test the error class/type
   ```typescript
   import { UserNotFoundError, ValidationError } from '~/server/error/errors'

   await expect(service.getUser('invalid')).rejects.toThrow(UserNotFoundError)
   await expect(service.validateInput({})).rejects.toThrow(ValidationError)
   ```

   **❌ DON'T:** Test exact error message strings
   ```typescript
   // Brittle - breaks when error messages improve
   await expect(service.getUser('invalid')).rejects.toThrow(
     'User with ID invalid not found in database'
   )
   ```

   **Why?** Error messages are internal implementation details that may change for clarity or localization. Testing error types ensures correct error handling while allowing message improvements.

7. **Use Constants Instead of Magic Strings**

   **✅ DO:** Import and use constants
   ```typescript
   import { HdrKeyTenantID } from '~/server/types/api'

   vi.mocked(getHeader).mockImplementation((event, header) => {
     if (header === HdrKeyTenantID) return 'test-tenant'
     return undefined
   })
   ```

   **❌ DON'T:** Hardcode string literals
   ```typescript
   // Fragile - won't update if constant changes
   if (header === 'X-Tenant-ID') return 'test-tenant'
   ```

   **Why?** Constants ensure tests stay in sync with production code. If the header name changes, tests automatically use the updated value.

## Test Configuration

### Understanding the Config Files

Two configuration files work together for testing:

#### `tests/tsconfig.json` - TypeScript & IDE Support
- Used by TypeScript compiler and your IDE
- Provides type checking and autocomplete
- Extends `.nuxt/tsconfig.json` to inherit Nuxt path mappings (`#server`, `#shared`, etc.)
- Only needs to specify Vitest globals for IDE autocomplete

```json
{
  "extends": "../.nuxt/tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"]  // For describe, it, expect autocomplete
  }
}
```

#### `vitest.config.ts` - Runtime Module Resolution
- Used by Vite/Vitest when executing tests
- **Must explicitly define path aliases** - Vite doesn't read tsconfig paths
- This is where runtime module resolution happens

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
```

**Important:** Both files are required. If you add a new path alias to the project:
1. Add it to `vitest.config.ts` for runtime resolution
2. The TypeScript paths are inherited from `.nuxt/tsconfig.json`

### Common Issues

**Problem:** `Cannot find module '#server/...'` errors in tests

**Solution:** Ensure `vitest.config.ts` has the `#server` alias defined in `resolve.alias`. Vitest uses Vite's module resolution, which doesn't automatically read TypeScript path mappings.

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Nuxt Test Utils](https://nuxt.com/docs/getting-started/testing)
