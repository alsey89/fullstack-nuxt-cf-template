# Operations Guide

Setup, deployment, and operational documentation for Keystone.

## Setup & Configuration

### [Complete Setup Guide](./SETUP.md)

Comprehensive setup guide for new projects using this template.

**Covers:**

- Project initialization
- Environment configuration
- Database setup
- OAuth configuration
- Deployment preparation

### [Quick Setup](../QUICKSTART.md)

5-minute quickstart to get running locally.

## Environment & Secrets

### [Secrets Management](./SECRETS.md)

Managing environment variables and secrets.

**Key Topics:**

- Local development secrets
- Staging/production secrets
- Secret rotation
- Cloudflare secrets

### [OAuth Setup](./OAUTH_SETUP.md)

Configuring OAuth providers (Google OAuth).

**Covers:**

- Google OAuth setup
- Redirect URIs
- Client credentials
- Testing OAuth flow

## Database Operations

### [Migration Workflows](./MIGRATIONS.md)

Database migration workflows and Time Travel safety.

**Key Concepts:**

- Drizzle migration generation
- Safe migration workflow
- Time Travel bookmarks
- Rollback procedures
- CI validation

## Security

### [Security Architecture](./SECURITY.md)

Security architecture, threat model, and best practices.

**Covers:**

- Multi-tenant security
- Authentication & authorization
- Session management
- Data isolation
- Threat model

## Related Documentation

**Quick Start:**

- [5-Minute Quickstart](../QUICKSTART.md) - Fast local setup
- [Contributing Guide](../../CONTRIBUTING.md) - Development workflow

**Development:**

- [Backend Guide](../BACKEND/README.md) - Backend patterns
- [Frontend Guide](../FRONTEND/README.md) - Frontend patterns (when available)
- [Database Schema](../../server/database/schema/README.md) - Schema documentation

**Deployment:**

- Cloudflare Workers deployment
- wrangler configuration
- Environment-specific settings

---

**Quick Navigation:**
[Setup](./SETUP.md) | [Secrets](./SECRETS.md) | [Migrations](./MIGRATIONS.md) | [OAuth](./OAUTH_SETUP.md) | [Security](./SECURITY.md)
