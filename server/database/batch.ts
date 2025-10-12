// ========================================
// D1 BATCH OPERATIONS (ATOMIC)
// ========================================
// D1's batch API executes multiple statements atomically:
// - All statements succeed together
// - If any fails, all are rolled back
// - Max 100 statements per batch
//
// Use cases:
// - Creating multiple related records
// - Updating multiple records consistently
// - Delete cascades with audit logging
// ========================================

/**
 * Execute statements in an atomic batch
 *
 * @param db - D1 database instance
 * @param statements - Array of prepared statements (max 100)
 * @returns Array of results for each statement
 *
 * @throws {Error} If more than 100 statements provided
 *
 * @example
 * const result = await executeBatch(db, [
 *   db.prepare('INSERT INTO users VALUES (?, ?)').bind('1', 'John'),
 *   db.prepare('INSERT INTO posts VALUES (?, ?)').bind('1', '1'),
 * ])
 */
export async function executeBatch(
  db: D1Database,
  statements: D1PreparedStatement[]
): Promise<D1Result[]> {
  if (statements.length === 0) {
    return [];
  }

  if (statements.length > 100) {
    throw new Error(
      `D1 batch limit is 100 statements, got ${statements.length}`
    );
  }

  return db.batch(statements);
}

/**
 * Create batch insert statements
 *
 * @param db - D1 database instance
 * @param table - Table name
 * @param records - Array of records to insert
 * @returns Array of prepared statements
 *
 * @example
 * const statements = createBatchInserts(db, 'users', [
 *   { id: '1', name: 'John' },
 *   { id: '2', name: 'Jane' },
 * ])
 * await executeBatch(db, statements)
 */
export function createBatchInserts(
  db: D1Database,
  table: string,
  records: Record<string, any>[]
): D1PreparedStatement[] {
  return records.map((record) => {
    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map(() => "?").join(", ");

    const sql = `INSERT INTO ${table} (${keys.join(
      ", "
    )}) VALUES (${placeholders})`;
    return db.prepare(sql).bind(...values);
  });
}

/**
 * Create batch update statements
 *
 * @param db - D1 database instance
 * @param table - Table name
 * @param updates - Array of update operations with where clause and set values
 * @returns Array of prepared statements
 *
 * @example
 * const statements = createBatchUpdates(db, 'users', [
 *   { where: { id: '1' }, set: { name: 'John Updated' } },
 *   { where: { id: '2' }, set: { name: 'Jane Updated' } },
 * ])
 * await executeBatch(db, statements)
 */
export function createBatchUpdates(
  db: D1Database,
  table: string,
  updates: Array<{ where: Record<string, any>; set: Record<string, any> }>
): D1PreparedStatement[] {
  return updates.map(({ where, set }) => {
    const setClause = Object.keys(set)
      .map((k) => `${k} = ?`)
      .join(", ");
    const whereClause = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return db.prepare(sql).bind(...Object.values(set), ...Object.values(where));
  });
}

/**
 * Create batch delete statements
 *
 * @param db - D1 database instance
 * @param table - Table name
 * @param conditions - Array of where conditions for deletion
 * @returns Array of prepared statements
 *
 * @example
 * const statements = createBatchDeletes(db, 'users', [
 *   { id: '1' },
 *   { id: '2' },
 * ])
 * await executeBatch(db, statements)
 */
export function createBatchDeletes(
  db: D1Database,
  table: string,
  conditions: Record<string, any>[]
): D1PreparedStatement[] {
  return conditions.map((where) => {
    const whereClause = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return db.prepare(sql).bind(...Object.values(where));
  });
}

/**
 * Batch builder for fluent API
 *
 * @example
 * const builder = new BatchBuilder(db)
 * builder
 *   .add(db.prepare('INSERT INTO users VALUES (?, ?)').bind('1', 'John'))
 *   .add(db.prepare('INSERT INTO posts VALUES (?, ?)').bind('1', '1'))
 * await builder.execute()
 */
export class BatchBuilder {
  private statements: D1PreparedStatement[] = [];

  constructor(private db: D1Database) {}

  /**
   * Add a prepared statement to the batch
   */
  add(statement: D1PreparedStatement): this {
    this.statements.push(statement);
    return this;
  }

  /**
   * Execute all statements atomically
   */
  async execute(): Promise<D1Result[]> {
    return executeBatch(this.db, this.statements);
  }

  /**
   * Get the number of statements in the batch
   */
  get length(): number {
    return this.statements.length;
  }

  /**
   * Clear all statements
   */
  clear(): this {
    this.statements = [];
    return this;
  }
}

/**
 * Execute a callback with a batch builder
 *
 * @example
 * await withBatch(db, async (batch) => {
 *   batch.add(db.prepare('INSERT INTO users VALUES (?, ?)').bind('1', 'John'))
 *   batch.add(db.prepare('INSERT INTO posts VALUES (?, ?)').bind('1', '1'))
 * })
 */
export async function withBatch<T = void>(
  db: D1Database,
  callback: (batch: BatchBuilder) => Promise<T> | T
): Promise<T> {
  const builder = new BatchBuilder(db);
  const result = await callback(builder);
  await builder.execute();
  return result;
}
