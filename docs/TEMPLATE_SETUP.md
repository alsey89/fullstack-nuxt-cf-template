# 🚀 Template Setup Guide

This guide walks you through setting up the Cloudflare Full-Stack Template for your new project.

> **Related Documentation:**
> - [CLAUDE.md](CLAUDE.md) - Development quick reference
> - [CONVENTIONS.md](CONVENTIONS.md) - Coding conventions and patterns
> - [RBAC.md](RBAC.md) - Role-based access control setup
> - [SECURITY.md](SECURITY.md) - Security considerations
> - [MIGRATIONS.md](MIGRATIONS.md) - Database migration guide
> - [SECRETS.md](SECRETS.md) - Managing secrets and environment variables

## 📋 Pre-Setup Checklist

- [ ] Cloudflare account created
- [ ] Node.js 18+ installed
- [ ] wrangler CLI installed: `npm install -g wrangler`
- [ ] Authenticated with Cloudflare: `wrangler auth login`

## 🎯 Step-by-Step Setup

### 1. Clone and Initialize

```bash
# Clone the template
git clone <your-template-repo> my-new-project
cd my-new-project

# Remove template git history
rm -rf .git
git init
git add .
git commit -m "Initial commit from template"

# Install dependencies
npm install
```

### 2. Project Configuration

Update project-specific settings:

```bash
# Update package.json
# Change "name" from "cf-fullstack-template" to your project name
```

**Files to update (look for TODO comments in each file):**
- `package.json` - Project name and description
- `wrangler.staging.jsonc` - App name and database name (see TODO comments)
- `wrangler.production.jsonc` - App name and database name (see TODO comments)
- `nuxt.config.ts` - PWA manifest (name, short_name, description)
- `server/database/seed.ts` - Company data for seeding (see TODO comments)
- `bruno/` - API collection for testing (already cleaned)

### 2.1. Configure Multitenancy

The template defaults to **Single-Tenant Mode** for easier setup. Choose your preferred mode:

**Single-Tenant Mode (Default):**
- ✅ One organization per deployment
- ✅ One D1 database for all data
- ✅ No subdomain or tenant headers required
- ✅ Simplified setup and deployment
- ✅ Perfect for internal tools, single-company apps

**Multi-Tenant Mode (Optional):**
- ⚙️ Separate D1 database per tenant (manual provisioning required)
- ⚙️ Each tenant requires wrangler binding: `DB_<TENANT>`
- ⚙️ Tenant ID passed via `x-tenant-id` header in API requests
- ⚙️ Physical data isolation at infrastructure level
- Perfect for SaaS applications serving multiple organizations

**To enable multi-tenant mode:**
```bash
# In .dev.vars for development
NUXT_MULTITENANCY_ENABLED=true
```

**Multi-tenant tenant provisioning (MANUAL PROCESS):**

For each new tenant, you must:

1. **Create a D1 database:**
```bash
# Example for tenant "acme"
wrangler d1 create acme-db
# Note the database_id from output
```

2. **Add binding to wrangler config:**
```jsonc
// wrangler.production.jsonc
{
  "d1_databases": [
    {
      "binding": "DB_ACME",  // Must match pattern DB_<TENANT_UPPER>
      "database_name": "acme-db",
      "database_id": "xxx-yyy-zzz"  // From step 1
    }
  ]
}
```

3. **Run migrations for the tenant database:**
```bash
# Apply schema to tenant database
wrangler d1 migrations apply acme-db --remote
```

4. **Seed tenant database (optional):**
```bash
# You'll need to create a custom seed script for tenant databases
# The built-in seed.ts only works for local development
```

5. **Configure tenant in your application:**
   - Store tenant metadata (tenant ID, name, DB binding name) in your system
   - Clients must pass `x-tenant-id: acme` header in requests
   - Middleware will resolve to `DB_ACME` binding automatically

**Important Notes:**
- Tenant provisioning is **manual** - no auto-provisioning API provided
- Each tenant requires its own D1 database and wrangler binding
- Plan your tenant onboarding workflow accordingly
- Consider tenant limits based on Cloudflare's D1 database limits

### 2.3. Security: Tenant Isolation

**Built-in Protection:**
The template automatically prevents cross-tenant access through:

1. **Session Binding**: User sessions are bound to the tenant where they authenticated
   - Sessions from Tenant A cannot be used on Tenant B
   - Automatic validation in authentication middleware ([server/middleware/02.auth.ts:33-40](../server/middleware/02.auth.ts#L33-L40))
   - Returns "Session tenant mismatch" error if tenants don't match

2. **Token Binding**: JWT tokens (email confirmation, password reset) include tenant validation
   - Tokens generated for Tenant A won't work on Tenant B
   - Prevents token replay attacks across tenants
   - Implemented in [server/lib/auth.ts](../server/lib/auth.ts)

3. **Single-Tenant Mode**: Even in single-tenant mode, sessions use `tenantId="default"`
   - Makes code mode-agnostic (no conditional logic needed)
   - Safe migration path if you enable multi-tenancy later
   - All security checks work identically in both modes

**How It Works:**
```typescript
// User signs in to Tenant A
await setUserSession(event, {
  user: { id: '123', email: 'user@example.com' },
  tenantId: 'acme', // Bound to tenant context
  permissions: ['users:view'],
  // ...
});

// User tries to access Tenant B with Tenant A's session
// Middleware automatically validates:
if (session.tenantId !== event.context.tenantId) {
  throw new AuthenticationError("Session tenant mismatch");
}
// ❌ Request rejected - session is from different tenant
```

**⚠️ Important: Mode Migration**
Changing from single-tenant to multi-tenant mode (or vice versa) requires:
- **Data migration** to move users/data between databases
- **Session invalidation** - all users must sign in again
- **Token invalidation** - all pending email/reset tokens will fail

**Recommendation:** Choose your tenancy mode carefully before production deployment. There is no automatic migration path between modes.

### 2.4. Configure RBAC (Optional)

The template includes **Role-Based Access Control (RBAC)** enabled by default:

**RBAC Enabled (Default):**
- ✅ Enterprise-grade permission system
- ✅ Wildcard permissions: `*`, `users:*`, `roles:*`
- ✅ 3 system roles: admin, manager, user
- ✅ Multiple roles per user
- ✅ Full REST API for role management

**To disable RBAC (for simple apps):**
```bash
# In .dev.vars - allows all actions
NUXT_RBAC_ENABLED=false
```

See [docs/RBAC.md](RBAC.md) for complete RBAC guide.

### 3. Environment Setup

```bash
# Copy the provided environment template
cp .dev.vars.example .dev.vars

# Edit with your values (or use defaults for quick start)
nano .dev.vars
```

**Quick Start**: The example file includes working defaults for local development!

Required variables:
```env
# Development database (auto-created)
NODE_ENV=development
ENVIRONMENT=development

# Session secret (REQUIRED - generate with: openssl rand -base64 64)
NUXT_SESSION_PASSWORD=your-64-char-random-string

# Email provider settings
EMAIL_PROVIDER=resend  # or "postmark"
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM=noreply@yourdomain.com

# Optional: Cloudflare Turnstile (bot protection)
NUXT_TURNSTILE_SITE_KEY=your-turnstile-site-key
NUXT_TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

### 4. Database Setup

```bash
# Create staging database
wrangler d1 create your-project-staging

# Update wrangler.staging.jsonc with returned database_id

# Create production database
wrangler d1 create your-project-production

# Update wrangler.production.jsonc with returned database_id

# Generate initial migration
npm run db:generate

# Apply migrations locally
npm run db:migrate:local:staging

# Seed with sample data (includes 3 default roles: admin, manager, user)
npm run db:reset
```

**Seed includes:**
- 3 system roles (admin, manager, user) with permissions
- 14 permission codes with wildcards
- 3 test user accounts with role assignments

### 5. Customize Company Data

Edit the seeding data in `server/database/seed.ts`:

```typescript
// Update company metadata (single record per database)
const [companyMetadata] = await drizzleDb
  .insert(schema.companyMetadata)
  .values({
    id: "default",                   // Always "default" for per-tenant architecture
    name: "Your Company Name",       // Your company name
    email: "info@yourcompany.com",   // Your contact email
    // ... update other company details
  })
```

### 6. Branding and UI

**Update brand colors in `tailwind.config.ts`:**
```typescript
theme: {
  extend: {
    colors: {
      primary: {
        // Update with your brand colors
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
    },
  },
},
```

**Update app metadata in `nuxt.config.ts`:**
```typescript
app: {
  head: {
    title: "Your App Name",
    meta: [
      { name: "description", content: "Your app description" }
    ]
  }
}
```

### 7. Start Development

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
```

**Single-Tenant Mode (Default):**
- ✅ Access directly at http://localhost:3000
- ✅ No tenant headers or subdomains required
- ✅ Ready to use immediately

**Multi-Tenant Mode (if enabled):**
- Use tenant header: `x-tenant-id: development`
- Or use subdomain: `development.localhost:3000`

### 8. Test Authentication

Login with default accounts (each with different RBAC permissions):

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@test.com | testtesttest | `*` (all permissions) |
| Manager | manager@test.com | testtesttest | `users:view`, `users:update`, `company:*` |
| User | user@test.com | testtesttest | `company:view` (read-only) |

### 9. Deploy to Staging

```bash
# Set staging secrets
wrangler secret put NUXT_SESSION_PASSWORD --env staging
wrangler secret put EMAIL_API_KEY --env staging
wrangler secret put EMAIL_FROM --env staging
wrangler secret put EMAIL_PROVIDER --env staging

# Deploy database
npm run db:migrate:safe:staging

# Deploy application
wrangler deploy --env staging
```

### 10. Deploy to Production

```bash
# Set production secrets (use different values!)
wrangler secret put NUXT_SESSION_PASSWORD --env production
wrangler secret put EMAIL_API_KEY --env production
wrangler secret put EMAIL_FROM --env production
wrangler secret put EMAIL_PROVIDER --env production

# Deploy database
npm run db:migrate:safe:production

# Deploy application
wrangler deploy --env production
```

## 🎨 Customization Guide

### Adding New Database Tables

1. **Create schema file:**
   ```bash
   # Create new schema file
   touch server/database/schema/your-domain.ts
   ```

2. **Define your tables:**
   ```typescript
   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
   import { baseFields } from './base'

   export const yourTable = sqliteTable('your_table', {
     ...baseFields, // Includes id, createdAt, updatedAt, deletedAt
     // ... your fields
     name: text('name').notNull(),
     description: text('description'),
   })
   ```

   **Note:** No `companyId` needed - each tenant has separate database!

3. **Export from main schema:**
   ```typescript
   // In server/database/schema.ts
   export * from './schema/your-domain'
   ```

4. **Generate migration:**
   ```bash
   npm run db:generate
   ```

### Adding New API Routes

1. **Create route file:**
   ```typescript
   // server/api/v1/your-resource/index.get.ts
   import { requirePermission } from '~/server/services/rbac'

   export default defineEventHandler(async (event) => {
     // Check RBAC permission (if enabled)
     await requirePermission(event, 'your-resource:view')

     const service = createYourService(event)
     const data = await service.getData()
     return createSuccessResponse('Success', data)
   })
   ```

2. **Follow the patterns:**
   - Use service layer for business logic
   - Repository layer for database access
   - Add RBAC checks with `requirePermission()`
   - Validate inputs with Zod schemas
   - Return standardized responses

### Adding New Services

1. **Create service file:**
   ```typescript
   // server/services/your-service.ts
   import { getDatabase } from '~/server/utils/multitenancy'

   export class YourService {
     private readonly db: D1Database

     constructor(
       private readonly event: H3Event,
       private readonly yourRepo: YourRepository
     ) {
       // Get tenant-specific database from context
       this.db = getDatabase(event)
     }

     async getData() {
       // Database is already tenant-scoped - no companyId needed!
       return this.yourRepo.findAll()
     }
   }
   ```

2. **Create factory function:**
   ```typescript
   export function createYourService(event: H3Event): YourService {
     const db = getDatabase(event)
     return new YourService(event, new YourRepository(db))
   }
   ```

### Customizing RBAC Permissions

1. **Add new permission codes to schema:**
   ```typescript
   // In server/database/schema/identity.ts
   export type PermissionCode =
     | 'users:view' | 'users:create' | 'users:update' | 'users:delete' | 'users:*'
     | 'your-resource:view' | 'your-resource:create' | 'your-resource:*'  // Add your permissions
     | '*'
   ```

2. **Add to seed data:**
   ```typescript
   // In server/database/seed.ts
   const permissionCodes = [
     { code: "your-resource:view", name: "View Your Resource", category: "YOUR_RESOURCE" },
     { code: "your-resource:create", name: "Create Your Resource", category: "YOUR_RESOURCE" },
     { code: "your-resource:*", name: "All Your Resource Permissions", category: "YOUR_RESOURCE" },
   ]
   ```

3. **Update role permissions:**
   ```typescript
   // Grant permissions to roles
   const managerRole = await drizzleDb.insert(schema.roles).values({
     name: "manager",
     permissions: ["users:view", "your-resource:*"], // JSON array
   })
   ```

See [docs/RBAC.md](RBAC.md) for complete permission management guide.

## ✅ Template Customization Checklist

Before deploying your application, customize these template defaults:

- [ ] **package.json** - Update `name` field to your project name
- [ ] **wrangler.staging.jsonc** - Update `name` and `database_name` (see TODO comments)
- [ ] **wrangler.production.jsonc** - Update `name` and `database_name` (see TODO comments)
- [ ] **nuxt.config.ts** - Update PWA manifest: `name`, `short_name`, `description`
- [ ] **server/database/seed.ts** - Update company data (name, email, etc.)
- [ ] **.dev.vars** - Copy from `.dev.vars.example` and set secrets
- [ ] **README.md** - Replace template README with your project README

## 🚨 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated new session secrets for each environment
- [ ] Configured proper CORS settings
- [ ] Set up Cloudflare Turnstile (optional but recommended)
- [ ] Reviewed permission assignments
- [ ] Tested multi-tenant isolation (if enabled)
- [ ] Configured proper email settings

## 🔍 Testing Your Setup

```bash
# Run full test suite
npm test
```

### Test Authentication Flow

**Multi-Tenant Mode:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: development" \
  -d '{"email":"admin@test.com","password":"testtesttest"}'

# Verify multi-tenancy
# Try accessing with wrong tenant ID - should fail
```

**Single-Tenant Mode (Current Default):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testtesttest"}'

# No tenant header required
```

## 🆘 Troubleshooting

**Database connection issues:**
- Verify wrangler is authenticated: `wrangler auth list`
- Check database IDs in wrangler config files
- Ensure migrations are applied

**Authentication problems:**
- Verify session secret is set
- Check tenant ID header/subdomain
- Confirm user exists in database

**Build failures:**
- Clear `.nuxt` and `node_modules`: `rm -rf .nuxt node_modules && npm install`
- Check TypeScript errors: `npx nuxi typecheck`

## 📚 Next Steps

1. **Read the architecture docs**: [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
2. **Implement your domain logic**: Add your specific business features
3. **Customize the UI**: Update components and pages for your brand
4. **Set up monitoring**: Add logging and error tracking
5. **Configure CI/CD**: Set up automated deployments

## 💡 Tips

- **No `companyId` needed** - Per-tenant database architecture handles isolation
- Use `getDatabase(event)` to get tenant-specific database
- Add RBAC checks with `requirePermission()` for protected routes
- Use the service layer pattern for business logic
- Validate all inputs with Zod schemas
- Follow the error handling patterns
- Test with multiple roles to verify RBAC works correctly

## 📖 Additional Resources

- **[docs/RBAC.md](RBAC.md)** - Complete RBAC guide with examples
- **[docs/CONVENTIONS.md](CONVENTIONS.md)** - Architecture patterns and best practices
- **[docs/MIGRATIONS.md](MIGRATIONS.md)** - Database migration workflows
- **[docs/ERROR_HANDLING.md](ERROR_HANDLING.md)** - Error handling patterns

Happy building! 🎉