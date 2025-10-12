/**
 * Database debugging utilities
 *
 * These helpers make D1/SQLite errors more readable during development
 */

/**
 * Wrap a database operation to catch and improve error messages
 */
export async function debugDbOperation<T>(
  operation: () => Promise<T>,
  context: {
    table: string
    operation: 'create' | 'update' | 'delete' | 'query'
    data?: any
  }
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Enhanced error message
    const enhancedError = new Error(
      `Database ${context.operation} failed on table "${context.table}"\n` +
      `Original error: ${error instanceof Error ? error.message : String(error)}\n` +
      (context.data ? `Data being ${context.operation}d:\n${JSON.stringify(context.data, null, 2)}` : '')
    )

    // Preserve stack trace
    if (error instanceof Error) {
      enhancedError.stack = error.stack
    }

    throw enhancedError
  }
}

/**
 * Validate required fields before database insertion
 * Throws a clear error if any required field is missing/null
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: Array<keyof T>,
  tableName: string
): void {
  const missingFields: string[] = []
  const nullFields: string[] = []

  for (const field of requiredFields) {
    if (!(field in data)) {
      missingFields.push(String(field))
    } else if (data[field] === null || data[field] === undefined) {
      nullFields.push(String(field))
    }
  }

  if (missingFields.length > 0 || nullFields.length > 0) {
    const errors: string[] = []

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`)
    }

    if (nullFields.length > 0) {
      errors.push(`Required fields are null/undefined: ${nullFields.join(', ')}`)
    }

    throw new Error(
      `Validation failed for table "${tableName}":\n` +
      errors.join('\n') +
      `\n\nReceived data:\n${JSON.stringify(data, null, 2)}`
    )
  }
}

/**
 * Example usage:
 *
 * // In your repository:
 * async create(data: NewPosition) {
 *   // Validate first
 *   validateRequiredFields(data, [
 *     'name',
 *     'departmentId',
 *     'compRangeMin',
 *     'compRangeMax',
 *     'compRangeInterval',
 *     'compRangeCurrency'
 *   ], 'positions')
 *
 *   // Then insert with better error handling
 *   return debugDbOperation(
 *     () => drizzle.insert(positions).values(data).returning(),
 *     { table: 'positions', operation: 'create', data }
 *   )
 * }
 */
