# Cloudflare Full-Stack Template

A production-ready full-stack web application template built on Cloudflare Workers with Nuxt 4, featuring authentication, multitenancy, and modern development patterns.

## 🚀 Features

- **⚡ Cloudflare Workers** - Edge computing with global distribution
- **🗄️ Cloudflare D1** - Serverless SQLite database with atomic batch operations
- **🔐 Authentication** - Secure session-based auth with nuxt-auth-utils
- **🏢 Multi-tenancy** - Configurable per-tenant database isolation (defaults to single-tenant)
- **🛡️ Security** - Session-tenant binding, JWT token isolation, cross-tenant protection
- **⚖️ RBAC** - Enterprise-grade role-based access control with wildcards
- **📊 Database ORM** - Drizzle ORM with TypeScript
- **✅ Validation** - Shared Zod schemas for FE/BE consistency with vee-validate
- **🎨 UI Components** - shadcn-nuxt with Tailwind CSS
- **📱 Responsive** - Mobile-first design with dark mode
- **🧪 Testing** - Vitest with Cloudflare Workers testing
- **🚀 CI/CD Ready** - Automated deployments and migrations

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) folder:

### Quick Start
- **[docs/CLAUDE.md](docs/CLAUDE.md)** - AI-optimized quick reference (START HERE for development)
- **[docs/TEMPLATE_SETUP.md](docs/TEMPLATE_SETUP.md)** - Complete setup guide for new projects

### Core Documentation
- **[docs/CONVENTIONS.md](docs/CONVENTIONS.md)** - Complete architectural patterns and coding conventions
- **[docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md)** - Structured error handling system
- **[docs/RBAC.md](docs/RBAC.md)** - Enterprise role-based access control guide
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security architecture and threat model
- **[docs/MIGRATIONS.md](docs/MIGRATIONS.md)** - Database migration workflows
- **[docs/SECRETS.md](docs/SECRETS.md)** - Secrets management and environment variables

## 🏗️ Tech Stack

- **Runtime:** Cloudflare Workers (Nuxt 4)
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle
- **Auth:** nuxt-auth-utils + JWT
- **Validation:** Zod + vee-validate
- **UI:** shadcn-nuxt + Tailwind CSS
- **Testing:** Vitest

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- wrangler CLI

### Installation

```bash
# Clone the template
git clone <your-template-repo>
cd cf-fullstack-template

# Install dependencies
npm install

# Set up environment variables (NEW: example file provided!)
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values

# Generate database migration
npm run db:generate

# Start development server
npm run dev
```

### Database Setup

```bash
# Apply migrations locally
npm run db:migrate:local:staging

# Seed with sample data (includes default roles: admin, manager, user)
npm run db:reset
```

### Production Deployment

```bash
# Create D1 database
wrangler d1 create template-production

# Update wrangler.production.jsonc with database ID

# Deploy migrations
npm run db:migrate:remote:staging

# Deploy to Cloudflare Workers
npm run deploy
```

## 📋 Architecture

Modern serverless architecture with configurable multi-tenancy:

```
API Routes (server/api/)
    ↓
Middleware (request context, tenant resolution)
    ↓
Services (request-scoped, factory functions)
    ↓
Repositories (database-scoped CRUD with batch operations)
    ↓
Drizzle ORM → D1 Database (single or multi-tenant)
```

### Key Features

- **Configurable tenancy** - Single-tenant by default, multi-tenant opt-in via configuration
- **Atomic operations** - Batch operations using D1's native batch API for data consistency
- **Request-scoped services** - No singletons, fresh instances per request
- **RBAC system** - Enterprise-grade role-based access control with wildcards
- **Fail-fast validation** - Context validation in service constructors
- **Type-safe** - End-to-end TypeScript with Drizzle schema
- **Graceful degradation** - RBAC can be toggled on/off via configuration

### Multi-Tenancy Options

**Single-Tenant (Default):**
- One database for the entire application
- Simplest setup, best for most use cases
- Set `NUXT_MULTITENANCY_ENABLED=false` in runtime config

**Multi-Tenant (Optional):**
- Separate D1 database per tenant via manual provisioning
- Each tenant requires a `DB_<TENANT>` binding in wrangler config
- Requires tenant provisioning workflow (see [docs/TEMPLATE_SETUP.md](docs/TEMPLATE_SETUP.md))

**⚠️ Important:** You cannot switch between single-tenant and multi-tenant mode without data migration. Sessions from one mode won't work in the other. Choose your mode carefully before deploying to production.

## 🛡️ Security Features

### Session-Tenant Binding
Sessions are cryptographically bound to tenant context to prevent cross-tenant access:
- **Automatic Protection**: Sessions created in Tenant A cannot be used in Tenant B
- **Mode-Agnostic**: Works in both single-tenant (`tenantId="default"`) and multi-tenant modes
- **JWT Token Isolation**: Email confirmation and password reset tokens include tenant validation
- **Zero Configuration**: Security enforcement is built-in and always active

### Cross-Tenant Protection
The template automatically prevents:
- ✅ Session reuse across different tenants
- ✅ JWT token replay attacks across tenants
- ✅ Unauthorized database access via tenant manipulation
- ✅ Cross-tenant data leakage through middleware validation

See [docs/SECURITY.md](docs/SECURITY.md) for detailed security documentation.

## ⚙️ Multitenancy & RBAC Configuration

### Multitenancy Modes

**Single-Tenant Mode (Default)**
- ✅ One organization per deployment
- ✅ One D1 database for all data
- ✅ No tenant headers required
- ✅ Perfect for internal tools or dedicated deployments
- ✅ Zero configuration required

**Multi-Tenant Mode (Optional)**
- ⚙️ Separate D1 database per tenant (manual provisioning required)
- ⚙️ Each tenant requires wrangler binding: `DB_<TENANT>`
- ⚙️ Tenant ID passed via `x-tenant-id` header
- 📚 See [docs/TEMPLATE_SETUP.md](docs/TEMPLATE_SETUP.md) for provisioning guide

**Enable Multi-Tenant Mode:**
```bash
# In .dev.vars or runtime config
NUXT_MULTITENANCY_ENABLED=true

# Each tenant needs a D1 binding in wrangler config:
# [[d1_databases]]
# binding = "DB_TENANT1"
# database_name = "tenant1-db"
# database_id = "xxx-yyy-zzz"
```

### RBAC (Role-Based Access Control)

**RBAC Enabled (Default)**
- ✅ Enterprise-grade permission system
- ✅ Wildcard support (*, users:*, roles:*)
- ✅ Multiple roles per user
- ✅ 3 system roles: admin, manager, user
- ✅ Full REST API for role management

**Disable RBAC (for simple apps):**
```bash
# In .dev.vars - allows all actions
NUXT_RBAC_ENABLED=false
```

**Using RBAC in Code:**
```typescript
// Check permission in API routes
import { requirePermission } from '~/server/services/rbac'

export default defineEventHandler(async (event) => {
  // Throws if user lacks permission
  await requirePermission(event, 'users:create')

  // Your logic here
})

// Get user permissions
import { getCurrentUserPermissions } from '~/server/services/rbac'

const permissions = await getCurrentUserPermissions(event)
// Returns: ['*'] for admin, ['users:*', 'company:*'] for manager, etc.
```

See [docs/RBAC.md](docs/RBAC.md) for complete RBAC guide.

## 🔧 Environment Variables

### Required Secrets (via `wrangler secret put`)

```bash
# Authentication
wrangler secret put NUXT_SESSION_PASSWORD  # 64-char random string

# Email (choose one provider)
wrangler secret put EMAIL_PROVIDER         # "resend" or "postmark"
wrangler secret put EMAIL_API_KEY
wrangler secret put EMAIL_FROM

# Security (optional)
wrangler secret put NUXT_TURNSTILE_SECRET_KEY  # Cloudflare Turnstile
```

### Public Variables (in wrangler.jsonc)

```json
{
  "vars": {
    "NODE_ENV": "production",
    "ENVIRONMENT": "production"
  }
}
```

## 🗄️ Database Schema

The template includes a production-ready foundational schema:

- **Company Metadata** - Single-tenant company profile (per database)
- **Users** - Authentication and user management
- **Roles** - Role definitions with JSON permission arrays
- **User Roles** - Many-to-many user-role assignments
- **Permissions** - Permission registry (validation/documentation)
- **User Settings** - JSON-based user preferences
- **Audit Logs** - Track all significant actions

**RBAC Architecture:**
- Hybrid storage: JSON permissions in roles for fast queries
- Permission wildcards: `*` (super admin), `users:*` (category), `users:create` (specific)
- System roles: admin, manager, user (cannot be deleted)

Clean foundation that's easy to extend with your domain-specific tables.

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

### Staging

```bash
# Configure staging environment
wrangler d1 create template-staging
# Update wrangler.staging.jsonc with database ID

# Deploy staging
npm run db:migrate:safe:staging
wrangler deploy --env staging
```

### Production

```bash
# Configure production environment
wrangler d1 create template-production
# Update wrangler.production.jsonc with database ID

# Deploy production
npm run db:migrate:safe:production
wrangler deploy --env production
```

## 🔐 Default Accounts

After seeding, you'll have these test accounts with different permission levels:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@test.com | testtesttest | `*` (all permissions) |
| Manager | manager@test.com | testtesttest | `users:view`, `users:update`, `company:view`, `company:update` |
| User | user@test.com | testtesttest | `company:view` (read-only) |

## 🎯 Customizing for Your Project

1. **Update branding**: Change company name, colors, and logo
2. **Extend schema**: Add your domain-specific database tables
3. **Add features**: Create new services, repositories, and API routes
4. **Configure auth**: Customize permissions and roles
5. **Update UI**: Modify pages and components for your use case

## 📖 Learn More

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Nuxt 3 Documentation](https://nuxt.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)

## 🤝 Contributing

This is a template repository. Fork it and make it your own!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.