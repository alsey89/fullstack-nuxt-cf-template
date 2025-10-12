import { drizzle } from 'drizzle-orm/d1'
import * as schema from '#server/database/schema'

/**
 * Get Drizzle ORM instance from raw D1Database
 *
 * ⚠️ FOR NON-REQUEST CONTEXTS ONLY
 *
 * Use cases:
 * - Migration scripts
 * - Seed scripts
 * - Testing utilities
 * - Background jobs
 *
 * For API handlers and services, use:
 * ```typescript
 * import { getDatabase } from './utils'
 * const db = getDatabase(event)
 * ```
 */
export function createDB(d1: D1Database) {
  return drizzle(d1, { schema })
}
