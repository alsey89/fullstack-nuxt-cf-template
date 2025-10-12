import { vi } from 'vitest'

// ========================================
// AUTO-MOCKING UTILITIES
// ========================================
// Similar to Go's automatic interface mocking
// Uses Vitest's vi.fn() to create spies for all methods
// ========================================

/**
 * Auto-mock any repository by creating mocked versions of all its methods
 * Similar to Go's mockgen or testify/mock
 *
 * Usage:
 *   const mockRepo = autoMockRepository(ShiftRepository)
 *   mockRepo.findById.mockResolvedValue(mockShift)
 */
export function autoMockRepository<T extends new (...args: any[]) => any>(
  RepositoryClass: T
): InstanceType<T> {
  const instance = new RepositoryClass({} as any, {} as any)
  const mock: any = {}

  // Get all methods from the prototype
  const prototype = Object.getPrototypeOf(instance)
  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name) => name !== 'constructor' && typeof prototype[name] === 'function'
  )

  // Create vi.fn() spy for each method
  for (const methodName of methodNames) {
    mock[methodName] = vi.fn()
  }

  // Also include any properties
  Object.keys(instance).forEach((key) => {
    if (!(key in mock)) {
      mock[key] = instance[key]
    }
  })

  return mock as InstanceType<T>
}

/**
 * Auto-mock all repository methods with a generic mock
 * Returns an object with all methods as vi.fn()
 */
export function createGenericRepositoryMock() {
  return {
    // Base repository methods
    table: {} as any,
    findById: vi.fn(),
    findByIds: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    restore: vi.fn(),
    exists: vi.fn(),
    count: vi.fn(),
    getDrizzle: vi.fn(),

    // Any additional methods are added as needed
  }
}

/**
 * Type-safe auto-mock for a specific repository
 * Extracts the type and creates a mock with all methods
 */
export type MockedRepository<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn> & T[K]
    : T[K]
}

/**
 * Create a type-safe mock of any object
 * All methods become vi.fn() mocks
 */
export function createMock<T extends object>(obj: T): MockedRepository<T> {
  const mock: any = {}

  for (const key in obj) {
    const value = obj[key]
    if (typeof value === 'function') {
      mock[key] = vi.fn()
    } else {
      mock[key] = value
    }
  }

  return mock
}
