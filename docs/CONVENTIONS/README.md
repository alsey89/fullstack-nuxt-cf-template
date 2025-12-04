# Conventions Index

This directory contains extracted conventions and best practices from the main CLAUDE.md document, organized for quick AI lookup and developer reference.

## Quick Start

**Before coding, read these in order:**

1. [**Common Pitfalls**](./COMMON_PITFALLS.md) - ⚡ Most important! Frequent mistakes to avoid
2. [**Development Checklists**](./CHECKLISTS.md) - Step-by-step implementation guides
3. [**Import Conventions**](./IMPORTS.md) - Path aliases and auto-imports
4. [**Naming Conventions**](./NAMING.md) - File, variable, and function naming

## Convention Files

### [Common Pitfalls](./COMMON_PITFALLS.md)

**Purpose:** Quick reference for mistakes to avoid

**Read this first before any development task!**

Organized by:

- Backend Pitfalls (Database, Imports, Services, API Routes, Errors)
- Frontend Pitfalls (API Calls, State Management, Forms, Components)

**Key Sections:**

- Soft delete checks (`this.notDeleted()`)
- Import alias usage
- Service factory patterns
- Store action patterns
- Form state management

### [Development Checklists](./CHECKLISTS.md)

**Purpose:** Step-by-step guides for common tasks

**Use when:**

- Creating new API endpoints
- Adding database tables
- Implementing features
- Creating store actions
- Building form components

**Includes:**

- New API Endpoint Checklist
- New Database Table Checklist
- New Feature Checklist
- New Store Action Checklist
- New Form Component Checklist

### [Import Conventions](./IMPORTS.md)

**Purpose:** Import alias usage and auto-import patterns

**Covers:**

- Import aliases (`@`, `#server`, `~~`)
- Frontend imports
- Backend imports
- Cross-boundary imports
- Auto-import rules (components, composables, stores, utils)

**Key Concepts:**

- When to use each alias
- Auto-import naming requirements
- VS Code integration
- When explicit imports are needed

### [Naming Conventions](./NAMING.md)

**Purpose:** Consistent naming patterns

**Covers:**

- File naming (API routes, services, repositories, components)
- Function naming (regular, async, event handlers)
- Class naming (services, repositories, errors)
- Variable naming (local, boolean, constants)
- Database naming (tables, columns, foreign keys)

**Quick Reference Table:**

- All naming patterns in one table
- Examples for each pattern
- Common mistakes to avoid

## Navigation

**Back to:**

- [Documentation Index](../README.md)
- [Complete Conventions](../CLAUDE.md)

**Related:**

- [Backend Guide](../BACKEND/README.md) (when available)
- [Frontend Guide](../FRONTEND/README.md) (when available)
- [Testing Guide](../TESTING.md)

## For AI Assistants

These convention files are optimized for AI lookup:

1. **Quick Pitfall Check:** `docs/CONVENTIONS/COMMON_PITFALLS.md`
2. **Task Checklist:** `docs/CONVENTIONS/CHECKLISTS.md` + relevant section
3. **Import Help:** `docs/CONVENTIONS/IMPORTS.md` + specific section
4. **Naming Help:** `docs/CONVENTIONS/NAMING.md` + quick reference table

**Pattern:**

```
# Task: Create new API endpoint
1. Read: docs/CONVENTIONS/COMMON_PITFALLS.md#api-routes--validation
2. Follow: docs/CONVENTIONS/CHECKLISTS.md#new-api-endpoint-checklist
3. Reference: docs/CONVENTIONS/NAMING.md (API Routes section)
4. Reference: docs/CONVENTIONS/IMPORTS.md (Backend Code section)
```

## Usage Examples

### Starting a New Feature

```markdown
1. Review Common Pitfalls (both backend and frontend sections)
2. Open relevant checklist from Development Checklists
3. Follow checklist step-by-step
4. Reference Naming Conventions for file names
5. Reference Import Conventions for import patterns
```

### Fixing a Bug

```markdown
1. Check Common Pitfalls for related area
2. Review relevant section in main CLAUDE.md
3. Apply fix following established patterns
```

### Code Review

```markdown
1. Check against Common Pitfalls
2. Verify naming follows Naming Conventions
3. Verify imports follow Import Conventions
4. Ensure checklist items completed (if applicable)
```

---

**Last Updated:** 2025-11-30
