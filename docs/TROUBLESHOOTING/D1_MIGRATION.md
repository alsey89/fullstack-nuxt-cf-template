# Cloudflare D1 Migration Troubleshooting Guide

> This document captures hard-won knowledge about D1 migration pitfalls and solutions.
> Optimized for AI assistant consumption for future troubleshooting.

## Critical D1 Behaviors

### 1. Foreign Keys Are ALWAYS Enabled

**Problem**: D1 enforces `PRAGMA foreign_keys = ON` by default and **ignores** any attempt to disable it.

```sql
-- THIS DOES NOT WORK IN D1
PRAGMA foreign_keys = OFF;  -- Silently ignored
DROP TABLE channels;        -- Will cascade delete messages!
```

**Solution**: Use `PRAGMA defer_foreign_keys = on` instead, which D1 supports:
```sql
PRAGMA defer_foreign_keys = on;  -- Defers FK checks until end of transaction
-- ... do work ...
PRAGMA defer_foreign_keys = off;
```

**BUT**: This only works within a single transaction. See next issue.

---

### 2. Wrangler Executes Each Statement Separately

**Problem**: Both `wrangler d1 migrations apply` and `wrangler d1 execute --file` split SQL by semicolons and execute each statement as a **separate transaction**.

This means:
- `PRAGMA defer_foreign_keys = on` in statement 1
- `DROP TABLE` in statement 2
- They run in different transactions, so PRAGMA has no effect!

**Evidence**: Output shows "X commands executed" not "1 batch executed"

**Solutions**:

1. **For local development**: Use `sqlite3` directly which respects PRAGMA:
   ```bash
   sqlite3 "$LOCAL_DB" <<EOF
   PRAGMA foreign_keys=OFF;
   .read migration.sql
   PRAGMA foreign_keys=ON;
   EOF
   ```

2. **For remote**: Avoid migrations that need PRAGMA protection (see below)

3. **From Workers code**: Use `db.batch([...])` which executes in single transaction

---

### 3. Drizzle Generates DROP TABLE for FK Constraint Changes

**Problem**: SQLite cannot ALTER foreign key constraints. Any change to FK behavior (like adding `onDelete: "set null"`) causes Drizzle to generate:

```sql
CREATE TABLE __new_table (...);
INSERT INTO __new_table SELECT * FROM old_table;
DROP TABLE old_table;           -- Cascades deletes!
ALTER TABLE __new_table RENAME TO old_table;
```

**Example trigger**:
```typescript
// This innocent change triggers DROP TABLE + recreate:
archivedBy: text("archived_by").references(() => users.id, {
  onDelete: "set null",  // Adding this = DROP TABLE
}),
```

**Solution**: Avoid changing FK constraints on tables with important related data, OR use the full schema reset workflow below.

---

### 4. Remote --file vs --command Behavior

**Problem**: `wrangler d1 execute --file` returns different JSON for local vs remote:

- **Local**: Returns actual row data in `results[]`
- **Remote**: Returns only summary stats (`Total queries executed`, `Rows read`, etc.)

**Impact**: Scripts using `--file --json` to fetch data will get empty results on remote.

**Solution**: Use `--command` for SELECT queries that need to return data:
```typescript
// For fetching data (works both local and remote)
const cmd = `wrangler d1 execute DB --command="SELECT * FROM ..." --json`;

// For batch updates (use file to avoid shell escaping)
const cmd = `wrangler d1 execute DB --file=updates.sql`;
```

---

## Common Scenarios & Solutions

### Scenario A: Migration Deletes Data (CASCADE)

**Symptoms**: After migration, related tables are empty (e.g., messages gone after channels recreated)

**Diagnosis**:
1. Check if migration has `DROP TABLE`
2. Check if dropped table has FK references with `ON DELETE CASCADE`

**Solution**: Use Schema Reset Workflow (see below)

---

### Scenario B: HTML to JSON Migration Script Returns 0 Rows on Remote

**Symptoms**: Script says "Found 0 rows" but data exists

**Diagnosis**: Script uses `--file --json` for SELECT queries

**Solution**: Use `--command` for SELECT queries:
```typescript
function runSqlCommand(sql: string, config: string, isRemote: boolean): string {
  const remoteFlag = isRemote ? "--remote" : "--local";
  const cmd = `npx wrangler d1 execute keystone-${config} ${remoteFlag} --command="${sql.replace(/"/g, '\\"')}" -c wrangler.${config}.jsonc --json`;
  return execSync(cmd, { encoding: "utf-8" });
}
```

---

### Scenario C: Need Fresh Schema Without Losing Data

**Full Schema Reset Workflow**:

```bash
# 1. Backup remote data
npx wrangler d1 export keystone-staging --remote --output=backup.sql -c wrangler.staging.jsonc

# 2. Clean up local migrations
rm -f server/database/migrations/*.sql
rm -rf server/database/migrations/meta
mkdir -p server/database/migrations/meta
echo '{"version":"7","dialect":"sqlite","entries":[]}' > server/database/migrations/meta/_journal.json

# 3. Generate fresh migration
npx drizzle-kit generate

# 4. Create drop script (order matters for FKs)
cat > drop-all.sql << 'EOF'
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS message_mentions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS channel_members;
-- ... all tables in reverse dependency order ...
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS d1_migrations;
PRAGMA foreign_keys=ON;
EOF

# 5. Drop all remote tables
npx wrangler d1 execute DB --remote --file=drop-all.sql -c config.jsonc

# 6. Apply fresh migration
npx wrangler d1 migrations apply DB --remote -c config.jsonc

# 7. Restore data table by table (avoids FK issues)
# Extract and import each table separately in dependency order:
for table in users permissions roles projects channels messages; do
  grep "INSERT INTO \"$table\"" backup.sql > /tmp/$table.sql
  npx wrangler d1 execute DB --remote --file=/tmp/$table.sql -c config.jsonc
done

# 8. Add any new tables not in backup
# (Extract CREATE TABLE from fresh migration if needed)

# 9. Update d1_migrations record
npx wrangler d1 execute DB --remote --command="DELETE FROM d1_migrations; INSERT INTO d1_migrations (name) VALUES ('0000_new_migration.sql');" -c config.jsonc
```

---

## Quick Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| Data deleted after migration | DROP TABLE + CASCADE FK | Schema reset workflow |
| PRAGMA foreign_keys ignored | D1 always enforces FKs | Use defer_foreign_keys (single tx only) |
| defer_foreign_keys not working | Wrangler splits statements | sqlite3 locally, avoid on remote |
| Script returns 0 rows on remote | --file doesn't return data | Use --command for SELECT |
| Migration recreates table | FK constraint changed | Don't change FK options, or schema reset |

---

## Files Reference

- `scripts/sync-remote-db-to-local.sh` - Sync remote DB to local for testing
- `scripts/migrate-html-to-json.ts` - Convert HTML content to TipTap JSON
- `server/database/migrations/` - Drizzle migrations
- `wrangler.staging.jsonc` / `wrangler.production.jsonc` - D1 configs

---

## Key Commands

```bash
# Export remote DB
npx wrangler d1 export DB_NAME --remote --output=backup.sql -c config.jsonc

# Execute SQL file
npx wrangler d1 execute DB_NAME --remote --file=script.sql -c config.jsonc

# Execute SQL command (returns data)
npx wrangler d1 execute DB_NAME --remote --command="SELECT * FROM table" -c config.jsonc

# Apply migrations
npx wrangler d1 migrations apply DB_NAME --remote -c config.jsonc

# Check migration status
npx wrangler d1 migrations list DB_NAME --remote -c config.jsonc

# Local sqlite3 access
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
```
