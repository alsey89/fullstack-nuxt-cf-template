import { drizzle } from "drizzle-orm/d1";
import { isNull, SQL } from "drizzle-orm";
import * as schema from "#server/database/schema";

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
   * Helper to add soft delete filter to queries
   * Returns a SQL condition that checks if deletedAt is NULL
   *
   * @example
   * // Single condition
   * .where(this.notDeleted(schema.users))
   *
   * // Multiple conditions
   * .where(and(
   *   eq(schema.users.email, email),
   *   this.notDeleted(schema.users)
   * ))
   */
  protected notDeleted<T extends { deletedAt: any }>(table: T): SQL {
    return isNull(table.deletedAt);
  }
}