import { drizzle } from "drizzle-orm/d1";
import {
  isNull,
  SQL,
  eq,
  ne,
  like,
  inArray,
  gt,
  gte,
  lt,
  lte,
  isNotNull,
  and,
  or,
  asc,
  desc,
  count,
} from "drizzle-orm";
import * as schema from "#server/database/schema";
import type { Filter, SortOrder } from "#server/types/api";
import { QueryHelpers } from "#server/repositories/helpers/query-builder";

/**
 * Base repository class with soft delete support
 * Provides database connection and common utilities
 */
export class BaseRepository {
  protected drizzle: ReturnType<typeof drizzle>;

  constructor(protected db: D1Database) {
    this.drizzle = drizzle(db, { schema });
  }

  /**
   * Build a SQL filter condition from a Filter object
   */
  protected buildFilterCondition(table: any, filter: Filter): SQL | undefined {
    const column = table[filter.field];
    if (!column) {
      return undefined;
    }

    switch (filter.operator) {
      case "eq":
        return eq(column, filter.value);
      case "ne":
        return ne(column, filter.value);
      case "like":
        // Raw LIKE - user controls wildcards
        return like(column, filter.value);
      case "contains":
        // Auto-wrap with % for "contains" behavior
        return like(column, `%${filter.value}%`);
      case "startsWith":
        // Auto-append % for "starts with" behavior
        return like(column, `${filter.value}%`);
      case "endsWith":
        // Auto-prepend % for "ends with" behavior
        return like(column, `%${filter.value}`);
      case "in":
        return inArray(column, Array.isArray(filter.value) ? filter.value : [filter.value]);
      case "gt":
        return gt(column, filter.value);
      case "gte":
        return gte(column, filter.value);
      case "lt":
        return lt(column, filter.value);
      case "lte":
        return lte(column, filter.value);
      case "isNull":
        return isNull(column);
      case "notNull":
        return isNotNull(column);
      default:
        return undefined;
    }
  }

  /**
   * Build multiple filter conditions and combine with AND
   */
  protected buildFilters(table: any, filters: Filter[]): SQL | undefined {
    const conditions = filters
      .map((filter) => this.buildFilterCondition(table, filter))
      .filter((condition): condition is SQL => condition !== undefined);

    if (conditions.length === 0) {
      return undefined;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return and(...conditions);
  }

  /**
   * Build sorting for a query
   */
  protected buildSort(table: any, sortBy?: string, sortOrder: SortOrder = "asc") {
    if (!sortBy) {
      return undefined;
    }

    const column = table[sortBy];
    if (!column) {
      return undefined;
    }

    return sortOrder === "asc" ? asc(column) : desc(column);
  }

  /**
   * Count records with optional filters
   */
  protected async countRecords(
    table: any,
    baseConditions?: SQL,
    filters?: Filter[]
  ): Promise<number> {
    const conditions: SQL[] = [];

    if (baseConditions) {
      conditions.push(baseConditions);
    }

    if (filters && filters.length > 0) {
      const filterCondition = this.buildFilters(table, filters);
      if (filterCondition) {
        conditions.push(filterCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await this.drizzle
      .select({ count: count() })
      .from(table)
      .where(whereClause);

    return result[0]?.count || 0;
  }
}