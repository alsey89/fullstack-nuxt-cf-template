import { text, integer, sqliteTable, index } from "drizzle-orm/sqlite-core";

/**
 * Base fields for all entities
 * Per-tenant database architecture - no companyId needed
 * Each database represents a single tenant
 */
export const baseFields = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
};

// ========================================
// MIGRATION STATE TRACKING
// ========================================
// Tracks migration history with Time Travel bookmarks for rollback
// ========================================

export const migrations = sqliteTable(
  "_migrations",
  {
    id: text("id").primaryKey(), // e.g., "0003_add_idempotency"
    hash: text("hash").notNull(), // SHA-256 of migration SQL
    appliedAt: integer("applied_at", { mode: "timestamp" }).notNull(),
    appliedBy: text("applied_by"), // "github-actions" or "developer@email.com"
    rolledBackAt: integer("rolled_back_at", { mode: "timestamp" }),
    timeravelBookmark: text("timetravel_bookmark"), // D1 bookmark before migration
    status: text("status", {
      enum: ["PENDING", "APPLIED", "FAILED", "ROLLED_BACK"],
    }).notNull(),
    errorMessage: text("error_message"),
    environment: text("environment", {
      enum: ["local", "staging", "production"],
    }).notNull(),
  },
  (table) => ({
    statusIdx: index("migrations_status_idx").on(table.status),
    envIdx: index("migrations_env_idx").on(table.environment),
    appliedAtIdx: index("migrations_applied_at_idx").on(table.appliedAt),
  })
);

export type Migration = typeof migrations.$inferSelect;
export type NewMigration = typeof migrations.$inferInsert;
