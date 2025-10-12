# Database Migrations

Complete reference for the migration and transaction safety system.

---

## 🏗️ Architecture

### **Components Built:**

1. **D1 Batch Transactions** ([server/repositories/base.ts](../server/repositories/base.ts))
   - Atomic operations (up to 100 statements)
   - `TransactionContext` API for SQL collection
   - Auto-rollback on failure

2. **Idempotency Keys** (Migration `0003_lumpy_ultimatum.sql`)
   - `payments.idempotency_key` (unique)
   - `adjustments.idempotency_key` (indexed)
   - Prevents duplicate payment processing

3. **Migration Tracking** ([server/database/schema/base.ts](../server/database/schema/base.ts))
   - `_migrations` table tracks all migrations
   - Stores Time Travel bookmarks for rollback
   - Records status, hash, environment, errors

4. **Safe Migration Script** ([scripts/safe-migrate.ts](../scripts/safe-migrate.ts))
   - Auto-captures Time Travel bookmarks before migrations
   - Validates migration count
   - Records state in database
   - Provides rollback commands on failure

5. **CI Validation** ([.github/workflows/migrate-validation.yml](../.github/workflows/migrate-validation.yml))
   - Creates temporary D1 database on Cloudflare
   - Applies migrations automatically
   - Runs validation tests
   - **Only runs for PRs to `main` (production)**

---

## 🔄 Migration Workflow

### **Complete Flow:**

```
Local Development
  ├─ Edit: server/database/schema/*.ts
  ├─ Run: npm run db:generate
  └─ Test: npm run db:migrate:local:staging
         ↓
Staging Deployment
  ├─ Create PR → develop (NO CI)
  ├─ Manual review & merge
  ├─ Deploy: npm run db:migrate:safe:staging
  └─ Monitor for 24h
         ↓
Production Deployment
  ├─ Create PR → main (CI RUNS! ✅)
  ├─ CI validates automatically
  ├─ Wait for CI results
  └─ Deploy: npm run db:migrate:safe:production
```

### **When CI Runs:**

| PR Target | CI Runs? | Testing Method |
|-----------|----------|----------------|
| `main` (prod) | ✅ Automatic | GitHub Actions + manual |
| `develop` (staging) | ❌ No | Manual only |
| Feature branches | ❌ No | Manual only |

---

## 🚀 Commands

### **Generate Migration:**
```bash
npm run db:generate
```

### **Test Locally:**
```bash
npm run db:migrate:local:staging
npm run dev
```

### **Deploy to Staging:**
```bash
npm run db:migrate:safe:staging
# Captures bookmark, applies migrations, provides rollback command
```

### **Deploy to Production:**
```bash
npm run db:migrate:safe:production
# Asks: "Have you tested on staging?"
# Captures bookmark, applies migrations, provides rollback command
```

### **Rollback (Time Travel):**
```bash
# Get bookmark (provided by migration script)
wrangler d1 time-travel restore ppm-staging --bookmark=<BOOKMARK>

# Or restore to timestamp
wrangler d1 time-travel restore ppm-staging --timestamp="2025-01-10T14:30:00Z"
```

---

## 📝 Migration Templates

### **Add Column (Non-Breaking):**
```sql
-- 0003_add_column.sql
ALTER TABLE payments ADD COLUMN new_field TEXT;
CREATE INDEX payments_new_field_idx ON payments(new_field);
```

### **Modify Column (Breaking - Use Two-Phase):**

**Phase 1: Expand (Week 1)**
```sql
-- 0004_expand_rename.sql
ALTER TABLE users ADD COLUMN new_name TEXT;
UPDATE users SET new_name = old_name WHERE new_name IS NULL;
```

**Phase 2: Contract (Week 2)**
```sql
-- 0005_contract_rename.sql
-- SQLite requires table recreation to drop columns
CREATE TABLE users_new AS
  SELECT id, company_id, new_name, email, created_at, updated_at
  FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
CREATE INDEX users_company_idx ON users(company_id);
```

---

## 🔒 Using Transactions

### **Before (Unsafe):**
```typescript
await paymentRepo.create(payment)
await adjustmentRepo.create(adjustment1)
await adjustmentRepo.create(adjustment2)
// ❌ If adjustment2 fails, payment & adjustment1 are committed
```

### **After (Safe):**
```typescript
await paymentRepo.transaction(async (tx) => {
  await tx.prepare('INSERT INTO payments VALUES (...)').bind(...).run()
  await tx.prepare('INSERT INTO adjustments VALUES (...)').bind(...).run()
  await tx.prepare('INSERT INTO adjustments VALUES (...)').bind(...).run()
  // ✅ All-or-nothing: if any fails, all rollback
})
```

### **Idempotency Example:**
```typescript
async calculatePayment(userId: string, payPeriodId: string) {
  const key = `payment_${userId}_${payPeriodId}_${companyId}`

  // Check if already processed
  const existing = await paymentRepo.findByIdempotencyKey(key, companyId)
  if (existing?.status !== 'CALCULATED') {
    return existing // Already done
  }

  // Process with idempotency key
  return await paymentRepo.create({
    ...data,
    idempotencyKey: key,
  })
}
```

---

## ⚠️ Limitations & Gotchas

### **D1 Limitations:**
- ❌ **No multi-request transactions** - BEGIN/COMMIT don't work across API calls
- ❌ **100 statement limit** - Batch operations max 100 statements
- ❌ **30-day Time Travel** - Only 30 days of rollback history
- ❌ **No DROP COLUMN** - SQLite requires table recreation

### **SQLite Quirks:**
- Table recreation needed to drop columns
- Foreign keys disabled by default in D1
- No `ALTER TABLE ALTER COLUMN` support

---

## 🆘 Emergency Procedures

### **If Production Migration Fails:**

1. **Get rollback bookmark:**
   ```bash
   # From migration output, or query database:
   wrangler d1 execute ppm-production --command="
     SELECT timetravel_bookmark FROM _migrations
     WHERE status='APPLIED'
     ORDER BY applied_at DESC LIMIT 1
   "
   ```

2. **Restore immediately:**
   ```bash
   wrangler d1 time-travel restore ppm-production --bookmark=<BOOKMARK>
   ```

3. **Verify:**
   ```bash
   wrangler d1 execute ppm-production --command="SELECT COUNT(*) FROM payments"
   ```

### **If Staging Migration Fails:**

1. **Check error:**
   ```bash
   wrangler d1 execute ppm-staging --command="
     SELECT * FROM _migrations
     WHERE status='FAILED'
     ORDER BY applied_at DESC LIMIT 1
   "
   ```

2. **Rollback:**
   ```bash
   wrangler d1 time-travel restore ppm-staging --bookmark=<BOOKMARK>
   ```

3. **Fix and retry:**
   ```bash
   # Fix migration SQL
   npm run db:generate
   npm run db:migrate:safe:staging
   ```

---

## 🔐 CI/CD Setup

### **Required GitHub Secrets:**

1. **Get Cloudflare API Token:**
   - https://dash.cloudflare.com/profile/api-tokens
   - Create Token → "Edit Cloudflare Workers"
   - Permissions: `D1:Edit`, `Workers:Edit`

2. **Add to GitHub:**
   - Repository → Settings → Secrets → Actions
   - Add `CLOUDFLARE_API_TOKEN`
   - Add `CLOUDFLARE_ACCOUNT_ID` (from dashboard URL)

### **CI Behavior:**

**Runs For:**
- ✅ PRs to `main` branch
- ✅ Changes to `server/database/migrations/**`
- ✅ Changes to `server/database/schema/**`

**Does NOT Run For:**
- ❌ PRs to `develop`, `staging`, feature branches
- ❌ Direct pushes
- ❌ Changes outside migration/schema

**What It Does:**
1. Creates `test-migration-<run-id>` on Cloudflare D1
2. Applies all migrations
3. Runs validation tests
4. Validates schema integrity
5. Cleans up test database
6. Comments results on PR

---

## 📊 Monitoring

### **View Migration History:**
```bash
wrangler d1 execute ppm-staging --command="
  SELECT id, status, environment, applied_at, timetravel_bookmark
  FROM _migrations
  ORDER BY applied_at DESC
  LIMIT 10
"
```

### **Check for Failed Migrations:**
```bash
wrangler d1 execute ppm-production --command="
  SELECT * FROM _migrations
  WHERE status='FAILED'
  ORDER BY applied_at DESC
"
```

### **Get Current Bookmark:**
```bash
wrangler d1 time-travel info ppm-staging
```

### **Check for Orphaned Test DBs:**
```bash
wrangler d1 list | grep test-migration
```

---

## ✅ Best Practices

### **DO:**
- ✅ Always test locally first
- ✅ Deploy to staging before production
- ✅ Monitor staging for 24h
- ✅ Use idempotency keys for critical operations
- ✅ Keep transactions under 100 statements
- ✅ Use two-phase migrations for breaking changes
- ✅ Capture Time Travel bookmarks before risky changes

### **DON'T:**
- ❌ Skip local/staging testing
- ❌ Deploy directly to production
- ❌ Combine schema + data changes in one migration
- ❌ Exceed 100 statements per transaction
- ❌ Delete Time Travel bookmarks within 30 days
- ❌ Modify production without rollback plan

---

## 📚 Schema Reference

### **Migration Tracking Table:**
```sql
CREATE TABLE _migrations (
  id TEXT PRIMARY KEY,                    -- Migration name
  hash TEXT NOT NULL,                     -- SHA-256 of SQL
  applied_at INTEGER NOT NULL,            -- Timestamp
  applied_by TEXT,                        -- User/CI
  rolled_back_at INTEGER,                 -- Rollback timestamp
  timetravel_bookmark TEXT,               -- D1 bookmark
  status TEXT NOT NULL,                   -- PENDING|APPLIED|FAILED|ROLLED_BACK
  error_message TEXT,                     -- Error details
  environment TEXT NOT NULL               -- local|staging|production
);
```

### **Idempotency Keys:**
```sql
-- Payments (unique constraint)
ALTER TABLE payments ADD COLUMN idempotency_key TEXT UNIQUE;

-- Adjustments (indexed, not unique)
ALTER TABLE adjustments ADD COLUMN idempotency_key TEXT;
```

---

## 🔧 Customization

### **Enable CI for Staging:**
Edit [.github/workflows/migrate-validation.yml](../.github/workflows/migrate-validation.yml):
```yaml
on:
  pull_request:
    branches:
      - main
      - develop  # Add this
```

### **Change Bookmark Retention:**
Note: Time Travel is 30 days (Cloudflare limitation, not configurable)

### **Add Migration Validation:**
Edit [scripts/safe-migrate.ts](../scripts/safe-migrate.ts):
```typescript
// Add custom validation
if (statements.length > 50) {
  console.warn('⚠️  Large migration detected')
}
```

---

## 📖 Related Files

- **Transaction Implementation:** [server/repositories/base.ts](../server/repositories/base.ts)
- **Migration Schema:** [server/database/schema/base.ts](../server/database/schema/base.ts)
- **Idempotency Schema:** [server/database/schema/compensation.ts](../server/database/schema/compensation.ts)
- **Safe Migration Script:** [scripts/safe-migrate.ts](../scripts/safe-migrate.ts)
- **CI Workflow:** [.github/workflows/migrate-validation.yml](../.github/workflows/migrate-validation.yml)
- **Test Suite:** [tests/migrations/idempotency.test.ts](../tests/migrations/idempotency.test.ts)
