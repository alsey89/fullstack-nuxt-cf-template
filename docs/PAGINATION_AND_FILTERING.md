# Pagination and Filtering Implementation

This document describes the standardized pagination, filtering, and sorting system implemented across all list endpoints.

## Overview

The system provides:
- **Pagination**: Page-based navigation with configurable page size
- **Filtering**: Flexible field-based filtering with multiple operators
- **Sorting**: Field-based sorting with ascending/descending order
- **Type Safety**: Full TypeScript and Zod validation support
- **Consistency**: Uniform API across all list endpoints

## API Format

### Query Parameters

```
GET /api/v1/{resource}?page=1&perPage=20&sortBy=field&sortOrder=desc&filter[field][operator]=value
```

#### Pagination Parameters
- `page` (number, default: 1): Page number (1-indexed)
- `perPage` (number, default: 20, max: 100): Items per page
  - Set to `-1` to disable pagination and return all results

#### Sorting Parameters
- `sortBy` (string): Field name to sort by (validated per endpoint)
- `sortOrder` (enum: "asc" | "desc", default: "asc"): Sort direction

#### Filter Parameters
Format: `filter[fieldName][operator]=value`

**Supported Operators:**
- `eq`: Equal to
- `ne`: Not equal to
- `like`: SQL LIKE pattern (you provide `%` wildcards, e.g., `%example%`)
- `contains`: Contains text (auto-wrapped with `%`, simpler than `like`)
- `startsWith`: Starts with text (auto-appends `%`)
- `endsWith`: Ends with text (auto-prepends `%`)
- `in`: Value in array (comma-separated)
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `isNull`: Field is NULL
- `notNull`: Field is NOT NULL

### Response Format

```json
{
  "message": "Resources retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "error": null
}
```

## Endpoints

### Users List
`GET /api/v1/user`

**Allowed Sort Fields:**
- `email`
- `firstName`
- `lastName`
- `createdAt` (default)
- `role`
- `isActive`
- `isEmailVerified`

**Allowed Filter Fields:**
- `email`
- `firstName`
- `lastName`
- `role`
- `isActive`
- `isEmailVerified`

**Example:**
```bash
# Get page 2 of active users, 50 per page, sorted by email
GET /api/v1/user?page=2&perPage=50&sortBy=email&sortOrder=asc&filter[isActive][eq]=true

# Get users with email containing "@example.com" (simple way)
GET /api/v1/user?filter[email][contains]=@example.com

# Get users with email containing "@example.com" (power user way with like)
GET /api/v1/user?filter[email][like]=%@example.com%

# Get users whose first name starts with "John"
GET /api/v1/user?filter[firstName][startsWith]=John

# Get users with Gmail addresses
GET /api/v1/user?filter[email][endsWith]=@gmail.com

# Get unverified users
GET /api/v1/user?filter[isEmailVerified][eq]=false
```

### Roles List
`GET /api/v1/roles`

**Allowed Sort Fields:**
- `name`
- `createdAt` (default)
- `isSystem`
- `description`

**Allowed Filter Fields:**
- `name`
- `isSystem`

**Additional Parameters:**
- `includeSystem` (boolean, default: true): Include system roles

**Example:**
```bash
# Get custom roles only (exclude system roles)
GET /api/v1/roles?includeSystem=false

# Search for roles with "admin" in name
GET /api/v1/roles?filter[name][like]=%admin%

# Get system roles sorted by name
GET /api/v1/roles?filter[isSystem][eq]=true&sortBy=name&sortOrder=asc
```

### Permissions List
`GET /api/v1/permissions`

**Allowed Sort Fields:**
- `code`
- `category` (default)
- `description`

**Allowed Filter Fields:**
- `code`
- `category`

**Example:**
```bash
# Get all user-related permissions
GET /api/v1/permissions?filter[category][eq]=users

# Search for specific permission code
GET /api/v1/permissions?filter[code][like]=users:%
```

## Implementation Details

### Architecture Layers

#### 1. Type Definitions (`server/types/api.ts`)
- `Pagination`: Pagination metadata
- `PaginatedResponse<T>`: Generic paginated response wrapper
- `SortOrder`: "asc" | "desc"
- `SortOptions`: Sorting configuration
- `FilterOperator`: Supported filter operators
- `Filter`: Single filter definition
- `ListQuery`: Combined query parameters

#### 2. Query Parser (`server/utils/query-parser.ts`)
- `parseListQuery(event)`: Parses all query parameters
- `parsePaginationParams(query)`: Extracts pagination
- `parseSortParams(query)`: Extracts sorting
- `parseFilterParams(query)`: Parses filter[field][operator] format
- `validateSortField()`: Validates sortBy against allowed fields
- `validateFilters()`: Validates filter fields against allowed list

#### 3. Pagination Helper (`server/utils/pagination.ts`)
- `calculatePagination()`: Computes pagination metadata
- `buildPaginatedResponse()`: Creates paginated response wrapper
- `calculateLimitOffset()`: Converts page/perPage to limit/offset

#### 4. Base Repository (`server/repositories/base.ts`)
Enhanced with:
- `buildFilterCondition()`: Converts Filter to SQL condition
- `buildFilters()`: Combines multiple filters with AND
- `buildSort()`: Creates SQL ORDER BY clause
- `countRecords()`: Counts with optional filters

#### 5. Repository Layer
Each repository now supports:
- `count(filters?)`: Count records with optional filters
- `list(limit, offset, filters?, sortBy?, sortOrder?)`: List with full support

#### 6. Service Layer
Services updated to pass through parameters:
- `IdentityService.listUsers()` and `countUsers()`
- `RBACService.listRoles()` and `countRoles()`
- `RBACService.listPermissions()` and `countPermissions()`

#### 7. API Endpoints
All list endpoints follow the pattern:
1. Parse query parameters
2. Validate sort field and filters
3. Calculate limit/offset
4. Fetch data and count in parallel
5. Build paginated response

### Validation

Zod schemas are available in `server/validators/query.ts`:
- `paginationSchema`: Validates pagination params
- `sortSchema`: Validates sort params
- `filterSchema`: Validates individual filters
- `listQuerySchema`: Combined validation
- Endpoint-specific schemas: `userListQuerySchema`, `roleListQuerySchema`, `permissionListQuerySchema`

## Usage Examples

### Frontend Integration

```typescript
// Fetch users with pagination
const { data } = await $fetch('/api/v1/user', {
  query: {
    page: 1,
    perPage: 20,
    sortBy: 'email',
    sortOrder: 'asc',
    'filter[isActive][eq]': true
  }
})

// Access pagination info
console.log(data.pagination.total) // Total count
console.log(data.pagination.hasNext) // Has next page
console.log(data.items) // Array of users
```

### Multiple Filters

```typescript
// Multiple filters (combined with AND)
const { data } = await $fetch('/api/v1/user', {
  query: {
    'filter[isActive][eq]': true,
    'filter[role][eq]': 'admin',
    'filter[email][like]': '%@company.com%'
  }
})
```

### Get All Results

```typescript
// Disable pagination to get all results
const { data } = await $fetch('/api/v1/roles', {
  query: {
    perPage: -1
  }
})
```

## Performance Considerations

1. **Parallel Queries**: Count and list queries run in parallel using `Promise.all()`
2. **Index Optimization**: Ensure database indexes on commonly filtered/sorted fields
3. **Max Page Size**: Enforced limit of 100 items per page (MAX_PER_PAGE)
4. **Validated Fields**: Only allowed fields can be used for sorting/filtering

## Extensibility

To add pagination/filtering to a new endpoint:

1. Update repository with `count()` and enhanced `list()` methods
2. Update service to accept new parameters
3. Update API endpoint using the standard pattern
4. Add allowed fields to validation
5. Document in this file

## Testing

The implementation includes:
- Type safety via TypeScript
- Runtime validation via Zod schemas
- Field validation (only allowed fields can be filtered/sorted)
- SQL injection protection (parameterized queries via Drizzle ORM)

## Migration Notes

**Backwards Compatibility:**
- Existing endpoints continue to work with default values
- Old pagination format (`page`, `perPage`) still supported
- New features are opt-in via query parameters

**Breaking Changes:**
- None - this is an enhancement to existing endpoints
