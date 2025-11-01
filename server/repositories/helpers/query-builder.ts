import {
  SQL,
  and,
  isNull,
  or,
  like,
  gte,
  lte,
  count as drizzleCount,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * QueryHelpers - Centralized query building utilities
 * Single source of truth for common query patterns
 *
 * @example
 * // Soft delete filtering
 * QueryHelpers.notDeleted(users, eq(users.id, userId))
 *
 * @example
 * // Multi-column search
 * QueryHelpers.search([users.name, users.email], searchTerm)
 *
 * @example
 * // Paginated results
 * const total = await db.select({ count: count() }).from(users).where(condition)
 * return QueryHelpers.paginated(baseQuery, total[0].count, { page: 1, limit: 10 })
 */
export class QueryHelpers {
  /**
   * Filter out soft-deleted records
   * Combines deletedAt IS NULL with additional conditions
   *
   * @param table - The table with deletedAt column
   * @param additionalConditions - Optional conditions to AND together
   * @returns SQL condition combining notDeleted + additional conditions
   *
   * @example
   * // Simple usage
   * .where(QueryHelpers.notDeleted(users))
   *
   * @example
   * // With conditions
   * .where(QueryHelpers.notDeleted(users, eq(users.id, userId)))
   *
   * @example
   * // Multiple conditions
   * .where(QueryHelpers.notDeleted(
   *   users,
   *   eq(users.isActive, true),
   *   eq(users.role, 'ADMIN')
   * ))
   */
  static notDeleted<T extends { deletedAt: any }>(
    table: T,
    ...additionalConditions: (SQL | undefined)[]
  ): SQL {
    const validConditions = additionalConditions.filter(
      (c): c is SQL => c !== undefined
    );
    return and(isNull(table.deletedAt), ...validConditions)!;
  }

  /**
   * Multi-column text search
   * Searches across multiple columns with LIKE %term% (OR condition)
   *
   * @param columns - Array of columns to search
   * @param searchTerm - Search term to look for
   * @returns SQL OR condition, or undefined if searchTerm is empty
   *
   * @example
   * // Search across name and email
   * const searchCondition = QueryHelpers.search(
   *   [users.name, users.email],
   *   'john'
   * )
   * .where(QueryHelpers.notDeleted(users, searchCondition))
   */
  static search(
    columns: SQLiteColumn[],
    searchTerm?: string
  ): SQL | undefined {
    if (!searchTerm || searchTerm.trim() === "") return undefined;

    const term = `%${searchTerm.trim()}%`;
    const conditions = columns.map((col) => like(col, term));

    return or(...conditions);
  }

  /**
   * Date range filter
   * Filters column between start and end dates (inclusive)
   *
   * @param column - The date column to filter
   * @param start - Start date (inclusive)
   * @param end - End date (inclusive)
   * @returns SQL condition, or undefined if both start and end are missing
   *
   * @example
   * // Filter by date range
   * const dateCondition = QueryHelpers.dateRange(
   *   users.createdAt,
   *   new Date('2024-01-01'),
   *   new Date('2024-12-31')
   * )
   * .where(QueryHelpers.notDeleted(users, dateCondition))
   *
   * @example
   * // Only start date (all records after)
   * QueryHelpers.dateRange(users.createdAt, startDate)
   */
  static dateRange(
    column: SQLiteColumn,
    start?: Date | string,
    end?: Date | string
  ): SQL | undefined {
    const conditions: SQL[] = [];

    if (start) {
      conditions.push(gte(column, start));
    }
    if (end) {
      conditions.push(lte(column, end));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Execute paginated query with total count
   * Returns standardized pagination response
   *
   * @param baseQuery - The drizzle query to paginate (without limit/offset)
   * @param totalCount - Total number of records matching the query
   * @param options - Pagination options (page, limit)
   * @returns Object with data, total, pages, page, limit
   *
   * @example
   * // Standard pagination
   * const condition = QueryHelpers.notDeleted(users)
   * const baseQuery = db.select().from(users).where(condition)
   * const [{ count: total }] = await db
   *   .select({ count: drizzleCount() })
   *   .from(users)
   *   .where(condition)
   *
   * return QueryHelpers.paginated(baseQuery, total, { page: 1, limit: 10 })
   * // Returns: { data: [...], total: 150, pages: 15, page: 1, limit: 10 }
   */
  static async paginated<T>(
    baseQuery: any,
    totalCount: number,
    options: {
      page: number;
      limit: number;
    }
  ): Promise<{
    data: T[];
    total: number;
    pages: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const data = await baseQuery.limit(limit).offset(offset);

    return {
      data,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      page,
      limit,
    };
  }

  /**
   * Active records filter (not deleted AND isActive = true)
   * Common pattern for filtering active, non-deleted records
   *
   * @param table - The table with deletedAt and isActive columns
   * @param additionalConditions - Optional conditions to AND together
   * @returns SQL condition
   *
   * @example
   * .where(QueryHelpers.activeOnly(users))
   */
  static activeOnly<T extends { deletedAt: any; isActive?: any }>(
    table: T,
    ...additionalConditions: (SQL | undefined)[]
  ): SQL | undefined {
    const conditions: (SQL | undefined)[] = [isNull(table.deletedAt)];

    // Only add isActive check if the column exists
    if (table.isActive !== undefined) {
      conditions.push(table.isActive as unknown as SQL);
    }

    conditions.push(...additionalConditions);

    const validConditions = conditions.filter(
      (c): c is SQL => c !== undefined
    );
    return and(...validConditions);
  }
}
