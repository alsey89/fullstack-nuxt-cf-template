import { text, integer } from "drizzle-orm/sqlite-core";

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
// MIGRATION TRACKING
// ========================================
// Migrations are tracked by wrangler's built-in `d1_migrations` table.
// Rollback bookmarks are logged to `server/database/operations/operations.log`
// when running production migrations via `npm run db:migrate:remote:production`.
//
// For rollback, use D1 Time Travel:
//   wrangler d1 time-travel restore <DB_NAME> --bookmark=<BOOKMARK_ID>
// ========================================
