# Database Migrations

Guide for managing database migrations with Drizzle ORM and Cloudflare D1.

---

## 🏗️ Overview

This template uses:
- **Drizzle ORM** for schema definition and type safety
- **Drizzle Kit** for generating SQL migrations
- **Wrangler** for applying migrations to D1 databases

---

## 🔄 Migration Workflow

### **Development Flow:**

```
1. Edit Schema
   ├─ Modify: server/database/schema/*.ts
   └─ Define tables, columns, indexes

2. Generate Migration
   ├─ Run: npm run db:generate
   └─ Creates SQL migration file

3. Test Locally
   ├─ Run: npm run db:migrate
   └─ Applies to local D1 database

4. Deploy to Production
   ├─ Run migration via wrangler
   └─ Test application
```

---

## 🚀 Commands

### **1. Generate Migration:**
```bash
npm run db:generate
```
Creates a new migration file in `server/database/migrations/` based on schema changes.

### **2. Apply Migrations Locally:**
```bash
npm run db:migrate
```
Applies all pending migrations to your local D1 database.

### **3. Apply Migrations to Production:**
```bash
# Apply specific migration file
wrangler d1 execute YOUR_DATABASE_NAME --file=server/database/migrations/0001_migration_name.sql

# Or apply all migrations
wrangler d1 migrations apply YOUR_DATABASE_NAME
```

### **4. Check Migration Status:**
```bash
wrangler d1 migrations list YOUR_DATABASE_NAME
```

---

## 📝 Migration Examples

### **Add Column (Non-Breaking):**
```sql
-- Add a new optional column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Add an index
CREATE INDEX users_phone_idx ON users(phone);
```

### **Add Required Column (Two Steps):**

**Step 1: Add as optional**
```sql
ALTER TABLE users ADD COLUMN status TEXT;
```

**Step 2: Populate and make required (in app code or separate migration)**
```sql
UPDATE users SET status = 'active' WHERE status IS NULL;
-- Note: SQLite doesn't support ALTER COLUMN to add NOT NULL
-- You'll need to recreate the table if you need NOT NULL
```

### **Rename Column (Recreate Table):**

SQLite doesn't support direct column rename, so you need to recreate:

```sql
-- Create new table with correct schema
CREATE TABLE users_new (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  new_column_name TEXT,  -- Renamed column
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data
INSERT INTO users_new SELECT id, email, old_column_name, created_at, updated_at FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE INDEX users_created_at_idx ON users(created_at);
```

---

## 🔒 Using Transactions

The template includes transaction support in the BaseRepository:

```typescript
// Example: Create multiple records atomically
await baseRepo.transaction(async (tx) => {
  await tx.prepare('INSERT INTO users VALUES (...)').bind(...).run();
  await tx.prepare('INSERT INTO user_settings VALUES (...)').bind(...).run();
  // ✅ All-or-nothing: if any fails, all rollback
});
```

**Limits:**
- Maximum 100 statements per transaction
- Only works within a single API request
- BEGIN/COMMIT don't work across HTTP requests

---

## ⚠️ D1 Limitations

### **Transaction Limitations:**
- ❌ **No cross-request transactions** - BEGIN/COMMIT don't persist across API calls
- ❌ **100 statement limit** - Batch operations limited to 100 statements
- ✅ **Batch API** - Use `db.batch()` for atomic operations

### **SQLite Limitations:**
- ❌ **No ALTER COLUMN** - Can't modify column types directly
- ❌ **No DROP COLUMN** - Must recreate table to remove columns
- ❌ **No RENAME COLUMN** - Must recreate table to rename columns
- ✅ **Table Recreation** - Use CREATE TABLE AS SELECT pattern

### **Schema Changes:**
- Foreign keys are disabled by default in D1
- Indexes must be recreated when recreating tables
- AUTOINCREMENT not supported (use UUIDs instead)

---

## 📊 Checking Migration Status

### **List all databases:**
```bash
wrangler d1 list
```

### **Execute SQL query:**
```bash
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT * FROM users LIMIT 5"
```

### **Check table schema:**
```bash
wrangler d1 execute YOUR_DATABASE_NAME --command="
  SELECT sql FROM sqlite_master
  WHERE type='table' AND name='users'
"
```

---

## ✅ Best Practices

### **DO:**
- ✅ Always test migrations locally first
- ✅ Generate migrations for all schema changes (don't write SQL manually)
- ✅ Keep migrations small and focused
- ✅ Use transactions for multi-step operations
- ✅ Add indexes for frequently queried columns
- ✅ Use two-phase migrations for breaking changes
- ✅ Back up production database before major migrations

### **DON'T:**
- ❌ Edit existing migration files after they're applied
- ❌ Skip migration generation (don't modify SQL directly)
- ❌ Combine schema and data changes in one migration
- ❌ Exceed 100 statements per transaction
- ❌ Deploy untested migrations to production
- ❌ Delete migration files (they're the source of truth)

---

## 🆘 Troubleshooting

### **Migration Failed - How to Fix:**

1. **Check the error:**
   ```bash
   wrangler d1 migrations list YOUR_DATABASE_NAME
   ```

2. **Fix the migration SQL file** in `server/database/migrations/`

3. **Reapply:**
   ```bash
   wrangler d1 migrations apply YOUR_DATABASE_NAME
   ```

### **Schema Out of Sync:**

If your local schema doesn't match the database:

1. **Check current schema:**
   ```bash
   wrangler d1 execute YOUR_DATABASE_NAME --command="
     SELECT name, sql FROM sqlite_master
     WHERE type='table'
     ORDER BY name
   "
   ```

2. **Generate new migration:**
   ```bash
   npm run db:generate
   ```

3. **Review and apply:**
   ```bash
   npm run db:migrate
   ```

### **Need to Roll Back:**

D1 doesn't have built-in rollback. Options:

1. **Manual rollback** - Write a reverse migration:
   ```sql
   -- If you added a column, drop it:
   -- Note: SQLite requires table recreation to drop columns
   ```

2. **Restore from backup** - If you backed up before migration

3. **Fresh start** (development only):
   ```bash
   # Delete and recreate database
   wrangler d1 delete YOUR_DATABASE_NAME
   wrangler d1 create YOUR_DATABASE_NAME
   npm run db:migrate
   ```

---

## 🔧 Configuration

### **Database Names:**

Set in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "your-database-name"
database_id = "your-database-id"
```

### **Migration Configuration:**

Set in `drizzle.config.ts`:
```typescript
export default {
  schema: "./server/database/schema/*.ts",
  out: "./server/database/migrations",
  dialect: "sqlite",
  driver: "d1-http",
}
```

---

## 📖 Related Documentation

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

## 📚 Example: Adding OAuth Fields

Here's the complete workflow for adding new fields (like we did for OAuth):

### 1. Update Schema

Edit `server/database/schema/identity.ts`:
```typescript
export const users = sqliteTable("users", {
  // ... existing fields
  oauthProvider: text("oauth_provider"),
  oauthProviderId: text("oauth_provider_id"),
  picture: text("picture"),
});
```

### 2. Generate Migration

```bash
npm run db:generate
```

This creates `server/database/migrations/0001_add_oauth_fields.sql`:
```sql
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_provider_id TEXT;
ALTER TABLE users ADD COLUMN picture TEXT;
```

### 3. Test Locally

```bash
npm run db:migrate
npm run dev
# Test OAuth functionality
```

### 4. Deploy to Production

```bash
wrangler d1 execute YOUR_DATABASE_NAME --file=server/database/migrations/0001_add_oauth_fields.sql
```

Done! ✨
