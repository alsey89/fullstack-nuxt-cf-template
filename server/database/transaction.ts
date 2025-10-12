import { drizzle } from 'drizzle-orm/d1'
import type { D1Database } from '@cloudflare/workers-types'
import * as schema from '#server/database/schema'

// ========================================
// TRANSACTION-LIKE OPERATIONS FOR DRIZZLE
// ========================================
// D1 doesn't support traditional transactions, but batch operations
// provide atomicity. This wrapper provides a familiar transaction API.
//
// IMPORTANT LIMITATION:
// - Drizzle queries execute immediately (can't be delayed)
// - This is more of a "rollback on error" pattern
// - For true atomicity, use raw batch operations (see batch.ts)
// ========================================

export type TransactionCallback<T> = (tx: ReturnType<typeof drizzle>) => Promise<T>

/**
 * Execute operations in a pseudo-transaction
 * Rolls back (throws) if any operation fails
 *
 * ⚠️ IMPORTANT: For critical operations requiring true atomicity,
 * use raw batch operations from batch.ts instead
 *
 * @param db - D1 database instance
 * @param callback - Transaction callback with Drizzle instance
 * @returns Result from callback
 * @throws Error if any operation fails
 *
 * @example
 * // Simple transaction-like pattern
 * const result = await withTransaction(db, async (tx) => {
 *   const user = await tx.insert(schema.users).values({ ... }).returning()
 *   const settings = await tx.insert(schema.userSettings).values({ userId: user.id })
 *   return { user, settings }
 * })
 *
 * @example
 * // For true atomicity, use batch operations instead:
 * import { executeBatch } from './batch'
 * const statements = [
 *   db.prepare('INSERT INTO users ...').bind(...),
 *   db.prepare('INSERT INTO user_settings ...').bind(...),
 * ]
 * await executeBatch(db, statements)
 */
export async function withTransaction<T>(
  db: D1Database,
  callback: TransactionCallback<T>
): Promise<T> {
  const tx = drizzle(db, { schema })

  try {
    const result = await callback(tx)
    return result
  } catch (error) {
    // Drizzle operations already executed - can't truly rollback
    // This just ensures error propagation
    throw error
  }
}

/**
 * Check if an error is a D1 constraint violation
 */
export function isConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('unique constraint') ||
      message.includes('foreign key constraint') ||
      message.includes('check constraint')
    )
  }
  return false
}

/**
 * Check if an error is a D1 database error
 */
export function isDatabaseError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('d1_error') ||
      message.includes('sqlite') ||
      isConstraintError(error)
    )
  }
  return false
}
