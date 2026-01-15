import {
  SQL,
  and,
  isNull,
  or,
  like,
  gte,
  lte,
  eq,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * Query Conditions - Composable query condition builders
 *
 * USAGE PATTERN: Build conditions as a flat array, combine at the end
 *
 * @example
 * const conditions = [
 *   Conditions.notDeleted(schema.projects),
 *   Conditions.workspaceScoped(schema.projects, workspaceId),
 *   Conditions.search([schema.projects.name], searchTerm),
 *   status ? eq(schema.projects.status, status) : undefined,
 * ];
 *
 * return db.select()
 *   .from(schema.projects)
 *   .where(and(...conditions.filter(Boolean)));
 *
 * BENEFITS:
 * - Flat structure - no nesting confusion
 * - Each condition is independent and composable
 * - Easy to add custom conditions inline
 * - undefined values naturally filtered out with filter(Boolean)
 * - Works perfectly with Drizzle's SQL primitives
 */
export const Conditions = {
  /**
   * Filter out soft-deleted records
   * Returns: deletedAt IS NULL
   *
   * @example
   * Conditions.notDeleted(schema.users)
   */
  notDeleted<T extends { deletedAt: SQLiteColumn }>(table: T): SQL {
    return isNull(table.deletedAt);
  },

  /**
   * Workspace isolation - REQUIRED for all workspace-scoped queries
   * Returns: workspaceId = :workspaceId
   *
   * @example
   * Conditions.workspaceScoped(schema.projects, workspaceId)
   */
  workspaceScoped<T extends { workspaceId: SQLiteColumn }>(
    table: T,
    workspaceId: string
  ): SQL {
    return eq(table.workspaceId, workspaceId);
  },

  /**
   * User ownership scoping
   * Returns: userId = :userId
   *
   * @example
   * Conditions.userOwned(schema.userSettings, userId)
   */
  userOwned<T extends { userId: SQLiteColumn }>(
    table: T,
    userId: string
  ): SQL {
    return eq(table.userId, userId);
  },

  /**
   * Multi-column text search with LIKE
   * Returns: (col1 LIKE %term% OR col2 LIKE %term% OR ...)
   * Returns undefined if term is empty (for easy filtering)
   *
   * @example
   * Conditions.search([schema.users.name, schema.users.email], 'john')
   */
  search(columns: SQLiteColumn[], term?: string): SQL | undefined {
    if (!term?.trim()) return undefined;

    const pattern = `%${term.trim()}%`;
    const conditions = columns.map((col) => like(col, pattern));

    return or(...conditions);
  },

  /**
   * Date range filter (inclusive)
   * Returns: (column >= start AND column <= end)
   * Returns undefined if both start and end are missing
   *
   * @example
   * Conditions.dateRange(schema.users.createdAt, startDate, endDate)
   * Conditions.dateRange(schema.users.createdAt, startDate) // Only start
   */
  dateRange(
    column: SQLiteColumn,
    start?: Date | string,
    end?: Date | string
  ): SQL | undefined {
    const parts: SQL[] = [];

    if (start) parts.push(gte(column, start));
    if (end) parts.push(lte(column, end));

    return parts.length > 0 ? and(...parts) : undefined;
  },

  /**
   * Active records filter (not deleted AND isActive = true)
   *
   * @example
   * Conditions.activeOnly(schema.users)
   */
  activeOnly<T extends { deletedAt: SQLiteColumn; isActive: SQLiteColumn }>(
    table: T
  ): SQL {
    return and(isNull(table.deletedAt), eq(table.isActive, true))!;
  },

  /**
   * Combine multiple conditions with AND
   * Filters out undefined/null values automatically
   *
   * @example
   * Conditions.all(
   *   Conditions.notDeleted(schema.users),
   *   Conditions.workspaceScoped(schema.users, workspaceId),
   *   maybeCondition
   * )
   */
  all(...conditions: (SQL | undefined | null)[]): SQL | undefined {
    const valid = conditions.filter((c): c is SQL => c != null);
    return valid.length > 0 ? and(...valid) : undefined;
  },

  /**
   * Combine multiple conditions with OR
   * Filters out undefined/null values automatically
   *
   * @example
   * Conditions.any(
   *   eq(schema.users.role, 'admin'),
   *   eq(schema.users.role, 'manager')
   * )
   */
  any(...conditions: (SQL | undefined | null)[]): SQL | undefined {
    const valid = conditions.filter((c): c is SQL => c != null);
    return valid.length > 0 ? or(...valid) : undefined;
  },
};

/**
 * Helper to filter and combine conditions
 * Use when you want explicit control over the combination
 *
 * @example
 * const conditions = [
 *   Conditions.notDeleted(schema.users),
 *   searchTerm ? Conditions.search([schema.users.name], searchTerm) : undefined,
 * ];
 * .where(combineConditions(conditions))
 */
export function combineConditions(
  conditions: (SQL | undefined | null)[]
): SQL | undefined {
  return Conditions.all(...conditions);
}
