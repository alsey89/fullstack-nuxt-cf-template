# Service Layer Pattern

Services encapsulate business logic and are **request-scoped** - created fresh for each HTTP request.

## Quick Reference

**Key Concepts:**

- Request-scoped (factory functions)
- Extends `BaseService`
- Uses `RepositoryContainer` for dependency injection
- Business logic only (no direct DB queries)
- Throws errors (let middleware handle)
- Audit significant actions

**Service Lifecycle:**

```
Request → Factory Function → Service Instance → Business Logic → Response
```

---

## Core Principles

1. **Single Responsibility** - One service handles one sub-domain
2. **Request-Scoped** - Fresh instance per request, no singletons
3. **Thin Controllers, Fat Services** - Business logic lives in services
4. **Services ≤ 300 Lines** - Split if larger
5. **Dependency Injection** - Use `RepositoryContainer`, not manual instantiation
6. **Stateless** - Services don't maintain state between requests

---

## BaseService Class

All services should extend `BaseService` for common utilities.

```typescript
// server/services/base.ts
import type { H3Event } from "h3";
import type { RepositoryContainer } from "#server/repositories/container";
import { AuthenticationError } from "#server/error/errors";

export abstract class BaseService {
  protected readonly userId?: string;
  protected readonly tenantId?: string;
  protected readonly traceId?: string;

  constructor(
    protected readonly event: H3Event,
    protected readonly repos: RepositoryContainer
  ) {
    // Extract common context values once
    this.userId = event.context.userId;
    this.tenantId = event.context.tenantId;
    this.traceId = event.context.traceId;
  }

  /**
   * Require authentication - throws if no userId
   * @returns Authenticated user ID
   */
  protected requireAuth(): string {
    if (!this.userId) {
      throw new AuthenticationError("User not authenticated");
    }
    return this.userId;
  }

  /**
   * Log audit trail
   */
  protected async audit(
    action: string,
    entityType: string,
    entityId?: string,
    data?: any
  ): Promise<void> {
    if (!this.userId) return;

    await this.repos.auditLog.log(
      this.userId,
      action,
      entityType,
      entityId,
      data
    );
  }

  /**
   * Get current timestamp
   */
  protected now(): Date {
    return new Date();
  }
}
```

---

## Service Structure

### Standard Service Template

```typescript
// server/services/exampleService.ts
import type { H3Event } from "h3";
import type { RepositoryContainer } from "#server/repositories/container";
import { BaseService } from "./base";
import {
  NotFoundError,
  DuplicateError,
  BusinessRuleError,
} from "#server/error/errors";
import type {
  CreateExampleInput,
  UpdateExampleInput,
} from "#shared/validators";

// ========================================
// EXAMPLE SERVICE
// ========================================
// Handles example management:
// - Create/Read/Update/Delete examples
// - Example configuration
// - Example search
// ========================================

export class ExampleService extends BaseService {
  constructor(event: H3Event, repos: RepositoryContainer) {
    super(event, repos);
  }

  // ========================================
  // PUBLIC METHODS (alphabetical)
  // ========================================

  /**
   * Create a new example
   */
  async createExample(data: CreateExampleInput) {
    const userId = this.requireAuth();

    // Business validation
    const existing = await this.repos.example.findByName(data.name);
    if (existing) {
      throw new DuplicateError("example name", data.name);
    }

    // Create example
    const example = await this.repos.example.create({
      ...data,
      userId,
      isActive: true,
    });

    // Audit log
    await this.audit("EXAMPLE_CREATED", "EXAMPLE", example.id, { data });

    return example;
  }

  /**
   * Delete example (soft delete)
   */
  async deleteExample(exampleId: string) {
    const userId = this.requireAuth();

    // Check business rules
    const hasActiveItems = await this.repos.example.hasActiveItems(exampleId);
    if (hasActiveItems) {
      throw new BusinessRuleError("Cannot delete example with active items");
    }

    // Soft delete
    const deleted = await this.repos.example.softDelete(exampleId);

    // Audit log
    await this.audit("EXAMPLE_DELETED", "EXAMPLE", exampleId);

    return { success: deleted };
  }

  /**
   * Get example by ID
   */
  async getExample(exampleId: string) {
    const example = await this.repos.example.findById(exampleId);
    if (!example) {
      throw new NotFoundError("Example", exampleId);
    }
    return example;
  }

  /**
   * List examples
   */
  async listExamples(activeOnly = false) {
    if (activeOnly) {
      const result = await this.repos.example.findActive();
      return result.items;
    }
    const result = await this.repos.example.findAll();
    return result.items;
  }

  /**
   * Update example
   */
  async updateExample(exampleId: string, data: UpdateExampleInput) {
    const userId = this.requireAuth();

    const updated = await this.repos.example.update(exampleId, data);
    if (!updated) {
      throw new NotFoundError("Example", exampleId);
    }

    // Audit log
    await this.audit("EXAMPLE_UPDATED", "EXAMPLE", exampleId, { data });

    return updated;
  }

  // ========================================
  // PRIVATE METHODS (alphabetical)
  // ========================================

  /**
   * Validate example exists
   */
  private async validateExampleExists(exampleId: string) {
    const example = await this.repos.example.findById(exampleId);
    if (!example) {
      throw new NotFoundError("Example", exampleId);
    }
    return example;
  }
}
```

---

## Factory Functions

Every service should have a factory function that creates a new instance per request.

### Simple Factory

```typescript
// server/services/exampleService.ts
import { createRepositoryContainer } from "#server/repositories/container";

export function createExampleService(event: H3Event): ExampleService {
  const repos = createRepositoryContainer(event);
  return new ExampleService(event, repos);
}
```

### Usage in API Routes

```typescript
// server/api/v1/examples/index.post.ts
export default defineEventHandler(async (event) => {
  // 1. Validate input
  const body = await readBody(event);
  const data = validateAndSanitize(createExampleSchema, body, ...);

  // 2. Create service (request-scoped)
  const service = createExampleService(event);

  // 3. Execute business logic
  const example = await service.createExample(data);

  // 4. Return standardized response
  return createSuccessResponse('Example created', example);
});
```

---

## Service Patterns

### Pattern 1: CRUD Operations

Standard CRUD methods following consistent naming:

```typescript
// Standard CRUD methods
async create(data: CreateInput): Promise<Entity>
async get(id: string): Promise<Entity>
async list(filters?: Filters): Promise<Entity[]>
async update(id: string, data: UpdateInput): Promise<Entity>
async delete(id: string): Promise<{ success: boolean }>
```

### Pattern 2: Business Operations

Use action verb prefixes for business logic:

```typescript
// Business operations
async calculatePayroll(payPeriodId: string): Promise<PayrollResult>
async approveLeave(leaveRequestId: string): Promise<LeaveRequest>
async generateShifts(templateId: string, startDate: Date, endDate: Date): Promise<Shift[]>
async assignUserToPosition(userId: string, positionId: string): Promise<Assignment>
```

### Pattern 3: Query Operations

Use "get" prefix for query operations:

```typescript
// Query operations
async getClockStatus(): Promise<ClockStatus>
async getLeaveBalance(assignmentId: string, leaveType: string): Promise<LeaveBalance>
async getUserActiveAssignment(userId: string): Promise<Assignment | null>
async getOrganizationStructure(): Promise<OrganizationStructure>
```

### Pattern 4: Role-Based Access Methods

Provide separate methods for different access levels rather than generic methods with embedded permission checks.

**Benefits:**

- Clear separation of concerns
- Type-safe access patterns
- Easy to understand caller intent
- Automatic scoping for managers
- Testable in isolation

**Naming Convention:**

- `listOwn*()` - Self-service list operations
- `listTeam*()` - Manager list operations (location-scoped)
- `list*()` - Admin list operations
- `getOwn*()` - Self-service single item
- `get*Details()` - Admin/manager single item

**Example:**

```typescript
export class LocationService extends BaseService {
  /**
   * List user's own locations (self-service)
   * Returns all locations where the user has assignments
   */
  async listOwnLocations(userId: string) {
    const assignments = await this.repos.assignment.findByUser(userId);
    const locationIds = [
      ...new Set(
        assignments.items
          .filter((a) => a.locationId)
          .map((a) => a.locationId as string)
      ),
    ];

    if (locationIds.length === 0) {
      return [];
    }

    const locations = await Promise.all(
      locationIds.map((id) => this.repos.location.findById(id))
    );

    return locations.filter((l): l is NonNullable<typeof l> => l !== null);
  }

  /**
   * List locations for company (admin operation)
   */
  async listLocations(activeOnly = false) {
    if (activeOnly) {
      const result = await this.repos.location.findActive();
      return result.items;
    }
    const result = await this.repos.location.findByCompany();
    return result.items;
  }

  /**
   * Get location details (admin or manager)
   */
  async getLocationDetails(locationId: string) {
    const location = await this.repos.location.findById(locationId);
    if (!location) {
      throw new NotFoundError("Location", locationId);
    }
    return location;
  }
}
```

**Usage in API Routes:**

```typescript
// Self-service route - /api/v1/me/locations/index.get.ts
export default defineEventHandler(async (event) => {
  const userId = event.context.userId!;
  const service = createLocationService(event);
  const locations = await service.listOwnLocations(userId);
  return createSuccessResponse("Locations retrieved", locations);
});

// Admin route - /api/v1/locations/index.get.ts
export default defineEventHandler(async (event) => {
  await requirePermission(event, "locations:read");

  const query = getQuery(event);
  const activeOnly = query.activeOnly === "true";

  const service = createLocationService(event);
  const locations = await service.listLocations(activeOnly);
  return createSuccessResponse("Locations retrieved", locations);
});
```

### Pattern 5: Validation Operations

Private validation methods for business rules:

```typescript
// Private validation methods
private async validateUserExists(userId: string): Promise<User>
private async validateDateRange(start: Date, end: Date): void
private async validateBusinessRule(data: any): void
```

---

## Dependency Injection

### Using RepositoryContainer

```typescript
// ✅ GOOD: Inject RepositoryContainer
export class CompanyService extends BaseService {
  constructor(event: H3Event, repos: RepositoryContainer) {
    super(event, repos);
  }

  async createCompany(data: CreateCompanyInput) {
    // Access repositories through container
    const existing = await this.repos.company.findByEmail(data.email);
    if (existing) {
      throw new DuplicateError("email", data.email);
    }

    const company = await this.repos.company.create(data);
    await this.audit("COMPANY_CREATED", "COMPANY", company.id);

    return company;
  }
}

// ❌ BAD: Manual repository instantiation
export class CompanyService {
  constructor(
    private event: H3Event,
    private db: D1Database,
    private companyRepo: CompanyRepository,
    private locationRepo: LocationRepository,
    private departmentRepo: DepartmentRepository
  ) // ... many more repositories
  {}
}
```

### RepositoryContainer Pattern

```typescript
// server/repositories/container.ts
export function createRepositoryContainer(event: H3Event): RepositoryContainer {
  const db = event.context.cloudflare?.env?.DB as D1Database;

  if (!db) {
    throw new InternalServerError("Database not available");
  }

  return {
    user: new UserRepository(db),
    project: new ProjectRepository(db),
    task: new TaskRepository(db),
    auditLog: new AuditLogRepository(db),
    // ... all repositories
  };
}
```

---

## Service Rules

### 1. Request-Scoped Services

```typescript
// ✅ GOOD: Factory function creates new instance
export function createExampleService(event: H3Event) {
  return new ExampleService(event, createRepositoryContainer(event));
}

const service = createExampleService(event);

// ❌ BAD: Singleton instance
export const exampleService = new ExampleService(...);
```

### 2. Context Validation

```typescript
constructor(event: H3Event, repos: RepositoryContainer) {
  super(event, repos);

  // Validate required context in constructor if needed
  if (this.requiresAuth && !this.userId) {
    throw new AuthenticationError("User not authenticated");
  }
}
```

### 3. Business Logic Only

```typescript
// ✅ GOOD: Business logic, delegate to repositories
async createUser(data: CreateUserInput) {
  const existing = await this.repos.user.findByEmail(data.email);
  if (existing) {
    throw new EmailAlreadyExistsError(data.email);
  }

  const user = await this.repos.user.create(data);
  await this.audit("USER_CREATED", "USER", user.id);
  return user;
}

// ❌ BAD: Direct database queries
async createUser(data: CreateUserInput) {
  const [user] = await this.db
    .insert(schema.users)
    .values(data)
    .returning();
  return user;
}
```

### 4. Audit Logging

```typescript
// Log significant actions
async createExample(data: CreateExampleInput) {
  const userId = this.requireAuth();

  const example = await this.repos.example.create(data);

  // Audit log with context
  await this.audit("EXAMPLE_CREATED", "EXAMPLE", example.id, {
    data: { name: data.name, type: data.type }
  });

  return example;
}
```

### 5. Error Throwing

```typescript
// ✅ GOOD: Throw specific errors, let middleware handle
async getExample(id: string) {
  const example = await this.repos.example.findById(id);
  if (!example) {
    throw new NotFoundError("Example", id);
  }
  return example;
}

// ❌ BAD: Catching and wrapping errors
async getExample(id: string) {
  try {
    const example = await this.repos.example.findById(id);
    if (!example) {
      return { error: "Not found" };
    }
    return { data: example };
  } catch (error) {
    return { error: error.message };
  }
}
```

---

## Complete Example

Here's a complete service implementation showing all patterns:

```typescript
// server/services/projectService.ts
import type { H3Event } from "h3";
import type { RepositoryContainer } from "#server/repositories/container";
import { BaseService } from "./base";
import {
  NotFoundError,
  DuplicateError,
  BusinessRuleError,
  AuthorizationError,
} from "#server/error/errors";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "#shared/validators";

export class ProjectService extends BaseService {
  constructor(event: H3Event, repos: RepositoryContainer) {
    super(event, repos);
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  async createProject(data: CreateProjectInput) {
    const userId = this.requireAuth();

    // Business validation
    const existing = await this.repos.project.findBySlug(data.slug);
    if (existing) {
      throw new DuplicateError("project slug", data.slug);
    }

    // Create project
    const project = await this.repos.project.create({
      ...data,
      ownerId: userId,
      status: "active",
    });

    // Audit log
    await this.audit("PROJECT_CREATED", "PROJECT", project.id);

    return project;
  }

  async deleteProject(projectId: string) {
    const userId = this.requireAuth();

    // Check ownership
    const project = await this.getProject(projectId);
    if (project.ownerId !== userId) {
      throw new AuthorizationError("Only owner can delete project");
    }

    // Check business rules
    const hasActiveTasks = await this.repos.task.hasActiveByProject(projectId);
    if (hasActiveTasks) {
      throw new BusinessRuleError("Cannot delete project with active tasks");
    }

    // Soft delete
    await this.repos.project.softDelete(projectId);
    await this.audit("PROJECT_DELETED", "PROJECT", projectId);

    return { success: true };
  }

  async getProject(projectId: string) {
    const project = await this.repos.project.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    return project;
  }

  async listOwnProjects(userId: string) {
    const result = await this.repos.project.findByOwner(userId);
    return result.items;
  }

  async listProjects(filters?: { status?: string }) {
    this.requireAuth();
    const result = await this.repos.project.findAll(filters);
    return result.items;
  }

  async updateProject(projectId: string, data: UpdateProjectInput) {
    const userId = this.requireAuth();

    // Check ownership
    const project = await this.getProject(projectId);
    if (project.ownerId !== userId) {
      throw new AuthorizationError("Only owner can update project");
    }

    // Update
    const updated = await this.repos.project.update(projectId, data);
    await this.audit("PROJECT_UPDATED", "PROJECT", projectId, { data });

    return updated;
  }
}

// Factory function
export function createProjectService(event: H3Event): ProjectService {
  return new ProjectService(event, createRepositoryContainer(event));
}
```

---

## Related Documentation

**Prerequisites:**

- [Common Pitfalls](../CONVENTIONS/COMMON_PITFALLS.md#services--business-logic) - Service mistakes to avoid
- [Development Checklists](../CONVENTIONS/CHECKLISTS.md#new-api-endpoint-checklist) - Implementation guides

**Deep Dive:**

- [Repositories](./REPOSITORIES.md) - Data access layer
- [API Routes](./API_ROUTES.md) - Using services in routes
- [Error Handling](./ERROR_HANDLING.md) - Error classes and codes
- [RBAC](./RBAC.md) - Permission checks

**Related:**

- [Backend Guide](./README.md) - Backend overview
- [Complete Conventions](../CLAUDE.md) - Full patterns
