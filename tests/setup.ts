import { vi } from 'vitest'

// ========================================
// GLOBAL TEST SETUP
// ========================================
// This file runs before all tests
// Sets up mocks and global test utilities
// ========================================

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: console.error, // Keep error for debugging
}

// Set test environment variables
process.env.NODE_ENV = 'test'

// ========================================
// MOCK NUXT-AUTH-UTILS
// ========================================
// Mock authentication utilities used across multiple test files
// These need to be mocked globally to avoid duplication
// Note: nuxt-auth-utils provides these as auto-imports in Nuxt runtime
// In tests, we need to mock them as global functions
// ========================================

// Create global mock functions
global.hashPassword = vi.fn().mockImplementation(async (password: string) => {
  // Simple deterministic hash for testing
  return `hashed_${password}`
})

global.verifyPassword = vi.fn().mockImplementation(async (hash: string, password: string) => {
  // Check if hash matches the expected pattern
  // Note: nuxt-auth-utils verifyPassword signature is (hash, password)
  return hash === `hashed_${password}`
})

global.getUserSession = vi.fn().mockResolvedValue(null)

global.setUserSession = vi.fn().mockResolvedValue(undefined)

// ========================================
// MOCK NUXT UTILITIES
// ========================================
// Mock Nuxt/h3 utilities that are auto-imported
// ========================================

global.defineEventHandler = vi.fn().mockImplementation((handler) => handler)

global.setHeader = vi.fn().mockImplementation(() => undefined)
