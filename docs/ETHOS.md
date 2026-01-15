# Template Ethos

> A strict, opinionated foundation for AI-driven development workflows.

This template is designed to be **audited and extended by AI coding assistants** as easily as by humans. The following criteria define what this template aims to achieve and how it should be evaluated.

---

## Evaluation Criteria

### 1. AI Legibility & Predictability

- Is there a **single obvious way** to perform common tasks (data access, mutations, UI composition, theming, i18n, auth, environment access)?
- Can an AI infer intent from **file location and naming alone** without reading large amounts of code?
- Are there places where multiple valid patterns exist without clear preference?

### 2. Convention as the Primary API

- Do folder structure and naming encode architectural rules?
- Are boundaries between client, server, domain logic, and infrastructure unmistakable?
- Identify any locations where logic is placed somewhere "because it works" rather than because it belongs there.

### 3. Architectural Boundaries & Data Flow

- Is data flow explicit and traceable from request → domain → persistence → response?
- Are Nuxt abstractions constrained or wrapped to fit a coherent architecture?
- Are there any hidden side effects or "magic" behaviors that reduce auditability?

### 4. Edge-Native & Cloudflare Discipline

- Is the project truly **Cloudflare Workers-first** (no Node-only assumptions)?
- Are bindings, environment variables, and runtime constraints explicit and centralized?
- Is deployment behavior deterministic across dev, preview, and production?

### 5. Scaffold Quality for AI Extension

- Does the template **scaffold behavior rather than implement everything**?
- Are extension points obvious, intentional, and safe for AI to extend?
- When adding a new feature/domain, is the change surface small and predictable?

### 6. i18n & Theming as Structural Concerns

- Is internationalization enforced structurally (no ad-hoc strings)?
- Is theming tokenized and system-driven rather than ad-hoc styling?
- Could an AI add a locale or theme without inventing new patterns?

### 7. Database & ORM Discipline

- Is the schema the clear source of truth for domain shape?
- Is all data access centralized and consistent?
- Are there any leaks of persistence logic into UI or routing layers?

### 8. Violations & Risk Assessment

- Architectural ambiguities
- Pattern duplication
- Over-flexible areas that would confuse AI agents
- Missing guardrails

Issues are ranked by **risk to AI-guided development quality**, not by severity for humans.

---

## How This Template Meets These Criteria

### AI Legibility

- **CLAUDE.md files** at every layer explain conventions, patterns, and reasoning
- **Explicit over implicit**: Configuration is centralized, patterns are documented
- **Consistent naming**: Same terminology everywhere (no synonyms that confuse AI context)
- **Self-describing structure**: File organization matches mental models

### Convention as API

| Layer | Location | Responsibility |
|-------|----------|----------------|
| API Routes | `server/api/` | HTTP handling only |
| Services | `server/services/` | Business logic, request-scoped |
| Repositories | `server/repositories/` | Data access, query building |
| Schema | `server/database/schema/` | Source of truth for domain shape |
| Config | `server/config/` | Routes, RBAC, centralized settings |
| Shared | `shared/` | Validators, error codes, types |
| Frontend | `app/` | UI components, stores, composables |

### Data Flow

```
HTTP Request
    ↓
Middleware (context, auth, rate limiting)
    ↓
API Route (validation, response formatting)
    ↓
Service (business logic, authorization)
    ↓
Repository (query building, data access)
    ↓
Database (Drizzle ORM → D1)
```

### Edge-Native Design

- **Stateless**: No assumptions about persistent connections
- **D1-first**: SQLite semantics, not PostgreSQL habits
- **Request-scoped services**: Fresh context per request, no shared mutable state
- **Bindings centralized**: `wrangler.jsonc` is the single source of truth

### Scaffold Quality

- **Deletable code**: Patterns are easy to remove if not needed
- **Minimal dependencies**: Every package must justify its existence
- **Extension points**: Add a domain by following existing patterns
- **Small change surface**: New features touch predictable locations

### Structural i18n & Theming

- **i18n enforced**: All user-facing strings through translation keys
- **Theme tokens**: CSS custom properties, not ad-hoc colors
- **Add a locale**: Copy keys to `i18n/i18n.config.ts`, no new patterns

### Database Discipline

- **Schema is truth**: Domain types derived from schema
- **Centralized access**: All queries through repositories
- **Conditions helpers**: Reusable query building patterns
- **No persistence leaks**: UI never touches database directly

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Cloudflare Workers | Global edge deployment, generous free tier, integrated ecosystem |
| Nuxt 4 | Full-stack Vue with file-based routing, Nitro for edge |
| Drizzle ORM | Type-safe, lightweight, SQLite-native, no runtime overhead |
| Config-based RBAC | No database queries for permission checks, explicit role definitions |
| Single database | Simpler operations, tenant isolation via queries not infrastructure |
| Session auth | Works everywhere, no JWT complexity, built-in with nuxt-auth-utils |
| shadcn-vue | Copy-paste components, full control, no black-box library |

---

## Success Criteria

The template succeeds when:

1. **AI assistants** can add features without breaking existing patterns
2. **New developers** understand the codebase in their first day
3. **Production deploys** happen multiple times per day with confidence
4. **Security audits** find nothing because the patterns prevent issues
5. **You delete half the template** for your use case and nothing breaks

---

## Philosophy in Practice

```
Ask: "Would an AI assistant understand this?"
If no → Add a CLAUDE.md or inline comment

Ask: "Could this leak data to the wrong tenant?"
If maybe → Add explicit tenant scoping

Ask: "Does this need to exist?"
If unsure → Delete it, add when actually needed

Ask: "Is there already a pattern for this?"
If yes → Follow it exactly
```

---

*Built for developers who ship, assisted by AI that understands.*
