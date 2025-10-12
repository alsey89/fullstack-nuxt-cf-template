// ========================================
// REPOSITORY SHARED TYPES
// ========================================
// Common types for query options and pagination
// ========================================

/**
 * Query options for repository methods
 * Used to control pagination, sorting, and filtering
 */
export interface RepositoryQueryOptions {
  // Pagination
  limit?: number
  offset?: number

  // Sorting
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'

  // Filters
  includeInactive?: boolean
}

/**
 * Repository list result with pagination metadata
 * Returned by methods that fetch collections
 */
export interface RepositoryListResult<T> {
  items: T[]
  total: number
}

/**
 * Helper to create a repository list result
 */
export function createListResult<T>(items: T[], total: number): RepositoryListResult<T> {
  return {
    items,
    total,
  }
}

/**
 * Default query options
 */
export const DEFAULT_QUERY_OPTIONS: Required<RepositoryQueryOptions> = {
  limit: 100,
  offset: 0,
  orderBy: 'created_at',
  orderDirection: 'DESC',
  includeInactive: false,
}
